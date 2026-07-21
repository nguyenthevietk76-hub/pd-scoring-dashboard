# Deprecated — file này không còn được dùng, backend chính là main.py.
import os
import sys
import json
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

# Add current directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
# Also add parent directory to path
PARENT_DIR = os.path.dirname(BASE_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from predict import predict_pd

# ------------------------------------------------------------------------------
# Khởi tạo app
# ------------------------------------------------------------------------------
app = FastAPI(
    title="PD Scoring API",
    description="API dự báo Xác suất Vỡ nợ (Probability of Distress) cho doanh nghiệp, "
                 "phục vụ AI-Quantum Challenge 2026 - Nhóm 3 (AI cho Quản trị Rủi ro và Tuân thủ).",
    version="1.0.0",
)

# Cho phép React dev server (Vite, port 5173) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Demo/prototype: cho phép tất cả origin. Production cần giới hạn lại.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(PARENT_DIR, "data", "raw_bctc_quarterly.csv")

# Load dữ liệu doanh nghiệp 1 lần khi khởi động (dùng cho /companies, /predict/{ticker})
# Thử đọc với sep=';' trước, sau đó fallback sang mặc định
try:
    _raw_df = pd.read_csv(DATA_PATH, sep=';')
except Exception:
    _raw_df = pd.read_csv(DATA_PATH)

# ------------------------------------------------------------------------------
# Schemas (Pydantic models)
# ------------------------------------------------------------------------------
class FinancialInput(BaseModel):
    revenue: float = Field(..., description="Doanh thu thuần")
    net_income: float = Field(..., description="Lợi nhuận sau thuế")
    ebit: float = Field(..., description="Lợi nhuận trước thuế và lãi vay")
    depreciation_amortization: float = Field(..., description="Khấu hao")
    current_assets: float = Field(..., description="Tài sản ngắn hạn")
    current_liabilities: float = Field(..., description="Nợ ngắn hạn")
    total_assets: float = Field(..., description="Tổng tài sản")
    total_liabilities: float = Field(..., description="Tổng nợ phải trả")
    total_equity: float = Field(..., description="Vốn chủ sở hữu")
    long_term_debt: float = Field(..., description="Nợ dài hạn")
    operating_cash_flow: float = Field(..., description="Dòng tiền HĐKD")
    cash_and_equiv: float = Field(..., description="Tiền và tương đương tiền")
    inventory: float = Field(..., description="Hàng tồn kho")
    retained_earnings: float = Field(..., description="Lợi nhuận chưa phân phối")
    model_name: Optional[str] = Field("logreg", description="'logreg' hoặc 'rf'")


class SimplifiedInput(BaseModel):
    company_name: str = Field(..., description="Tên doanh nghiệp")
    tax_code: Optional[str] = Field(None, description="Mã số thuế (tuỳ chọn)")
    total_assets: float = Field(..., description="Tổng tài sản (tỷ VNĐ)")
    current_liabilities: float = Field(..., description="Nợ ngắn hạn (tỷ VNĐ)")
    long_term_debt: float = Field(..., description="Nợ dài hạn (tỷ VNĐ)")
    revenue: float = Field(..., description="Doanh thu (tỷ VNĐ)")
    operating_cash_flow: float = Field(..., description="Dòng tiền HĐKD (tỷ VNĐ)")
    model_name: Optional[str] = Field("logreg", description="'logreg' hoặc 'rf'")


class TopFactor(BaseModel):
    feature: str
    raw_value: float
    label_vi: str
    display_val: str
    contribution: float


class PredictResponse(BaseModel):
    company_name: Optional[str] = None
    pd_score: float
    pd_score_pct: float
    risk_level: str
    risk_level_vi: str
    top_factors: List[TopFactor]
    note: Optional[str] = None


# ------------------------------------------------------------------------------
# Label tiếng Việt cho các feature (dùng để hiển thị top_factors)
# ------------------------------------------------------------------------------
FEATURE_LABELS_VI = {
    "revenue": "Doanh thu thuần",
    "net_income": "Lợi nhuận sau thuế",
    "ebit": "Lợi nhuận trước thuế & lãi vay (EBIT)",
    "depreciation_amortization": "Khấu hao",
    "current_assets": "Tài sản ngắn hạn",
    "current_liabilities": "Nợ ngắn hạn",
    "total_assets": "Tổng tài sản",
    "total_liabilities": "Tổng nợ phải trả",
    "total_equity": "Vốn chủ sở hữu",
    "long_term_debt": "Nợ dài hạn",
    "operating_cash_flow": "Dòng tiền HĐKD",
    "cash_and_equiv": "Tiền và tương đương tiền",
    "inventory": "Hàng tồn kho",
    "retained_earnings": "Lợi nhuận chưa phân phối",
    "current_ratio": "Tỷ số thanh toán hiện hành",
    "quick_ratio": "Tỷ số thanh toán nhanh",
    "cash_ratio": "Tỷ số thanh toán bằng tiền",
    "debt_to_equity": "Nợ trên Vốn chủ (D/E)",
    "debt_to_assets": "Nợ trên Tổng tài sản",
    "long_term_debt_to_equity": "Nợ dài hạn / Vốn chủ",
    "cfo_to_debt": "Dòng tiền HĐKD / Tổng nợ",
    "ebit_to_long_term_debt": "EBIT / Nợ dài hạn",
    "asset_turnover": "Hiệu suất sử dụng tài sản",
    "inventory_turnover": "Vòng quay hàng tồn kho",
    "ebitda": "EBITDA",
    "ebitda_margin": "Biên EBITDA",
    "net_profit_margin": "Biên lợi nhuận thuần",
    "roa": "Tỷ suất sinh lời trên tài sản (ROA)",
    "retained_earnings_to_assets": "Lợi nhuận giữ lại / Tổng tài sản",
    "log_total_assets": "Quy mô tài sản (log)",
    "is_retail": "Đặc thù ngành Bán lẻ/Tiêu dùng",
    "current_ratio_roll4q_mean": "Tỷ số thanh toán hiện hành (TB 4 quý)",
    "current_ratio_qoq_change": "Thay đổi Tỷ số thanh toán hiện hành (QoQ)",
    "debt_to_equity_roll4q_mean": "Nợ/Vốn chủ (TB 4 quý)",
    "debt_to_equity_qoq_change": "Thay đổi Nợ/Vốn chủ (QoQ)",
    "cfo_to_debt_roll4q_mean": "Dòng tiền HĐKD/Nợ (TB 4 quý)",
    "cfo_to_debt_qoq_change": "Thay đổi Dòng tiền HĐKD/Nợ (QoQ)",
    "ebitda_margin_roll4q_mean": "Biên EBITDA (TB 4 quý)",
    "ebitda_margin_qoq_change": "Thay đổi Biên EBITDA (QoQ)",
    "net_profit_margin_roll4q_mean": "Biên lợi nhuận thuần (TB 4 quý)",
    "net_profit_margin_qoq_change": "Thay đổi Biên lợi nhuận thuần (QoQ)",
    "roa_roll4q_mean": "ROA (TB 4 quý)",
    "roa_qoq_change": "Thay đổi ROA (QoQ)",
    "asset_turnover_roll4q_mean": "Hiệu suất sử dụng tài sản (TB 4 quý)",
    "asset_turnover_qoq_change": "Thay đổi Hiệu suất sử dụng tài sản (QoQ)",
}

RISK_LEVEL_VI = {"Low": "Thấp", "Medium": "Trung bình", "High": "Cao"}

RATIO_LIKE_PREFIXES = (
    "current_ratio", "quick_ratio", "cash_ratio", "debt_to", "long_term_debt_to_equity",
    "cfo_to_debt", "ebit_to_long_term_debt", "asset_turnover", "inventory_turnover",
    "ebitda_margin", "net_profit_margin", "roa", "retained_earnings_to_assets",
)


def format_display_val(feature: str, raw_val: float) -> str:
    if feature == "is_retail":
        return "Có" if raw_val >= 0.5 else "Không"
    if feature == "log_total_assets":
        try:
            import math
            return f"~{math.exp(raw_val) / 1e9:,.0f} tỷ VNĐ"
        except (ValueError, OverflowError):
            return f"{raw_val:.2f}"
    if any(feature.startswith(p) for p in RATIO_LIKE_PREFIXES):
        return f"{raw_val * 100:.1f}%"
    if abs(raw_val) >= 1e9:
        return f"{raw_val / 1e9:,.0f} tỷ VNĐ"
    return f"{raw_val:,.2f}"


def build_top_factors(raw_factors: list) -> List[TopFactor]:
    result = []
    for f in raw_factors:
        feature = f["feature"]
        raw_val = f["raw_value"]
        contribution = f.get("risk_contribution", f.get("global_importance", 0.0))
        result.append(TopFactor(
            feature=feature,
            raw_value=raw_val,
            label_vi=FEATURE_LABELS_VI.get(feature, feature),
            display_val=format_display_val(feature, raw_val),
            contribution=contribution,
        ))
    return result


def expand_simplified_input(data: SimplifiedInput) -> dict:
    def clean_val(v: float) -> float:
        # Nếu giá trị nhập vào lớn hơn hoặc bằng 1e7 (10 triệu), rất có thể người dùng đã nhập
        # đơn vị VNĐ thay vì tỷ VNĐ (vì 10 triệu tỷ VNĐ là không tưởng với DN Việt Nam).
        if abs(v) >= 1e7:
            return v / 1e9
        return v

    B = 1e9
    total_assets = clean_val(data.total_assets) * B
    current_liabilities = clean_val(data.current_liabilities) * B
    long_term_debt = clean_val(data.long_term_debt) * B
    revenue = clean_val(data.revenue) * B
    operating_cash_flow = clean_val(data.operating_cash_flow) * B

    total_liabilities = current_liabilities + long_term_debt
    total_equity = max(total_assets - total_liabilities, total_assets * 0.1)
    current_assets = total_assets * 0.45
    inventory = current_assets * 0.30
    cash_and_equiv = current_assets * 0.20
    net_income = revenue * 0.07
    ebit = net_income * 1.25
    depreciation_amortization = total_assets * 0.02
    retained_earnings = total_equity * 0.30

    return {
        "revenue": revenue,
        "net_income": net_income,
        "ebit": ebit,
        "depreciation_amortization": depreciation_amortization,
        "current_assets": current_assets,
        "current_liabilities": current_liabilities,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "total_equity": total_equity,
        "long_term_debt": long_term_debt,
        "operating_cash_flow": operating_cash_flow,
        "cash_and_equiv": cash_and_equiv,
        "inventory": inventory,
        "retained_earnings": retained_earnings,
    }


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "models_loaded": True}


