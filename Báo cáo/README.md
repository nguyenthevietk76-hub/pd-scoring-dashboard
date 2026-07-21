# Dự Án Dự Báo Xác Suất Vỡ Nợ Doanh Nghiệp (Probability of Distress - PD)

## AI-Quantum Challenge 2026 - Nhóm 3 (AI cho Quản trị Rủi ro và Tuân thủ)

Hệ thống dự báo Xác suất Vỡ nợ (Probability of Distress - PD) cho các doanh nghiệp niêm yết tại Việt Nam, kết hợp mô hình Học máy (Machine Learning) ở Backend và Dashboard tương tác trực quan ở Frontend.

Dự án hiện hỗ trợ đầy đủ dữ liệu báo cáo tài chính chuẩn hóa của **73 doanh nghiệp** lớn nhỏ thuộc **26 ngành nghề** tại Việt Nam (bao gồm 23 mã gốc ban đầu và 50 mã cập nhật mới, đã bổ sung dữ liệu dòng tiền sạch từ `vnstock`).

---

## 📂 Bố Cục Dự Án (Repository Structure)

Bố cục thư mục được sắp xếp thông minh giúp dễ dàng cài đặt và tích hợp:

```text
├── backend/                  # Mã nguồn Backend (FastAPI)
│   ├── main.py               # API Server khởi chạy ứng dụng FastAPI (cổng 8000)
│   ├── predict.py            # Logic dự báo PD bằng các mô hình ML đã train
│   ├── generate_demo_data.py # Script sinh dữ liệu demoData.json cho Frontend
│   └── sector_benchmark.json # Chỉ số trung vị so sánh theo 26 ngành nghề
│
├── frontend/                 # Mã nguồn Frontend (React + Vite + TailwindCSS)
│   ├── src/
│   │   ├── demoData.json     # File dữ liệu chuẩn hóa của 73 doanh nghiệp để load offline
│   │   ├── sector_benchmark.json # Bản sao lưu benchmark ngành cho Frontend
│   │   └── ...               # Giao diện và các component Dashboard
│   ├── package.json          # File cấu hình thư viện NodeJS
│   └── ...
│
├── data/                     # Thư mục chứa dữ liệu CSV
│   ├── raw_bctc_quarterly.csv # Dữ liệu BCTC chuẩn hóa cuối cùng của 73 doanh nghiệp (đầy đủ các cột)
│   └── ...                   # Các file dữ liệu backup và raw khác
│
├── models/                   # Các file model ML đã huấn luyện (Joblib format)
│   ├── logreg_pd_model.pkl   # Mô hình Logistic Regression
│   ├── rf_pd_model.pkl       # Mô hình Random Forest
│   ├── imputer.pkl           # Bộ xử lý dữ liệu khuyết (Imputation)
│   └── scaler.pkl            # Bộ chuẩn hóa đặc trưng (MinMax Scaler)
│
├── requirements.txt          # Các thư viện Python cần cài đặt cho Backend
├── train_models.py           # Script huấn luyện lại các mô hình ML
└── fetch_vnstock_data.py     # Script tải dữ liệu báo cáo tài chính từ vnstock
```

---

## ⚡ Hướng Dẫn Cài Đặt và Khởi Chạy Nhanh (Quick Start)

Dự án có thể chạy hoàn toàn offline bằng dữ liệu demo đã sinh sẵn trong Frontend, hoặc chạy kết nối thời gian thực thông qua Backend API.

### Yêu cầu hệ thống

* **Python** 3.8 trở lên
* **Node.js** 16 trở lên

---

### 1. Cài đặt & Chạy Backend (Cổng 8000)

Mở terminal tại thư mục gốc của dự án và chạy các lệnh sau:

1. **Tạo môi trường ảo (Khuyên dùng):**

   ```bash
   python -m venv venv
   # Kích hoạt trên Windows:
   .\venv\Scripts\activate
   # Kích hoạt trên macOS/Linux:
   source venv/bin/activate
   ```
2. **Cài đặt thư viện:**

   ```bash
   pip install -r requirements.txt
   ```
3. **Khởi chạy API Server:**

   ```bash
   cd backend
   python main.py
   ```

   *Backend sẽ chạy tại: **http://localhost:8000***
   *Tài liệu API tương tác (Swagger UI) có tại: **http://localhost:8000/docs***

---

### 2. Cài đặt & Chạy Frontend (Cổng 5173)

Mở một terminal mới tại thư mục gốc của dự án:

1. **Di chuyển vào thư mục frontend:**

   ```bash
   cd frontend
   ```
2. **Cài đặt các thư viện Node.js:**

   ```bash
   npm install
   ```
3. **Khởi chạy local dev server:**

   ```bash
   npm run dev
   ```

   *Dashboard sẽ mở tại: **http://localhost:5173***

---

## 🛠️ Một Số Script Hữu Ích

Nếu bạn muốn huấn luyện lại mô hình hoặc cập nhật dữ liệu mới:

* **Tự động sinh lại dữ liệu demo (`demoData.json`):**
  Khi dữ liệu CSV trong thư mục `data/` thay đổi, chạy lệnh sau ở thư mục gốc để cập nhật lại dashboard:
  ```bash
  python backend/generate_demo_data.py
  ```
* **Huấn luyện lại mô hình Machine Learning:**
  Nếu bạn muốn cập nhật trọng số mô hình dựa trên tập dữ liệu mới:
  ```bash
  python train_models.py
  ```
* **Tải dữ liệu mới từ VNSTOCK:**
  Để tải dữ liệu tài chính của các mã chứng khoán mới từ API vnstock:
  ```bash
  python fetch_vnstock_data.py
  ```

---

## 📝 Giới thiệu về Thuật toán & Phương pháp tính toán PD

Mô hình tính toán Xác suất vỡ nợ (Probability of Distress - PD) dựa trên cấu trúc các chỉ số tài chính cơ bản của doanh nghiệp:

1. **Khả năng thanh toán (Solvency):** `Total Debt / Total Assets`, `Current Ratio`.
2. **Khả năng sinh lời (Profitability):** `ROA`, `ROE`, `EBIT / Total Assets`.
3. **Hiệu suất hoạt động (Activity):** `Asset Turnover`.
4. **Dòng tiền (Cash Flow):** `Operating Cash Flow / Total Debt`, `Cash & Equivalents / Total Assets`.

Hệ thống cho phép người dùng chuyển đổi linh hoạt giữa mô hình **Logistic Regression (LogReg)** (diễn giải trực quan tốt, trọng số rõ ràng) và **Random Forest (RF)** (bám sát phi tuyến, chính xác cao) ngay trên Dashboard giao diện người dùng.
