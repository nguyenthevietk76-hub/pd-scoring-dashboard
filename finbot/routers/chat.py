from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import os
import json
import asyncio
import httpx
from rapidfuzz import fuzz
import logging

from prompts.system_prompt import FINBOT_SYSTEM_PROMPT
from dotenv import load_dotenv
from core.cache import response_cache
from core.limiter import limiter

load_dotenv()

logger = logging.getLogger("finbot")

# ── Đọc config từ biến môi trường ─────────────────────────────────
MAX_HISTORY_LENGTH = int(os.getenv("MAX_HISTORY_LENGTH", "20"))
MAX_MESSAGE_LENGTH = 2000
RATE_LIMIT_PER_MINUTE = os.getenv("RATE_LIMIT_PER_MINUTE", "20")

router = APIRouter()

# ── Cấu hình Gemini ──────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

GENERATION_CONFIG = {
    "temperature": 0.4,       # Thấp → phản hồi nhất quán, ít "sáng tạo" quá mức
    "top_p": 0.85,
    "top_k": 40,
    "max_output_tokens": 2048,
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# ── Schema ────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str        # "user" hoặc "assistant"
    content: str

class CompanyContext(BaseModel):
    company_name:  Optional[str]  = None
    ticker:        Optional[str]  = None
    industry:      Optional[str]  = None
    pd_score:      Optional[float]= None
    risk_label:    Optional[str]  = None
    z_score:       Optional[float]= None
    shap_factors:  Optional[list] = None   # [{"factor": "...", "value": 0.12, "direction": "tăng"}]
    data_year:     Optional[int]  = None
    pd_scores_4q:  Optional[list] = None

class ChatRequest(BaseModel):
    message:  str
    history:  list[Message] = []
    context:  Optional[CompanyContext] = None
    stream:   bool = False
    auto_lookup: bool = True

class ChatResponse(BaseModel):
    reply:   str
    tokens:  Optional[int] = None
    rag_sources: list[str] = []    # Nguồn tri thức RAG đã sử dụng
    company_data: Optional[dict] = None

# ── Helper: build context string ─────────────────────────────────
def build_context_block(ctx: CompanyContext) -> str:
    if not ctx or not ctx.company_name:
        return ""

    shap_text = ""
    if ctx.shap_factors:
        lines = []
        for i, f in enumerate(ctx.shap_factors[:5], 1):
            lines.append(
                f"    {i}. {f.get('factor','?')}: "
                f"{f.get('value', 0):.4f} "
                f"({f.get('direction','?')})"
            )
        shap_text = "\n".join(lines)

    trend_text = ""
    if getattr(ctx, "pd_scores_4q", None) and len(ctx.pd_scores_4q) == 4:
        q1, q2, q3, q4 = ctx.pd_scores_4q
        trend_text = f"Xu hướng 4 quý gần nhất: Q1={q1}%, Q2={q2}%, Q3={q3}%, Q4={q4}%\n"

    return f"""
DỮ LIỆU THỰC TỪ HỆ THỐNG — ƯU TIÊN TUYỆT ĐỐI:
Công ty: {ctx.ticker} — {ctx.company_name or 'Chưa cung cấp'}
PD Score thực tế: {f"{ctx.pd_score}%" if ctx.pd_score is not None else 'Chưa tính'}
Xếp hạng rủi ro: {ctx.risk_label or 'Chưa xác định'}
Nguồn: Mô hình ML của hệ thống PD Scoring Dashboard
{trend_text}
Top SHAP factors:
{shap_text or '    Chưa có dữ liệu SHAP'}
"""

def build_system_prompt(ctx: Optional[CompanyContext], available_companies: list = None,
                        rag_context: str = None) -> str:
    """Xây dựng system prompt hoàn chỉnh, bao gồm RAG context nếu có."""
    prompt_parts = [FINBOT_SYSTEM_PROMPT]

    # Thêm khối TRI THỨC THAM CHIẾU từ RAG
    if rag_context:
        prompt_parts.append(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRI THỨC THAM CHIẾU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{rag_context}
""")

    # Thêm dữ liệu doanh nghiệp cụ thể
    context_block = build_context_block(ctx) if ctx else ""
    if context_block:
        prompt_parts.append("\nDỮ LIỆU DOANH NGHIỆP HIỆN TẠI:\n" + context_block)
    elif available_companies:
        names = [f"{c.get('company_name')} ({c.get('ticker')})" for c in available_companies]
        prompt_parts.append("\nDANH SÁCH CÔNG TY TRONG HỆ THỐNG:\n" + ", ".join(names))

    return "\n".join(prompt_parts)

async def detect_and_fetch_company(message: str, company_list: list, base_url: str):
    if not company_list:
        return None, None

    msg_lower = message.lower()
    
    best_score = 0
    best_ticker = None
    best_idx = None

    for idx, comp in enumerate(company_list):
        ticker = comp.get('ticker', '').lower()
        name = comp.get('name', '').lower()
        
        # So khớp ticker trực tiếp trong câu hỏi (ưu tiên cao nhất)
        if ticker and ticker in msg_lower:
            best_ticker = comp.get('ticker')
            best_idx = idx
            best_score = 100
            break
        
        # So khớp tên công ty — dùng partial_ratio để bắt được tên trong câu dài
        if name:
            score_partial = fuzz.partial_ratio(name, msg_lower)
            score_token = fuzz.token_set_ratio(name, msg_lower)
            score = max(score_partial, score_token)
            
            if score > best_score:
                best_score = score
                best_ticker = comp.get('ticker')
                best_idx = idx

    # Ngưỡng 65 thay vì 70 để bắt được các tên dài như "Công ty cổ phần Traphaco"
    if best_score >= 65 and best_ticker:
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(
                    f"{base_url}/api/data/company/search?q={best_ticker}",
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("found"):
                        return best_ticker, data.get("company")
            except Exception as e:
                logger.warning(f"[Lookup] Lỗi khi fetch company {best_ticker}: {e}")
    
    return None, None

# ── Helper: convert history to Gemini format ─────────────────────
def format_history(history: list[Message], inject_format_rule: bool = True) -> list[dict]:
    formatted = []
    
    if inject_format_rule:
        # Nhét formatting rule như một cặp user/model exchange ở đầu history
        formatted.append({
            "role": "user",
            "parts": [{"text": "Trước khi bắt đầu, hãy xác nhận quy tắc trả lời của bạn."}]
        })
        formatted.append({
            "role": "model", 
            "parts": [{"text": "Tôi xác nhận: Tôi sẽ KHÔNG dùng ###, ####, **, *, --- trong bất kỳ câu trả lời nào. Tôi chỉ viết văn xuôi thuần túy bằng tiếng Việt. Tôi sẽ luôn kết thúc bằng đúng một câu hỏi ngắn. Nếu có dữ liệu PD thực từ hệ thống, tôi sẽ hiển thị ở cuối câu trả lời theo đúng format được yêu cầu."}]
        })
    
    for msg in history:
        role = "user" if msg.role == "user" else "model"
        formatted.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })
    return formatted

# ── Helper: build company_data dict cho RAG context ──────────────
def _ctx_to_company_data(ctx: CompanyContext) -> Optional[dict]:
    """Chuyển CompanyContext thành dict tương thích với RAG engine."""
    if not ctx or not ctx.company_name:
        return None
    return {
        "name": ctx.company_name,
        "sector": ctx.industry,
        "current_pd": ctx.pd_score,
        "risk_label": ctx.risk_label,
    }

# ── Endpoint: POST /api/chat ──────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat(req: ChatRequest, request: Request):
    # ── Validation message ──
    if not req.message:
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống.")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được chỉ chứa khoảng trắng.")
    if len(req.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Tin nhắn không được vượt quá {MAX_MESSAGE_LENGTH} ký tự. Hiện tại: {len(req.message)} ký tự."
        )

    # ── Giới hạn history ──
    if len(req.history) > MAX_HISTORY_LENGTH:
        req.history = req.history[-MAX_HISTORY_LENGTH:]

    logger.warning(f"[DEBUG] message='{req.message}'")
    logger.warning(f"[DEBUG] auto_lookup={req.auto_lookup}")
    logger.warning(f"[DEBUG] company_list length={len(getattr(request.app.state, 'company_list', []))}")
    logger.warning(f"[DEBUG] context trước detect={req.context}")

    ctx = req.context
    available_companies = None
    company_data_response = None

    if req.auto_lookup:
        base_url = str(request.base_url).rstrip("/")
        company_list = getattr(request.app.state, "company_list", [])
        extracted_ticker, company_data_response = await detect_and_fetch_company(req.message, company_list, base_url)
        
        if company_data_response:
            c = company_data_response
            ctx = CompanyContext(
                company_name=c.get("name"),
                ticker=c.get("ticker"),
                industry=c.get("industry"),
                pd_score=c.get("pd_score"),
                risk_label=c.get("risk_label"),
                z_score=c.get("z_score"),
                shap_factors=c.get("key_factors"),
                data_year=2023,
                pd_scores_4q=c.get("pd_scores_4q")
            )
            
        logger.warning(f"[DEBUG] detected ticker={extracted_ticker}")
        logger.warning(f"[DEBUG] company_data_response={company_data_response}")
        logger.warning(f"[DEBUG] ctx sau detect={ctx}")

    # ── RAG: Truy xuất tri thức tham chiếu ──
    rag_context = None
    rag_sources = []
    rag_engine = getattr(request.app.state, "rag_engine", None)
    if rag_engine:
        try:
            company_data = _ctx_to_company_data(ctx)
            rag_context, rag_sources = rag_engine.build_context(req.message, company_data)
        except Exception as e:
            print(f"[RAG] Warning: Lỗi khi truy xuất tri thức: {e}")

    # ── Cache: kiểm tra trước khi gọi Gemini ──
    cache_ticker = ctx.ticker if ctx else None
    cached_reply = response_cache.get(req.message, cache_ticker)
    if cached_reply is not None:
        logger.info(f"[Cache HIT] message='{req.message[:50]}...' ticker={cache_ticker}")
        return ChatResponse(
            reply=cached_reply,
            tokens=None,
            rag_sources=rag_sources,
            company_data=company_data_response,
        )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
            system_instruction=build_system_prompt(ctx, available_companies, rag_context),
        )

        chat_session = model.start_chat(history=format_history(req.history, inject_format_rule=True))
        
        # Nếu có dữ liệu công ty thực, append vào cuối message của user
        enriched_message = req.message
        if company_data_response and ctx and ctx.pd_score is not None:
            enriched_message = (
                f"{req.message}\n\n"
                f"[DỮ LIỆU THỰC TỪ HỆ THỐNG — PHẢI HIỂN THỊ Ở CUỐI CÂU TRẢ LỜI]\n"
                f"Công ty: {ctx.ticker} — {ctx.company_name}\n"
                f"PD Score thực tế từ mô hình ML: {ctx.pd_score}%\n"
                f"Xếp hạng rủi ro: {ctx.risk_label}\n"
                f"Yêu cầu: Sau khi trả lời câu hỏi, bắt buộc thêm dòng: "
                f"'Dữ liệu PD tham khảo từ hệ thống: {ctx.pd_score}% — Xếp hạng: {ctx.risk_label}.'"
            )
        elif req.auto_lookup and not company_data_response:
            enriched_message = (
                f"{req.message}\n\n"
                f"[LƯU Ý HỆ THỐNG]\n"
                f"Công ty này không có trong cơ sở dữ liệu 73 doanh nghiệp. "
                f"Sau khi trả lời, bắt buộc thêm dòng: "
                f"'Lưu ý: Công ty này chưa có trong cơ sở dữ liệu hệ thống. Kết quả trên là phân tích định tính.'"
            )
            
        response = chat_session.send_message(enriched_message)

        # ── Cache: lưu kết quả ──
        response_cache.set(req.message, response.text, cache_ticker)

        return ChatResponse(
            reply=response.text,
            tokens=response.usage_metadata.total_token_count
                   if hasattr(response, "usage_metadata") else None,
            rag_sources=rag_sources,
            company_data=company_data_response,
        )

    except genai.types.generation_types.BlockedPromptException:
        raise HTTPException(
            status_code=422,
            detail="Tin nhắn bị chặn bởi bộ lọc an toàn. Vui lòng diễn đạt lại câu hỏi."
        )
    except genai.types.generation_types.StopCandidateException:
        raise HTTPException(
            status_code=422,
            detail="Phản hồi bị dừng giữa chừng. Vui lòng thử lại."
        )
    except Exception as e:
        logger.error(f"[Gemini SDK Error] {type(e).__name__}: {e}", exc_info=True)
        error_msg = str(e)
        if "API_KEY" in error_msg.upper() or "401" in error_msg:
            raise HTTPException(status_code=401, detail="API key Gemini không hợp lệ hoặc chưa được cấu hình.")
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Đã vượt giới hạn API. Vui lòng thử lại sau ít phút.")
        if "timeout" in error_msg.lower():
            raise HTTPException(status_code=504, detail="Kết nối đến Gemini quá chậm. Vui lòng thử lại.")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {error_msg}")


# ── Endpoint: POST /api/chat/stream (Streaming) ───────────────────
@router.post("/chat/stream")
@limiter.limit("20/minute")
async def chat_stream(req: ChatRequest, request: Request):
    # ── Validation message ──
    if not req.message:
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống.")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được chỉ chứa khoảng trắng.")
    if len(req.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Tin nhắn không được vượt quá {MAX_MESSAGE_LENGTH} ký tự. Hiện tại: {len(req.message)} ký tự."
        )

    # ── Giới hạn history ──
    if len(req.history) > MAX_HISTORY_LENGTH:
        req.history = req.history[-MAX_HISTORY_LENGTH:]

    ctx = req.context
    available_companies = None
    company_data_response = None

    if req.auto_lookup:
        base_url = str(request.base_url).rstrip("/")
        company_list = getattr(request.app.state, "company_list", [])
        extracted_ticker, company_data_response = await detect_and_fetch_company(req.message, company_list, base_url)
        
        if company_data_response:
            c = company_data_response
            ctx = CompanyContext(
                company_name=c.get("name"),
                ticker=c.get("ticker"),
                industry=c.get("industry"),
                pd_score=c.get("pd_score"),
                risk_label=c.get("risk_label"),
                z_score=c.get("z_score"),
                shap_factors=c.get("key_factors"),
                data_year=2023,
                pd_scores_4q=c.get("pd_scores_4q")
            )

    # ── RAG: Truy xuất tri thức tham chiếu cho streaming ──
    rag_context = None
    rag_sources = []
    rag_engine = getattr(request.app.state, "rag_engine", None)
    if rag_engine:
        try:
            company_data = _ctx_to_company_data(ctx)
            rag_context, rag_sources = rag_engine.build_context(req.message, company_data)
        except Exception as e:
            print(f"[RAG] Warning: Lỗi khi truy xuất tri thức (stream): {e}")

    async def generate():
        try:
            model = genai.GenerativeModel(
                model_name="gemini-3.5-flash",
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS,
                system_instruction=build_system_prompt(ctx, available_companies, rag_context),
            )
            chat_session = model.start_chat(history=format_history(req.history, inject_format_rule=True))
            
            # Nếu có dữ liệu công ty thực, append vào cuối message của user
            enriched_message = req.message
            if company_data_response and ctx and ctx.pd_score is not None:
                enriched_message = (
                    f"{req.message}\n\n"
                    f"[DỮ LIỆU THỰC TỪ HỆ THỐNG — PHẢI HIỂN THỊ Ở CUỐI CÂU TRẢ LỜI]\n"
                    f"Công ty: {ctx.ticker} — {ctx.company_name}\n"
                    f"PD Score thực tế từ mô hình ML: {ctx.pd_score}%\n"
                    f"Xếp hạng rủi ro: {ctx.risk_label}\n"
                    f"Yêu cầu: Sau khi trả lời câu hỏi, bắt buộc thêm dòng: "
                    f"'Dữ liệu PD tham khảo từ hệ thống: {ctx.pd_score}% — Xếp hạng: {ctx.risk_label}.'"
                )
            elif req.auto_lookup and not company_data_response:
                enriched_message = (
                    f"{req.message}\n\n"
                    f"[LƯU Ý HỆ THỐNG]\n"
                    f"Công ty này không có trong cơ sở dữ liệu 73 doanh nghiệp. "
                    f"Sau khi trả lời, bắt buộc thêm dòng: "
                    f"'Lưu ý: Công ty này chưa có trong cơ sở dữ liệu hệ thống. Kết quả trên là phân tích định tính.'"
                )
                
            response = chat_session.send_message(enriched_message, stream=True)

            for chunk in response:
                if chunk.text:
                    # SSE format: data: {...}\n\n
                    yield f"data: {json.dumps({'chunk': chunk.text}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0)  # Nhường event loop

            # Gửi rag_sources ở cuối stream
            yield f"data: {json.dumps({'done': True, 'rag_sources': rag_sources, 'company_data': company_data_response}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"[Gemini SDK Stream Error] {type(e).__name__}: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Quan trọng cho Nginx
        }
    )


# ── Endpoint: GET /api/chat/history (placeholder) ────────────────
@router.get("/chat/starters")
async def get_starters():
    """Trả về câu hỏi gợi ý cho người dùng mới"""
    return {
        "sme": [
            "PD score của công ty tôi là 28%, điều này có nghĩa là gì?",
            "Làm thế nào để cải thiện điểm tín dụng trước khi vay vốn?",
            "Tại sao tỷ số nợ lại ảnh hưởng nhiều đến hồ sơ tín dụng của tôi?",
            "Altman Z-score 1.8 có đáng lo ngại không?",
        ],
        "banker": [
            "Giải thích cách mô hình Ensemble tính PD score cho doanh nghiệp này",
            "SHAP value âm trên chỉ số ROA có nghĩa là gì với rủi ro tín dụng?",
            "So sánh Z-score của doanh nghiệp này với ngưỡng chuẩn ngành bán lẻ",
            "Những yếu tố nào trong báo cáo tài chính cần xác minh thêm?",
        ]
    }
