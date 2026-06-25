"""
Module dự đoán Xác suất Vỡ nợ (Probability of Distress) cho 1 doanh nghiệp.
"""
import os
import sys
import io
import warnings
import numpy as np
import pandas as pd
import joblib

# Fix encoding cho Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
warnings.filterwarnings('ignore')

# Xác định đường dẫn tuyệt đối
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Load models và transformers 1 lần khi import module
print("Initializing ML Models...")
try:
    imputer = joblib.load(os.path.join(MODELS_DIR, 'imputer.pkl'))
    scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
    logreg_model = joblib.load(os.path.join(MODELS_DIR, 'logreg_pd_model.pkl'))
    rf_model = joblib.load(os.path.join(MODELS_DIR, 'rf_pd_model.pkl'))
except Exception as e:
    print(f"Warning: Không thể load models: {e}")

# Import compute_ratios từ thư mục cha
sys.path.insert(0, BASE_DIR)
from feature_engineering import compute_ratios

def predict_pd(raw_row: dict, model_name: str = "logreg") -> dict:
    """
    Dự đoán Probability of Distress (PD Score) cho 1 quý của doanh nghiệp.
    
    Args:
        raw_row (dict): Các giá trị BCTC cơ bản của 1 quý (doanh thu, lợi nhuận, tài sản...).
        model_name (str): 'logreg' (mặc định) hoặc 'rf'.
        
    Returns:
        dict: Chứa pd_score, risk_level và top_risk_factors.
    """
    # 1. Chuyển thành DataFrame
    df = pd.DataFrame([raw_row])
    
    # Thêm dummy id_cols nếu thiếu để compute_ratios() không bị lỗi khi sort_values
    if 'ticker' not in df.columns: df['ticker'] = 'DUMMY'
    if 'year' not in df.columns: df['year'] = 2099
    if 'quarter' not in df.columns: df['quarter'] = 1
    
    # Đảm bảo tất cả 14 cột BCTC cơ bản có mặt (thiếu thì điền NaN) để tránh KeyError trong compute_ratios()
    raw_bctc_cols = [
        'revenue', 'net_income', 'ebit', 'depreciation_amortization',
        'current_assets', 'current_liabilities', 'total_assets',
        'total_liabilities', 'total_equity', 'long_term_debt',
        'operating_cash_flow', 'cash_and_equiv', 'inventory', 'retained_earnings'
    ]
    for col in raw_bctc_cols:
        if col not in df.columns:
            df[col] = np.nan

    # 2. Tính toán các tỷ số tài chính (ratios)
    df = compute_ratios(df)
    
    # 3. Xử lý Time Features (roll4q_mean, qoq_change) cho input 1 dòng
    # Thay vì dùng rolling window (yêu cầu dữ liệu lịch sử 4 quý), ta áp dụng heuristic:
    # - Giá trị trung bình 4 quý (roll4q_mean) = giá trị hiện tại.
    # - Mức thay đổi so với quý trước (qoq_change) = 0.
    # Cách này giúp model đánh giá dựa hoàn toàn vào trạng thái HIỆN TẠI của quý này
    # mà không bị phạt (do median imputation gán giá trị lạ) khi thiếu lịch sử.
    time_cols = [
        'current_ratio', 'debt_to_equity', 'cfo_to_debt',
        'ebitda_margin', 'net_profit_margin', 'roa', 'asset_turnover'
    ]
    for col in time_cols:
        if col in df.columns:
            df[f"{col}_roll4q_mean"] = df[col]
            df[f"{col}_qoq_change"] = 0.0
            
    # Đảm bảo tất cả 43 cột của imputer/scaler có mặt (thiếu thì điền NaN)
    features_in = imputer.feature_names_in_
    for col in features_in:
        if col not in df.columns:
            df[col] = np.nan
            
    # Lấy đúng 43 cột và đúng thứ tự
    X_raw = df[features_in].copy()
    
    # Xử lý inf
    X_raw = X_raw.replace([np.inf, -np.inf], np.nan)
    
    # 4. Impute và Scale
    X_imputed = imputer.transform(X_raw)
    X_scaled = scaler.transform(X_imputed)
    
    # 5. Predict
    model = logreg_model if model_name == 'logreg' else rf_model
    proba = model.predict_proba(X_scaled)[0, 1]  # Xác suất lớp 1 (Distress)
    
    # Đánh giá Risk Level
    if proba < 0.3:
        risk_level = "Low"
    elif proba < 0.6:
        risk_level = "Medium"
    else:
        risk_level = "High"
        
    # 6. Tìm Top Risk Factors (Yếu tố góp phần làm tăng rủi ro nhất cho dòng này)
    top_risk_factors = []
    
    if model_name == 'logreg':
        # Đối với LogReg: Đóng góp của feature = hệ số góc (coef) * giá trị (scaled_value)
        # Ta tìm các features làm TĂNG xác suất (contribution > 0) nhiều nhất.
        coefs = model.coef_[0]
        contributions = coefs * X_scaled[0]
        
        # Lấy top 3 đóng góp dương lớn nhất
        top_indices = np.argsort(contributions)[::-1][:3]
        for idx in top_indices:
            feat_name = features_in[idx]
            contrib = float(contributions[idx])
            raw_val = float(X_raw.iloc[0, idx])
            scaled_val = float(X_scaled[0, idx])
            if contrib > 0:
                top_risk_factors.append({
                    'feature': feat_name,
                    'raw_value': raw_val,
                    'scaled_value': scaled_val,
                    'risk_contribution': contrib
                })
    else:
        # Đối với Random Forest, rất khó tính row-wise contribution nhanh chóng mà không dùng SHAP.
        # Tạm trả về Top 3 features quan trọng nhất global của model.
        importances = model.feature_importances_
        top_indices = np.argsort(importances)[::-1][:3]
        for idx in top_indices:
            feat_name = features_in[idx]
            raw_val = float(X_raw.iloc[0, idx])
            scaled_val = float(X_scaled[0, idx])
            top_risk_factors.append({
                'feature': feat_name,
                'raw_value': raw_val,
                'scaled_value': scaled_val,
                'global_importance': float(importances[idx])
            })

    return {
        'pd_score': float(proba),
        'risk_level': risk_level,
        'top_risk_factors': top_risk_factors
    }


