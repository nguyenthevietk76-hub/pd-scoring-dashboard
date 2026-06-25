import os
import sys
import io
import json
import pandas as pd
import warnings

warnings.filterwarnings('ignore')

# Thêm BASE_DIR vào sys.path để import từ backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.predict import predict_pd

# Đường dẫn file
RAW_DATA_PATH = os.path.join(BASE_DIR, 'data', 'raw_bctc_quarterly.csv')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend', 'src')
OUTPUT_PATH = os.path.join(FRONTEND_DIR, 'demoData.json')

os.makedirs(FRONTEND_DIR, exist_ok=True)

COMPANY_NAMES = {
    # === Batch 1 (23 mã gốc) ===
    'DGW': 'Công ty Cổ phần Thế Giới Số',
    'DPM': 'Tổng Công ty Phân bón và Hóa chất Dầu khí',
    'FPT': 'Công ty Cổ phần FPT',
    'GAS': 'Tổng Công ty Khí Việt Nam',
    'GMD': 'Công ty Cổ phần Gemadept',
    'HAG': 'Công ty Cổ phần Hoàng Anh Gia Lai',
    'HPG': 'Công ty Cổ phần Tập đoàn Hòa Phát',
    'HVN': 'Tổng Công ty Hàng không Việt Nam',
    'KDH': 'Công ty Cổ phần Đầu tư và Kinh doanh nhà Khang Điền',
    'MSN': 'Công ty Cổ phần Tập đoàn Masan',
    'MWG': 'Công ty Cổ phần Đầu tư Thế Giới Di Động',
    'NVL': 'Công ty Cổ phần Tập đoàn Đầu tư Địa ốc No Va',
    'PDR': 'Công ty Cổ phần Phát triển Bất động sản Phát Đạt',
    'PLX': 'Tập đoàn Xăng Dầu Việt Nam',
    'PNJ': 'Công ty Cổ phần Vàng Bạc Đá Quý Phú Nhuận',
    'REE': 'Công ty Cổ phần Cơ Điện Lạnh',
    'ROS': 'Công ty Cổ phần Xây dựng FLC Faros',
    'SAB': 'Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Sài Gòn',
    'SBT': 'Công ty Cổ phần Thành Thành Công - Biên Hòa',
    'SSI': 'Công ty Cổ phần Chứng khoán SSI',
    'VIC': 'Tập đoàn Vingroup',
    'VNM': 'Công ty Cổ phần Sữa Việt Nam',
    'VRE': 'Công ty Cổ phần Vincom Retail',
    # === Batch 2 (50 mã mới) ===
    'AAA': 'Công ty Cổ phần Nhựa An Phát Xanh',
    'AGG': 'Công ty Cổ phần Đầu tư và Phát triển Bất động sản An Gia',
    'ANV': 'Công ty Cổ phần Nam Việt',
    'BCM': 'Tổng Công ty Đầu tư và Phát triển Công nghiệp - CTCP',
    'BSR': 'Công ty Cổ phần Lọc Hóa dầu Bình Sơn',
    'CEO': 'Công ty Cổ phần Tập đoàn C.E.O',
    'CMG': 'Công ty Cổ phần Tập đoàn Công nghệ CMC',
    'CSM': 'Công ty Cổ phần Công nghiệp Cao su Miền Nam',
    'CSV': 'Công ty Cổ phần Hóa chất Cơ bản Miền Nam',
    'CTD': 'Công ty Cổ phần Xây dựng Coteccons',
    'DBT': 'Công ty Cổ phần Dược phẩm Bến Tre',
    'DHC': 'Công ty Cổ phần Đông Hải Bến Tre',
    'DIG': 'Tổng Công ty Cổ phần Đầu tư Phát triển Xây dựng',
    'DPG': 'Công ty Cổ phần Đạt Phương',
    'DRC': 'Công ty Cổ phần Cao su Đà Nẵng',
    'DXS': 'Công ty Cổ phần Dịch vụ Bất động sản Đất Xanh',
    'ELC': 'Công ty Cổ phần Đầu tư Phát triển Công nghệ Điện tử Viễn thông',
    'FCN': 'Công ty Cổ phần FECON',
    'FRT': 'Công ty Cổ phần Bán lẻ Kỹ thuật số FPT',
    'GEX': 'Công ty Cổ phần Tập đoàn GELEX',
    'GIL': 'Công ty Cổ phần Sản xuất Kinh doanh Xuất nhập khẩu Bình Thạnh',
    'HDC': 'Công ty Cổ phần Phát triển Nhà Bà Rịa - Vũng Tàu',
    'HQC': 'Công ty Cổ phần Tư vấn - Thương mại - Dịch vụ Địa ốc Hoàng Quân',
    'HT1': 'Công ty Cổ phần Xi Măng Hà Tiên 1',
    'HUT': 'Công ty Cổ phần Tasco',
    'IDI': 'Công ty Cổ phần Đầu tư và Phát triển Đa Quốc Gia I.D.I',
    'IJC': 'Công ty Cổ phần Phát triển Hạ tầng Kỹ thuật',
    'IMP': 'Công ty Cổ phần Dược phẩm Imexpharm',
    'KSB': 'Công ty Cổ phần Khoáng sản và Xây dựng Bình Dương',
    'NHA': 'Tổng Công ty Đầu tư Phát triển Nhà và Đô thị Nam Hà Nội',
    'NT2': 'Công ty Cổ phần Điện lực Dầu khí Nhơn Trạch 2',
    'PAN': 'Công ty Cổ phần Tập đoàn PAN',
    'PET': 'Tổng Công ty Cổ phần Dịch vụ Tổng hợp Dầu khí',
    'PGV': 'Tổng Công ty Phát điện 3 - CTCP',
    'POM': 'Công ty Cổ phần Thép Pomina',
    'PVD': 'Tổng Công ty Cổ phần Khoan và Dịch vụ Khoan Dầu khí',
    'PVS': 'Tổng Công ty Cổ phần Dịch vụ Kỹ thuật Dầu khí Việt Nam',
    'PVT': 'Tổng Công ty Cổ phần Vận tải Dầu khí',
    'SCR': 'Công ty Cổ phần Địa ốc Sài Gòn Thương Tín',
    'SJS': 'Công ty Cổ phần Đầu tư Phát triển Đô thị và Khu công nghiệp Sông Đà',
    'SMC': 'Công ty Cổ phần Đầu tư Thương mại SMC',
    'STG': 'Công ty Cổ phần Kho vận Miền Nam',
    'STK': 'Công ty Cổ phần Sợi Thế Kỷ',
    'SZC': 'Công ty Cổ phần Sonadezi Châu Đức',
    'TCL': 'Công ty Cổ phần Đại lý Giao nhận Vận tải Xếp dỡ Tân Cảng',
    'TCM': 'Công ty Cổ phần Dệt may - Đầu tư - Thương mại Thành Công',
    'TLH': 'Công ty Cổ phần Tập đoàn Thép Tiến Lên',
    'TRA': 'Công ty Cổ phần Traphaco',
    'VCG': 'Tổng Công ty Cổ phần Xuất nhập khẩu và Xây dựng Việt Nam',
    'VGS': 'Công ty Cổ phần Ống thép Việt Đức',
}

