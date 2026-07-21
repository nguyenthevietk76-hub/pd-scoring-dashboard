"""
SimpleCache — In-memory cache cho Gemini API responses.
Giảm chi phí gọi API bằng cách lưu lại câu hỏi + câu trả lời với TTL.
"""

import hashlib
import time
from typing import Optional
from collections import OrderedDict


class SimpleCache:
    """
    Cache đơn giản dùng OrderedDict với TTL và giới hạn số entry.
    
    - Key: SHA256 hash của (message + ticker)
    - Value: {"reply": str, "timestamp": float}
    - Tự xóa entry cũ nhất khi vượt max_entries
    - Tự xóa entry hết hạn khi truy vấn
    """

    def __init__(self, max_entries: int = 200, ttl_seconds: int = 600):
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, dict] = OrderedDict()

    def _make_key(self, message: str, ticker: Optional[str] = None) -> str:
        """Tạo cache key bằng SHA256 hash của message + ticker."""
        raw = message.strip().lower()
        if ticker:
            raw += f"|{ticker.strip().upper()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, message: str, ticker: Optional[str] = None) -> Optional[str]:
        """
        Lấy câu trả lời từ cache.
        Trả về None nếu không có hoặc đã hết hạn.
        """
        key = self._make_key(message, ticker)
        entry = self._cache.get(key)

        if entry is None:
            return None

        # Kiểm tra TTL
        if time.time() - entry["timestamp"] > self.ttl_seconds:
            # Entry đã hết hạn → xóa
            del self._cache[key]
            return None

        # Di chuyển entry lên cuối (most recently used)
        self._cache.move_to_end(key)
        return entry["reply"]

    def set(self, message: str, reply: str, ticker: Optional[str] = None) -> None:
        """
        Lưu câu trả lời vào cache.
        Nếu đầy thì xóa entry cũ nhất (FIFO).
        """
        key = self._make_key(message, ticker)

        # Nếu key đã tồn tại → cập nhật
        if key in self._cache:
            self._cache.move_to_end(key)
            self._cache[key] = {"reply": reply, "timestamp": time.time()}
            return

        # Nếu đầy → xóa entry cũ nhất
        while len(self._cache) >= self.max_entries:
            self._cache.popitem(last=False)  # Xóa entry đầu tiên (cũ nhất)

        self._cache[key] = {"reply": reply, "timestamp": time.time()}

    @property
    def size(self) -> int:
        """Số entry hiện tại trong cache."""
        return len(self._cache)

    def clear(self) -> None:
        """Xóa toàn bộ cache."""
        self._cache.clear()


# ── Singleton instance ──
# Sử dụng chung 1 instance xuyên suốt ứng dụng
response_cache = SimpleCache(max_entries=200, ttl_seconds=600)
