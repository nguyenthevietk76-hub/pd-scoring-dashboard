"""
================================================================================
PD SCORING MODEL - Feature Engineering
Nhóm 3: AI cho Quản trị Rủi ro và Tuân thủ (AI-Quantum Challenge 2026)
================================================================================

KHAI BÁO (theo Điều 14 - Thể lệ cuộc thi):
  File này được viết với hỗ trợ của AI (Claude). Logic tính toán tỷ số tài
  chính, lựa chọn rolling window và phương pháp xử lý missing values do nhóm
  quyết định và cần được review trước khi dùng cho báo cáo chính thức.

INPUT EXPECTED (DataFrame thô từ clean_dataset.csv hoặc tương đương):
  Bắt buộc có các cột (đơn vị VND, đồng nhất):
    ticker, year, quarter (1-4)
    revenue, net_income, ebit, depreciation_amortization
    current_assets, current_liabilities
    total_assets, total_liabilities, total_equity, long_term_debt
    operating_cash_flow, cash_and_equiv, inventory, retained_earnings
  Và cột label: label_distress (0 = Healthy, 1 = Distress)

OUTPUT: X (features, đã scale + impute), y (label)
================================================================================
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer


# ==============================================================================
# 1. COMPUTE_RATIOS - Tính 15 tỷ số tài chính từ BCTC thô
# ==============================================================================
def compute_ratios(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính 15 tỷ số tài chính cốt lõi dùng cho mô hình PD (Probability of Default).

    Input: df chứa các cột BCTC thô (xem docstring đầu file).
    Output: df gốc + 15 cột tỷ số mới.
    """
    df = df.copy()

    # Hàm chia an toàn: tránh lỗi chia cho 0 / NaN
    def safe_div(a, b):
        b = b.replace(0, np.nan)
        return a / b

    # --- Nhóm 1: Khả năng thanh toán (Liquidity) ---
    # 1. current_ratio: Tài sản ngắn hạn / Nợ ngắn hạn
    #    Ý nghĩa: khả năng thanh toán ngắn hạn, >1 là an toàn
    df["current_ratio"] = safe_div(df["current_assets"], df["current_liabilities"])

    # 2. quick_ratio: (Tài sản ngắn hạn - Hàng tồn kho) / Nợ ngắn hạn
    #    Ý nghĩa: khả năng thanh toán nhanh, loại bỏ tài sản kém lỏng (tồn kho)
    df["quick_ratio"] = safe_div(
        df["current_assets"] - df["inventory"], df["current_liabilities"]
    )

    # 3. cash_ratio: Tiền và tương đương tiền / Nợ ngắn hạn
    #    Ý nghĩa: khả năng trả nợ ngắn hạn ngay lập tức bằng tiền mặt
    df["cash_ratio"] = safe_div(df["cash_and_equiv"], df["current_liabilities"])

    # --- Nhóm 2: Đòn bẩy tài chính (Leverage) ---
    # 4. debt_to_equity: Tổng nợ / Vốn chủ sở hữu
    #    Ý nghĩa: mức độ sử dụng nợ so với vốn tự có, càng cao càng rủi ro
    df["debt_to_equity"] = safe_div(df["total_liabilities"], df["total_equity"])

    # 5. debt_to_assets: Tổng nợ / Tổng tài sản
    #    Ý nghĩa: tỷ trọng tài sản được tài trợ bằng nợ
    df["debt_to_assets"] = safe_div(df["total_liabilities"], df["total_assets"])

    # 6. long_term_debt_to_equity: Nợ dài hạn / Vốn chủ sở hữu
    #    Ý nghĩa: gánh nặng nợ dài hạn so với vốn chủ - ảnh hưởng PD dài hạn
    df["long_term_debt_to_equity"] = safe_div(df["long_term_debt"], df["total_equity"])

    # --- Nhóm 3: Khả năng trả nợ từ hoạt động (Coverage) ---
    # 7. cfo_to_debt: Dòng tiền hoạt động (CFO) / Tổng nợ
    #    Ý nghĩa: khả năng trả nợ từ dòng tiền hoạt động kinh doanh thực tế
    #    -> tỷ số được cho là dự báo PD tốt hơn lợi nhuận kế toán
    df["cfo_to_debt"] = safe_div(df["operating_cash_flow"], df["total_liabilities"])

    # 8. interest_coverage proxy: EBIT / Nợ dài hạn (proxy do thiếu chi phí lãi vay riêng)
    #    Ý nghĩa: khả năng "gánh" nghĩa vụ nợ dài hạn từ lợi nhuận hoạt động
    df["ebit_to_long_term_debt"] = safe_div(df["ebit"], df["long_term_debt"])

    # --- Nhóm 4: Hiệu quả hoạt động (Efficiency) ---
    # 9. asset_turnover: Doanh thu / Tổng tài sản
    #    Ý nghĩa: hiệu quả sử dụng tài sản để tạo doanh thu
    df["asset_turnover"] = safe_div(df["revenue"], df["total_assets"])

    # 10. inventory_turnover proxy: Doanh thu / Hàng tồn kho
    #     Ý nghĩa: tốc độ luân chuyển hàng tồn kho - tồn kho ứ đọng là dấu hiệu rủi ro
    df["inventory_turnover"] = safe_div(df["revenue"], df["inventory"])

    # --- Nhóm 5: Khả năng sinh lời (Profitability) ---
    # 11. ebitda_margin: EBITDA / Doanh thu  (EBITDA = EBIT + D&A)
    #     Ý nghĩa: biên lợi nhuận hoạt động trước khấu hao - đo "sức khỏe" cốt lõi
    df["ebitda"] = df["ebit"] + df["depreciation_amortization"]
    df["ebitda_margin"] = safe_div(df["ebitda"], df["revenue"])

    # 12. net_profit_margin: Lợi nhuận sau thuế / Doanh thu
    #     Ý nghĩa: biên lợi nhuận cuối cùng, phản ánh hiệu quả tổng thể
    df["net_profit_margin"] = safe_div(df["net_income"], df["revenue"])

    # 13. roa: Lợi nhuận sau thuế / Tổng tài sản
    #     Ý nghĩa: hiệu suất sinh lời trên tổng tài sản
    df["roa"] = safe_div(df["net_income"], df["total_assets"])

    # 14. retained_earnings_to_assets: LN giữ lại / Tổng tài sản
    #     Ý nghĩa: thước đo tích lũy lợi nhuận qua thời gian (1 thành phần Altman Z)
    df["retained_earnings_to_assets"] = safe_div(df["retained_earnings"], df["total_assets"])

    # --- Nhóm 6: Tăng trưởng (Growth) ---
    # 15. revenue_growth_yoy: (Doanh thu kỳ này - Doanh thu cùng kỳ năm trước) / Doanh thu cùng kỳ năm trước
    #     Ý nghĩa: xu hướng tăng trưởng - doanh thu sụt giảm liên tục là tín hiệu cảnh báo PD
    #     Lưu ý: cần dữ liệu theo quý, sort theo ticker + thời gian, lag = 4 quý
    df = df.sort_values(["ticker", "year", "quarter"]).reset_index(drop=True)
    df["revenue_growth_yoy"] = (
        df.groupby("ticker")["revenue"]
        .pct_change(periods=4)  # lệch 4 quý = cùng kỳ năm trước
    )

    # 16. log_total_assets: Quy mô tuyệt đối (Size)
    df["log_total_assets"] = np.log1p(df["total_assets"])

    # 17. is_retail: Phân tách nhóm ngành Bán lẻ/Tiêu dùng
    retail_tickers = {'MWG', 'DGW', 'PNJ', 'MSN'}
    df["is_retail"] = df["ticker"].isin(retail_tickers).astype(float)

    return df


