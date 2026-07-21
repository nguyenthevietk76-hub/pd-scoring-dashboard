# BÁO CÁO XÂY DỰNG CHI TIẾT: HỆ THỐNG PD SCORING DASHBOARD

---

## MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG](#1-tổng-quan-hệ-thống)
2. [THU THẬP & TIỀN XỬ LÝ DỮ LIỆU](#2-thu-thập--tiền-xử-lý-dữ-liệu)
3. [FEATURE ENGINEERING](#3-feature-engineering-feature_engineeringpy)
4. [HUẤN LUYỆN MÔ HÌNH](#4-huấn-luyện-mô-hình-train_modelspy)
5. [BACKEND API](#5-backend-api-fastapi)
6. [FRONTEND DASHBOARD](#6-frontend-dashboard-react)
7. [TÍCH HỢP CHATBOT AI](#7-tích-hợp-chatbot-ai-finbot)
8. [KẾT LUẬN](#8-kết-luận)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Bài toán nghiệp vụ
Hệ thống dự báo Xác suất Vỡ nợ (Probability of Distress - PD) được chúng tôi xây dựng nhằm cung cấp một công cụ định lượng rủi ro tín dụng tự động. Đối tượng sử dụng chính là các chuyên viên thẩm định tín dụng, bộ phận quản trị rủi ro tại ngân hàng (CRO), và nhà đầu tư. Hệ thống giúp thay thế quy trình đánh giá rủi ro thủ công bằng mô hình học máy (Machine Learning) dựa trên báo cáo tài chính (BCTC) và dữ liệu vĩ mô, từ đó đưa ra quyết định tín dụng nhanh chóng và khách quan hơn.

### 1.2 Kiến trúc tổng thể
Hệ thống được thiết kế theo kiến trúc phân tầng (Micro-Architecture) bao gồm các thành phần chính:
- **Tầng Dữ liệu:** Thu thập BCTC qua API `vnstock` và dữ liệu vĩ mô (WorldBank), lưu dưới dạng CSV.
- **Tầng Feature Engineering & Model:** Tiền xử lý dữ liệu, tính toán tỷ số tài chính, và huấn luyện hai mô hình (Logistic Regression & Random Forest) song song độc lập.
- **Tầng Backend:** Ứng dụng FastAPI tải mô hình (Pickle) vào bộ nhớ để phục vụ dự báo thời gian thực và cung cấp API.
- **Tầng Frontend:** Ứng dụng React hiển thị dữ liệu trực quan thông qua biểu đồ và bảng biểu.
- **Tầng Chatbot:** Tích hợp trực tiếp Gemini API với Prompt động chứa ngữ cảnh (Context) từ giao diện, đóng vai trò chuyên viên tư vấn.

**Luồng dữ liệu thực tế:** 
`fetch_vnstock_data.py` -> `raw_bctc_quarterly.csv` -> `feature_engineering.py` -> `features_processed.csv` -> `train_models.py` -> `models/*.pkl` -> `backend/main.py` -> `frontend/src/`.

### 1.3 Công nghệ sử dụng
- **Data & ML:** Python 3, Pandas, Numpy, Scikit-learn (StandardScaler, SimpleImputer, LogisticRegression, RandomForestClassifier).
- **Backend:** FastAPI, Uvicorn, urllib (gọi Gemini API).
- **Frontend:** React, Vite, Tailwind CSS, Recharts.

---

## 2. THU THẬP & TIỀN XỬ LÝ DỮ LIỆU

### 2.1 Thu thập dữ liệu từ vnstock API
**1. Mục đích & Ý nghĩa:** Tự động hóa việc lấy dữ liệu Bảng cân đối kế toán, Kết quả kinh doanh, và Lưu chuyển tiền tệ theo quý thay vì nhập tay, cung cấp nguồn dữ liệu đầu vào cốt lõi để tính toán sức khỏe tài chính.
**2. Cách xây dựng:** 
- Sử dụng hàm `fetch_ticker_data(ticker, source='VCI')` trong file `fetch_vnstock_data.py`.
- Khởi tạo đối tượng `Vnstock().stock(symbol=ticker)` để gọi 3 bảng: `balance_sheet`, `income_statement`, `cash_flow`. 
- Cấu hình vòng lặp với độ trễ `time.sleep(0.5)` giữa các lần gọi để tránh bị chặn rate-limit. Dữ liệu trả về được unpivot theo cột thời gian (ví dụ: '2025-Q3') và map vào các cột như `current_assets`, `total_liabilities`.
**3. Kết quả thực tế:** Code được thiết lập cứng danh sách `TICKERS` gồm 30 công ty tiêu biểu (như FPT, HPG, VNM, ROS, NVL...). Kết quả tập dữ liệu huấn luyện cuối cùng (`features_processed.csv`) thu được 292 mẫu (rows) hợp lệ sau khi làm sạch.
**4. Giá trị mang lại:** Giảm thiểu 100% thời gian nhập liệu BCTC thủ công, đảm bảo dữ liệu đầu vào luôn đồng nhất về format.

### 2.2 Xử lý dữ liệu khuyết (Imputation)
**1. Mục đích & Ý nghĩa:** BCTC thực tế thường bị khuyết các khoản mục (doanh nghiệp không phát sinh hoặc không báo cáo). Nếu không xử lý, mô hình học máy sẽ văng lỗi NaN và không thể huấn luyện.
**2. Cách xây dựng:** 
- Chúng tôi sử dụng đối tượng `SimpleImputer(strategy="median")` trong hàm `preprocess` (file `feature_engineering.py`).
- *Lý do chọn Median thay vì Mean:* Các chỉ số tài chính (như tỷ lệ Nợ/Vốn) thường có phân phối lệch (skewed) rất mạnh. Một công ty cận phá sản có thể có tỷ lệ đòn bẩy lên tới hàng nghìn phần trăm, kéo lệch hoàn toàn giá trị trung bình (mean). Dùng trung vị (median) giúp giá trị điền vào chống chịu tốt (robust) trước các điểm dị biệt này.
**3. Kết quả thực tế:** Trên dữ liệu `features_processed.csv` có 26 features đưa vào mô hình, toàn bộ các giá trị NaN đã được thay thế thành công bằng median của cột tương ứng. Ví dụ: Nếu một doanh nghiệp bất động sản mới không có khoản `inventory` trong 1 quý, nó sẽ nhận giá trị trung vị hàng tồn kho của toàn bộ tập dữ liệu huấn luyện.
**4. Giá trị mang lại:** Giúp hệ thống hoạt động ổn định, không bị gián đoạn hoặc dự báo sai lệch trầm trọng khi BCTC đầu vào bị thiếu một vài dòng.

### 2.3 Chuẩn hóa dữ liệu (Scaling)
**1. Mục đích & Ý nghĩa:** Đưa toàn bộ các đặc trưng về cùng một thang đo. Tránh tình trạng các chỉ số có giá trị tuyệt đối lớn lấn át các tỷ lệ phần trăm nhỏ trong hàm mục tiêu của mô hình.
**2. Cách xây dựng:** 
- Sử dụng `StandardScaler()` của thư viện `scikit-learn` trong hàm `preprocess`.
- Công thức: $Z = \frac{X - \mu}{\sigma}$. 
- *Lý do:* Chuyển đổi dữ liệu về phân phối có trung bình bằng 0 và độ lệch chuẩn bằng 1. Điều này bắt buộc đối với Logistic Regression (mô hình nhạy cảm với khoảng cách dữ liệu) để tăng tốc độ hội tụ và độ chính xác của gradient descent.
**3. Kết quả thực tế:** Scaler được fit trên toàn bộ dữ liệu huấn luyện và lưu ra file vật lý `models/scaler.pkl`. Khi có request mới vào API `/predict`, file scaler này sẽ được load lại để scale đúng dòng dữ liệu mới.
**4. Giá trị mang lại:** Tối ưu hóa hiệu năng và độ chính xác của các thuật toán phân loại, giúp tính năng Feature Importance phản ánh đúng tầm quan trọng thực sự của từng biến.

---

## 3. FEATURE ENGINEERING (feature_engineering.py)

Toàn bộ các chỉ số dưới đây được chúng tôi xây dựng trong hàm `compute_ratios`, `add_time_features` và `add_macro_features`.

### 3.1 Nhóm Khả năng thanh toán (Liquidity)
**1. Mục đích & Ý nghĩa:** Đo lường khả năng doanh nghiệp thanh toán các khoản nợ ngắn hạn, phòng ngừa rủi ro đứt gãy thanh khoản.
**2. Cách xây dựng:**
- Khai báo các cột: `current_ratio` = Current Assets / Current Liabilities. `quick_ratio` = (Current Assets - Inventory) / Current Liabilities. `cash_ratio` = Cash & Equivalents / Current Liabilities. Sử dụng `np.where` để gán tỷ số bằng 0 nếu mẫu số = 0.
**3. Kết quả thực tế:** Ví dụ công ty AAA (demoData.json) có hệ số lưu động, mô hình đã tính ra `cash_ratio_est` tương ứng để hiển thị trên frontend. Top Feature của Random Forest ghi nhận `cash_ratio` đạt mức quan trọng xếp hạng 3 (0.1018).
**4. Giá trị mang lại:** Giúp cán bộ tín dụng nhìn ngay được rủi ro vỡ nợ ngắn hạn của doanh nghiệp.

### 3.2 Nhóm Đòn bẩy tài chính (Leverage)
**1. Mục đích & Ý nghĩa:** Đánh giá mức độ sử dụng nợ và rủi ro cấu trúc vốn. Nợ quá cao sẽ ăn mòn lợi nhuận và dễ dẫn đến vỡ nợ.
**2. Cách xây dựng:** 
- Tính `debt_to_equity` = Total Liabilities / Total Equity, `debt_to_assets` = Total Liabilities / Total Assets, và `long_term_debt_to_equity` = Long Term Debt / Total Equity.
**3. Kết quả thực tế:** Trong Random Forest, `debt_to_assets` lọt top 10 feature quan trọng (Importance = 0.0335). Logistic Regression cũng ghi nhận `long_term_debt_to_equity` có tác động lớn (Coef = -0.7382).
**4. Giá trị mang lại:** Là chốt chặn an toàn để kiểm soát dư nợ tối đa trên mỗi doanh nghiệp.

### 3.3 Nhóm Khả năng trả nợ (Coverage)
**1. Mục đích & Ý nghĩa:** Đánh giá khả năng "gánh" nợ từ hoạt động kinh doanh thực tế.
**2. Cách xây dựng:** 
- Khai báo `cfo_to_debt` = Operating Cash Flow / Total Liabilities và `ebit_to_long_term_debt` = EBIT / Long Term Debt.
**3. Kết quả thực tế:** `ebit_to_long_term_debt` là đặc trưng cực kỳ quan trọng đối với Random Forest (Importance: 0.0870, xếp hạng 4).
**4. Giá trị mang lại:** Khẳng định nguyên lý "tiền mặt là vua" (Cash is king) trong phân tích rủi ro tín dụng.

### 3.4 Nhóm Hiệu quả hoạt động (Efficiency)
**1. Mục đích & Ý nghĩa:** Đánh giá việc ban lãnh đạo sử dụng tài sản để tạo ra doanh thu có hiệu quả hay không.
**2. Cách xây dựng:** 
- `asset_turnover` = Revenue / Total Assets. `inventory_turnover` = Revenue / Inventory.
**3. Kết quả thực tế:** Công ty AGG có `asset_turnover` (Vòng quay tổng tài sản) là 1.2% (0.0125), bị đánh giá là một yếu tố làm tăng rủi ro (contribution: 1.5452) trong dữ liệu demo.
**4. Giá trị mang lại:** Phát hiện sớm các doanh nghiệp "phình to" quy mô tài sản nhưng không tạo ra dòng tiền thật.

### 3.5 Nhóm Khả năng sinh lời (Profitability)
**1. Mục đích & Ý nghĩa:** Đánh giá biên lợi nhuận, yếu tố cốt lõi để tích lũy tài sản và sống sót qua khủng hoảng.
**2. Cách xây dựng:** 
- Tính toán `ebitda_margin`, `net_profit_margin`, `roa` (Net Income / Total Assets), và `retained_earnings_to_assets` (Thành phần Altman Z-Score).
**3. Kết quả thực tế:** `roa` (Tỷ suất LN/TS) chính là biến quan trọng nhất quyết định PD trong mô hình Random Forest (Importance: 0.1754, xếp hạng 1). Công ty AAA có ROA 1.3%, đóng góp rủi ro 0.4075 (demoData.json).
**4. Giá trị mang lại:** Giúp loại bỏ các doanh nghiệp tuy doanh thu nghìn tỷ nhưng biên lợi nhuận mỏng manh.

### 3.6 Đặc trưng Thời gian và Vĩ mô
**1. Mục đích & Ý nghĩa:** Bắt được độ trễ, tính mùa vụ và áp lực từ môi trường kinh tế bên ngoài.
**2. Cách xây dựng:** 
- Sử dụng `groupby('ticker').rolling(4).mean()` để tạo các cột `roll4q_mean`. Dùng `pct_change()` để tạo `qoq_change`. 
- Nối bảng (merge) cột `gdp_growth` và `lending_rate` từ `data/macro.csv`.
**3. Kết quả thực tế:** Biến `roa_roll4q_mean` lọt top 6 tầm quan trọng trong Random Forest (0.0664).
**4. Giá trị mang lại:** Giúp mô hình không bị "mù" trước các biến động theo chu kỳ của nền kinh tế.

---

## 4. HUẤN LUYỆN MÔ HÌNH (train_models.py)

### 4.1 Kiến trúc mô hình học máy
**1. Mục đích & Ý nghĩa:** Tạo ra động cơ dự báo cốt lõi của hệ thống, phân loại doanh nghiệp vào nhóm Healthy (0) hoặc Distress (1).
**2. Cách xây dựng:** 
- Chúng tôi thiết lập 2 mô hình ĐỘC LẬP CHẠY SONG SONG: `LogisticRegression` (tối ưu hóa tính diễn giải) và `RandomForestClassifier(n_estimators=100)` (tối ưu hóa khả năng phân tách phi tuyến). 
- *Đính chính thực trạng code:* Cả 2 mô hình được fit hoàn toàn độc lập trên cùng bộ dữ liệu `X`, `y`, không có chuyện Random Forest lọc biến rồi truyền cho LogReg. Frontend có một Model Toggle để người dùng chuyển đổi kết quả giữa 2 mô hình.
**3. Kết quả thực tế:** Cả hai được lưu tách biệt ra `models/logreg_pd_model.pkl` và `models/rf_pd_model.pkl`.
**4. Giá trị mang lại:** Cung cấp cho chuyên gia rủi ro hai góc nhìn đối chiếu: một thiên về tính giải thích cổ điển, một thiên về sức mạnh dự báo.

### 4.2 Xử lý mất cân bằng dữ liệu (Class Imbalance)
**1. Mục đích & Ý nghĩa:** Tỷ lệ vỡ nợ rất hiếm. Nếu không xử lý, mô hình sẽ mặc định đoán "Healthy" cho tất cả và bỏ lọt rủi ro.
**2. Cách xây dựng:** 
- Cấu hình tham số `class_weight='balanced'` trực tiếp bên trong cả 2 hàm khởi tạo `LogisticRegression` và `RandomForestClassifier`. Thuật toán tự động tăng hình phạt lỗi khi dự đoán sai lớp Distress theo tỷ lệ nghịch với số lượng mẫu.
**3. Kết quả thực tế:** Phân phối label thật từ log huấn luyện: 269 Healthy (0) và chỉ có 23 Distress (1). Việc dùng `balanced` đã giúp Random Forest bắt được 16/23 trường hợp vỡ nợ (True Positives = 16).
**4. Giá trị mang lại:** Tối ưu hóa điểm Recall, tránh rủi ro "bỏ lọt tội phạm" trong thẩm định.

### 4.3 Stratified 5-Fold Cross Validation
**1. Mục đích & Ý nghĩa:** Đảm bảo điểm số đánh giá mô hình phản ánh đúng sức mạnh thực tế, không bị overfit ngẫu nhiên trên một tập test duy nhất.
**2. Cách xây dựng:** 
- Khởi tạo `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`. Chia toàn bộ `X`, `y` làm 5 phần, mỗi lần train trên 4 phần, validate trên 1 phần. *Stratified* đảm bảo tỷ lệ mẫu Distress (23 mẫu) được chia đều cho 5 fold.
**3. Kết quả thực tế:** Pipeline chạy vòng lặp và ghi nhận Confusion Matrix tích lũy (Out-of-fold) cho toàn bộ tập dữ liệu (TN: 266, FP: 3, FN: 7, TP: 16 cho RF).
**4. Giá trị mang lại:** Cung cấp bằng chứng thống kê vững chắc trước hội đồng rủi ro ngân hàng.

### 4.4 Kết quả đánh giá mô hình (Metrics thật)
**1. Mục đích & Ý nghĩa:** Cung cấp con số định lượng về khả năng cảnh báo sớm của mô hình.
**2. Cách xây dựng:** Tính toán roc_auc_score, precision_score, recall_score, f1_score trên từng fold rồi lấy trung bình.
**3. Kết quả thực tế (Đọc từ Log huấn luyện):**
- **Logistic Regression:**
  - ROC-AUC: 0.7716
  - Precision: 0.3410
  - Recall: 0.6600
  - F1-score: 0.4406
- **Random Forest:**
  - ROC-AUC: 0.9654
  - Precision: 0.8700
  - Recall: 0.7000
  - F1-score: 0.7692
**4. Giá trị mang lại:** RF áp đảo hoàn toàn với AUC = 96.5% và độ chính xác rủi ro (Precision) = 87%, cho phép tự động duyệt các hồ sơ rõ ràng.

### 4.5 Trích xuất Feature Importance
**1. Mục đích & Ý nghĩa:** Giải thích rủi ro (Explainable AI), giúp chuyên viên biết vì sao hệ thống từ chối hồ sơ vay.
**2. Cách xây dựng:** Đối với LogReg, trích xuất `model.coef_[0]`. Đối với RF, trích xuất `model.feature_importances_`. Lấy Top 10 giá trị lớn nhất.
**3. Kết quả thực tế:** Top 5 của RF đã học được:
  1. `roa` : 0.1754
  2. `net_profit_margin` : 0.1373
  3. `cash_ratio` : 0.1018
  4. `ebit_to_long_term_debt` : 0.0870
  5. `quick_ratio` : 0.0834
**4. Giá trị mang lại:** Biến "hộp đen" AI thành "hộp kính", hỗ trợ đắc lực việc soạn tờ trình tín dụng.

---

## 5. BACKEND API (FastAPI)

Các dịch vụ được cung cấp qua file `backend/main.py`.

### 5.1 Endpoint `/health`
**1. Mục đích & Ý nghĩa:** Ping server, dùng cho Monitoring / Load Balancer để biết API có đang sống hay không.
**2. Cách xây dựng:** Route `@app.get("/health")`, trả về JSON cứng báo trạng thái ok.
**3. Kết quả thực tế:** Response thật: `{"status": "ok", "models_loaded": true}`.
**4. Giá trị mang lại:** Đảm bảo hệ thống duy trì Uptime cao trên môi trường production.

### 5.2 Endpoint `/companies`
**1. Mục đích & Ý nghĩa:** Lấy danh sách doanh nghiệp và thông tin lịch sử tài chính để vẽ bảng và biểu đồ trên Dashboard.
**2. Cách xây dựng:** Quét `_raw_df`, sort theo year/quarter, lấy 4 quý gần nhất. Móc nối với meta data từ file `frontend/src/demoData.json` (risk_level, top_factors).
**3. Kết quả thực tế:** JSON Schema trả về danh sách `companies`, bên trong chứa `ticker`, `financial_history` (gồm mảng 4 quý của `revenue`, `roa`, `de_ratio`...).
**4. Giá trị mang lại:** Cấp dữ liệu tức thời cho giao diện hiển thị mà không cần tính toán lại.

### 5.3 Endpoint `/predict` (Full 14 chỉ tiêu)
**1. Mục đích & Ý nghĩa:** Nòng cốt của hệ thống, nhận BCTC đầu vào đầy đủ và trả về điểm rủi ro.
**2. Cách xây dựng:** Nhận Pydantic model `FinancialInput`. Chạy qua pipeline scaler, gọi `predict_proba` của model được chỉ định ("logreg" hoặc "rf"), tính điểm PD (%), phân loại rủi ro (Thấp/Trung bình/Cao) và gọi `build_top_factors` để định dạng hiển thị.
**3. Kết quả thực tế:** 
- **Request:** `{"revenue": 10000000000, "total_assets": 50000000000, "model_name": "rf", ...}`
- **Response:** `{"pd_score": 0.1216, "pd_score_pct": 12.16, "risk_level": "Low", "risk_level_vi": "Thấp", "top_factors": [...]}`.
**4. Giá trị mang lại:** Tự động hóa đánh giá rủi ro chuyên sâu cho hồ sơ công ty niêm yết.

### 5.4 Endpoint `/predict/simplified`
**1. Mục đích & Ý nghĩa:** Phục vụ các trường hợp người dùng chỉ có dữ liệu sơ bộ (như doanh nghiệp SMEs) không có đủ 14 khoản mục BCTC.
**2. Cách xây dựng:** Nhận 5 đầu vào cơ bản (Tổng TS, Nợ ngắn hạn, Nợ dài hạn, Doanh thu, Dòng tiền HĐKD). Chạy qua hàm `expand_simplified_input()` dùng các quy tắc kinh nghiệm chuyên gia để nội suy (phóng đại) ra 14 tham số chuẩn (vd: Vốn chủ = TS - Nợ, Lợi nhuận ròng = Doanh thu * 7%). Sau đó gọi luồng predict bình thường.
**3. Kết quả thực tế:** Response trả về y hệt `/predict` nhưng có kèm trường `"note"` giải thích kết quả là ước tính dựa trên 5 chỉ tiêu.
**4. Giá trị mang lại:** M mở rộng tệp khách hàng cho Dashboard, phù hợp cho môi trường thẩm định nhanh tại chi nhánh ngân hàng.

---

## 6. FRONTEND DASHBOARD (React)

### Tóm tắt Trạng thái Hoàn thiện Giao diện

| STT | Tên chức năng | Trạng thái |
| :--- | :--- | :--- |
| 1 | Landing Page (Risk Tech) | Hoàn thiện (Có data tĩnh/động hỗn hợp) |
| 2 | Tổng quan Layout & TickerBar | Hoàn thiện (Kết nối API thật) |
| 3 | Hỏi FinBot | Hoàn thiện (Kết nối Gemini API - Context Injection) |
| 4 | Market Overview | Hoàn thiện (Kết nối API thật) |
| 5 | Tra cứu doanh nghiệp | Đang phát triển (Kết nối API cơ bản, Tin tức là Mock Data) |
| 6 | PD Scoring (Dashboard chính) | Hoàn thiện (Kết nối API thật) |
| 7 | Xu hướng rủi ro | Hoàn thiện (Kết nối API thật) |
| 8 | So sánh chỉ số | Hoàn thiện (Kết nối API thật) |
| 9 | So sánh Altman Z | Placeholder (Dữ liệu ước lượng tĩnh) |
| 10 | Biểu đồ tùy chỉnh | Placeholder (Dữ liệu generate Random/Hash) |
| 11 | Portfolio Monitor | Hoàn thiện (Kết nối API thật, Lọc tại Client) |
| 12 | Cảnh báo sớm | Hoàn thiện (Kết nối API thật, Logic Client) |
| 13 | Bảng xếp hạng | Hoàn thiện (Kết nối API thật, Sort tại Client) |
| 14 | Phân tích tin tức | Placeholder (Chỉ dùng dữ liệu tĩnh MOCK_NEWS) |
| 15 | Credit Report | Hoàn thiện (Giao diện tĩnh & Print view) |
| 16 | Xuất dữ liệu | Hoàn thiện (Tải CSV từ dữ liệu API) |
| 17 | SQL Explorer | Hoàn thiện (Kết nối API /api/sql thật) |

---

### 6.0 LANDING PAGE (Trang Giới Thiệu)
**1. Mục đích & Ý nghĩa:** Đóng vai trò như "bộ mặt" thương hiệu của Risk Tech, cung cấp không gian giới thiệu giải pháp AI chuyên nghiệp tới khách hàng mà không cần đăng nhập vào hệ thống bên trong.
**2. Cách xây dựng:** 
- Giao diện được xây dựng bằng component `Landing.jsx` độc lập với Dashboard.
- **a) Thành phần UI:** Header chứa logo và nút CTA "Khởi chạy hệ thống"; Component `TickerBar` chạy ngang mã chứng khoán theo real-time; Hero section có tiêu đề lớn, background hiệu ứng Aurora/Meteor; và hình ảnh `Meteor3DCard` (mockup thẻ tín dụng AURA PLATINUM). Có 2 nút CTA chính ("Xem thêm", "Khám phá dữ liệu mẫu").
- **b) Nguồn dữ liệu & Logic:** TickerBar gọi dữ liệu thật từ API `/api/companies` (hoặc fallback `demoData.json`) để lấy `current_pd` và mã chứng khoán. Layout sử dụng `IntersectionObserver` để tạo hiệu ứng reveal (fade-in) khi cuộn chuột.
**3. Kết quả thực tế:** Giao diện đã hoàn thiện, hoạt động mượt mà với các hiệu ứng thị giác cao cấp.
**4. Giá trị mang lại:** Tạo ấn tượng mạnh mẽ (wow-effect) về một nền tảng Fintech hiện đại, đắt tiền ngay từ cái nhìn đầu tiên.

### 6.1 Tổng quan Giao diện Layout & TickerBar
**1. Mục đích & Ý nghĩa:** Cung cấp bộ khung giao diện chuyên nghiệp cho người sử dụng cuối.
**2. Cách xây dựng:** 
- **a) Thành phần UI:** `Layout.jsx` bọc toàn bộ ứng dụng, sử dụng Tailwind CSS cho dàn trang responsive. Component `TickerBar.jsx` chạy ngang mô phỏng sàn giao dịch.
- **b) Nguồn dữ liệu & Logic:** Đọc danh sách từ API `/api/companies`.
**3. Kết quả thực tế:** Thanh bar đen hiển thị ví dụ `AAA - 12.16% (Thấp)` lướt liên tục.
**4. Giá trị mang lại:** Trải nghiệm người dùng cao cấp, liên tục cập nhật trạng thái hệ thống.

---
#### NHÓM TỔNG QUAN

### 6.2 Hỏi FinBot
**1. Mục đích & Ý nghĩa:** Cung cấp trợ lý ảo chuyên sâu về tín dụng, giải thích số liệu rủi ro tự động.
**2. Cách xây dựng:**
- **a) Thành phần UI:** Giao diện chat (nhắn tin) tương tự ChatGPT. Có các nút gợi ý câu hỏi (Starter prompts) chia làm 2 nhóm (SME và Banker). Có sidebar chứa lịch sử hội thoại (Session History).
- **b) Nguồn dữ liệu & Logic:** Quản lý state bằng `FinBotPage.jsx`. Sử dụng kỹ thuật Context Injection: Lấy `companyContext` truyền thẳng vào request POST tới endpoint `/api/chat`. Lịch sử chat được lưu trong `localStorage`.
**3. Kết quả thực tế:** Giao diện hoàn thiện, chat mượt mà, lưu trữ session hoạt động bình thường, gọi được API thật.
**4. Giá trị mang lại:** Giảm bớt gánh nặng tra cứu tài liệu và hỗ trợ giải thích trực quan kết quả AI.

### 6.3 Market Overview
**1. Mục đích & Ý nghĩa:** Cung cấp cái nhìn bao quát về toàn bộ thị trường niêm yết mà hệ thống đang giám sát.
**2. Cách xây dựng:**
- **a) Thành phần UI:** 3 thẻ Stats Cards (Tổng số DN, SL Rủi ro cao, SL Rủi ro TB). Biểu đồ tròn (PieChart - Phân bổ rủi ro) và Biểu đồ cột ngang (BarChart - PD Trung bình theo ngành) vẽ bằng `recharts`.
- **b) Nguồn dữ liệu & Logic:** Fetch API `/api/companies` trong `MarketOverview.jsx`. Tại Front-end sẽ dùng `.filter()` và `.reduce()` để tính tổng và trung bình ngành theo biến `sector` và `risk_level`.
**3. Kết quả thực tế:** Đã hoàn thiện tính toán và render biểu đồ bằng dữ liệu thật từ API.
**4. Giá trị mang lại:** Giúp ban lãnh đạo ngân hàng nắm bắt ngay lập tức rủi ro tập trung (Concentration Risk) của toàn bộ danh mục thị trường.