@app.get("/companies")
@app.get("/api/companies")
def list_companies():
    df = _raw_df.copy()
    
    latest = (
        df.sort_values(["ticker", "year", "quarter"])
        .groupby("ticker")
        .tail(1)[["ticker", "year", "quarter"]]
    )
    
    demo_json_path = os.path.join(PARENT_DIR, 'frontend', 'src', 'demoData.json')
    companies_meta = {}
    if os.path.exists(demo_json_path):
        try:
            with open(demo_json_path, 'r', encoding='utf-8') as f:
                d = json.load(f)
                for c in d.get("companies", []):
                    companies_meta[c["ticker"]] = {
                        "name": c["name"],
                        "sector": c["sector"],
                        "current_pd": c["current_pd"],
                        "risk_level": c["risk_level"],
                        "top_factors": c["top_factors"],
                        "pd_scores_4q": c["pd_scores_4q"]
                    }
        except Exception as e:
            print("Error parsing demoData.json:", e)

    out_list = []
    for r in latest.to_dict(orient="records"):
        ticker = r["ticker"]
        meta = companies_meta.get(ticker, {})
        out_list.append({
            "ticker": ticker,
            "year": r["year"],
            "quarter": r["quarter"],
            "name": meta.get("name", f"Công ty Cổ phần {ticker}"),
            "sector": meta.get("sector", "Khác"),
            "current_pd": meta.get("current_pd", 0.0),
            "risk_level": meta.get("risk_level", "Thấp"),
            "top_factors": meta.get("top_factors", []),
            "pd_scores_4q": meta.get("pd_scores_4q", [])
        })

    return {
        "count": len(out_list),
        "companies": out_list,
    }