# ==============================================================================
# 2. ADD_TIME_FEATURES - Rolling mean 4 quý & biến động theo tháng/quý (MoM)
# ==============================================================================
def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính các đặc trưng theo thời gian: rolling mean 4 quý và % thay đổi
    theo kỳ liền trước (QoQ - quarter over quarter, tương tự MoM nhưng
    theo đơn vị quý vì BCTC công khai là theo quý).

    Yêu cầu: df đã có các cột tỷ số từ compute_ratios() và đã sort theo
    (ticker, year, quarter).
    """
    df = df.copy()
    df = df.sort_values(["ticker", "year", "quarter"]).reset_index(drop=True)

    # Các tỷ số cốt lõi cần tính rolling & QoQ change
    core_ratios = [
        "current_ratio", "debt_to_equity", "cfo_to_debt",
        "ebitda_margin", "net_profit_margin", "roa", "asset_turnover",
    ]

    grouped = df.groupby("ticker")

    for col in core_ratios:
        if col not in df.columns:
            continue

        # --- Rolling mean 4 quý ---
        # Ý nghĩa: làm mượt biến động ngắn hạn (theo mùa), phản ánh xu hướng
        # trung hạn của doanh nghiệp - quan trọng vì BCTC quý dao động mạnh
        df[f"{col}_roll4q_mean"] = (
            grouped[col]
            .transform(lambda s: s.rolling(window=4, min_periods=2).mean())
        )

        # --- QoQ change (tương đương MoM nhưng theo quý) ---
        # Ý nghĩa: tốc độ thay đổi so với quý liền trước - phát hiện
        # "cú sốc" / suy giảm đột ngột, dấu hiệu cảnh báo sớm rủi ro
        df[f"{col}_qoq_change"] = grouped[col].transform(lambda s: s.pct_change(periods=1))

    return df


# ==============================================================================
# 3. ADD_MACRO_FEATURES - Merge chỉ số vĩ mô theo năm-quý
# ==============================================================================
def add_macro_features(df: pd.DataFrame, macro_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge các chỉ số vĩ mô (từ World Bank) vào dataset theo (year, quarter).

    Input:
      df       : DataFrame doanh nghiệp đã có các tỷ số tài chính + time features
      macro_df : DataFrame vĩ mô, bắt buộc có cột 'year' và 'quarter',
                 cùng các cột chỉ số như:
                   - gdp_growth   : Tăng trưởng GDP (%) - chu kỳ kinh tế vĩ mô
                   - lending_rate : Lãi suất cho vay (%) - chi phí vốn thị trường
                   - cpi_inflation: Lạm phát CPI (%) (tuỳ chọn, nếu có)

    Lưu ý: Nếu macro_df chỉ có dữ liệu theo NĂM (không theo quý), hàm sẽ
    tự động "trải" (broadcast) giá trị năm đó cho cả 4 quý.
    """
    df = df.copy()
    macro_df = macro_df.copy()

    if "quarter" not in macro_df.columns:
        # Macro chỉ có theo năm -> nhân bản cho 4 quý
        macro_expanded = []
        for q in [1, 2, 3, 4]:
            tmp = macro_df.copy()
            tmp["quarter"] = q
            macro_expanded.append(tmp)
        macro_df = pd.concat(macro_expanded, ignore_index=True)

    merge_cols = ["year", "quarter"]
    macro_cols = [c for c in macro_df.columns if c not in merge_cols]

    merged = df.merge(macro_df[merge_cols + macro_cols], on=merge_cols, how="left")

    # gdp_growth: Tăng trưởng GDP (Từ World Bank)
    #   Ý nghĩa: phản ánh chu kỳ kinh tế vĩ mô - giai đoạn suy thoái thường
    #   đi kèm tỷ lệ default tăng trên toàn thị trường (yếu tố hệ thống)
    # lending_rate: Lãi suất cho vay (Từ World Bank)
    #   Ý nghĩa: chi phí vốn thị trường - lãi suất tăng làm tăng gánh nặng
    #   trả nợ của doanh nghiệp, đặc biệt doanh nghiệp đòn bẩy cao

    missing_macro = ["gdp_growth", "lending_rate"]
    for col in missing_macro:
        if col not in merged.columns:
            print(f"[CẢNH BÁO] Thiếu cột vĩ mô '{col}' trong macro_df.")

    return merged