---
#### NHÓM PHÂN TÍCH RỦI RO

### 6.4 Tra cứu doanh nghiệp
**1. Mục đích & Ý nghĩa:** Tra cứu nhanh thông tin 360 độ của một doanh nghiệp (Tài chính, PD Score, Tin tức).
**2. Cách xây dựng:**
- **a) Thành phần UI:** Thanh Search lớn ở trên. Bên trái: Danh sách kết quả tìm kiếm (List). Bên phải: Bảng thông tin tóm tắt tài chính (Grid) và Danh sách tin tức nổi bật.
- **b) Nguồn dữ liệu & Logic:** Component `SearchCompany.jsx` fetch API `/api/companies`. Lọc local theo `ticker`, `name`, `sector`. Bảng thông tin tính toán TTM (Trailing Twelve Months) từ `financial_history`. Tin tức sử dụng **MOCK_NEWS_MAP** (dữ liệu tĩnh).
**3. Kết quả thực tế:** [Hiện tại: Giao diện đã dựng. Phần tài chính lấy dữ liệu thật, phần Tin Tức chưa kết nối API, chỉ là MOCK_DATA].
**4. Giá trị mang lại:** Tìm kiếm nhanh, tích hợp All-in-one giúp chuyên viên không phải mở nhiều tab/web khác nhau.

