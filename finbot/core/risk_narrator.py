"""
risk_narrator.py – Tạo đoạn tường thuật rủi ro tự động bằng tiếng Việt
cho PD Scoring Dashboard.

Sử dụng:
    from finbot.core.risk_narrator import RiskNarrator
    narrator = RiskNarrator()
    text = narrator.generate_narrative(company_data, benchmark)
"""

# Bảng ánh xạ tên feature → gợi ý hành động cải thiện (tiếng Việt)
ACTION_MAP: dict[str, str] = {
    # Nhóm đòn bẩy / nợ
    "debt_to_equity": "tái cấu trúc nguồn vốn, giảm tỷ lệ nợ trên vốn chủ sở hữu",
    "debt_to_assets": "giảm dần dư nợ vay và tăng cường vốn tự có",
    "long_term_debt_to_equity": "đàm phán tái cơ cấu nợ dài hạn hoặc chuyển đổi nợ thành vốn",
    # Nhóm khả năng sinh lời
    "roa": "nâng cao hiệu quả sử dụng tài sản và cải thiện biên lợi nhuận",
    "net_profit_margin": "tối ưu hoá chi phí vận hành để cải thiện biên lợi nhuận ròng",
    "ebitda_margin": "tăng doanh thu hoặc cắt giảm chi phí hoạt động để cải thiện EBITDA",
    # Nhóm thanh khoản
    "current_ratio": "cải thiện quản lý vốn lưu động và tăng tài sản ngắn hạn",
    "quick_ratio": "tăng cường dự trữ tiền mặt và thu hồi công nợ nhanh hơn",
    "cash_ratio": "nâng cao khả năng thanh toán bằng tiền mặt thông qua quản lý dòng tiền",
    # Nhóm khả năng trả nợ
    "cfo_to_debt": "cải thiện dòng tiền từ hoạt động kinh doanh để tăng khả năng trả nợ",
    "ebit_to_long_term_debt": "nâng cao lợi nhuận trước lãi vay và thuế để đảm bảo khả năng phục vụ nợ",
    # Chỉ số lợi nhuận giữ lại
    "retained_earnings_to_assets": "tăng tỷ lệ lợi nhuận giữ lại thay vì chia cổ tức để củng cố nền tảng tài chính",
    # Hiệu suất hoạt động
    "asset_turnover": "đẩy mạnh doanh thu trên mỗi đồng tài sản đầu tư",
}

# Gợi ý mặc định khi feature không nằm trong ACTION_MAP
_DEFAULT_ACTION = "thực hiện rà soát toàn diện sức khoẻ tài chính và xây dựng kế hoạch cải thiện cụ thể"


class RiskNarrator:
    """Tạo đoạn văn tường thuật rủi ro bằng tiếng Việt từ dữ liệu PD."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate_narrative(
        self,
        company_data: dict,
        benchmark: dict = None,
    ) -> str:
        """
        Sinh đoạn tường thuật 3-5 câu bằng tiếng Việt.

        Parameters
        ----------
        company_data : dict
            Dữ liệu công ty theo cấu trúc demoData.json (name, ticker,
            sector, current_pd, risk_level, top_factors, …).
        benchmark : dict | None
            Ngưỡng trung bình ngành theo sector_benchmark.json
            (average_pd, min_pd, max_pd, company_count).

        Returns
        -------
        str  – Đoạn văn thuần tuý tiếng Việt, không chứa Markdown.
        """
        # --- Kiểm tra dữ liệu đầu vào ---
        if not company_data or not isinstance(company_data, dict):
            return (
                "Không có đủ dữ liệu doanh nghiệp để tạo phân tích. "
                "Vui lòng cung cấp thông tin công ty cần đánh giá."
            )

        name = company_data.get("name", "Doanh nghiệp")
        sector = company_data.get("sector", "không xác định")
        current_pd = company_data.get("current_pd")
        risk_level = company_data.get("risk_level", "không xác định")
        top_factors: list[dict] = company_data.get("top_factors", [])

        if current_pd is None:
            return (
                f"Dữ liệu PD của {name} hiện chưa đầy đủ, "
                "không thể đưa ra đánh giá chi tiết."
            )

        sentences: list[str] = []

        # --- Câu 1: PD và phân loại rủi ro ---
        sentences.append(
            f"Công ty {name} hiện có xác suất vỡ nợ (PD) ở mức "
            f"{current_pd}%, được xếp vào nhóm rủi ro {risk_level}."
        )

        # --- Câu 2-3: Nguyên nhân chính (top 2 factors) ---
        if not top_factors:
            sentences.append(
                "Hiện chưa có đủ dữ liệu phân tích yếu tố đóng góp "
                "(SHAP) nên đánh giá nguyên nhân còn hạn chế."
            )
        else:
            first = top_factors[0]
            sentences.append(
                f"Nguyên nhân chính đến từ chỉ số "
                f"{first.get('label_vi', first.get('feature', 'không rõ'))} "
                f"đang ở mức {first.get('display_val', 'N/A')}, "
                f"đóng góp {first.get('contribution', 0):.4f} "
                f"vào rủi ro tổng thể."
            )
            if len(top_factors) >= 2:
                second = top_factors[1]
                sentences.append(
                    f"Bên cạnh đó, "
                    f"{second.get('label_vi', second.get('feature', 'không rõ'))} "
                    f"({second.get('display_val', 'N/A')}, "
                    f"đóng góp {second.get('contribution', 0):.4f}) "
                    f"cũng là yếu tố đáng chú ý."
                )

        # --- Câu 4: So sánh với trung bình ngành (nếu có) ---
        if benchmark and isinstance(benchmark, dict):
            avg_pd = benchmark.get("average_pd")
            if avg_pd is not None:
                diff = current_pd - avg_pd
                if diff < 0:
                    comparison = (
                        f"thấp hơn (tốt hơn) {abs(diff):.2f} điểm phần trăm"
                    )
                elif diff > 0:
                    comparison = (
                        f"cao hơn (kém hơn) {diff:.2f} điểm phần trăm"
                    )
                else:
                    comparison = "ngang bằng"
                sentences.append(
                    f"So với trung bình ngành {sector} "
                    f"(PD trung bình: {avg_pd}%), "
                    f"doanh nghiệp đang {comparison}."
                )

        # --- Câu 5: Gợi ý hành động ưu tiên ---
        if top_factors:
            top_feature = top_factors[0].get("feature", "")
            action = ACTION_MAP.get(top_feature, _DEFAULT_ACTION)
            label = top_factors[0].get(
                "label_vi", top_factors[0].get("feature", "chỉ số quan trọng nhất")
            )
            sentences.append(
                f"Hành động ưu tiên nhất hiện tại là cải thiện "
                f"{label} thông qua {action}."
            )

        return " ".join(sentences)
