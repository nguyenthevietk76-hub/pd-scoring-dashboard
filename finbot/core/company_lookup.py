import json
import os
from rapidfuzz import process, fuzz

class CompanyLookup:
    def __init__(self, demo_data_path: str = None, sector_benchmark_path: str = None):
        # Đường dẫn mặc định tương đối so với vị trí của file này (finbot/core/company_lookup.py)
        if not demo_data_path:
            demo_data_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'demoData.json')
        if not sector_benchmark_path:
            sector_benchmark_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'sector_benchmark.json')

        self.companies = []
        self.sector_benchmarks = {}

        try:
            with open(demo_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.companies = data.get("companies", [])
        except Exception as e:
            print(f"Warning: Could not load demoData.json: {e}")

        try:
            with open(sector_benchmark_path, 'r', encoding='utf-8') as f:
                self.sector_benchmarks = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load sector_benchmark.json: {e}")

        # Chuẩn bị lookup dictionary cho fuzzy search
        # Để fuzzy search chính xác, ta tạo chuỗi kết hợp Ticker và Tên
        self.lookup_choices = {}
        for idx, comp in enumerate(self.companies):
            ticker = comp.get('ticker', '').lower()
            name = comp.get('name', '').lower()
            self.lookup_choices[idx] = f"{ticker} {name}"

    def search(self, query: str):
        """
        Nhận vào chuỗi query, dùng fuzzy matching trả về danh sách tối đa 3 kết quả gần đúng nhất.
        """
        if not query or not self.lookup_choices:
            return []

        query = query.lower().strip()

        # Tìm các kết quả tốt nhất
        results = process.extract(
            query,
            self.lookup_choices,
            scorer=fuzz.WRatio,
            limit=3
        )
        
        # Results from process.extract: (match_string, score, key)
        matches = []
        for match_str, score, key in results:
            if score >= 50:  # Ngưỡng tin cậy cơ bản
                comp = self.companies[key]
                matches.append({
                    "score": score,
                    "company_data": comp
                })
        return matches

    def get_context_string(self, company_data: dict) -> str:
        """
        Tạo chuỗi văn bản súc tích (<300 từ) để nhét vào system prompt cho Gemini.
        """
        name = company_data.get('name', 'Không rõ')
        ticker = company_data.get('ticker', 'Không rõ')
        industry = company_data.get('sector', 'Không rõ')
        pd_score = company_data.get('current_pd', 'N/A')
        risk = company_data.get('risk_level', 'Không rõ')
        factors = company_data.get('top_factors', [])

        factor_lines = []
        for f in factors:
            factor_lines.append(f"- {f.get('label_vi', f.get('feature', ''))}: {f.get('display_val', '')} (Đóng góp: {f.get('contribution', 0):.4f})")
        
        factors_str = "\n".join(factor_lines) if factor_lines else "- Chưa có dữ liệu SHAP"

        context = (
            f"Công ty: {name} (Mã: {ticker})\n"
            f"Ngành: {industry}\n"
            f"PD Score (Xác suất vỡ nợ): {pd_score}%\n"
            f"Mức độ rủi ro: {risk}\n"
            f"Các yếu tố chính ảnh hưởng đến PD Score:\n{factors_str}"
        )
        return context

    def get_industry_benchmark(self, industry: str):
        """
        Trả về ngưỡng trung bình ngành
        """
        return self.sector_benchmarks.get(industry, None)
