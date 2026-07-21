"""
================================================================================
FinBot Knowledge Base — Bộ não kiến thức cho chatbot tín dụng
================================================================================

Module chứa toàn bộ kiến thức tĩnh (static knowledge) và kiến thức từ dữ liệu
thực (dynamic knowledge) phục vụ RAG pipeline:
  - PART 1: 15 tỷ số tài chính — định nghĩa, công thức, ngưỡng, ý nghĩa
  - PART 2: 26 hồ sơ rủi ro ngành — đặc điểm, tỷ số quan trọng, thống kê thực
  - PART 3: Kiến thức pháp quy — Basel DSCR, Thông tư 11, Altman Z-score

Sử dụng:
    from finbot.core.knowledge_base import KnowledgeBase
    kb = KnowledgeBase()
    info = kb.get_ratio_info("current_ratio")
    chunks = kb.get_all_knowledge_texts()   # cho RAG indexing
================================================================================
"""

import json
import os
from typing import Optional


# ==============================================================================
# PART 1: FINANCIAL_RATIOS — Định nghĩa 15 tỷ số tài chính
# ==============================================================================

FINANCIAL_RATIOS = {
    # --- Nhóm 1: Khả năng thanh toán (Liquidity) ---
    "current_ratio": {
        "name_vi": "Tỷ số thanh toán hiện hành",
        "formula": "Tài sản ngắn hạn / Nợ ngắn hạn",
        "safe_threshold": 2.0,
        "warning_threshold": 1.2,
        "danger_threshold": 0.8,
        "higher_is_better": True,
        "meaning": (
            "Đo lường khả năng thanh toán các khoản nợ ngắn hạn bằng tài sản "
            "ngắn hạn. Tỷ số > 2 cho thấy doanh nghiệp có đủ tài sản lưu động "
            "để trang trải nghĩa vụ nợ. Dưới 1 nghĩa là nợ ngắn hạn vượt quá "
            "tài sản ngắn hạn — tín hiệu rủi ro thanh khoản nghiêm trọng."
        ),
    },
    "quick_ratio": {
        "name_vi": "Tỷ số thanh toán nhanh",
        "formula": "(Tài sản ngắn hạn - Hàng tồn kho) / Nợ ngắn hạn",
        "safe_threshold": 1.5,
        "warning_threshold": 1.0,
        "danger_threshold": 0.5,
        "higher_is_better": True,
        "meaning": (
            "Giống tỷ số thanh toán hiện hành nhưng loại bỏ hàng tồn kho — "
            "loại tài sản khó chuyển đổi thành tiền mặt nhanh. Cho thấy khả "
            "năng trả nợ ngắn hạn thực sự mà không phải bán tồn kho."
        ),
    },
    "cash_ratio": {
        "name_vi": "Tỷ số thanh toán tiền mặt",
        "formula": "Tiền và tương đương tiền / Nợ ngắn hạn",
        "safe_threshold": 0.5,
        "warning_threshold": 0.2,
        "danger_threshold": 0.1,
        "higher_is_better": True,
        "meaning": (
            "Đo khả năng trả nợ ngắn hạn ngay lập tức chỉ bằng tiền mặt. "
            "Đây là thước đo thanh khoản khắt khe nhất. Tỷ số quá thấp có thể "
            "khiến doanh nghiệp không xoay kịp khi có nghĩa vụ trả nợ đột xuất."
        ),
    },

    # --- Nhóm 2: Đòn bẩy tài chính (Leverage) ---
    "debt_to_equity": {
        "name_vi": "Tỷ số nợ trên vốn chủ sở hữu",
        "formula": "Tổng nợ / Vốn chủ sở hữu",
        "safe_threshold": 1.0,
        "warning_threshold": 2.0,
        "danger_threshold": 4.0,
        "higher_is_better": False,
        "meaning": (
            "Phản ánh mức độ sử dụng nợ so với vốn tự có. D/E cao nghĩa là "
            "doanh nghiệp phụ thuộc nhiều vào vốn vay — rủi ro tài chính lớn "
            "hơn, đặc biệt khi lãi suất tăng hoặc doanh thu sụt giảm."
        ),
    },
    "debt_to_assets": {
        "name_vi": "Tỷ số nợ trên tổng tài sản",
        "formula": "Tổng nợ / Tổng tài sản",
        "safe_threshold": 0.4,
        "warning_threshold": 0.6,
        "danger_threshold": 0.8,
        "higher_is_better": False,
        "meaning": (
            "Cho biết bao nhiêu phần trăm tài sản được tài trợ bằng nợ. "
            "Tỷ số > 0.6 cho thấy doanh nghiệp sử dụng đòn bẩy cao, "
            "dễ bị tổn thương nếu thị trường biến động hoặc tín dụng bị thắt chặt."
        ),
    },
    "long_term_debt_to_equity": {
        "name_vi": "Tỷ số nợ dài hạn trên vốn chủ",
        "formula": "Nợ dài hạn / Vốn chủ sở hữu",
        "safe_threshold": 0.5,
        "warning_threshold": 1.0,
        "danger_threshold": 2.0,
        "higher_is_better": False,
        "meaning": (
            "Đo gánh nặng nợ dài hạn so với vốn chủ. Nợ dài hạn quá lớn "
            "so với vốn chủ sở hữu tạo áp lực trả lãi kéo dài và tăng xác "
            "suất vỡ nợ (PD) trong trung và dài hạn."
        ),
    },

    # --- Nhóm 3: Khả năng trả nợ từ hoạt động (Coverage) ---
    "cfo_to_debt": {
        "name_vi": "Dòng tiền hoạt động trên tổng nợ",
        "formula": "Dòng tiền hoạt động (CFO) / Tổng nợ",
        "safe_threshold": 0.3,
        "warning_threshold": 0.15,
        "danger_threshold": 0.05,
        "higher_is_better": True,
        "meaning": (
            "Cho biết bao nhiêu phần nợ có thể được trả từ dòng tiền hoạt "
            "động kinh doanh thực tế. Được đánh giá là chỉ báo dự báo vỡ nợ "
            "tốt hơn lợi nhuận kế toán vì phản ánh tiền thực, không bị ảnh "
            "hưởng bởi các bút toán kế toán."
        ),
    },
    "ebit_to_long_term_debt": {
        "name_vi": "EBIT trên nợ dài hạn",
        "formula": "EBIT / Nợ dài hạn",
        "safe_threshold": 1.5,
        "warning_threshold": 0.8,
        "danger_threshold": 0.3,
        "higher_is_better": True,
        "meaning": (
            "Proxy cho khả năng trả lãi vay — đo khả năng gánh nghĩa vụ "
            "nợ dài hạn từ lợi nhuận hoạt động (EBIT). Tỷ số thấp cho thấy "
            "lợi nhuận hoạt động không đủ bù đắp nghĩa vụ nợ dài hạn."
        ),
    },

    # --- Nhóm 4: Hiệu quả hoạt động (Efficiency) ---
    "asset_turnover": {
        "name_vi": "Vòng quay tổng tài sản",
        "formula": "Doanh thu / Tổng tài sản",
        "safe_threshold": 0.8,
        "warning_threshold": 0.4,
        "danger_threshold": 0.15,
        "higher_is_better": True,
        "meaning": (
            "Đo hiệu quả sử dụng tài sản để tạo doanh thu. Tỷ số thấp "
            "có nghĩa doanh nghiệp đang sở hữu nhiều tài sản nhưng không "
            "tạo ra doanh thu tương xứng — dấu hiệu kinh doanh kém hiệu quả."
        ),
    },
    "inventory_turnover": {
        "name_vi": "Vòng quay hàng tồn kho",
        "formula": "Doanh thu / Hàng tồn kho",
        "safe_threshold": 8.0,
        "warning_threshold": 4.0,
        "danger_threshold": 2.0,
        "higher_is_better": True,
        "meaning": (
            "Đo tốc độ luân chuyển hàng tồn kho. Tỷ số thấp cho thấy hàng "
            "tồn kho ứ đọng — vốn bị chôn trong kho, tăng chi phí lưu kho "
            "và rủi ro mất giá hàng hóa. Đây là dấu hiệu cảnh báo rủi ro "
            "đặc biệt quan trọng với ngành bán lẻ và sản xuất."
        ),
    },

    # --- Nhóm 5: Khả năng sinh lời (Profitability) ---
    "ebitda_margin": {
        "name_vi": "Biên EBITDA",
        "formula": "(EBIT + Khấu hao) / Doanh thu",
        "safe_threshold": 0.20,
        "warning_threshold": 0.10,
        "danger_threshold": 0.03,
        "higher_is_better": True,
        "meaning": (
            "Biên lợi nhuận hoạt động trước khấu hao — đo sức khỏe cốt lõi "
            "của hoạt động kinh doanh, loại bỏ ảnh hưởng của cơ cấu tài chính "
            "và chính sách khấu hao. EBITDA âm là tín hiệu rất nguy hiểm."
        ),
    },
    "net_profit_margin": {
        "name_vi": "Biên lợi nhuận ròng",
        "formula": "Lợi nhuận sau thuế / Doanh thu",
        "safe_threshold": 0.10,
        "warning_threshold": 0.03,
        "danger_threshold": 0.0,
        "higher_is_better": True,
        "meaning": (
            "Phản ánh hiệu quả tổng thể — mỗi đồng doanh thu giữ lại bao "
            "nhiêu lợi nhuận sau khi trừ hết chi phí. Biên âm nghĩa là doanh "
            "nghiệp đang lỗ, kéo dài sẽ dẫn đến mất khả năng thanh toán."
        ),
    },
    "roa": {
        "name_vi": "Tỷ suất sinh lời trên tổng tài sản (ROA)",
        "formula": "Lợi nhuận sau thuế / Tổng tài sản",
        "safe_threshold": 0.08,
        "warning_threshold": 0.03,
        "danger_threshold": 0.0,
        "higher_is_better": True,
        "meaning": (
            "Cho biết mỗi đồng tài sản tạo ra bao nhiêu lợi nhuận. ROA thấp "
            "hoặc âm cho thấy tài sản không được sử dụng hiệu quả hoặc doanh "
            "nghiệp đang thua lỗ — tăng xác suất vỡ nợ."
        ),
    },
    "retained_earnings_to_assets": {
        "name_vi": "Lợi nhuận giữ lại trên tổng tài sản",
        "formula": "Lợi nhuận chưa phân phối / Tổng tài sản",
        "safe_threshold": 0.30,
        "warning_threshold": 0.10,
        "danger_threshold": 0.0,
        "higher_is_better": True,
        "meaning": (
            "Phản ánh mức độ tích lũy lợi nhuận qua thời gian — thành phần "
            "quan trọng trong mô hình Altman Z-score. Tỷ số thấp cho thấy "
            "doanh nghiệp trẻ hoặc đã phân phối hết lợi nhuận, ít có đệm "
            "tài chính để chống đỡ rủi ro."
        ),
    },

    # --- Nhóm 6: Tăng trưởng (Growth) ---
    "revenue_growth_yoy": {
        "name_vi": "Tăng trưởng doanh thu so với cùng kỳ năm trước",
        "formula": "(Doanh thu kỳ này - Doanh thu cùng kỳ năm trước) / Doanh thu cùng kỳ năm trước",
        "safe_threshold": 0.10,
        "warning_threshold": 0.0,
        "danger_threshold": -0.15,
        "higher_is_better": True,
        "meaning": (
            "Đo xu hướng tăng trưởng doanh thu. Doanh thu sụt giảm liên tục "
            "(YoY âm nhiều quý) là tín hiệu cảnh báo sớm về rủi ro vỡ nợ — "
            "doanh nghiệp mất dần khả năng tạo ra dòng tiền để trả nợ."
        ),
    },
}