COMPANY_SECTORS = {
    # === Batch 1 (23 mã gốc) ===
    'DGW': 'Bán lẻ',
    'DPM': 'Hóa chất',
    'FPT': 'Công nghệ',
    'GAS': 'Dầu khí',
    'GMD': 'Logistics',
    'HAG': 'Nông nghiệp',
    'HPG': 'Thép',
    'HVN': 'Hàng không',
    'KDH': 'Bất động sản',
    'MSN': 'Tiêu dùng',
    'MWG': 'Bán lẻ',
    'NVL': 'Bất động sản',
    'PDR': 'Bất động sản',
    'PLX': 'Dầu khí',
    'PNJ': 'Bán lẻ',
    'REE': 'Tiện ích',
    'ROS': 'Xây dựng',
    'SAB': 'Thực phẩm - Đồ uống',
    'SBT': 'Nông nghiệp',
    'SSI': 'Tài chính',
    'VIC': 'Bất động sản',
    'VNM': 'Thực phẩm - Đồ uống',
    'VRE': 'Bất động sản',
    # === Batch 2 (50 mã mới) ===
    'AAA': 'Nhựa - Bao bì',
    'AGG': 'Bất động sản',
    'ANV': 'Thủy sản',
    'BCM': 'Bất động sản KCN',
    'BSR': 'Dầu khí',
    'CEO': 'Bất động sản',
    'CMG': 'Công nghệ',
    'CSM': 'Cao su',
    'CSV': 'Hóa chất',
    'CTD': 'Xây dựng',
    'DBT': 'Dược phẩm',
    'DHC': 'Giấy - Bao bì',
    'DIG': 'Bất động sản',
    'DPG': 'Xây dựng',
    'DRC': 'Cao su',
    'DXS': 'Bất động sản',
    'ELC': 'Công nghệ',
    'FCN': 'Xây dựng',
    'FRT': 'Bán lẻ',
    'GEX': 'Công nghiệp',
    'GIL': 'Dệt may',
    'HDC': 'Bất động sản',
    'HQC': 'Bất động sản',
    'HT1': 'Vật liệu xây dựng',
    'HUT': 'Xây dựng',
    'IDI': 'Thủy sản',
    'IJC': 'Bất động sản KCN',
    'IMP': 'Dược phẩm',
    'KSB': 'Khoáng sản',
    'NHA': 'Bất động sản',
    'NT2': 'Điện lực',
    'PAN': 'Nông nghiệp',
    'PET': 'Dầu khí',
    'PGV': 'Điện lực',
    'POM': 'Thép',
    'PVD': 'Dầu khí',
    'PVS': 'Dầu khí',
    'PVT': 'Vận tải',
    'SCR': 'Bất động sản',
    'SJS': 'Bất động sản KCN',
    'SMC': 'Thép',
    'STG': 'Logistics',
    'STK': 'Dệt may',
    'SZC': 'Bất động sản KCN',
    'TCL': 'Logistics',
    'TCM': 'Dệt may',
    'TLH': 'Thép',
    'TRA': 'Dược phẩm',
    'VCG': 'Xây dựng',
    'VGS': 'Thép',
}

