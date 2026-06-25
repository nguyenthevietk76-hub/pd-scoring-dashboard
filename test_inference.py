"""
Test Inference Pipeline với 1 dòng dữ liệu
"""
import sys, io, os
import pandas as pd
import numpy as np
import joblib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.chdir(r'C:\Users\nguye\OneDrive\Tài liệu\Đề Thi')

from feature_engineering import compute_ratios, add_time_features

# Load mô hình và transformer
print("Loading models and transformers...")
imputer = joblib.load('models/imputer.pkl')
scaler = joblib.load('models/scaler.pkl')
model = joblib.load('models/logreg_pd_model.pkl')

# Đọc 1 dòng từ raw (lấy dòng đầu tiên bị Distress để test PD score)
raw_df = pd.read_csv('data/raw_bctc_quarterly.csv', sep=';')
distress_rows = raw_df[raw_df['label_distress'] == 1]
single_row = distress_rows.head(1).copy()

print("\n--- 1. Raw Row ---")
print(single_row[['ticker', 'year', 'quarter', 'label_distress']])

# Chạy compute_ratios
print("\n--- 2. compute_ratios ---")
df_ratios = compute_ratios(single_row)

# Chạy add_time_features
# Vì chỉ có 1 dòng nên các feature dạng roll4q, qoq sẽ bị NaN
print("--- 3. add_time_features ---")
df_time = add_time_features(df_ratios)

# Chọn đúng 43 cột theo imputer.feature_names_in_
print("--- 4. Chọn cột ---")
features_in = imputer.feature_names_in_

# Cần tạo các cột thiếu nếu có (vd time_features sinh ra nhưng bị thiếu hoặc macro không có)
for col in features_in:
    if col not in df_time.columns:
        df_time[col] = np.nan

# Đảm bảo đúng thứ tự
X_raw = df_time[features_in].copy()
print(f"X_raw shape: {X_raw.shape}")

# Xử lý vô cực (như trong preprocess)
X_raw = X_raw.replace([np.inf, -np.inf], np.nan)

# Chạy imputer
print("--- 5. Impute ---")
X_imputed = imputer.transform(X_raw)

# Chạy scaler
print("--- 6. Scale ---")
X_scaled = scaler.transform(X_imputed)

# Chạy model.predict_proba
print("--- 7. Predict ---")
proba = model.predict_proba(X_scaled)
pd_score = proba[0, 1]  # Xác suất class 1 (Distress)

print("=" * 60)
print(f"✅ THÀNH CÔNG: Không gặp lỗi shape mismatch!")
print(f"Ticker: {single_row['ticker'].values[0]} | Q{single_row['quarter'].values[0]} {single_row['year'].values[0]}")
print(f"PD Score (Probability of Distress): {pd_score:.4f} ({pd_score*100:.2f}%)")
print("=" * 60)