# ==============================================================================
# PART 2: SECTOR_PROFILES — Hồ sơ rủi ro 26 ngành
# ==============================================================================

SECTOR_PROFILES = {
    "Bán lẻ": {
        "key_risks": (
            "Phụ thuộc vào sức mua tiêu dùng, cạnh tranh gay gắt từ thương mại "
            "điện tử, biên lợi nhuận mỏng, rủi ro tồn kho ứ đọng khi xu hướng "
            "tiêu dùng thay đổi nhanh."
        ),
        "critical_ratios": ["inventory_turnover", "current_ratio", "net_profit_margin", "revenue_growth_yoy"],
    },
    "Bất động sản": {
        "key_risks": (
            "Phụ thuộc lớn vào chu kỳ tín dụng và lãi suất, đòn bẩy tài chính "
            "cao, rủi ro thanh khoản do tài sản kém lỏng, pháp lý dự án phức tạp, "
            "vốn chôn trong hàng tồn kho (bất động sản dở dang) rất lớn."
        ),
        "critical_ratios": ["debt_to_equity", "current_ratio", "cfo_to_debt", "debt_to_assets"],
    },
    "Bất động sản KCN": {
        "key_risks": (
            "Chu kỳ đầu tư dài, vốn lớn, phụ thuộc vào dòng vốn FDI và chính "
            "sách ưu đãi khu công nghiệp. Rủi ro tỷ lệ lấp đầy thấp khi kinh "
            "tế suy giảm."
        ),
        "critical_ratios": ["debt_to_equity", "asset_turnover", "cfo_to_debt", "roa"],
    },
    "Cao su": {
        "key_risks": (
            "Phụ thuộc vào giá cao su thế giới biến động mạnh, ảnh hưởng bởi "
            "thời tiết và dịch bệnh cây trồng, chi phí nhân công cao, rủi ro "
            "chuyển đổi mục đích sử dụng đất."
        ),
        "critical_ratios": ["net_profit_margin", "debt_to_assets", "revenue_growth_yoy", "cfo_to_debt"],
    },
    "Công nghiệp": {
        "key_risks": (
            "Phụ thuộc vào đơn hàng sản xuất, chi phí nguyên vật liệu biến động, "
            "yêu cầu đầu tư máy móc lớn, ảnh hưởng bởi chu kỳ kinh tế toàn cầu."
        ),
        "critical_ratios": ["asset_turnover", "debt_to_equity", "ebitda_margin", "current_ratio"],
    },
    "Công nghệ": {
        "key_risks": (
            "Thay đổi công nghệ nhanh chóng, cạnh tranh nhân sự, rủi ro về bảo "
            "mật và sở hữu trí tuệ. Tuy nhiên biên lợi nhuận thường cao nếu mô "
            "hình kinh doanh vững."
        ),
        "critical_ratios": ["revenue_growth_yoy", "net_profit_margin", "roa", "quick_ratio"],
    },
    "Dược phẩm": {
        "key_risks": (
            "Rào cản pháp lý cao (GMP, đấu thầu), phụ thuộc vào chính sách bảo "
            "hiểm y tế, chi phí R&D lớn, rủi ro hàng tồn kho do hạn sử dụng."
        ),
        "critical_ratios": ["inventory_turnover", "net_profit_margin", "roa", "current_ratio"],
    },
    "Dầu khí": {
        "key_risks": (
            "Phụ thuộc vào giá dầu thế giới biến động mạnh, chi phí thăm dò và "
            "khai thác rất lớn, rủi ro môi trường, ảnh hưởng bởi địa chính trị "
            "và chính sách năng lượng."
        ),
        "critical_ratios": ["debt_to_assets", "ebitda_margin", "cfo_to_debt", "asset_turnover"],
    },
    "Dệt may": {
        "key_risks": (
            "Phụ thuộc vào đơn hàng xuất khẩu, cạnh tranh giá từ Bangladesh và "
            "Campuchia, biên lợi nhuận mỏng, ảnh hưởng bởi tỷ giá và chi phí "
            "lao động tăng."
        ),
        "critical_ratios": ["net_profit_margin", "inventory_turnover", "quick_ratio", "revenue_growth_yoy"],
    },
    "Giấy - Bao bì": {
        "key_risks": (
            "Chi phí nguyên liệu (bột giấy) biến động, cạnh tranh từ hàng nhập "
            "khẩu, yêu cầu đầu tư dây chuyền sản xuất lớn, rủi ro môi trường "
            "từ nước thải sản xuất."
        ),
        "critical_ratios": ["debt_to_equity", "ebitda_margin", "asset_turnover", "current_ratio"],
    },
    "Hàng không": {
        "key_risks": (
            "Chi phí cố định rất cao (máy bay, nhiên liệu), phụ thuộc vào giá "
            "xăng dầu, nhạy cảm với dịch bệnh và biến cố toàn cầu, cạnh tranh "
            "khốc liệt, đòn bẩy tài chính cao do thuê/mua máy bay."
        ),
        "critical_ratios": ["debt_to_equity", "cfo_to_debt", "ebitda_margin", "cash_ratio"],
    },
    "Hóa chất": {
        "key_risks": (
            "Phụ thuộc vào giá nguyên liệu đầu vào, rủi ro môi trường và an "
            "toàn lao động, quy định pháp luật nghiêm ngặt về hóa chất, chu kỳ "
            "cung cầu biến động."
        ),
        "critical_ratios": ["ebitda_margin", "debt_to_assets", "inventory_turnover", "cfo_to_debt"],
    },
    "Khoáng sản": {
        "key_risks": (
            "Phụ thuộc vào giá khoáng sản thế giới, chi phí khai thác tăng khi "
            "trữ lượng giảm, rủi ro pháp lý về giấy phép khai thác, ảnh hưởng "
            "môi trường nghiêm trọng."
        ),
        "critical_ratios": ["debt_to_assets", "cfo_to_debt", "net_profit_margin", "ebitda_margin"],
    },
    "Logistics": {
        "key_risks": (
            "Phụ thuộc vào hoạt động xuất nhập khẩu, chi phí vận tải biến động "
            "theo giá nhiên liệu, yêu cầu đầu tư hạ tầng (kho bãi, đội xe) lớn, "
            "cạnh tranh từ doanh nghiệp nước ngoài."
        ),
        "critical_ratios": ["asset_turnover", "debt_to_equity", "cfo_to_debt", "current_ratio"],
    },
    "Nhựa - Bao bì": {
        "key_risks": (
            "Chi phí hạt nhựa phụ thuộc giá dầu, cạnh tranh giá gay gắt, xu "
            "hướng giảm nhựa dùng một lần tạo rủi ro dài hạn, biên lợi nhuận "
            "phụ thuộc vào quy mô sản xuất."
        ),
        "critical_ratios": ["ebitda_margin", "inventory_turnover", "debt_to_assets", "revenue_growth_yoy"],
    },
    "Nông nghiệp": {
        "key_risks": (
            "Phụ thuộc vào thời tiết, dịch bệnh cây trồng/vật nuôi, giá nông "
            "sản biến động theo mùa vụ, thiếu chuỗi giá trị khép kín, rủi ro "
            "thị trường xuất khẩu."
        ),
        "critical_ratios": ["revenue_growth_yoy", "net_profit_margin", "current_ratio", "cfo_to_debt"],
    },
    "Thép": {
        "key_risks": (
            "Phụ thuộc vào giá thép và quặng sắt thế giới, cạnh tranh từ thép "
            "Trung Quốc giá rẻ, chi phí năng lượng cao, chu kỳ bất động sản và "
            "xây dựng ảnh hưởng trực tiếp đến nhu cầu."
        ),
        "critical_ratios": ["debt_to_equity", "ebitda_margin", "inventory_turnover", "cfo_to_debt"],
    },
    "Thủy sản": {
        "key_risks": (
            "Rủi ro dịch bệnh thủy sản, phụ thuộc vào thị trường xuất khẩu, "
            "rào cản kỹ thuật từ các nước nhập khẩu (thẻ vàng IUU), biến động "
            "giá nguyên liệu đầu vào (thức ăn chăn nuôi)."
        ),
        "critical_ratios": ["inventory_turnover", "net_profit_margin", "debt_to_assets", "revenue_growth_yoy"],
    },
    "Thực phẩm - Đồ uống": {
        "key_risks": (
            "Cạnh tranh gay gắt, yêu cầu vệ sinh an toàn thực phẩm cao, phụ "
            "thuộc vào sức mua tiêu dùng nội địa, rủi ro thương hiệu nếu xảy "
            "ra sự cố chất lượng."
        ),
        "critical_ratios": ["net_profit_margin", "inventory_turnover", "roa", "current_ratio"],
    },
    "Tiêu dùng": {
        "key_risks": (
            "Phụ thuộc vào sức mua và niềm tin tiêu dùng, cạnh tranh từ hàng "
            "nhập khẩu và thương mại điện tử, biên lợi nhuận nhạy cảm với chi "
            "phí marketing và phân phối."
        ),
        "critical_ratios": ["revenue_growth_yoy", "net_profit_margin", "inventory_turnover", "quick_ratio"],
    },
    "Tiện ích": {
        "key_risks": (
            "Doanh thu ổn định nhưng bị kiểm soát giá bởi nhà nước, đầu tư hạ "
            "tầng lớn, rủi ro pháp lý về môi trường, phụ thuộc vào chính sách "
            "năng lượng quốc gia."
        ),
        "critical_ratios": ["debt_to_equity", "cfo_to_debt", "roa", "ebitda_margin"],
    },
    "Tài chính": {
        "key_risks": (
            "Nhạy cảm với chu kỳ kinh tế và lãi suất, rủi ro tín dụng khách "
            "hàng, yêu cầu vốn pháp định cao, quản lý rủi ro thanh khoản phức "
            "tạp, chịu sự giám sát chặt từ NHNN."
        ),
        "critical_ratios": ["debt_to_assets", "roa", "cash_ratio", "net_profit_margin"],
    },
    "Vận tải": {
        "key_risks": (
            "Chi phí nhiên liệu biến động, phụ thuộc vào hoạt động thương mại "
            "và sản xuất, yêu cầu đầu tư phương tiện lớn, rủi ro an toàn giao "
            "thông và bảo hiểm."
        ),
        "critical_ratios": ["asset_turnover", "debt_to_equity", "cfo_to_debt", "ebitda_margin"],
    },
    "Vật liệu xây dựng": {
        "key_risks": (
            "Phụ thuộc vào chu kỳ xây dựng và bất động sản, chi phí nguyên liệu "
            "và năng lượng cao, cạnh tranh giá giữa các nhà sản xuất, ảnh hưởng "
            "bởi chính sách đầu tư công."
        ),
        "critical_ratios": ["debt_to_equity", "inventory_turnover", "ebitda_margin", "revenue_growth_yoy"],
    },
    "Xây dựng": {
        "key_risks": (
            "Đòn bẩy cao, công nợ phải thu lớn (chờ thanh toán từ chủ đầu tư), "
            "rủi ro dự án chậm tiến độ, biên lợi nhuận mỏng, phụ thuộc vào đầu "
            "tư công và thị trường bất động sản."
        ),
        "critical_ratios": ["current_ratio", "debt_to_equity", "cfo_to_debt", "net_profit_margin"],
    },
    "Điện lực": {
        "key_risks": (
            "Đầu tư ban đầu rất lớn (nhà máy điện), giá bán điện bị quản lý "
            "bởi EVN/nhà nước, đòn bẩy tài chính cao, rủi ro thủy văn (thủy "
            "điện) và nhiên liệu (nhiệt điện), chuyển đổi năng lượng tái tạo."
        ),
        "critical_ratios": ["debt_to_equity", "cfo_to_debt", "ebitda_margin", "debt_to_assets"],
    },
}