FEATURE_LABELS_VI = {
    # 1. BCTC gốc
    'revenue': 'Doanh thu thuần',
    'net_income': 'Lợi nhuận sau thuế',
    'ebit': 'Lợi nhuận HĐKD (EBIT)',
    'depreciation_amortization': 'Khấu hao',
    'current_assets': 'Tài sản ngắn hạn',
    'current_liabilities': 'Nợ ngắn hạn',
    'total_assets': 'Tổng tài sản',
    'total_liabilities': 'Tổng nợ',
    'total_equity': 'Vốn chủ sở hữu',
    'long_term_debt': 'Nợ dài hạn',
    'operating_cash_flow': 'Dòng tiền HĐKD',
    'cash_and_equiv': 'Tiền & Tương đương tiền',
    'inventory': 'Hàng tồn kho',
    'retained_earnings': 'LN chưa phân phối',

    # 2. Ratios
    'current_ratio': 'Tỷ số thanh toán hiện hành',
    'quick_ratio': 'Tỷ số thanh toán nhanh',
    'cash_ratio': 'Tỷ số thanh toán tiền mặt',
    'debt_to_equity': 'Nợ trên Vốn chủ sở hữu',
    'debt_to_assets': 'Nợ trên Tổng tài sản',
    'long_term_debt_to_equity': 'Nợ dài hạn / Vốn chủ',
    'cfo_to_debt': 'Dòng tiền HĐKD / Tổng nợ',
    'ebit_to_long_term_debt': 'EBIT / Nợ dài hạn',
    'asset_turnover': 'Vòng quay tổng tài sản',
    'inventory_turnover': 'Vòng quay hàng tồn kho',
    'ebitda': 'EBITDA',
    'ebitda_margin': 'Biên lợi nhuận EBITDA',
    'net_profit_margin': 'Biên lợi nhuận ròng',
    'roa': 'Tỷ suất LN/TS (ROA)',
    'retained_earnings_to_assets': 'LN chưa phân phối / Tổng tài sản',

    # 3. Time features (Rolling 4Q)
    'current_ratio_roll4q_mean': 'Tỷ số thanh toán hiện hành (TB 4Q)',
    'debt_to_equity_roll4q_mean': 'Nợ/VCSH (TB 4Q)',
    'cfo_to_debt_roll4q_mean': 'Dòng tiền HĐKD/Tổng nợ (TB 4Q)',
    'ebitda_margin_roll4q_mean': 'Biên LN EBITDA (TB 4Q)',
    'net_profit_margin_roll4q_mean': 'Biên LN ròng (TB 4Q)',
    'roa_roll4q_mean': 'ROA (TB 4Q)',
    'asset_turnover_roll4q_mean': 'Vòng quay tổng tài sản (TB 4Q)',

    # 4. Time features (QoQ change)
    'current_ratio_qoq_change': 'Biến động TS thanh toán hiện hành (QoQ)',
    'debt_to_equity_qoq_change': 'Biến động Nợ/VCSH (QoQ)',
    'cfo_to_debt_qoq_change': 'Biến động Dòng tiền HĐKD/Nợ (QoQ)',
    'ebitda_margin_qoq_change': 'Biến động Biên LN EBITDA (QoQ)',
    'net_profit_margin_qoq_change': 'Biến động Biên LN ròng (QoQ)',
    'roa_qoq_change': 'Biến động ROA (QoQ)',
    'asset_turnover_qoq_change': 'Biến động Vòng quay TS (QoQ)',
    
    # 5. Các biến mới thêm
    'log_total_assets': 'Quy mô tổng tài sản (Log)',
    'is_retail': 'Đặc thù ngành Bán lẻ/Tiêu dùng'
}