@app.post("/predict", response_model=PredictResponse)
@app.post("/api/predict")
def predict_full(input_data: FinancialInput):
    if input_data.model_name not in ("logreg", "rf"):
        raise HTTPException(status_code=400, detail="model_name phải là 'logreg' hoặc 'rf'")

    raw_row = input_data.dict(exclude={"model_name"})

    print("\n" + "="*80)
    print("DEBUG: RAW ROW FOR FULL PREDICT REQUEST")
    print(json.dumps(raw_row, indent=2, ensure_ascii=False))
    print("="*80 + "\n")

    try:
        result = predict_pd(raw_row, model_name=input_data.model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi predict: {e}")

    return PredictResponse(
        pd_score=result["pd_score"],
        pd_score_pct=round(result["pd_score"] * 100, 2),
        risk_level=result["risk_level"],
        risk_level_vi=RISK_LEVEL_VI.get(result["risk_level"], result["risk_level"]),
        top_factors=build_top_factors(result["top_risk_factors"]),
    )


@app.post("/predict/simplified", response_model=PredictResponse)
@app.post("/api/predict/simplified")
def predict_simplified(input_data: SimplifiedInput):
    if input_data.model_name not in ("logreg", "rf"):
        raise HTTPException(status_code=400, detail="model_name phải là 'logreg' hoặc 'rf'")

    raw_row = expand_simplified_input(input_data)

    print("\n" + "="*80)
    print("DEBUG: RAW ROW FOR SIMPLIFIED PREDICT REQUEST")
    print(f"Company Name: {input_data.company_name} | Tax Code: {input_data.tax_code}")
    print(json.dumps(raw_row, indent=2, ensure_ascii=False))
    print("="*80 + "\n")

    try:
        result = predict_pd(raw_row, model_name=input_data.model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi predict: {e}")

    return PredictResponse(
        company_name=input_data.company_name,
        pd_score=result["pd_score"],
        pd_score_pct=round(result["pd_score"] * 100, 2),
        risk_level=result["risk_level"],
        risk_level_vi=RISK_LEVEL_VI.get(result["risk_level"], result["risk_level"]),
        top_factors=build_top_factors(result["top_risk_factors"]),
        note=(
            "Kết quả ước tính dựa trên 5 chỉ tiêu nhập tay; các chỉ tiêu còn lại "
            "(LN sau thuế, EBIT, hàng tồn kho, vốn chủ sở hữu...) được suy ra theo "
            "tỷ lệ trung bình ngành. Để có kết quả chính xác hơn, sử dụng /predict "
            "với đầy đủ 14 chỉ tiêu BCTC."
        ),
    )


@app.get("/predict/ticker/{ticker}", response_model=PredictResponse)
@app.get("/api/predict/ticker/{ticker}")
def predict_by_ticker(ticker: str, model_name: str = "logreg"):
    if model_name not in ("logreg", "rf"):
        raise HTTPException(status_code=400, detail="model_name phải là 'logreg' hoặc 'rf'")

    ticker = ticker.upper()
    df = _raw_df[_raw_df["ticker"] == ticker]
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy ticker '{ticker}'")

    last_row = df.sort_values(["year", "quarter"]).iloc[-1].to_dict()
    raw_row = {
        k: v for k, v in last_row.items()
        if k not in ("ticker", "year", "quarter", "label_distress")
    }

    try:
        result = predict_pd(raw_row, model_name=model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi predict: {e}")

    return PredictResponse(
        company_name=ticker,
        pd_score=result["pd_score"],
        pd_score_pct=round(result["pd_score"] * 100, 2),
        risk_level=result["risk_level"],
        risk_level_vi=RISK_LEVEL_VI.get(result["risk_level"], result["risk_level"]),
        top_factors=build_top_factors(result["top_risk_factors"]),
        note=f"Dữ liệu quý {last_row['year']}Q{last_row['quarter']} từ dataset thật.",
    )


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


def get_sector_benchmarks():
    try:
        benchmark_path = os.path.join(BASE_DIR, 'sector_benchmark.json')
        if os.path.exists(benchmark_path):
            with open(benchmark_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading benchmarks: {e}")
    return {}


def call_gemini_api(system_instruction: str, user_message: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    body = {
        "contents": [
            {"parts": [{"text": user_message}]}
        ],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }
    
    import urllib.request
    import time
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(body).encode("utf-8"), 
        headers=headers, 
        method="POST"
    )
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                res = json.loads(response.read().decode("utf-8"))
                return res["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini API call failed on attempt {attempt + 1}:", e)
            if hasattr(e, 'read'):
                print(e.read().decode('utf-8'))
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail=f"Gemini API call failed after {max_retries} attempts: {str(e)}")
            time.sleep(2)


@app.post("/chat")
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        benchmarks = get_sector_benchmarks()
        benchmarks_str = json.dumps(benchmarks, indent=2, ensure_ascii=False)
        
        ctx = req.context
        if not ctx:
            context_str = "Hiện tại người dùng CHƯA chọn doanh nghiệp nào để phân tích ở Dashboard. Hãy chào mừng người dùng và hướng dẫn họ chọn hoặc nhập liệu phân tích doanh nghiệp trước ở Dashboard để bạn có dữ liệu trả lời chi tiết."
        else:
            raw_name = ctx.get('company_name') or ''
            if not raw_name or raw_name.isdigit() or raw_name in ('Công ty Chưa rõ tên', 'Doanh nghiệp Chưa rõ tên'):
                company_name = "doanh nghiệp đang được phân tích"
            else:
                company_name = raw_name

            context_str = f"- Tên doanh nghiệp: {company_name}\n"
            context_str += f"- Ngành nghề: {ctx.get('sector') or 'Chưa rõ'}\n"
            context_str += f"- Điểm số PD (Xác suất vỡ nợ): {ctx.get('pd_score_pct')}%\n"
            context_str += f"- Xếp hạng Rủi ro: {ctx.get('risk_level_vi')}\n"
            context_str += f"- Điểm PD 4 quý gần nhất: {ctx.get('pd_scores_4q')}\n"
            context_str += f"- Quy mô tổng tài sản (nếu có từ form nhập): {ctx.get('total_assets_b') or 'Chưa nhập'} tỷ VNĐ\n"
            context_str += "- Yếu tố ảnh hưởng chính (top_factors):\n"
            for idx, factor in enumerate(ctx.get('top_factors', [])):
                context_str += f"  {idx+1}. {factor.get('label_vi', factor.get('feature'))}: Giá trị thực tế {factor.get('display_val', factor.get('raw_val'))}, Đóng góp rủi ro: {factor.get('contribution')}\n"
        
        system_instruction = f"""Bạn là AI Credit Analyst - chuyên gia phân tích rủi ro tín dụng doanh nghiệp tại Việt Nam. Nhiệm vụ của bạn là hỗ trợ người dùng giải thích và phân tích kết quả dự báo Xác suất Vỡ nợ (Probability of Distress - PD) của các doanh nghiệp.

Dưới đây là DỮ LIỆU NGÀNH (Sector Benchmarks) để bạn so sánh khi người dùng hỏi "So sánh với ngành?":
{benchmarks_str}

Khi trả lời câu hỏi, bạn phải tuân thủ nghiêm ngặt các quy tắc sau:
1. LUÔN LUÔN giao tiếp bằng tiếng Việt chuẩn mực, giữ vững văn phong chuyên nghiệp, trang trọng, khách quan và thận trọng của một chuyên viên thẩm định tín dụng kiêm quản trị rủi ro cấp cao.
   - Bắt đầu câu trả lời một cách lịch sự, trang trọng (ví dụ: "Kính gửi Bộ phận Thẩm định và Quản lý Rủi ro Tín dụng, ...").
   - Trình bày thông tin theo cấu trúc báo cáo phân tích chuyên nghiệp: chia thành các đề mục rõ ràng, sử dụng gạch đầu dòng mạch lạc và in đậm các chỉ số tài chính trọng yếu cùng các mức đóng góp điểm rủi ro tương ứng.
   - Sử dụng các thuật ngữ tài chính chuẩn xác: "Hệ số đòn bẩy tài chính", "Khả năng tự chủ tài chính", "Giả định hoạt động liên tục (Going concern)", "Áp lực nghĩa vụ nợ (gốc và lãi)", "Dòng tiền từ hoạt động kinh doanh", "Rủi ro chất lượng dữ liệu (Data Quality Risk)".

2. Tuyệt đối KHÔNG hiển thị mã số thuế hoặc ký số (như "4234234") thay cho tên doanh nghiệp trong nội dung phân tích. Thay vào đó, hãy gọi chung là "doanh nghiệp", "đối tượng thẩm định" hoặc "khách hàng doanh nghiệp".

3. Phát hiện lỗi số liệu nhập liệu cực đoan hoặc bất thường (Data Input Anomaly):
   - Nếu phát hiện các giá trị tài chính thực tế trong Context bị méo mó, cực đoan (như tỷ lệ "999.936,0%" cho Nợ trên Tổng tài sản, hoặc giá trị nợ khổng lồ "3.243.032.432 tỷ VNĐ" do người dùng nhập nhầm số liệu đơn vị VNĐ thô thay vì Tỷ VNĐ):
     * Bạn phải lịch sự đưa ra nhận định mang tính cảnh báo: "Có dấu hiệu bất thường về số liệu đầu vào (sai lệch đơn vị tính giữa VNĐ thô và Tỷ VNĐ)".
     * Giải thích ngắn gọn tại sao chỉ số này lại bất thường dưới góc độ nghiệp vụ (ví dụ: Nợ vượt tài sản hàng nghìn lần hoặc nợ dài hạn lên tới hàng tỷ tỷ VNĐ là không khả thi trên thực tế).
     * Khuyến nghị người dùng rà soát lại dữ liệu đầu vào trên Dashboard (đặc biệt là quy đổi đơn vị sang Tỷ VNĐ) để có kết quả chính xác hơn.
     * Tuyệt đối không đưa ra kết luận phi thực tế về tình hình phá sản của doanh nghiệp chỉ dựa vào dữ liệu nhập lỗi này.

4. Cách trả lời các câu hỏi cụ thể:
   a. "Tại sao điểm cao?" (hoặc câu hỏi tương tự giải thích nguyên nhân rủi ro):
      - Bạn phải chỉ ra các yếu tố ảnh hưởng chính (top_factors) của doanh nghiệp đang xem được cung cấp trong Context trên.
      - Phân tích chi tiết ý nghĩa của các chỉ số tài chính đó đối với cấu trúc tài chính và rủi ro tín dụng của doanh nghiệp.
      - KHÔNG ĐƯỢC tự bịa đặt hoặc sử dụng các yếu tố của doanh nghiệp khác.
   b. "Nên cho vay bao nhiêu?" (hoặc câu hỏi về quyết định hạn mức/phê duyệt cho vay):
      - Bạn BẮT BUỘC phải đưa ra cảnh báo từ chối trách nhiệm (Disclaimer) rõ ràng: Quyết định phê duyệt tín dụng phụ thuộc vào chính sách tín dụng nội bộ của ngân hàng, tài sản bảo đảm, khả năng trả nợ thực tế của khách hàng, và khẩu vị rủi ro tại thời điểm thẩm định.
      - TUYỆT ĐỐI không đề xuất một hạn mức cho vay hoặc số tiền cụ thể. Chỉ thảo luận về các khía cạnh định tính (ví dụ: xem xét thắt chặt điều kiện tín dụng, yêu cầu thêm tài sản bảo đảm đối với trường hợp rủi ro cao).
   c. "Xu hướng rủi ro?" (hoặc câu hỏi về xu hướng điểm số):
      - Dựa vào danh sách 4 số `pd_scores_4q` được cung cấp trong Context.
      - Phân tích xu hướng qua 4 quý gần nhất (tăng, giảm hay ổn định) để đánh giá sự cải thiện hay suy giảm của chất lượng tín dụng. Báo rõ nếu thiếu dữ liệu lịch sử.
   d. "So sánh với ngành?" (hoặc câu hỏi so sánh doanh nghiệp với trung bình ngành):
      - Kiểm tra ngành của doanh nghiệp (`sector`) có trong DỮ LIỆU NGÀNH hay không.
      - So sánh cụ thể điểm số của doanh nghiệp (`pd_score_pct`) với trung bình ngành để đưa ra nhận định tương quan. Báo rõ nếu chưa có dữ liệu điểm chuẩn (benchmark) cho ngành này.
   e. "Biện pháp giảm thiểu rủi ro?" (hoặc các câu hỏi về giảm thiểu/quản trị rủi ro tín dụng):
      - Đề xuất các biện pháp giảm thiểu rủi ro tín dụng chuẩn mực ngân hàng: Yêu cầu thêm tài sản bảo đảm (TSBĐ) thanh khoản cao, siết chặt các điều khoản ràng buộc tài chính (covenants - ví dụ: duy trì tỷ lệ DSCR, tỷ lệ thanh toán), rút ngắn kỳ hạn vay, kiểm soát chặt chẽ dòng tiền qua tài khoản chuyên dùng tại ngân hàng cho vay, hoặc yêu cầu bảo lãnh từ bên thứ ba/công ty mẹ.
   f. "Đánh giá khả năng thanh toán?" (hoặc câu hỏi về dòng tiền & khả năng thanh khoản):
      - Phân tích các chỉ số thanh khoản chính được cung cấp trong Context (hoặc được tính toán từ các tham số tài sản ngắn hạn / nợ ngắn hạn như Hệ số thanh toán hiện hành, Hệ số thanh toán nhanh) kết hợp với dòng tiền từ hoạt động kinh doanh (CFO). Chỉ ra dòng tiền có đủ để bù đắp nghĩa vụ nợ ngắn hạn hay không.
   g. "Kiểm tra chất lượng dữ liệu?" (hoặc câu hỏi tra soát lỗi nhập liệu):
      - Tiến hành rà soát các tham số trong Context để phát hiện các tỷ lệ vô lý (ví dụ: Nợ vượt tài sản hàng trăm lần, nợ dài hạn lớn bất thường so với tổng tài sản, dòng tiền hoặc doanh thu trống). Giải thích lỗi nhập liệu và hướng dẫn người dùng sửa đổi trên giao diện nhập liệu.
   h. "Phân tích cơ cấu nguồn vốn?" (hoặc câu hỏi về cấu trúc vốn và đòn bẩy tài chính):
      - Đánh giá cơ cấu tài trợ nguồn vốn của doanh nghiệp qua chỉ số đòn bẩy nợ phải trả/vốn chủ sở hữu (D/E) hoặc nợ/tổng tài sản. Phân tích mức độ phụ thuộc vào đòn bẩy tài chính từ vốn vay bên ngoài so với sự cam kết từ vốn góp chủ sở hữu.
"""
        
        response_text = call_gemini_api(system_instruction, req.message)
        return {"response": response_text}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