# ==============================================================================
# PART 3: REGULATIONS — Kiến thức pháp quy
# ==============================================================================

REGULATIONS = {
    "dscr": {
        "name_vi": "Hệ số khả năng trả nợ (DSCR)",
        "description": (
            "Theo tiêu chuẩn Basel, hệ số DSCR (Debt Service Coverage Ratio) "
            "tối thiểu phải đạt 1.2x, nghĩa là dòng tiền hoạt động phải gấp "
            "ít nhất 1.2 lần nghĩa vụ trả nợ gốc và lãi. DSCR dưới 1x nghĩa "
            "là doanh nghiệp không tạo đủ dòng tiền để trả nợ — dấu hiệu "
            "cảnh báo nghiêm trọng về khả năng vỡ nợ."
        ),
        "threshold": 1.2,
        "source": "Basel Convention / Hiệp ước Basel",
    },
    "phan_loai_no": {
        "name_vi": "Phân loại nợ theo Thông tư 11/2021/TT-NHNN",
        "description": (
            "Theo Thông tư 11/2021/TT-NHNN của Ngân hàng Nhà nước Việt Nam, "
            "nợ vay được phân thành 5 nhóm dựa trên khả năng trả nợ và thời "
            "gian quá hạn. Tổ chức tín dụng phải trích lập dự phòng rủi ro "
            "tương ứng với từng nhóm nợ."
        ),
        "groups": [
            {
                "group": 1,
                "name_vi": "Nợ đủ tiêu chuẩn",
                "description": "Nợ trong hạn, được đánh giá có khả năng thu hồi đầy đủ cả gốc và lãi.",
                "provision_rate": 0.0,
            },
            {
                "group": 2,
                "name_vi": "Nợ cần chú ý",
                "description": (
                    "Nợ quá hạn từ 10 đến 90 ngày, hoặc nợ được cơ cấu lại "
                    "thời hạn trả nợ lần đầu."
                ),
                "provision_rate": 0.05,
            },
            {
                "group": 3,
                "name_vi": "Nợ dưới tiêu chuẩn",
                "description": (
                    "Nợ quá hạn từ 91 đến 180 ngày, hoặc nợ được cơ cấu lại "
                    "thời hạn trả nợ lần đầu nhưng tiếp tục quá hạn."
                ),
                "provision_rate": 0.20,
            },
            {
                "group": 4,
                "name_vi": "Nợ nghi ngờ",
                "description": (
                    "Nợ quá hạn từ 181 đến 360 ngày, hoặc nợ đã cơ cấu lại "
                    "thời hạn trả nợ lần thứ hai."
                ),
                "provision_rate": 0.50,
            },
            {
                "group": 5,
                "name_vi": "Nợ có khả năng mất vốn",
                "description": (
                    "Nợ quá hạn trên 360 ngày, hoặc nợ đã cơ cấu lại thời "
                    "hạn trả nợ lần thứ hai nhưng tiếp tục quá hạn. Rủi ro "
                    "mất vốn rất cao."
                ),
                "provision_rate": 1.0,
            },
        ],
        "source": "Thông tư 11/2021/TT-NHNN ngày 30/07/2021",
    },
    "altman_z_score": {
        "name_vi": "Chỉ số Altman Z-score",
        "description": (
            "Mô hình Z-score của Edward Altman (1968) dự đoán xác suất phá sản "
            "của doanh nghiệp dựa trên 5 tỷ số tài chính. Được sử dụng rộng "
            "rãi trong phân tích tín dụng và quản trị rủi ro trên toàn thế giới."
        ),
        "thresholds": {
            "safe": {
                "min_value": 2.99,
                "label_vi": "Vùng an toàn",
                "description": "Z-score > 2.99: Doanh nghiệp có sức khỏe tài chính tốt, xác suất phá sản thấp.",
            },
            "grey": {
                "min_value": 1.81,
                "max_value": 2.99,
                "label_vi": "Vùng xám (cảnh báo)",
                "description": (
                    "1.81 ≤ Z-score ≤ 2.99: Vùng không rõ ràng — doanh nghiệp "
                    "có một số dấu hiệu rủi ro, cần theo dõi sát."
                ),
            },
            "danger": {
                "max_value": 1.81,
                "label_vi": "Vùng nguy hiểm",
                "description": (
                    "Z-score < 1.81: Doanh nghiệp có xác suất phá sản cao. "
                    "Cần xem xét cẩn thận trước khi cấp tín dụng."
                ),
            },
        },
        "source": "Altman, E. I. (1968). Financial ratios, discriminant analysis and the prediction of corporate bankruptcy.",
    },
}


