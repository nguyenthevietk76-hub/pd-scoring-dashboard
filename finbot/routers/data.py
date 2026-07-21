from fastapi import APIRouter, Request, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from core.limiter import limiter

router = APIRouter()

class CompanyBasicInfo(BaseModel):
    company_name: str
    industry: str
    ticker: str

class CompanyListResponse(BaseModel):
    companies: List[CompanyBasicInfo]
    total: int

class ShapFactor(BaseModel):
    factor: str
    value: float
    direction: str

class CompanyDetail(BaseModel):
    company_name: str
    ticker: str
    industry: str
    pd_score: float
    risk_label: str
    z_score: Optional[float] = None
    revenue: Optional[float] = None
    total_debt: Optional[float] = None
    net_profit: Optional[float] = None
    shap_factors: List[ShapFactor] = []

class CompanyDataResponse(BaseModel):
    found: bool
    company: Optional[CompanyDetail] = None
    suggestions: list = []

@router.get("/companies", response_model=CompanyListResponse)
async def get_companies(request: Request):
    lookup = request.app.state.company_lookup
    companies = []
    for comp in lookup.companies:
        companies.append(CompanyBasicInfo(
            company_name=comp.get("name", ""),
            industry=comp.get("sector", ""),
            ticker=comp.get("ticker", "")
        ))
    return CompanyListResponse(companies=companies, total=len(companies))

import os
import csv

import json

def get_demo_data(ticker: str):
    demo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'demoData.json')
    try:
        with open(demo_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            companies = data.get("companies", [])
            for comp in companies:
                if comp.get('ticker') == ticker:
                    return comp
            return {}
    except Exception as e:
        print(f"Error reading demoData.json: {e}")
        return {}

from rapidfuzz import process, fuzz

@router.get("/company/search")
async def search_company(q: str, request: Request):
    companies = getattr(request.app.state, "company_list", [])
    if not companies:
        return {"found": False, "suggestions": []}
        
    choices = {}
    for idx, comp in enumerate(companies):
        choices[idx] = f"{comp.get('ticker', '')} {comp.get('name', '')}".lower()
        
    results = process.extract(
        q.lower(),
        choices,
        scorer=fuzz.WRatio,
        limit=3
    )
    
    matches = []
    for match_str, score, key in results:
        if score >= 60:
            matches.append((score, companies[key]))
            
    if matches:
        # Lấy kết quả có điểm cao nhất
        best_match = matches[0][1]
        return {
            "found": True,
            "company": {
                "ticker": best_match.get("ticker"),
                "name": best_match.get("name"),
                "industry": best_match.get("sector"),
                "pd_score": best_match.get("current_pd"),
                "risk_label": best_match.get("risk_level"),
                "z_score": None,
                "key_factors": best_match.get("top_factors", []),
                "pd_scores_4q": best_match.get("pd_scores_4q", []) # Thêm trường này cho Step 3
            },
            "source": "system_data"
        }
    else:
        # Không tìm thấy đủ điểm -> trả về suggestions
        suggestions = []
        for match_str, score, key in results:
            comp = companies[key]
            suggestions.append(f"{comp.get('name')} ({comp.get('ticker')})")
        return {"found": False, "suggestions": suggestions}

@router.get("/company/{ticker_or_name}", response_model=CompanyDataResponse)
@limiter.limit("60/minute")
async def get_company(ticker_or_name: str, request: Request):
    lookup = request.app.state.company_lookup
    matches = lookup.search(ticker_or_name)
    
    if not matches:
        return CompanyDataResponse(found=False, suggestions=[])
    
    best_match = matches[0]
    
    if best_match["score"] >= 85:
        comp = best_match["company_data"]
        ticker = comp.get("ticker", "")
        
        # Read from demoData.json
        demo_data = get_demo_data(ticker)
        
        # Convert values safely
        def safe_float(val):
            try:
                if val is None or str(val).strip() == '': return None
                return float(str(val).replace('.', '').replace(',', '.'))
            except:
                return None
                
        z_score = safe_float(demo_data.get('z_score', demo_data.get('altman_zscore')))
        revenue = safe_float(demo_data.get('revenue'))
        total_debt = safe_float(demo_data.get('total_debt', demo_data.get('total_liabilities')))
        net_profit = safe_float(demo_data.get('net_income'))
        
        shap_factors = []
        for f in comp.get("top_factors", []):
            contrib = f.get("contribution", 0)
            direction = "tăng PD" if contrib > 0 else "giảm PD"
            shap_factors.append(ShapFactor(
                factor=f.get("label_vi", f.get("feature", "")),
                value=contrib,
                direction=direction
            ))
            
        company_info = CompanyDetail(
            company_name=comp.get("name", ""),
            ticker=ticker,
            industry=comp.get("sector", ""),
            pd_score=comp.get("current_pd", 0),
            risk_label=comp.get("risk_level", "Không rõ"),
            z_score=z_score,
            revenue=revenue,
            total_debt=total_debt,
            net_profit=net_profit,
            shap_factors=shap_factors
        )
        return CompanyDataResponse(found=True, company=company_info)
    else:
        suggestions = []
        for m in matches:
            suggestions.append({
                "company_name": m["company_data"].get("name", ""),
                "ticker": m["company_data"].get("ticker", "")
            })
        return CompanyDataResponse(found=False, suggestions=suggestions)

@router.get("/industry/{industry_name}")
async def get_industry(industry_name: str, request: Request):
    lookup = request.app.state.company_lookup
    benchmark = lookup.get_industry_benchmark(industry_name)
    if not benchmark:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu ngành này")
    return benchmark

from rapidfuzz import process, fuzz