# ==============================================================================
# 4. PREPROCESS - Scale features (StandardScaler) + xử lý missing (median imputation)
# ==============================================================================
def preprocess(df: pd.DataFrame, label_col: str = "label_distress",
               id_cols=("ticker", "year", "quarter")):
    """
    Chuẩn hóa dữ liệu để đưa vào mô hình ML:
      1. Chọn các cột feature số (loại bỏ id_cols, label_col, và cột chuỗi).
      2. Impute missing values bằng MEDIAN của từng cột (robust với outlier
         hơn mean - phù hợp với dữ liệu tài chính có nhiều giá trị cực trị).
      3. Scale toàn bộ features bằng StandardScaler (mean=0, std=1) -
         cần thiết cho các mô hình nhạy với scale (Logistic Regression, SVM,
         Neural Network, Quantum ML...).

    Input:
      df       : DataFrame đầy đủ sau compute_ratios + add_time_features + add_macro_features
      label_col: tên cột nhãn (mặc định 'label_distress')
      id_cols  : các cột định danh không dùng làm feature

    Output:
      X       : pd.DataFrame features đã scale + impute, sẵn sàng để train
      y       : pd.Series nhãn (0/1)
      scaler  : đối tượng StandardScaler đã fit (dùng lại khi predict dữ liệu mới)
      imputer : đối tượng SimpleImputer đã fit (dùng lại khi predict dữ liệu mới)
      feature_names : danh sách tên cột feature (để map ngược khi cần)
    """
    df = df.copy()

    if label_col not in df.columns:
        raise ValueError(f"Không tìm thấy cột label '{label_col}' trong df.")

    y = df[label_col].copy()

    # Chọn các cột số, loại id_cols, label_col và các cột nhiễu (toàn NaN hoặc variance = 0)
    # Loại bỏ các cột nguyên thủy dạng số tuyệt đối (VND) để tránh spurious correlation do chênh lệch quy mô (như tổng tài sản, hàng tồn kho)
    raw_financial_cols = [
        'revenue', 'net_income', 'ebit', 'depreciation_amortization',
        'current_assets', 'current_liabilities', 'total_assets', 'total_liabilities',
        'total_equity', 'long_term_debt', 'operating_cash_flow', 'cash_and_equiv',
        'inventory', 'retained_earnings', 'ebitda'
    ]
    
    # Loại bỏ các cột làm nhiễu mô hình hoặc gây bias ngành nghề (theo user feedback)
    buggy_cols = [
        'log_total_assets',
        'ebitda_margin_roll4q_mean',
        'ebitda_margin',
        'ebitda_margin_qoq_change'
    ]
    
    drop_cols = list(id_cols) + [label_col] + ['revenue_growth_yoy', 'gdp_growth', 'cpi_inflation', 'lending_rate'] + raw_financial_cols + buggy_cols
    feature_cols = [
        c for c in df.columns
        if c not in drop_cols and pd.api.types.is_numeric_dtype(df[c])
    ]

    X_raw = df[feature_cols].copy()

    # --- Xử lý infinity (do chia 0 bị bỏ qua tạo ra inf) -> coi như NaN ---
    X_raw = X_raw.replace([np.inf, -np.inf], np.nan)

    # --- Bước A: Median Imputation ---
    # Dùng median thay vì mean vì tỷ số tài chính thường có phân phối lệch
    # (skewed) và nhiều outlier (vd: debt_to_equity của doanh nghiệp gần
    # phá sản có thể rất lớn) -> median ổn định hơn.
    imputer = SimpleImputer(strategy="median")
    X_imputed = pd.DataFrame(
        imputer.fit_transform(X_raw),
        columns=feature_cols,
        index=X_raw.index,
    )

    # --- Bước B: StandardScaler ---
    # Đưa toàn bộ feature về cùng thang đo (mean=0, std=1), tránh việc
    # các feature có giá trị lớn (vd: total_assets nếu lỡ chưa loại)
    # lấn át các tỷ số nhỏ (vd: net_profit_margin ~ 0.05) trong mô hình.
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(
        scaler.fit_transform(X_imputed),
        columns=feature_cols,
        index=X_imputed.index,
    )

    return X_scaled, y, scaler, imputer, feature_cols


# ==============================================================================
# PIPELINE TỔNG HỢP - chạy thử nghiệm
# ==============================================================================
if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    # Đọc dữ liệu BCTC thô và dữ liệu vĩ mô
    raw_df = pd.read_csv("data/raw_bctc_quarterly.csv", sep=";")
    macro_df = pd.read_csv("data/macro.csv", sep=";")

    print("Bước 1: compute_ratios ...")
    df = compute_ratios(raw_df)

    print("Bước 2: add_time_features ...")
    df = add_time_features(df)

    print("Bước 3: add_macro_features ...")
    df = add_macro_features(df, macro_df)

    print("Bước 4: preprocess ...")
    X, y, scaler, imputer, feature_names = preprocess(df)

    print(f"\nSố lượng features: {len(feature_names)}")
    print(f"Kích thước X: {X.shape}, y: {y.shape}")
    print(f"Phân phối label:\n{y.value_counts()}")
    print(f"\n5 dòng đầu của X (đã scale):\n{X.head()}")