if __name__ == "__main__":
    # --- ĐOẠN TEST: Dữ liệu HAG Q2/2025 ---
    # Ta có thể lấy từ data/raw_bctc_quarterly.csv
    import warnings
    warnings.filterwarnings('ignore')
    
    print("\n" + "="*50)
    print("TESTING MODULE PREDICT_PD")
    print("="*50)
    
    # Đọc dữ liệu thực tế từ raw_bctc_quarterly.csv
    csv_path = os.path.join(BASE_DIR, 'data', 'raw_bctc_quarterly.csv')
    if os.path.exists(csv_path):
        df_csv = pd.read_csv(csv_path, sep=';')
        hag_q2_2025 = df_csv[(df_csv['ticker'] == 'HAG') & (df_csv['year'] == 2025) & (df_csv['quarter'] == 2)].iloc[0].to_dict()
        print(f"Loaded real HAG Q2/2025 data from {csv_path}")
    else:
        # Fallback if file not found
        hag_q2_2025 = {
            'revenue': 2327420395000.0,
            'net_income': 519303097000.0,
            'ebit': 527165484000.0,
            'depreciation_amortization': 224282811000.0,
            'current_assets': 10948323437000.0,
            'current_liabilities': 13715514723000.0,
            'total_assets': 26004202677000.0,
            'total_liabilities': 15629558760000.0,
            'total_equity': 10374643917000.0,
            'long_term_debt': 1407547661000.0,
            'operating_cash_flow': -1091982237000.0,
            'cash_and_equiv': 193660834000.0,
            'inventory': 737007565000.0,
            'retained_earnings': 409410378000.0
        }
        print("Warning: data/raw_bctc_quarterly.csv not found. Using fallback hardcoded real HAG Q2/2025 data.")
    
    print("1. Thử nghiệm với Logistic Regression Model:")
    result_lr = predict_pd(hag_q2_2025, model_name="logreg")
    print(f"  PD Score:   {result_lr['pd_score']:.4f} ({result_lr['pd_score']*100:.1f}%)")
    print(f"  Risk Level: {result_lr['risk_level']}")
    print("  Top Risk Factors (kéo điểm Distress lên):")
    for factor in result_lr['top_risk_factors']:
        print(f"    - {factor['feature']:<25s}: raw_val={factor['raw_value']:12,.4f} | scaled_val={factor['scaled_value']:8,.4f} | contribution_score={factor['risk_contribution']:.4f}")
        
    print("\n2. Thử nghiệm với Random Forest Model:")
    result_rf = predict_pd(hag_q2_2025, model_name="rf")
    print(f"  PD Score:   {result_rf['pd_score']:.4f} ({result_rf['pd_score']*100:.1f}%)")
    print(f"  Risk Level: {result_rf['risk_level']}")
    print("  Top Risk Factors (Global Importance):")
    for factor in result_rf['top_risk_factors']:
        print(f"    - {factor['feature']:<25s}: raw_val={factor['raw_value']:12,.4f} | scaled_val={factor['scaled_value']:8,.4f} | global_importance={factor['global_importance']:.4f}")

    print("="*50)