### 6.5 PD Scoring (Dashboard chính)
**1. Mục đích & Ý nghĩa:** Phân tích chi tiết rủi ro một doanh nghiệp cụ thể qua mô hình ML.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `Dashboard.jsx`. Có Form nhập liệu 5/14 tham số (Predict Simplified). Component Gauge (đồng hồ điểm) và `FinancialHealthRadar` (biểu đồ màng nhện) dùng `Recharts`. Bảng Top Factors (Nhân tố ảnh hưởng).
- **b) Nguồn dữ liệu & Logic:** Nạp dữ liệu qua API POST `/api/predict/simplified`. Vẽ Radar dựa trên `financial_history` lịch sử. Toggle chọn model LogReg/RF.
**3. Kết quả thực tế:** Hoạt động hoàn hảo với API thật.
**4. Giá trị mang lại:** Số hóa quá trình đọc BCTC khô khan thành dashboard tương tác, phân tích rõ ràng nguyên nhân tăng/giảm PD.

### 6.6 Xu hướng rủi ro
**1. Mục đích & Ý nghĩa:** Theo dõi diễn biến Xác suất vỡ nợ (PD) qua các quý để phát hiện sự suy giảm sức khỏe dần dần.
**2. Cách xây dựng:**
- **a) Thành phần UI:** Dropdown chọn công ty. Biểu đồ vùng (`AreaChart` của `recharts`) so sánh "PD Score" và "Trung bình ngành". Card tóm tắt xu hướng (Ổn định/Cảnh báo).
- **b) Nguồn dữ liệu & Logic:** `Trends.jsx` fetch `/api/companies`. Trích xuất mảng `pd_scores_4q`. Trung bình ngành hiện tại đang dùng logic giả định (nhân/chia PD hiện tại) chứ chưa tính toán chéo thực tế.
**3. Kết quả thực tế:** Hoàn thiện biểu đồ diễn biến 4 quý từ dữ liệu mô hình.
**4. Giá trị mang lại:** Nhìn nhận rủi ro dưới góc độ động học (Dynamic) thay vì cắt ngang (Static).

