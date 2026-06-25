"""
================================================================================
PD SCORING DASHBOARD - Data Preparation Script
Nhóm 3: AI cho Quản trị Rủi ro và Tuân thủ
================================================================================

INPUT:
  - data/raw_bctc.csv  : Báo cáo tài chính doanh nghiệp (từ Vietstock/CafeF/SSC)
  - data/macro.csv     : Chỉ số vĩ mô Việt Nam (từ World Bank API)

OUTPUT:
  - data/clean_dataset.csv : Dataset sạch, có financial ratios + label PD proxy

LƯU Ý KHAI BÁO (theo Điều 14 - Thể lệ cuộc thi):
  Script này được viết với hỗ trợ của AI (Claude). Logic tính toán, lựa chọn
  công thức Altman Z'-score biến thể và ngưỡng phân loại do nhóm quyết định
  và cần được review/điều chỉnh trước khi dùng cho báo cáo chính thức.
================================================================================
"""

import pandas as pd
import numpy as np

# ------------------------------------------------------------------------------
# CẤU HÌNH CỘT ĐẦU VÀO MONG ĐỢI TRONG raw_bctc.csv
# ------------------------------------------------------------------------------
# Mỗi dòng = 1 doanh nghiệp x 1 năm. Các cột bắt buộc (đơn vị: VND, đồng nhất):
#   ticker              : Mã cổ phiếu
#   year                : Năm báo cáo
#   revenue             : Doanh thu thuần
#   net_income          : Lợi nhuận sau thuế
#   retained_earnings   : Lợi nhuận giữ lại (LNST chưa phân phối)
#   total_assets        : Tổng tài sản
#   current_assets      : Tài sản ngắn hạn
#   current_liabilities : Nợ ngắn hạn
#   long_term_debt      : Nợ dài hạn
#   total_liabilities   : Tổng nợ phải trả
#   total_equity        : Vốn chủ sở hữu
#   ebit                : Lợi nhuận trước thuế và lãi vay (LNTT + chi phí lãi vay)
#   operating_cash_flow : Lưu chuyển tiền thuần từ HĐKD
#   cash_and_equiv      : Tiền và tương đương tiền
#
# Nếu thiếu cột nào, script sẽ cảnh báo và bỏ qua tỷ số liên quan.
# ------------------------------------------------------------------------------

RAW_BCTC_PATH = "data/raw_bctc.csv"
MACRO_PATH = "data/macro.csv"
OUTPUT_PATH = "data/clean_dataset.csv"

REQUIRED_COLS = [
    "ticker", "year", "revenue", "net_income", "retained_earnings",
    "total_assets", "current_assets", "current_liabilities",
    "long_term_debt", "total_liabilities", "total_equity",
    "ebit", "operating_cash_flow", "cash_and_equiv",
]


