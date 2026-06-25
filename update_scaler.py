"""
Cập nhật Scaler và Imputer để loại bỏ 4 features "chết".
Xác minh danh sách cột khớp với Model.
"""
import sys, io, os
import pandas as pd
import numpy as np
import joblib

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.chdir(r'C:\Users\nguye\OneDrive\Tài liệu\Đề Thi')

from feature_engineering import compute_ratios, add_time_features, add_macro_features, preprocess

print("1. Đọc data và chạy các bước feature engineering trước preprocess...")
raw_df = pd.read_csv('data/raw_bctc_quarterly.csv', sep=';')
macro_df = pd.read_csv('data/macro.csv', sep=';')

# Mở rộng macro
data_years = sorted(raw_df['year'].unique())
macro_years = sorted(macro_df['year'].unique())
max_macro_year = macro_df['year'].max()
for yr in data_years:
    if yr not in macro_years:
        new_row = macro_df[macro_df['year'] == max_macro_year].copy()
        new_row['year'] = yr
        macro_df = pd.concat([macro_df, new_row], ignore_index=True)

df = compute_ratios(raw_df)
df = add_time_features(df)
df = add_macro_features(df, macro_df)

print("2. Chạy preprocess() (đã cập nhật để drop 4 features chết)...")
X, y, scaler, imputer, feature_names = preprocess(df)

print("3. Lưu Scaler và Imputer mới...")
joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(imputer, 'models/imputer.pkl')

print("\n" + "=" * 60)
print("XÁC MINH SỐ LƯỢNG VÀ THỨ TỰ CỘT")
print("=" * 60)

# Load model
model = joblib.load('models/logreg_pd_model.pkl')

model_features = list(model.feature_names_in_)
scaler_features = list(scaler.feature_names_in_)
imputer_features = list(imputer.feature_names_in_)

print(f"Số lượng features của Model:   {len(model_features)}")
print(f"Số lượng features của Scaler:  {len(scaler_features)}")
print(f"Số lượng features của Imputer: {len(imputer_features)}")

# So sánh chính xác
if model_features == scaler_features == imputer_features == feature_names:
    print("\n[THÀNH CÔNG] Tất cả danh sách features hoàn toàn KHỚP NHAU về số lượng và thứ tự!")
else:
    print("\n[LỖI] Có sự sai lệch trong danh sách features!")
    # Tìm sự khác biệt
    for i in range(max(len(model_features), len(scaler_features))):
        mf = model_features[i] if i < len(model_features) else "MISSING"
        sf = scaler_features[i] if i < len(scaler_features) else "MISSING"
        if mf != sf:
            print(f"  Vị trí {i}: Model='{mf}' | Scaler='{sf}'")
            break