### 6.7 So sánh chỉ số
**1. Mục đích & Ý nghĩa:** Benchmark (đối chuẩn) chỉ số tài chính của doanh nghiệp với các đối thủ cùng ngành.
**2. Cách xây dựng:**
- **a) Thành phần UI:** Component `CompareFinancials.jsx`. Selector đa luồng (chọn tối đa 5 mã). Có `BarChart` và `LineChart` tùy chọn Metrics (ROA, D/E, Revenue...). Bảng so sánh matrix (Table) ở dưới.
- **b) Nguồn dữ liệu & Logic:** Đọc mảng `financial_history` từ `/api/companies`. Logic `.map` render động Custom Tooltip.
**3. Kết quả thực tế:** Chức năng hoạt động đầy đủ với số liệu API.
**4. Giá trị mang lại:** Thẩm định doanh nghiệp dựa trên vị thế tương đối trong ngành, cực kỳ hữu ích cho quy trình cấp tín dụng.

### 6.8 So sánh Altman Z
**1. Mục đích & Ý nghĩa:** Đối chiếu mô hình AI (AURA PD) với mô hình chấm điểm phá sản truyền thống (Altman Z-Score) để tăng tính thuyết phục.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `AltmanZ.jsx`. Bảng Form nhập 5 chỉ tiêu của Altman. Kết quả Z-Score (vùng Đỏ/Xám/Xanh).
- **b) Nguồn dữ liệu & Logic:** [Hiện tại: Giao diện đã dựng, dữ liệu tự động điền form dựa trên các công thức giả định nội suy từ `total_assets_b` của Context. KHÔNG gọi API tính toán từ dữ liệu thật BCTC].
**3. Kết quả thực tế:** Placeholder. Giao diện đẹp nhưng dữ liệu bên dưới là giả lập nội suy (Simulated).
**4. Giá trị mang lại:** Cầu nối giữa phương pháp truyền thống và hiện đại (khi hoàn thiện).