def load_and_validate(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        print(f"[CẢNH BÁO] Thiếu các cột sau trong {path}: {missing}")
        print("  -> Một số tỷ số tài chính liên quan sẽ bị bỏ qua (NaN).")

    # Loại trùng (ticker, year)
    before = len(df)
    df = df.drop_duplicates(subset=["ticker", "year"])
    after = len(df)
    if before != after:
        print(f"[INFO] Đã loại {before - after} dòng trùng (ticker, year).")

    # Loại dòng thiếu total_assets <= 0 (chia 0)
    if "total_assets" in df.columns:
        bad = df["total_assets"].isna() | (df["total_assets"] <= 0)
        if bad.sum() > 0:
            print(f"[INFO] Loại {bad.sum()} dòng có total_assets <= 0 hoặc NaN.")
            df = df[~bad]

    return df.reset_index(drop=True)


def safe_div(numerator, denominator):
    """Chia an toàn, trả NaN nếu mẫu số = 0 hoặc NaN."""
    denominator = denominator.replace(0, np.nan)
    return numerator / denominator


def compute_financial_ratios(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính các tỷ số tài chính dùng làm FEATURES cho mô hình PD.
    """
    df = df.copy()

    # 1. Current ratio = TS ngắn hạn / Nợ ngắn hạn
    df["current_ratio"] = safe_div(df["current_assets"], df["current_liabilities"])

    # 2. Debt to equity = Tổng nợ / VCSH
    df["debt_to_equity"] = safe_div(df["total_liabilities"], df["total_equity"])

    # 3. Asset turnover = Doanh thu / Tổng tài sản
    df["asset_turnover"] = safe_div(df["revenue"], df["total_assets"])

    # 4. Operating cash flow ratio = CF HĐKD / Nợ ngắn hạn
    df["operating_cash_flow_ratio"] = safe_div(
        df["operating_cash_flow"], df["current_liabilities"]
    )

    # 5. Revenue growth (YoY) - cần sort theo ticker, year
    df = df.sort_values(["ticker", "year"]).reset_index(drop=True)
    df["revenue_growth"] = (
        df.groupby("ticker")["revenue"].pct_change()
    )

    # Một vài tỷ số bổ trợ hữu ích cho dashboard PD
    df["net_profit_margin"] = safe_div(df["net_income"], df["revenue"])
    df["roa"] = safe_div(df["net_income"], df["total_assets"])
    df["cash_ratio"] = safe_div(df["cash_and_equiv"], df["current_liabilities"])

    return df


def compute_altman_zscore_proxy(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính Altman Z'-score (biến thể cho thị trường mới nổi - Emerging Markets Z-score)
    và gán nhãn PD proxy (0 = Healthy, 1 = Distress).

    Công thức (Altman, Hartzell, Peck 1995 - EM scoring model dạng rút gọn):
        Z' = 6.56 * (Working Capital / Total Assets)
           + 3.26 * (Retained Earnings / Total Assets)
           + 6.72 * (EBIT / Total Assets)
           + 1.05 * (Equity / Total Liabilities)

    Ngưỡng phân loại (theo thể lệ đề xuất của nhóm):
        Z' < 1.1   -> Distress (label = 1)
        Z' > 2.6   -> Healthy  (label = 0)
        1.1 <= Z' <= 2.6 -> Grey zone (label = 1, conservative; có thể đổi sang -1
                            nếu nhóm muốn loại khỏi training set)

    QUAN TRỌNG: Đây là PROXY LABEL, không phải dữ liệu vỡ nợ thực tế từ CIC/NHNN.
    Cần khai báo rõ trong báo cáo (Tiêu chí 11.1 mục 4 - Tính khả thi của dữ liệu).
    """
    df = df.copy()

    working_capital = df["current_assets"] - df["current_liabilities"]

    df["zscore_working_capital_ratio"] = safe_div(working_capital, df["total_assets"])
    df["zscore_retained_earnings_ratio"] = safe_div(df["retained_earnings"], df["total_assets"])
    df["zscore_ebit_ratio"] = safe_div(df["ebit"], df["total_assets"])
    df["zscore_equity_to_liabilities"] = safe_div(df["total_equity"], df["total_liabilities"])

    df["altman_zscore"] = (
        6.56 * df["zscore_working_capital_ratio"]
        + 3.26 * df["zscore_retained_earnings_ratio"]
        + 6.72 * df["zscore_ebit_ratio"]
        + 1.05 * df["zscore_equity_to_liabilities"]
    )

    # Phân loại nhãn PD proxy
    conditions = [
        df["altman_zscore"] < 1.1,
        df["altman_zscore"] > 2.6,
    ]
    choices = [1, 0]  # 1 = Distress, 0 = Healthy
    df["label_distress"] = np.select(conditions, choices, default=1)  # grey zone -> 1 (conservative)

    df["zscore_zone"] = pd.cut(
        df["altman_zscore"],
        bins=[-np.inf, 1.1, 2.6, np.inf],
        labels=["Distress", "Grey Zone", "Healthy"],
    )

    return df


def load_macro(path: str) -> pd.DataFrame:
    """
    Load dữ liệu vĩ mô (World Bank API export).
    Cột mong đợi: year, gdp_growth, cpi_inflation, lending_rate
    (đặt tên cột tuỳ ý, chỉ cần có cột 'year' để merge)
    """
    macro = pd.read_csv(path)
    if "year" not in macro.columns:
        raise ValueError(f"{path} phải có cột 'year' để merge với BCTC.")
    macro = macro.drop_duplicates(subset=["year"])
    return macro


def main():
    print("=" * 60)
    print("BƯỚC 1: Đọc và làm sạch dữ liệu BCTC")
    print("=" * 60)
    bctc = load_and_validate(RAW_BCTC_PATH)
    print(f"  -> {len(bctc)} dòng (doanh nghiệp x năm) sau làm sạch.")

    print("\n" + "=" * 60)
    print("BƯỚC 2: Tính các tỷ số tài chính")
    print("=" * 60)
    bctc = compute_financial_ratios(bctc)
    print("  -> Đã tính: current_ratio, debt_to_equity, asset_turnover,")
    print("     operating_cash_flow_ratio, revenue_growth, roa, net_profit_margin, cash_ratio")

    print("\n" + "=" * 60)
    print("BƯỚC 3: Tính Altman Z'-score và nhãn PD proxy")
    print("=" * 60)
    bctc = compute_altman_zscore_proxy(bctc)
    label_counts = bctc["label_distress"].value_counts().to_dict()
    print(f"  -> Phân phối nhãn (0=Healthy, 1=Distress): {label_counts}")
    print(f"  -> Phân phối vùng Z-score:\n{bctc['zscore_zone'].value_counts()}")

    print("\n" + "=" * 60)
    print("BƯỚC 4: Merge với dữ liệu vĩ mô theo năm")
    print("=" * 60)
    macro = load_macro(MACRO_PATH)
    merged = bctc.merge(macro, on="year", how="left")
    missing_macro = merged[macro.columns.drop("year")].isna().all(axis=1).sum()
    if missing_macro > 0:
        print(f"[CẢNH BÁO] {missing_macro} dòng không khớp năm với dữ liệu vĩ mô.")
    print(f"  -> Dataset sau merge: {merged.shape[0]} dòng x {merged.shape[1]} cột")

    print("\n" + "=" * 60)
    print(f"BƯỚC 5: Xuất file {OUTPUT_PATH}")
    print("=" * 60)
    merged.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print(f"  -> Đã lưu {OUTPUT_PATH}")

    # In tóm tắt cuối
    print("\n" + "=" * 60)
    print("TÓM TẮT DATASET")
    print("=" * 60)
    print(merged[[
        "ticker", "year", "current_ratio", "debt_to_equity",
        "altman_zscore", "label_distress"
    ]].head(10).to_string(index=False))


if __name__ == "__main__":
    main()
