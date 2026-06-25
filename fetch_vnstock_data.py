"""
================================================================================
FETCH BCTC DATA FROM VNSTOCK
Tự động tải BCTC (Bảng cân đối, KQKD, Lưu chuyển tiền tệ) theo quý
từ vnstock, map cột sang format feature_engineering.py cần.
================================================================================

LƯU Ý: Phiên bản cộng đồng (miễn phí) giới hạn tối đa 4 kỳ/ticker.
        Để có đủ dữ liệu cho model, cần nhiều ticker.
"""

import sys
import io
import warnings
import time
import traceback

# Fix encoding cho Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from vnstock import Vnstock

# ==============================================================================
# DANH SÁCH TICKER (đa dạng ngành, có cả healthy & distress tiềm năng)
# ==============================================================================
TICKERS = [
    # Large-cap / Blue chips (likely Healthy)
    'FPT',   # Công nghệ
    'HPG',   # Thép
    'VNM',   # Sữa
    'MWG',   # Bán lẻ điện tử
    'PNJ',   # Trang sức
    'GMD',   # Cảng - Logistics
    'REE',   # Đầu tư hạ tầng
    'VCB',   # Ngân hàng (loại nếu cấu trúc BCTC khác)
    'ACB',   # Ngân hàng
    'TCB',   # Ngân hàng
    # Mid-cap
    'DGW',   # Phân phối điện tử
    'VRE',   # BĐS thương mại
    'KDH',   # BĐS nhà ở
    'DPM',   # Phân bón
    'GAS',   # Dầu khí
    'PLX',   # Xăng dầu
    'SBT',   # Đường
    'HAG',   # Nông nghiệp (từng khó khăn tài chính)
    'HVN',   # Hàng không (từng lỗ lớn do COVID)
    'ROS',   # BĐS (rủi ro cao)
    # Thêm để tăng mẫu
    'MSN',   # Tập đoàn đa ngành
    'VIC',   # BĐS - tập đoàn
    'SAB',   # Bia rượu
    'BVH',   # Bảo hiểm
    'SSI',   # Chứng khoán
    'HDB',   # Ngân hàng
    'VPB',   # Ngân hàng
    'MBB',   # Ngân hàng
    'NVL',   # BĐS (từng khó khăn)
    'PDR',   # BĐS (từng khó khăn)
]


# ==============================================================================
# MAPPING: vnstock item_id -> feature_engineering.py column name
# ==============================================================================
# Dữ liệu vnstock trả về dạng pivot: mỗi quý là 1 cột, mỗi dòng là 1 item_id.
# Ta cần unpivot và map sang tên cột phù hợp.

# Balance Sheet mapping
BS_MAPPING = {
    'current_assets':              'current_assets',
    'current_liabilities':         'current_liabilities',
    'total_assets':                'total_assets',
    'liabilities':                 'total_liabilities',      # vnstock: "liabilities" = tổng nợ
    'owners_equity':               'total_equity',           # vnstock: "owners_equity" = VCSH
    'long_term_borrowings':        'long_term_debt',         # Vay dài hạn
    'cash_and_cash_equivalents':   'cash_and_equiv',         # Tiền và tương đương tiền
    'inventories_net':             'inventory',              # Hàng tồn kho (net)
    'undistributed_earnings':      'retained_earnings',      # Lợi nhuận chưa phân phối
}

# Income Statement mapping
IS_MAPPING = {
    'net_sales':                      'revenue',             # Doanh thu thuần
    'net_profit_loss_after_tax':      'net_income',          # Lợi nhuận sau thuế
    'operating_profit_loss':          'ebit',                # Lợi nhuận từ HĐKD (proxy EBIT)
}

# Cash Flow mapping
CF_MAPPING = {
    'depreciation_and_amortization':                    'depreciation_amortization',
    'net_cash_inflows_outflows_from_operating_activities': 'operating_cash_flow',
}


