"""
Shared rate limiter instance for the entire FinBot application.
Import this limiter in any router file that needs rate limiting.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
