import json
import os

class RAGEngine:
    """
    RAG Engine — kết nối KnowledgeBase với FinBot qua ChromaDB vector store.
    Sử dụng sentence-transformers để encode văn bản thành embeddings,
    lưu trữ và truy xuất tri thức liên quan cho mỗi câu hỏi của người dùng.
    """

    def __init__(self, persist_dir: str = None):
        # Đường dẫn mặc định lưu ChromaDB tương đối so với file này (finbot/core/rag_engine.py)
        if not persist_dir:
            persist_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'chroma_db')
        self.persist_dir = persist_dir

        # Khởi tạo các thành phần chính — chỉ load khi gọi build_index()
        self.knowledge_base = None
        self.client = None          # ChromaDB PersistentClient
        self.collection = None      # ChromaDB collection 'finbot_knowledge'
        self.model = None           # SentenceTransformer model (load 1 lần duy nhất)

    # ------------------------------------------------------------------ #
    #  BUILD INDEX — Xây dựng chỉ mục vector từ KnowledgeBase + demoData
    # ------------------------------------------------------------------ #
    def build_index(self):
        """
        Xây dựng (hoặc tái sử dụng) chỉ mục ChromaDB:
        1. Load KnowledgeBase và sentence-transformers model (1 lần duy nhất)
        2. Tạo ChromaDB persistent client
        3. Nếu collection đã có dữ liệu → bỏ qua
        4. Nếu chưa → encode toàn bộ tri thức + dữ liệu công ty rồi lưu vào collection
        """
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            from core.knowledge_base import KnowledgeBase
        except ImportError as e:
            print(f"Warning: Thiếu thư viện cần thiết cho RAG Engine: {e}")
            return

        try:
            # Khởi tạo KnowledgeBase
            self.knowledge_base = KnowledgeBase()
            print("RAG Engine: Đã khởi tạo KnowledgeBase.")

            # Load model sentence-transformers (1 lần duy nhất)
            if self.model is None:
                print("RAG Engine: Đang tải model paraphrase-multilingual-MiniLM-L12-v2...")
                self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                print("RAG Engine: Đã tải model thành công.")

            # Tạo ChromaDB persistent client
            os.makedirs(self.persist_dir, exist_ok=True)
            self.client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = self.client.get_or_create_collection(name='finbot_knowledge')
            print(f"RAG Engine: ChromaDB collection 'finbot_knowledge' — {self.collection.count()} documents.")

            # Nếu collection đã có dữ liệu → không cần rebuild
            if self.collection.count() > 0:
                print("Index already built, skipping...")
                return

            # -----------------------------------------------------------
            # Thu thập tất cả văn bản cần index
            # -----------------------------------------------------------
            all_ids = []
            all_texts = []
            all_embeddings = []
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

            # -----------------------------------------------------------
            # Encode tất cả văn bản và đẩy vào ChromaDB
            # -----------------------------------------------------------
            if not all_texts:
                print("Warning: Không có văn bản nào để index.")
                return

            print(f"RAG Engine: Đang encode {len(all_texts)} văn bản...")
            all_embeddings = self.model.encode(all_texts).tolist()

            # ChromaDB giới hạn batch size, thêm theo batch 500
            batch_size = 500
            for start in range(0, len(all_ids), batch_size):
                end = start + batch_size
                self.collection.add(
                    ids=all_ids[start:end],
                    embeddings=all_embeddings[start:end],
                    documents=all_texts[start:end],
                    metadatas=all_metadatas[start:end],
                )

            print(f"RAG Engine: Đã index thành công {self.collection.count()} documents vào ChromaDB.")

        except Exception as e:
            print(f"Warning: Lỗi khi build index RAG Engine: {e}")

    # ------------------------------------------------------------------ #
    #  RETRIEVE — Truy xuất văn bản liên quan từ ChromaDB
    # ------------------------------------------------------------------ #
    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        """
        Encode câu hỏi và tìm top_k văn bản gần nhất trong ChromaDB.
        Trả về danh sách dict: {text, metadata, distance}
        """
        if self.collection is None or self.model is None:
            return []

        try:
            query_embedding = self.model.encode([query]).tolist()
            results = self.collection.query(
                query_embeddings=query_embedding,
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
            print(f"Warning: Lỗi khi truy xuất từ ChromaDB: {e}")
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

        # ---- (2 & 3) Tri thức từ ChromaDB ---- #
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