# ==============================================================================
# CLASS: KnowledgeBase
# ==============================================================================

class KnowledgeBase:
    """
    Bộ não kiến thức cho FinBot — tập hợp tất cả kiến thức tĩnh và dữ liệu
    thống kê ngành thực tế để phục vụ RAG pipeline.

    Khởi tạo sẽ tự động load dữ liệu thống kê ngành từ demoData.json và
    sector_benchmark.json.
    """

    def __init__(self):
        self.financial_ratios = FINANCIAL_RATIOS
        self.sector_profiles = SECTOR_PROFILES
        self.regulations = REGULATIONS

        # Dữ liệu thống kê ngành — sẽ được populate từ file JSON
        self.sector_stats: dict = {}
        self.load_sector_stats()

    # ------------------------------------------------------------------
    # Load thống kê ngành từ dữ liệu thực
    # ------------------------------------------------------------------
    def load_sector_stats(self):
        """
        Đọc dữ liệu thực từ demoData.json và sector_benchmark.json để tính
        thống kê trung bình PD theo ngành. Merge kết quả vào sector_stats.
        """
        # Đường dẫn tương đối so với file này (finbot/core/knowledge_base.py)
        demo_data_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'demoData.json'
        )
        sector_benchmark_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 'backend', 'sector_benchmark.json'
        )

        # --- Bước 1: Load demoData.json (nguồn chính) ---
        try:
            with open(demo_data_path, 'r', encoding='utf-8') as f:
                demo_data = json.load(f)
                companies = demo_data.get("companies", [])
        except Exception as e:
            print(f"[KnowledgeBase] Cảnh báo: Không thể đọc demoData.json: {e}")
            companies = []

        # Tính trung bình PD theo ngành từ demoData
        if companies:
            sector_pd_map: dict[str, list[float]] = {}
            for comp in companies:
                sector = comp.get("sector", "")
                pd_val = comp.get("current_pd")
                if sector and pd_val is not None:
                    sector_pd_map.setdefault(sector, []).append(float(pd_val))

            for sector, pd_list in sector_pd_map.items():
                self.sector_stats[sector] = {
                    "average_pd": round(sum(pd_list) / len(pd_list), 2),
                    "min_pd": round(min(pd_list), 2),
                    "max_pd": round(max(pd_list), 2),
                    "company_count": len(pd_list),
                }

        # --- Bước 2: Bổ sung từ sector_benchmark.json ---
        benchmark_data = {}
        try:
            with open(sector_benchmark_path, 'r', encoding='utf-8') as f:
                benchmark_data = json.load(f)
        except Exception as e:
            print(f"[KnowledgeBase] Cảnh báo: Không thể đọc sector_benchmark.json: {e}")

        for sector, stats in benchmark_data.items():
            if sector not in self.sector_stats:
                self.sector_stats[sector] = {
                    "average_pd": stats.get("average_pd"),
                    "min_pd": stats.get("min_pd"),
                    "max_pd": stats.get("max_pd"),
                    "company_count": stats.get("company_count", 0),
                }

        print(f"KnowledgeBase: sector_stats computed from demoData — {len(self.sector_stats)} sectors loaded.")

    # ------------------------------------------------------------------
    # API Methods
    # ------------------------------------------------------------------

    def get_ratio_info(self, ratio_name: str) -> Optional[dict]:
        """
        Trả về thông tin chi tiết của một tỷ số tài chính.

        Args:
            ratio_name: Tên tỷ số (ví dụ: "current_ratio", "roa")

        Returns:
            dict chứa name_vi, formula, thresholds, meaning hoặc None nếu
            không tìm thấy.
        """
        return self.financial_ratios.get(ratio_name)

    def get_sector_info(self, sector_name: str) -> Optional[dict]:
        """
        Trả về hồ sơ rủi ro ngành kết hợp với thống kê thực tế.

        Args:
            sector_name: Tên ngành tiếng Việt (ví dụ: "Bất động sản")

        Returns:
            dict chứa key_risks, critical_ratios, và sector_stats (nếu có)
            hoặc None nếu không tìm thấy.
        """
        profile = self.sector_profiles.get(sector_name)
        if profile is None:
            return None

        # Kết hợp profile tĩnh với thống kê thực tế
        result = dict(profile)
        stats = self.sector_stats.get(sector_name)
        if stats:
            result["stats"] = stats
        return result

    def get_regulation(self, topic: str) -> Optional[str]:
        """
        Trả về mô tả kiến thức pháp quy theo chủ đề.

        Args:
            topic: Chủ đề pháp quy — một trong: "dscr", "phan_loai_no",
                   "altman_z_score"

        Returns:
            Chuỗi mô tả bằng tiếng Việt hoặc None nếu không tìm thấy.
        """
        reg = self.regulations.get(topic)
        if reg is None:
            return None

        # Xây dựng chuỗi mô tả đầy đủ
        parts = [f"{reg['name_vi']}: {reg['description']}"]

        # Bổ sung chi tiết tùy loại
        if topic == "phan_loai_no" and "groups" in reg:
            parts.append("Phân loại chi tiết:")
            for g in reg["groups"]:
                parts.append(
                    f"  - Nhóm {g['group']} ({g['name_vi']}): {g['description']} "
                    f"Tỷ lệ trích lập dự phòng: {g['provision_rate']:.0%}."
                )

        if topic == "altman_z_score" and "thresholds" in reg:
            parts.append("Ngưỡng đánh giá:")
            for zone_key in ["safe", "grey", "danger"]:
                zone = reg["thresholds"][zone_key]
                parts.append(f"  - {zone['label_vi']}: {zone['description']}")

        if topic == "dscr":
            parts.append(f"Ngưỡng tối thiểu: {reg['threshold']}x.")

        parts.append(f"Nguồn: {reg['source']}")
        return "\n".join(parts)

    def get_all_knowledge_texts(self) -> list[str]:
        """
        Trả về tất cả kiến thức dưới dạng danh sách các đoạn văn bản (chunks)
        để phục vụ RAG indexing / embedding.

        Mỗi chunk là một đoạn văn bản có ý nghĩa hoàn chỉnh, đủ ngắn để
        embedding hiệu quả nhưng đủ dài để giữ ngữ cảnh.

        Returns:
            list[str] — danh sách các text chunks tiếng Việt.
        """
        chunks: list[str] = []

        # --- Chunk từ tỷ số tài chính ---
        for ratio_key, ratio_info in self.financial_ratios.items():
            direction = "càng cao càng tốt" if ratio_info["higher_is_better"] else "càng thấp càng tốt"
            chunk = (
                f"Tỷ số tài chính: {ratio_info['name_vi']} ({ratio_key})\n"
                f"Công thức: {ratio_info['formula']}\n"
                f"Ngưỡng an toàn: {ratio_info['safe_threshold']} | "
                f"Ngưỡng cảnh báo: {ratio_info['warning_threshold']} | "
                f"Ngưỡng nguy hiểm: {ratio_info['danger_threshold']} "
                f"({direction})\n"
                f"Ý nghĩa: {ratio_info['meaning']}"
            )
            chunks.append(chunk)

        # --- Chunk từ hồ sơ rủi ro ngành ---
        for sector_name, profile in self.sector_profiles.items():
            # Lấy tên tiếng Việt của các tỷ số quan trọng
            critical_ratio_names = []
            for r in profile["critical_ratios"]:
                r_info = self.financial_ratios.get(r)
                if r_info:
                    critical_ratio_names.append(r_info["name_vi"])
                else:
                    critical_ratio_names.append(r)

            chunk = (
                f"Ngành: {sector_name}\n"
                f"Rủi ro chính: {profile['key_risks']}\n"
                f"Tỷ số tài chính quan trọng cần theo dõi: {', '.join(critical_ratio_names)}"
            )

            # Bổ sung thống kê thực tế nếu có
            stats = self.sector_stats.get(sector_name)
            if stats:
                chunk += (
                    f"\nThống kê ngành: PD trung bình {stats['average_pd']}%, "
                    f"thấp nhất {stats['min_pd']}%, "
                    f"cao nhất {stats['max_pd']}%, "
                    f"số công ty: {stats['company_count']}"
                )
            chunks.append(chunk)

        # --- Chunk từ kiến thức pháp quy ---
        for topic in self.regulations:
            reg_text = self.get_regulation(topic)
            if reg_text:
                chunks.append(reg_text)

        return chunks


# ==============================================================================
# Quick test khi chạy trực tiếp
# ==============================================================================
if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    kb = KnowledgeBase()

    print("=" * 60)
    print("TEST: get_ratio_info('current_ratio')")
    print("=" * 60)
    info = kb.get_ratio_info("current_ratio")
    if info:
        for k, v in info.items():
            print(f"  {k}: {v}")

    print("\n" + "=" * 60)
    print("TEST: get_sector_info('Bất động sản')")
    print("=" * 60)
    sector = kb.get_sector_info("Bất động sản")
    if sector:
        for k, v in sector.items():
            print(f"  {k}: {v}")

    print("\n" + "=" * 60)
    print("TEST: get_regulation('altman_z_score')")
    print("=" * 60)
    reg = kb.get_regulation("altman_z_score")
    if reg:
        print(reg)

    print("\n" + "=" * 60)
    print("TEST: get_all_knowledge_texts()")
    print("=" * 60)
    all_chunks = kb.get_all_knowledge_texts()
    print(f"Tổng số chunks: {len(all_chunks)}")
    for i, chunk in enumerate(all_chunks[:3]):
        print(f"\n--- Chunk {i+1} ---")
        print(chunk[:200] + "...")
