import json
import os
import pickle
import numpy as np

class SimpleVectorStore:
    """
    Một Vector Store thuần Python sử dụng numpy để tính cosine similarity.
    Hoàn toàn không có phụ thuộc C++ phức tạp (như chromadb / hnswlib), 
    hoạt động mượt mà trên tất cả các phiên bản Python (kể cả Python 3.13 trên Windows).
    """
    def __init__(self, persist_path: str):
        self.persist_path = persist_path
        self.ids = []
        self.documents = []
        self.metadatas = []
        self.embeddings = None  # Sẽ là numpy array hình dạng (N, 3072)
        self.load()

    def load(self):
        if os.path.exists(self.persist_path):
            try:
                with open(self.persist_path, 'rb') as f:
                    data = pickle.load(f)
                    self.ids = data.get('ids', [])
                    self.documents = data.get('documents', [])
                    self.metadatas = data.get('metadatas', [])
                    embeddings_list = data.get('embeddings', [])
                    if embeddings_list:
                        self.embeddings = np.array(embeddings_list, dtype=np.float32)
                print(f"SimpleVectorStore: Đã tải {len(self.ids)} tài liệu từ {self.persist_path}")
            except Exception as e:
                print(f"Warning: Lỗi khi tải SimpleVectorStore: {e}")

    def save(self):
        try:
            os.makedirs(os.path.dirname(self.persist_path), exist_ok=True)
            with open(self.persist_path, 'wb') as f:
                pickle.dump({
                    'ids': self.ids,
                    'documents': self.documents,
                    'metadatas': self.metadatas,
                    'embeddings': self.embeddings.tolist() if self.embeddings is not None else []
                }, f)
            print(f"SimpleVectorStore: Đã lưu {len(self.ids)} tài liệu vào {self.persist_path}")
        except Exception as e:
            print(f"Warning: Lỗi khi lưu SimpleVectorStore: {e}")

    def count(self) -> int:
        return len(self.ids)

    def add(self, ids: list[str], embeddings: list[list[float]], documents: list[str], metadatas: list[dict]):
        self.ids.extend(ids)
        self.documents.extend(documents)
        self.metadatas.extend(metadatas)
        
        new_emb = np.array(embeddings, dtype=np.float32)
        if self.embeddings is None or len(self.embeddings) == 0:
            self.embeddings = new_emb
        else:
            self.embeddings = np.vstack([self.embeddings, new_emb])
        self.save()

    def query(self, query_embeddings: list[list[float]], n_results: int = 3) -> dict:
        if self.embeddings is None or len(self.embeddings) == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

        # Lấy vector query đầu tiên
        q = np.array(query_embeddings[0], dtype=np.float32)
        
        # Chuẩn hóa để tính cosine similarity
        q_norm = q / (np.linalg.norm(q) + 1e-10)
        emb_norm = self.embeddings / (np.linalg.norm(self.embeddings, axis=1, keepdims=True) + 1e-10)
        
        similarities = np.dot(emb_norm, q_norm)
        distances = 1.0 - similarities  # Cosine distance = 1 - similarity
        
        # Lấy top k khoảng cách nhỏ nhất
        top_k = min(n_results, len(distances))
        idx = np.argsort(distances)[:top_k]
        
        res_docs = [self.documents[i] for i in idx]
        res_metas = [self.metadatas[i] for i in idx]
        res_dists = [float(distances[i]) for i in idx]
        
        return {
            "documents": [res_docs],
            "metadatas": [res_metas],
            "distances": [res_dists]
        }


