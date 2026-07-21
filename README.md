# 🚀 PD Scoring Dashboard - AI-Quantum Challenge 2026

## 📖 Giới thiệu dự án
Hệ thống dự báo **Xác suất Vỡ nợ (Probability of Distress - PD)** cho doanh nghiệp. Dự án được xây dựng và phát triển để phục vụ **AI-Quantum Challenge 2026 - Nhóm 3 (AI cho Quản trị Rủi ro và Tuân thủ)**.
Hệ thống tích hợp các mô hình Học máy (Machine Learning) tiên tiến, dữ liệu tài chính thực tế và một trợ lý ảo (Finbot) giúp phân tích rủi ro một cách trực quan, chính xác qua giao diện Dashboard hiện đại.

---

## 🏗 Bố cục hệ thống (System Architecture & Layout)
Dự án được tổ chức theo kiến trúc Backend - Frontend tách biệt cùng các module xử lý dữ liệu độc lập:

- **`/backend/`**: 
  - Chứa mã nguồn API Server (FastAPI).
  - Cung cấp các endpoints giao tiếp với Frontend (dự báo, dữ liệu công ty).
  - Tích hợp Finbot (trợ lý ảo AI) để truy xuất thông tin và hỗ trợ phân tích.
- **`/frontend/`**: 
  - Giao diện người dùng (Dashboard) được xây dựng bằng **React 19** và **Vite**.
  - Trực quan hóa dữ liệu bằng **Recharts**, sử dụng **Lucide React** cho biểu tượng.
- **`/models/`**: Thư mục chứa các mô hình Machine Learning đã được huấn luyện và lưu trữ lại (Ví dụ: Random Forest, XGBoost, Scaler).
- **`/data/`**: Thư mục lưu trữ dữ liệu thô và dữ liệu đã qua xử lý phục vụ dự báo.
- **Các Scripts ở thư mục gốc**:
  - `fetch_vnstock_data.py`: Lấy dữ liệu chứng khoán/tài chính.
  - `prepare_data.py` & `feature_engineering.py`: Tiền xử lý, làm sạch và trích xuất đặc trưng (Feature Engineering).
  - `train_models.py` & `update_scaler.py`: Huấn luyện mô hình và cập nhật bộ chuẩn hóa dữ liệu.

---

## 🛠 Công nghệ sử dụng
- **Backend & Data**: Python 3.9+, FastAPI, Pandas, Scikit-learn, Uvicorn, Vnstock, ChromaDB, Sentence-Transformers.
- **Frontend**: React 19, Vite, React Router DOM, Recharts.

---

## 🚀 Hướng dẫn khởi động dự án chi tiết

Để hệ thống hoạt động đầy đủ tính năng, bạn cần khởi chạy cả Backend và Frontend chạy song song ở hai cửa sổ Terminal (hoặc Command Prompt) khác nhau.

### Bước 1: Cài đặt và Khởi động Backend
Mở Terminal / Command Prompt thứ nhất và thực hiện:

```bash
# 1. Di chuyển vào thư mục gốc của dự án
cd "c:\Users\nguye\OneDrive\Tài liệu\Đề Thi"

# 2. Tạo môi trường ảo (Virtual Environment)
python -m venv venv

# 3. Kích hoạt môi trường ảo
# Trên Windows:
.\venv\Scripts\activate
# Trên macOS/Linux:
# source venv/bin/activate

# 4. Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# 5. Chuyển vào thư mục backend và chạy server
cd backend
uvicorn main:app --reload --port 8000
```
✅ **Kết quả**: Backend sẽ chạy tại địa chỉ `http://localhost:8000`. 
Tài liệu API (Swagger UI) có thể truy cập tại `http://localhost:8000/docs`.

### Bước 2: Cài đặt và Khởi động Frontend
Mở Terminal / Command Prompt thứ hai và thực hiện:

```bash
# 1. Di chuyển vào thư mục frontend
cd "c:\Users\nguye\OneDrive\Tài liệu\Đề Thi\frontend"

# 2. Cài đặt các thư viện (Node Modules)
npm install

# 3. Khởi chạy giao diện web
npm run dev
```
✅ **Kết quả**: Frontend Dashboard sẽ chạy tại địa chỉ `http://localhost:5173`. Bạn hãy mở trình duyệt và truy cập vào link này để sử dụng hệ thống.

---

## 🔄 Hướng dẫn cập nhật và huấn luyện lại Mô hình (Tùy chọn)

Trong trường hợp bạn đã nâng cấp hệ thống, thêm dữ liệu mới và cần huấn luyện lại mô hình AI:
Mở Terminal (đảm bảo đã kích hoạt môi trường ảo `venv` ở Bước 1) và chạy tuần tự các lệnh sau ở **thư mục gốc**:

```bash
# 1. Kéo dữ liệu mới nhất
python fetch_vnstock_data.py

# 2. Làm sạch và tiền xử lý dữ liệu
python prepare_data.py

# 3. Tính toán các chỉ số và trích xuất đặc trưng
python feature_engineering.py

# 4. Huấn luyện lại mô hình dự báo
python train_models.py

# 5. Cập nhật lại bộ chuẩn hóa (Scaler)
python update_scaler.py
```
*Lưu ý: Quá trình chạy có thể tốn thời gian tùy thuộc vào lượng dữ liệu.*

---
**Chúc bạn và Nhóm 3 có một kỳ thi AI-Quantum Challenge 2026 thành công rực rỡ! 🏆**