def extract_value_for_item(report_df, item_id, period_col):
    """Trích giá trị của 1 item_id trong 1 kỳ báo cáo."""
    rows = report_df[report_df['item_id'] == item_id]
    if rows.empty:
        return np.nan
    # Lấy dòng đầu tiên (có thể duplicate item_id do cấu trúc phân cấp)
    val = rows.iloc[0][period_col]
    try:
        return float(val) if pd.notna(val) else np.nan
    except (ValueError, TypeError):
        return np.nan


def parse_period(period_str):
    """Parse '2025-Q3' -> (2025, 3)"""
    parts = period_str.split('-Q')
    if len(parts) == 2:
        return int(parts[0]), int(parts[1])
    return None, None


def fetch_ticker_data(ticker, source='VCI'):
    """
    Fetch BS + IS + CF cho 1 ticker, unpivot và merge.
    Trả về DataFrame với các cột đã map.
    """
    try:
        stock = Vnstock().stock(symbol=ticker, source=source)

        bs = stock.finance.balance_sheet(period='quarter', lang='en')
        time.sleep(0.5)  # Tránh rate-limit
        is_ = stock.finance.income_statement(period='quarter', lang='en')
        time.sleep(0.5)
        cf = stock.finance.cash_flow(period='quarter', lang='en')
        time.sleep(0.5)

        # Lấy danh sách kỳ (columns dạng '2025-Q3', '2025-Q2', ...)
        period_cols = [c for c in bs.columns if '-Q' in c]
        if not period_cols:
            print(f"  [SKIP] {ticker}: Không tìm thấy cột kỳ báo cáo")
            return None

        rows = []
        for period_col in period_cols:
            year, quarter = parse_period(period_col)
            if year is None:
                continue

            row = {'ticker': ticker, 'year': year, 'quarter': quarter}

            # Extract Balance Sheet items
            for item_id, col_name in BS_MAPPING.items():
                row[col_name] = extract_value_for_item(bs, item_id, period_col)

            # Extract Income Statement items
            # Lưu ý: IS period cols có thể khác BS
            is_period_cols = [c for c in is_.columns if '-Q' in c]
            if period_col in is_period_cols:
                for item_id, col_name in IS_MAPPING.items():
                    row[col_name] = extract_value_for_item(is_, item_id, period_col)
            else:
                for col_name in IS_MAPPING.values():
                    row[col_name] = np.nan

            # Extract Cash Flow items
            cf_period_cols = [c for c in cf.columns if '-Q' in c]
            if period_col in cf_period_cols:
                for item_id, col_name in CF_MAPPING.items():
                    row[col_name] = extract_value_for_item(cf, item_id, period_col)
            else:
                for col_name in CF_MAPPING.values():
                    row[col_name] = np.nan

            rows.append(row)

        if not rows:
            return None

        df = pd.DataFrame(rows)
        return df

    except Exception as e:
        print(f"  [ERROR] {ticker}: {e}")
        traceback.print_exc()
        return None


def assign_distress_label(df):
    """
    Gán nhãn label_distress (0 = Healthy, 1 = Distress) theo logic cải tiến:
    - Sử dụng CFO bình quân rolling 4 quý để tránh nhiễu theo mùa.
    - Giảm ngưỡng thanh toán cho nhóm ngành Bán lẻ/Tiêu dùng (MWG, DGW, PNJ, MSN).
    - Hardcode nhãn cho các mã gặp sự kiện tín dụng thực tế (ROS, NVL).
    """
    # Đảm bảo được sắp xếp theo ticker, year, quarter
    df = df.sort_values(['ticker', 'year', 'quarter']).reset_index(drop=True)
    
    # 1. Tính toán CFO trung bình rolling 4 quý (hoặc tối thiểu 1 quý)
    cfo_roll4q = df.groupby('ticker')['operating_cash_flow'].transform(lambda x: x.rolling(4, min_periods=1).mean())
    
    conditions = pd.DataFrame(index=df.index)
    conditions['loss'] = (df['net_income'] < 0).astype(int)
    conditions['negative_equity'] = (df['total_equity'] < 0).astype(int)
    conditions['negative_cfo'] = (cfo_roll4q < 0).astype(int)
    
    # Phân nhóm ngành bán lẻ
    retail_tickers = {'MWG', 'DGW', 'PNJ', 'MSN'}
    is_retail = df['ticker'].isin(retail_tickers)
    
    current_ratio = df['current_assets'] / df['current_liabilities'].replace(0, np.nan)
    conditions['illiquid'] = np.where(
        is_retail,
        (current_ratio < 0.55).astype(int), # Retail sector can tolerate lower current ratio
        (current_ratio < 1.0).astype(int)
    )
    
    # Sự kiện tín dụng thực tế
    actual_default_tickers = {'ROS', 'NVL'}
    is_actual_default = df['ticker'].isin(actual_default_tickers).astype(int)
    
    score = conditions.sum(axis=1)
    combo_loss_cfo = (conditions['loss'] == 1) & (conditions['negative_cfo'] == 1)
    
    df['label_distress'] = ((score >= 2) | combo_loss_cfo | is_actual_default).astype(int)
    
    return df