def get_label_vi(feature):
    return FEATURE_LABELS_VI.get(feature, feature)

def format_display_val(val):
    abs_val = abs(val)
    if abs_val > 1e9:
        return f"{val / 1e9:,.0f} tỷ VNĐ"
    elif abs_val <= 1:
        return f"{val * 100:.1f}%"
    else:
        return f"{val:,.2f}"

def run():
    print("Reading raw data...")
    raw_df = pd.read_csv(RAW_DATA_PATH, sep=';')
    
    tickers = raw_df['ticker'].unique()
    print(f"Total tickers found: {len(tickers)}")
    
    demo_companies = []
    risk_counts = {"Thấp": 0, "Trung bình": 0, "Cao": 0}
    
    for ticker in tickers:
        try:
            ticker_df = raw_df[raw_df['ticker'] == ticker].sort_values(['year', 'quarter'])
            
            if len(ticker_df) == 0:
                print(f"Warning: No data for {ticker}, skipping.")
                continue
                
            pd_scores_4q = []
            latest_res = None
            
            for _, row in ticker_df.iterrows():
                row_dict = row.drop(['ticker', 'year', 'quarter', 'label_distress']).to_dict()
                res = predict_pd(row_dict, model_name='logreg')
                
                pd_score_pct = round(res['pd_score'] * 100, 2)
                pd_scores_4q.append(pd_score_pct)
                latest_res = res
                
            top_factors = []
            import math
            for factor in latest_res['top_risk_factors']:
                raw_val = factor['raw_value']
                if pd.isna(raw_val) or (isinstance(raw_val, float) and math.isnan(raw_val)):
                    raw_val = 0.0
                top_factors.append({
                    "feature": factor['feature'],
                    "raw_val": round(raw_val, 4),
                    "display_val": format_display_val(raw_val),
                    "contribution": round(factor['risk_contribution'], 4),
                    "label_vi": get_label_vi(factor['feature'])
                })
                
            current_pd = pd_scores_4q[-1]
            if current_pd < 30:
                risk_level = "Thấp"
            elif current_pd < 60:
                risk_level = "Trung bình"
            else:
                risk_level = "Cao"
                
            risk_counts[risk_level] += 1
                
            demo_companies.append({
                "name": COMPANY_NAMES.get(ticker, f"Công ty Cổ phần {ticker}"),
                "ticker": ticker,
                "sector": COMPANY_SECTORS.get(ticker, "Khác"),
                "pd_scores_4q": pd_scores_4q[-4:],
                "current_pd": current_pd,
                "risk_level": risk_level,
                "top_factors": top_factors
            })
            
        except Exception as e:
            print(f"Warning: Failed processing {ticker}: {e}")
            
    print("-" * 50)
    print(f"Risk Distribution: Thấp: {risk_counts['Thấp']}, Trung bình: {risk_counts['Trung bình']}, Cao: {risk_counts['Cao']}")
    print("-" * 50)
        
    out_dict = {"companies": demo_companies}
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out_dict, f, ensure_ascii=False, indent=2)
        
    print(f"\nSaved successfully to {OUTPUT_PATH}!")

if __name__ == '__main__':
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8') if hasattr(sys.stdout, 'buffer') else sys.stdout
    run()