### 6.9 Biểu đồ tùy chỉnh
**1. Mục đích & Ý nghĩa:** Phân tích tương quan đa chiều linh hoạt (Scatter Plot).
**2. Cách xây dựng:**
- **a) Thành phần UI:** `CustomChart.jsx`. Hai dropdown chọn Trục X và Trục Y (VD: Doanh thu vs PD Score). Biểu đồ `ScatterChart`.
- **b) Nguồn dữ liệu & Logic:** [Hiện tại: Dùng logic tạo số giả pseudo‑random `seededRandom(hashTicker)` để vẽ biểu đồ]. KHÔNG map với API dữ liệu thật.
**3. Kết quả thực tế:** Placeholder tính năng. Chưa có giá trị phân tích thật.
**4. Giá trị mang lại:** Concept minh họa cho tính năng BI (Business Intelligence) mở rộng.

---
#### NHÓM DANH MỤC

### 6.10 Portfolio Monitor
**1. Mục đích & Ý nghĩa:** Giám sát nhanh toàn bộ danh mục đang cho vay, lọc ra các nhóm rủi ro.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `Portfolio.jsx`. Có thanh Tìm kiếm, Dropdown lọc theo mức Rủi ro (Tất cả, Thấp, TB, Cao). Bảng Table danh sách mã CK, Ngành, PD Score, Risk Level.
- **b) Nguồn dữ liệu & Logic:** Fetch toàn bộ `/api/companies`. Filter `.filter()` chạy tại Client.
**3. Kết quả thực tế:** Chức năng hoạt động hoàn chỉnh, nhanh và phản hồi tức thời.
**4. Giá trị mang lại:** Công cụ làm việc hàng ngày của Relationship Manager (RM).