def main():
    print("=" * 60)
    print("FETCH BCTC DATA FROM VNSTOCK")
    print("=" * 60)
    print(f"Số ticker: {len(TICKERS)}")
    print(f"Tickers: {TICKERS}")
    print()

    all_data = []
    success_count = 0
    fail_count = 0

    for i, ticker in enumerate(TICKERS, 1):
        print(f"[{i}/{len(TICKERS)}] Đang tải {ticker}...", end=" ", flush=True)
        df = fetch_ticker_data(ticker)
        if df is not None and len(df) > 0:
            all_data.append(df)
            success_count += 1
            print(f"OK ({len(df)} quý)")
        else:
            fail_count += 1
            print("FAIL")
        # Delay giữa các ticker để tránh bị rate-limit
        time.sleep(1)

    if not all_data:
        print("\n[CRITICAL] Không lấy được dữ liệu từ bất kỳ ticker nào!")
        sys.exit(1)

    # Gộp tất cả ticker
    raw_df = pd.concat(all_data, ignore_index=True)

    # Sort
    raw_df = raw_df.sort_values(['ticker', 'year', 'quarter']).reset_index(drop=True)

    # Gán label
    raw_df = assign_distress_label(raw_df)

    # Thứ tự cột chuẩn cho feature_engineering.py
    required_cols = [
        'ticker', 'year', 'quarter',
        'revenue', 'net_income', 'ebit', 'depreciation_amortization',
        'current_assets', 'current_liabilities',
        'total_assets', 'total_liabilities', 'total_equity', 'long_term_debt',
        'operating_cash_flow', 'cash_and_equiv', 'inventory', 'retained_earnings',
        'label_distress',
    ]

    # Kiểm tra cột thiếu
    missing = [c for c in required_cols if c not in raw_df.columns]
    if missing:
        print(f"\n[WARNING] Thiếu cột: {missing}")

    # Sắp xếp cột
    final_df = raw_df[[c for c in required_cols if c in raw_df.columns]]

    # Lưu
    output_path = 'data/raw_bctc_quarterly.csv'
    final_df.to_csv(output_path, index=False)

    print()
    print("=" * 60)
    print("KẾT QUẢ")
    print("=" * 60)
    print(f"Tickers thành công: {success_count}/{len(TICKERS)}")
    print(f"Tickers thất bại:   {fail_count}/{len(TICKERS)}")
    print(f"Tổng số dòng:       {len(final_df)}")
    print(f"Số cột:             {len(final_df.columns)}")
    print(f"Cột:                {list(final_df.columns)}")
    print()
    print(f"Phân phối label_distress:")
    vc = final_df['label_distress'].value_counts().sort_index()
    for val, cnt in vc.items():
        label_name = 'Healthy' if val == 0 else 'Distress'
        print(f"  {val} ({label_name}): {cnt} ({cnt/len(final_df)*100:.1f}%)")
    print()
    print(f"Missing values per column:")
    for col in final_df.columns:
        n_miss = final_df[col].isna().sum()
        if n_miss > 0:
            print(f"  {col}: {n_miss} ({n_miss/len(final_df)*100:.1f}%)")
    print()
    print(f"5 dòng đầu:")
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 200)
    print(final_df.head().to_string())
    print()
    print(f"Đã lưu: {output_path}")


if __name__ == "__main__":
    main()