class RAGEngine:
    """
    RAG Engine — kết nối KnowledgeBase và các tài liệu PDF với FinBot qua SimpleVectorStore.
    Sử dụng Gemini Embeddings API để chuyển đổi tri thức thành vector 3072 chiều.
    """

    def __init__(self, persist_dir: str = None):
        if not persist_dir:
            persist_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'chroma_db')
        self.persist_dir = persist_dir
        self.persist_file = os.path.join(self.persist_dir, "vector_store.pkl")

        # Khởi tạo các thành phần chính
        self.knowledge_base = None
        self.collection = None      # Đại diện cho SimpleVectorStore
        self.model = "gemini-embedding-001"

    # ------------------------------------------------------------------ #
    #  BUILD INDEX — Xây dựng chỉ mục vector từ KnowledgeBase + demoData
    # ------------------------------------------------------------------ #
    def build_index(self):
        """
        Xây dựng chỉ mục vector:
        1. Load KnowledgeBase
        2. Khởi tạo SimpleVectorStore
        3. Nếu vector store đã có dữ liệu → bỏ qua
        4. Nếu chưa → nạp dữ liệu từ KnowledgeBase, demoData.json và các file PDF trong data/documents/
        5. Gọi Gemini Embeddings API để tạo vector và lưu lại
        """
        try:
            from core.knowledge_base import KnowledgeBase
        except ImportError as e:
            print(f"Warning: Thiếu thư viện cần thiết cho RAG Engine: {e}")
            return

        try:
            # Khởi tạo KnowledgeBase
            self.knowledge_base = KnowledgeBase()
            print("RAG Engine: Đã khởi tạo KnowledgeBase.")

            # Khởi tạo SimpleVectorStore
            self.collection = SimpleVectorStore(self.persist_file)
            print(f"RAG Engine: SimpleVectorStore loaded — {self.collection.count()} documents.")

            # Nếu đã có dữ liệu → không cần build lại
            if self.collection.count() > 0:
                print("Index already built, skipping...")
                return

            # -----------------------------------------------------------
            # Thu thập tất cả văn bản cần index
            # -----------------------------------------------------------
            all_ids = []
            all_texts = []
            all_metadatas = []

            # (a) Tri thức chung từ KnowledgeBase
            knowledge_texts = self.knowledge_base.get_all_knowledge_texts()
            print(f"RAG Engine: Đã lấy {len(knowledge_texts)} đoạn tri thức từ KnowledgeBase.")

            for i, text in enumerate(knowledge_texts):
                all_ids.append(f"knowledge_{i}")
                all_texts.append(text)
                all_metadatas.append({"type": "knowledge"})

            # (b) Dữ liệu 73 công ty từ demoData.json
            demo_data_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'demoData.json')
            try:
                with open(demo_data_path, 'r', encoding='utf-8') as f:
                    demo_data = json.load(f)
                companies = demo_data.get("companies", [])
                print(f"RAG Engine: Đã đọc {len(companies)} công ty từ demoData.json.")

                for idx, comp in enumerate(companies):
                    name = comp.get('name', 'Không rõ')
                    ticker = comp.get('ticker', 'N/A')
                    sector = comp.get('sector', 'Không rõ')
                    current_pd = comp.get('current_pd', 'N/A')
                    risk_level = comp.get('risk_level', 'Không rõ')
                    top_factors = comp.get('top_factors', [])

                    # Tạo chuỗi mô tả các yếu tố chính
                    factors_parts = []
                    for f in top_factors:
                        label = f.get('label_vi', f.get('feature', ''))
                        display = f.get('display_val', '')
                        contribution = f.get('contribution', 0)
                        factors_parts.append(f"{label}: {display} (đóng góp: {contribution:.4f})")
                    factors_text = "; ".join(factors_parts) if factors_parts else "Chưa có dữ liệu"

                    # Tạo bản tóm tắt văn bản cho công ty
                    summary = (
                        f"Công ty {name} (Mã: {ticker}), ngành {sector}, "
                        f"PD Score hiện tại: {current_pd}%, Mức rủi ro: {risk_level}. "
                        f"Các yếu tố chính: {factors_text}"
                    )

                    all_ids.append(f"company_{idx}_{ticker}")
                    all_texts.append(summary)
                    all_metadatas.append({"type": "company", "sector": sector, "ticker": ticker})

            except Exception as e:
                print(f"Warning: Không thể đọc demoData.json: {e}")

            # (c) Đọc và phân tích các tài liệu PDF từ data/documents/
            documents_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'documents')
            if os.path.exists(documents_dir):
                import glob
                try:
                    from pypdf import PdfReader
                    pdf_files = glob.glob(os.path.join(documents_dir, "*.pdf"))
                    print(f"RAG Engine: Tìm thấy {len(pdf_files)} file PDF trong thư mục documents.")
                    
                    for pdf_path in pdf_files:
                        filename = os.path.basename(pdf_path)
                        print(f"RAG Engine: Đang đọc file PDF '{filename}'...")
                        try:
                            reader = PdfReader(pdf_path)
                            full_text = ""
                            for page_num, page in enumerate(reader.pages):
                                page_text = page.extract_text()
                                if page_text:
                                    full_text += page_text + "\n"
                            
                            # Làm sạch text sơ bộ
                            cleaned_text = " ".join(full_text.split())
                            if not cleaned_text:
                                print(f"Warning: File {filename} không có text hoặc không đọc được.")
                                continue
                                
                            # Chia nhỏ thành các đoạn (chunks) 1000 ký tự, trùng lặp 200 ký tự
                            chunk_size = 1000
                            overlap = 200
                            
                            chunks = []
                            start_idx = 0
                            while start_idx < len(cleaned_text):
                                end_idx = start_idx + chunk_size
                                chunk = cleaned_text[start_idx:end_idx]
                                chunks.append(chunk)
                                if end_idx >= len(cleaned_text):
                                    break
                                start_idx += chunk_size - overlap
                                
                            print(f"RAG Engine: File '{filename}' được tách thành {len(chunks)} đoạn tri thức.")
                            for c_idx, chunk_text in enumerate(chunks):
                                all_ids.append(f"doc_{filename}_{c_idx}")
                                all_texts.append(chunk_text)
                                all_metadatas.append({"type": "knowledge", "source": filename})
                                
                        except Exception as e:
                            print(f"Warning: Lỗi khi xử lý file PDF '{filename}': {e}")
                except Exception as e:
                    print(f"Warning: Thiếu thư viện pypdf hoặc lỗi import: {e}")

            # -----------------------------------------------------------
            # Encode tất cả văn bản và đẩy vào SimpleVectorStore
            # -----------------------------------------------------------
            if not all_texts:
                print("Warning: Không có văn bản nào để index.")
                return

            print(f"RAG Engine: Đang encode {len(all_texts)} văn bản bằng Gemini Embedding API...")
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

            import time
            all_embeddings = []
            api_batch_size = 90

            def embed_with_retry(batch_texts, start_idx):
                for attempt in range(5):
                    try:
                        res = genai.embed_content(
                            model="models/gemini-embedding-001",
                            content=batch_texts
                        )
                        return res['embedding']
                    except Exception as e:
                        if "429" in str(e) or "quota" in str(e).lower() or "limit" in str(e).lower():
                            wait_time = 65
                            print(f"RAG Engine: Chạm giới hạn API ở batch {start_idx}. Đang chờ {wait_time}s để reset quota (Lần thử {attempt + 1}/5)...")
                            time.sleep(wait_time)
                        else:
                            raise e
                print(f"Warning: Thử lại thất bại sau 5 lần ở batch {start_idx}. Dùng fallback zero vectors.")
                return [[0.0] * 3072] * len(batch_texts)

            for i in range(0, len(all_texts), api_batch_size):
                batch_texts = all_texts[i : i + api_batch_size]
                embeddings_chunk = embed_with_retry(batch_texts, i)
                all_embeddings.extend(embeddings_chunk)
                print(f"RAG Engine: Đã encode xong {min(i + api_batch_size, len(all_texts))}/{len(all_texts)}...")
                time.sleep(2)

            # Lưu vào SimpleVectorStore
            self.collection.add(
                ids=all_ids,
                embeddings=all_embeddings,
                documents=all_texts,
                metadatas=all_metadatas,
            )

            print(f"RAG Engine: Đã index thành công {self.collection.count()} documents vào SimpleVectorStore.")

        except Exception as e:
            print(f"Warning: Lỗi khi build index RAG Engine: {e}")

    # ------------------------------------------------------------------ #
    #  RETRIEVE — Truy xuất văn bản liên quan từ SimpleVectorStore
    # ------------------------------------------------------------------ #
    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        """
        Encode câu hỏi bằng Gemini Embedding và tìm top_k văn bản gần nhất trong SimpleVectorStore.
        Trả về danh sách dict: {text, metadata, distance}
        """
        if self.collection is None:
            self.collection = SimpleVectorStore(self.persist_file)

        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

            res = genai.embed_content(
                model="models/gemini-embedding-001",
                content=query
            )
            query_embedding = res['embedding']

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
            )

            retrieved = []
            if results and results.get('documents'):
                documents = results['documents'][0]
                metadatas = results['metadatas'][0] if results.get('metadatas') else [{}] * len(documents)
                distances = results['distances'][0] if results.get('distances') else [0.0] * len(documents)

                for doc, meta, dist in zip(documents, metadatas, distances):
                    retrieved.append({
                        "text": doc,
                        "metadata": meta,
                        "distance": dist,
                    })

            return retrieved

        except Exception as e:
            print(f"Warning: Lỗi khi truy xuất từ SimpleVectorStore: {e}")
            return []

    # ------------------------------------------------------------------ #
    #  BUILD CONTEXT — Xây dựng context string cho Gemini prompt
    # ------------------------------------------------------------------ #
    def build_context(self, query: str, company_data: dict = None) -> tuple[str, list[str]]:
        """
        Xây dựng context string (< 500 từ) và danh sách nguồn trích dẫn.
        Thứ tự ưu tiên:
          1. Dữ liệu công ty cụ thể (nếu có company_data)
          2. Tri thức ngành (sector knowledge)
          3. Quy định pháp lý liên quan
        Trả về tuple: (context_string, source_labels)
        """
        context_parts = []
        source_labels = []

        # ---- (1) Dữ liệu công ty cụ thể ---- #
        if company_data:
            name = company_data.get('name', 'Không rõ')
            ticker = company_data.get('ticker', 'N/A')
            sector = company_data.get('sector', 'Không rõ')
            pd_score = company_data.get('current_pd', 'N/A')
            risk = company_data.get('risk_level', 'Không rõ')
            factors = company_data.get('top_factors', [])

            factor_lines = []
            for f in factors:
                factor_lines.append(
                    f"- {f.get('label_vi', f.get('feature', ''))}: {f.get('display_val', '')} "
                    f"(Đóng góp: {f.get('contribution', 0):.4f})"
                )
            factors_str = "\n".join(factor_lines) if factor_lines else "- Chưa có dữ liệu"

            company_context = (
                f"[Dữ liệu công ty]\n"
                f"Công ty: {name} (Mã: {ticker})\n"
                f"Ngành: {sector}\n"
                f"PD Score: {pd_score}%\n"
                f"Mức rủi ro: {risk}\n"
                f"Yếu tố chính:\n{factors_str}"
            )
            context_parts.append(company_context)
            source_labels.append(f"Dữ liệu công ty {ticker}")

        # ---- (2 & 3) Tri thức từ SimpleVectorStore ---- #
        retrieved = self.retrieve(query, top_k=5)

        # Phân loại kết quả truy xuất theo type
        sector_docs = []
        regulation_docs = []
        other_docs = []

        for item in retrieved:
            doc_type = item.get('metadata', {}).get('type', '')
            if doc_type == 'company':
                # Bỏ qua company docs nếu đã có company_data cụ thể
                if company_data:
                    continue
                other_docs.append(item)
            elif doc_type == 'knowledge':
                text_lower = item.get('text', '').lower()
                # Phân biệt tri thức ngành vs quy định dựa vào nội dung
                if any(kw in text_lower for kw in ['thông tư', 'nghị định', 'quy định', 'basel', 'pháp lý']):
                    regulation_docs.append(item)
                else:
                    sector_docs.append(item)
            else:
                other_docs.append(item)

        # Thêm tri thức ngành
        for doc in sector_docs:
            text = doc.get('text', '')
            if text:
                context_parts.append(f"[Tri thức tham khảo]\n{text}")
                # Tạo nhãn nguồn từ metadata
                sector = doc.get('metadata', {}).get('sector', '')
                if sector:
                    label = f"Tri thức ngành {sector}"
                else:
                    # Trích xuất nhãn ngắn gọn từ nội dung
                    label = text[:50].strip().replace('\n', ' ')
                if label not in source_labels:
                    source_labels.append(label)

        # Thêm quy định pháp lý
        for doc in regulation_docs:
            text = doc.get('text', '')
            if text:
                context_parts.append(f"[Quy định liên quan]\n{text}")
                # Cố gắng trích xuất tên quy định
                label = self._extract_regulation_label(text)
                if label not in source_labels:
                    source_labels.append(label)

        # Thêm các tài liệu khác nếu còn chỗ
        for doc in other_docs:
            text = doc.get('text', '')
            if text:
                context_parts.append(f"[Tham khảo]\n{text}")
                ticker = doc.get('metadata', {}).get('ticker', '')
                if ticker:
                    label = f"Dữ liệu công ty {ticker}"
                else:
                    # Nếu có nguồn từ file PDF thì dùng tên file làm nhãn
                    source_file = doc.get('metadata', {}).get('source', '')
                    if source_file:
                        label = f"Tài liệu: {source_file}"
                    else:
                        label = text[:50].strip().replace('\n', ' ')
                if label not in source_labels:
                    source_labels.append(label)

        # Ghép context và giới hạn 500 từ
        full_context = "\n\n".join(context_parts)
        full_context = self._truncate_to_word_limit(full_context, max_words=500)

        return full_context, source_labels

    # ------------------------------------------------------------------ #
    #  HELPER — Trích xuất nhãn quy định từ văn bản
    # ------------------------------------------------------------------ #
    def _extract_regulation_label(self, text: str) -> str:
        """Trích xuất tên thông tư / nghị định từ đoạn văn bản."""
        import re
        # Tìm các pattern phổ biến: Thông tư XX/YYYY, Nghị định XX/YYYY
        patterns = [
            r'(Thông tư\s+\d+/\d+[^\s,\.]*)',
            r'(Nghị định\s+\d+/\d+[^\s,\.]*)',
            r'(Basel\s+[IVX]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        # Fallback: lấy 50 ký tự đầu
        return text[:50].strip().replace('\n', ' ')

    def _truncate_to_word_limit(self, text: str, max_words: int = 500) -> str:
        """Cắt văn bản để không vượt quá max_words từ."""
        words = text.split()
        if len(words) <= max_words:
            return text
        return " ".join(words[:max_words]) + "..."