### 6.11 Cảnh báo sớm
**1. Mục đích & Ý nghĩa:** Hệ thống hóa và tự động đẩy tín hiệu suy giảm tín dụng khẩn cấp.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `Alerts.jsx`. Danh sách các thẻ (Cards) cảnh báo. Có biểu tượng (AlertTriangle, AlertOctagon) phân loại màu đỏ (Nguy hiểm) và vàng (Suy giảm).
- **b) Nguồn dữ liệu & Logic:** Duyệt `pd_scores_4q`. Logic Client: Bật thẻ đỏ nếu `current_pd > 60`, bật thẻ vàng nếu `(current - prev) > 15`.
**3. Kết quả thực tế:** Chạy thật dựa trên logic quét dữ liệu API.
**4. Giá trị mang lại:** Kích hoạt ngay các quy trình thu hồi nợ trước hạn (Early Warning System - EWS).

### 6.12 Bảng xếp hạng
**1. Mục đích & Ý nghĩa:** Tìm ra các doanh nghiệp tốt nhất để ngân hàng chủ động chào mời tín dụng (Sales target).
**2. Cách xây dựng:**
- **a) Thành phần UI:** `Rankings.jsx`. Danh sách list/table có huy chương (🥇 🥈 🥉) cho Top 3.
- **b) Nguồn dữ liệu & Logic:** Fetch API, sau đó `.sort((a, b) => a.current_pd - b.current_pd)`.
**3. Kết quả thực tế:** Hoạt động tốt.
**4. Giá trị mang lại:** Ứng dụng mô hình rủi ro vào khâu bán hàng (Risk-based pricing / Marketing).

