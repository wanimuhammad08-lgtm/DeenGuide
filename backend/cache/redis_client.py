import redis
import json
import logging
from config import REDIS_HOST, REDIS_PORT

class Cache:
    def __init__(self):
        self.use_redis = False
        try:
            self.r = redis.Redis(
                host=REDIS_HOST, 
                port=REDIS_PORT, 
                decode_responses=True, 
                socket_connect_timeout=0.1,
                socket_timeout=0.1
            )
            if self.r.ping():
                self.use_redis = True
        except Exception:
            self.mem_cache = {}

    def get(self, key: str):
        if self.use_redis:
            try:
                return self.r.get(key)
            except Exception:
                return None
        return self.mem_cache.get(key)

    def set(self, key: str, value: any, ex: int = 3600):
        if self.use_redis:
            try:
                self.r.set(key, json.dumps(value), ex=ex)
            except Exception:
                pass
        else:
            self.mem_cache[key] = json.dumps(value)
