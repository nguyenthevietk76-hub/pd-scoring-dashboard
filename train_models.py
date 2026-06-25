"""
Train Logistic Regression và Random Forest với Stratified K-Fold CV
"""
import sys, io, os
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.chdir(r'C:\Users\nguye\OneDrive\Tài liệu\Đề Thi')

# 1. Đọc dữ liệu thô và chạy các bước feature engineering trước preprocess
from feature_engineering import compute_ratios, add_time_features, add_macro_features, preprocess

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

X, y, scaler, imputer, feature_names = preprocess(df)

# Ghi đè features_processed.csv để lưu vết dữ liệu huấn luyện
feat_processed_df = X.copy()
feat_processed_df['label_distress'] = y
feat_processed_df.to_csv('data/features_processed.csv', index=False)

print("=" * 60)
print(f"Dữ liệu huấn luyện: {X.shape[0]} mẫu, {X.shape[1]} features")
print(f"Phân phối label:\n{y.value_counts()}")
print("=" * 60)

# 2. Khởi tạo Models
models = {
    'Logistic Regression': LogisticRegression(class_weight='balanced', random_state=42, max_iter=1000),
    'Random Forest': RandomForestClassifier(class_weight='balanced', random_state=42, n_estimators=100)
}

# Khởi tạo Stratified K-Fold
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for model_name, model in models.items():
    print(f"\n[{model_name}] Đang chạy 5-Fold CV...")
    
    auc_scores = []
    precisions = []
    recalls = []
    f1s = []
    
    # Để tính Cumulative Confusion Matrix
    oof_y_true = []
    oof_y_pred = []
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
        
        model.fit(X_train, y_train)
        
        # Predict
        y_pred = model.predict(X_val)
        y_proba = model.predict_proba(X_val)[:, 1] if hasattr(model, "predict_proba") else y_pred
        
        # Metrics for class 1 (Distress)
        auc = roc_auc_score(y_val, y_proba)
        prec = precision_score(y_val, y_pred, zero_division=0)
        rec = recall_score(y_val, y_pred, zero_division=0)
        f1 = f1_score(y_val, y_pred, zero_division=0)
        
        auc_scores.append(auc)
        precisions.append(prec)
        recalls.append(rec)
        f1s.append(f1)
        
        oof_y_true.extend(y_val.values)
        oof_y_pred.extend(y_pred)
    
    print(f"  ROC-AUC:   {np.mean(auc_scores):.4f} ± {np.std(auc_scores):.4f}")
    print(f"  Precision: {np.mean(precisions):.4f} ± {np.std(precisions):.4f}")
    print(f"  Recall:    {np.mean(recalls):.4f} ± {np.std(recalls):.4f}")
    print(f"  F1-score:  {np.mean(f1s):.4f} ± {np.std(f1s):.4f}")
    
    cm = confusion_matrix(oof_y_true, oof_y_pred)
    print("  Out-of-fold Confusion Matrix (Total):")
    print(f"      [TN: {cm[0][0]:3d} | FP: {cm[0][1]:3d}]")
    print(f"      [FN: {cm[1][0]:3d} | TP: {cm[1][1]:3d}]")
    
    # Train trên toàn bộ dữ liệu
    model.fit(X, y)
    
    # In Top 10 Features
    if model_name == 'Logistic Regression':
        importance = model.coef_[0]
        # Lấy abs(coef) để biết mức độ quan trọng
        top_idx = np.argsort(np.abs(importance))[::-1][:10]
        print("\n  Top 10 Features (Coefficients):")
        for i in top_idx:
            print(f"    {X.columns[i]:<30s}: {importance[i]:+.4f}")
        
        # Lưu model
        joblib.dump(model, 'models/logreg_pd_model.pkl')
        print("  -> Đã lưu models/logreg_pd_model.pkl")
        
    elif model_name == 'Random Forest':
        importance = model.feature_importances_
        top_idx = np.argsort(importance)[::-1][:10]
        print("\n  Top 10 Features (Feature Importance):")
        for i in top_idx:
            print(f"    {X.columns[i]:<30s}: {importance[i]:.4f}")
            
        # Lưu model
        joblib.dump(model, 'models/rf_pd_model.pkl')
        print("  -> Đã lưu models/rf_pd_model.pkl")

print("\n" + "=" * 60)
print("Đang trích xuất và lưu Scaler & Imputer từ feature_engineering...")

# Chạy lại 1 phần quy trình pipeline để lấy scaler và imputer
from feature_engineering import compute_ratios, add_time_features, add_macro_features, preprocess

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

numeric_cols = df.select_dtypes(include='number').columns
for col in numeric_cols:
    if df[col].isna().all():
        df[col] = 0.0

# Preprocess sẽ trả về scaler và imputer
_, _, scaler, imputer, _ = preprocess(df)

joblib.dump(scaler, 'models/scaler.pkl')
joblib.dump(imputer, 'models/imputer.pkl')
print("Đã lưu models/scaler.pkl và models/imputer.pkl")
print("=" * 60)
