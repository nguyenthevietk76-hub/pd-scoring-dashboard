from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
import os

from dotenv import load_dotenv
load_dotenv()

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from routers.chat import router as chat_router
from routers.data import router as data_router
from core.company_lookup import CompanyLookup
from core.rag_engine import RAGEngine
from core.cache import response_cache
from core.limiter import limiter

# ── Logging configuration ────────────────────────────────────────
FINBOT_ENV = os.getenv("FINBOT_ENV", "development")

logger = logging.getLogger("finbot")
logger.setLevel(logging.INFO)

# Console handler (luôn có)
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(console_handler)

# File handler (chỉ trong production)
if FINBOT_ENV == "production":
    file_handler = logging.FileHandler(
        os.path.join(os.path.dirname(__file__), "finbot.log"),
        encoding="utf-8"
    )
    file_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
    logger.addHandler(file_handler)

# ── CORS origins ──────────────────────────────────────────────────
def get_allowed_origins() -> list[str]:
    """Đọc CORS origins từ biến môi trường dựa theo FINBOT_ENV."""
    if FINBOT_ENV == "development":
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
    else:
        # Production: đọc từ ALLOWED_ORIGINS (comma-separated)
        origins_str = os.getenv("ALLOWED_ORIGINS", "")
        if origins_str:
            return [o.strip() for o in origins_str.split(",") if o.strip()]
        return []

# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lưu thời gian khởi động
    app.state.start_time = time.time()

    # ── Khởi tạo CompanyLookup ──
    app.state.company_lookup = CompanyLookup()
    
    # Đọc frontend/src/demoData.json vào app.state.company_list
    import json
    demo_data_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'demoData.json')
    app.state.company_list = []
    try:
        with open(demo_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            app.state.company_list = data.get("companies", [])
    except Exception as e:
        logger.warning(f"Could not load demoData.json: {e}")

    # ── Khởi tạo RAG Engine (một lần duy nhất) ──
    try:
        rag_engine = RAGEngine()
        rag_engine.build_index()
        app.state.rag_engine = rag_engine
        logger.info("[FinBot] RAG Engine initialized successfully.")
    except Exception as e:
        logger.warning(f"[FinBot] Failed to initialize RAG Engine: {e}")
        logger.info("[FinBot] App will run without RAG features.")
        app.state.rag_engine = None

    yield

app = FastAPI(
    title="FinBot API",
    description="Trợ lý tư vấn tín dụng AI cho SME",
    version="1.0.0",
    lifespan=lifespan
)

# ── Gắn limiter vào app ──────────────────────────────────────────
app.state.limiter = limiter

# ── Custom 429 handler (tiếng Việt) ──────────────────────────────
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ 1 phút trước khi tiếp tục."
        }
    )

# ── CORS Middleware ───────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Logging Middleware ────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration_ms}ms")
    return response

# ── Routers ───────────────────────────────────────────────────────
app.include_router(chat_router, prefix="/api")
app.include_router(data_router, prefix="/api/data")

# ── Root endpoint ─────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "FinBot is running", "version": "1.0.0"}

# ── Health check (nâng cấp) ───────────────────────────────────────
@app.get("/health")
async def health():
    rag_engine = getattr(app.state, "rag_engine", None)
    rag_status = "available" if rag_engine is not None else "unavailable"

    # Đếm số công ty
    company_list = getattr(app.state, "company_list", [])
    company_count = len(company_list)

    # Đếm số documents trong ChromaDB
    chroma_documents = 0
    if rag_engine and getattr(rag_engine, "collection", None):
        try:
            chroma_documents = rag_engine.collection.count()
        except Exception:
            chroma_documents = 0

    # Cache entries
    cache_entries = response_cache.size

    # Uptime
    start_time = getattr(app.state, "start_time", time.time())
    uptime_seconds = round(time.time() - start_time)

    return {
        "status": "ok",
        "version": "1.0.0",
        "rag_engine": rag_status,
        "company_count": company_count,
        "chroma_documents": chroma_documents,
        "cache_entries": cache_entries,
        "uptime_seconds": uptime_seconds,
    }