### 6.13 Phân tích tin tức
**1. Mục đích & Ý nghĩa:** Bắt tín hiệu rủi ro phi tài chính từ báo chí (NLP Sentiment Analysis).
**2. Cách xây dựng:**
- **a) Thành phần UI:** `NewsAnalysis.jsx`. Danh sách bài báo dạng Card, có tag sắc thái (Positive/Negative) và điểm Sentiment Score (%).
- **b) Nguồn dữ liệu & Logic:** [Hiện tại: Chỉ dùng mảng tĩnh `MOCK_NEWS` hardcode sẵn trong file]. Chưa có backend cào tin tức hay model NLP chấm điểm thật.
**3. Kết quả thực tế:** Placeholder giao diện. Chưa kết nối dữ liệu.
**4. Giá trị mang lại:** Cho thấy tầm nhìn của hệ thống (khi hoàn thiện) về việc kết hợp dữ liệu định lượng (BCTC) và định tính (Tin tức).

---
#### NHÓM BÁO CÁO

### 6.14 Credit Report
**1. Mục đích & Ý nghĩa:** Xuất báo cáo giấy, tờ trình phê duyệt tín dụng theo format chuẩn.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `CreditReport.jsx`. Dropdown chọn công ty. Khung hiển thị giả lập mặt giấy A4. Nút Print.
- **b) Nguồn dữ liệu & Logic:** Lấy dữ liệu `/api/companies` kết hợp `window.print()` bằng CSS media query `@media print` ẩn các nút bấm.
**3. Kết quả thực tế:** Giao diện in ấn hoạt động tốt, layout đẹp khi xuất PDF.
**4. Giá trị mang lại:** Tích hợp trực tiếp vào luồng trình duyệt hồ sơ truyền thống của ngân hàng.

### 6.15 Xuất dữ liệu
**1. Mục đích & Ý nghĩa:** Đóng gói kết quả máy học thành file CSV để CRO hoặc Data Analyst xử lý ở tool khác.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `Export.jsx`. Nút bấm "Download CSV".
- **b) Nguồn dữ liệu & Logic:** Fetch `/api/companies`. Logic tạo Blob CSV với charset `\uFEFF` (hỗ trợ tiếng Việt UTF-8), kích hoạt tải file ẩn.
**3. Kết quả thực tế:** Tải thành công danh sách kết quả PD Score thật ra CSV.
**4. Giá trị mang lại:** Tăng tính linh hoạt và khả năng tích hợp (Interoperability) của phần mềm.

### 6.16 SQL Explorer
**1. Mục đích & Ý nghĩa:** Cho phép Data Engineer/Quản trị viên trực tiếp query kho dữ liệu của mô hình.
**2. Cách xây dựng:**
- **a) Thành phần UI:** `SqlExplorer.jsx`. Textarea gõ lệnh SQL. Bảng schema cột. Các nút lệnh mẫu (Quick queries). Bảng kết quả (Table).
- **b) Nguồn dữ liệu & Logic:** Người dùng gõ SQL -> Gửi POST request `/api/sql` với body `{ query }`. Nhận kết quả JSON và render động các cột `Object.keys(results[0])`. Hỗ trợ phím tắt `Ctrl + Enter`.
**3. Kết quả thực tế:** Chức năng nâng cao (PRO) hoạt động hoàn hảo kết nối với SQLite backend.
**4. Giá trị mang lại:** Công cụ quyền lực để truy xuất báo cáo ad-hoc (bất thường) mà không phụ thuộc vào UI có sẵn.

---

## 7. TÍCH HỢP CHATBOT AI (FinBot)

### 7.1 Kiến trúc & Luồng hoạt động (Context Injection)
**1. Mục đích & Ý nghĩa:** Trợ lý ảo hoạt động 24/7 giúp chuyên viên phân tích lý do tăng giảm điểm PD và đề xuất biện pháp xử lý rủi ro mà không cần viết lệnh SQL hay tự suy luận.
**2. Cách xây dựng:** 
- Endpoint `/chat` trong `backend/main.py`.
- **Thực trạng kiến trúc:** Mã nguồn hiện tại **KHÔNG dùng Vector DB**, do đó **KHÔNG phải là kiến trúc RAG** kinh điển. Hệ thống sử dụng kỹ thuật **Context Injection** (Nhúng ngữ cảnh): Lấy trực tiếp dữ liệu từ giao diện (Tên Cty, Điểm PD, Risk Level, Top Factors, Sector Benchmarks) nối vào System Prompt và gửi thẳng qua HTTP POST (bằng `urllib.request`) tới Gemini API.
- Có logic tự động retry tối đa 3 lần với khoảng cách 2 giây để chống lỗi `HTTP Error 503: Service Unavailable` của Gemini.
**3. Kết quả thực tế:**
- **Request:** `{"message": "Tại sao điểm công ty này cao?", "context": {"company_name": "AAA", "pd_score_pct": 12.16, "top_factors": [{"label_vi": "ROA", "display_val": "1.3%", "contribution": 0.4075}]}}`
- **Response FinBot:** "Kính gửi Bộ phận Thẩm định, điểm PD của doanh nghiệp đang chịu ảnh hưởng chính từ Tỷ suất LN/TS (ROA) chỉ ở mức 1.3%, đóng góp rủi ro đáng kể..."
**4. Giá trị mang lại:** Nâng cao năng suất lao động cho Credit Analyst, cung cấp ngay bản nháp lý giải tín dụng chất lượng cao.

---

## 8. KẾT LUẬN

### 8.1 Giá trị đạt được
Hệ thống PD Scoring Dashboard đã chứng minh khả năng tự động hóa toàn bộ luồng quy trình đánh giá rủi ro tín dụng. Với bộ chỉ số Feature Engineering tài chính sâu sắc, mô hình Random Forest đạt ROC-AUC lên tới **96.54%** trên dữ liệu thật. Giao diện trực quan kết hợp cùng trợ lý FinBot đã thu hẹp khoảng cách giữa kết quả học máy và ngôn ngữ nghiệp vụ ngân hàng.

### 8.2 Hạn chế hiện tại
- Kiến trúc Chatbot đang dừng ở mức nhúng ngữ cảnh tĩnh (Context Injection) vào Prompt, chưa triển khai Vector DB nên không thể truy vấn chéo quy định nội bộ ngân hàng (RAG thực thụ).
- Endpoint `/predict/simplified` dùng tỷ lệ nội suy tĩnh (như Lợi nhuận = 7% Doanh thu) khá cứng nhắc, dễ sai số cho ngành nghề đặc thù.

### 8.3 Hướng phát triển
1. Xây dựng Vector Database thực thụ (như ChromaDB/Pinecone) cho Chatbot AI để xử lý các tài liệu tín dụng nội bộ.
2. Cập nhật phương pháp nội suy tự động bằng Machine Learning cho tính năng Predict Simplified (Dự đoán Missing Values đa chiều).
3. Triển khai kiến trúc Stacking Model (kết hợp LogReg và RF thành 1 Meta-Model) để tận dụng ưu điểm của cả hai.
