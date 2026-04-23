"""
图片缓存管理器 - LRU 缓存实现

使用 LRU (Least Recently Used) 策略管理图片缓存，
在保证性能的同时控制内存使用。
"""

import threading
from collections import OrderedDict
from typing import Optional, Tuple


class ImageCache:
    """
    LRU 图片缓存管理器

    特性：
    - 线程安全
    - LRU 淘汰策略
    - 最大容量限制
    """

    def __init__(self, max_size: int = 666):
        """
        初始化缓存管理器

        Args:
            max_size: 最大缓存条目数，默认 666
        """
        self._cache: OrderedDict[str, bytes] = OrderedDict()
        self._max_size = max_size
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[bytes]:
        """
        获取缓存中的图片数据

        Args:
            key: 缓存键，格式为 "product_code_sequence"

        Returns:
            图片数据bytes，如果不存在返回None
        """
        with self._lock:
            if key in self._cache:
                # 移到末尾表示最近使用
                self._cache.move_to_end(key)
                self._hits += 1
                return self._cache[key]
            self._misses += 1
            return None

    def put(self, key: str, data: bytes) -> None:
        """
        添加数据到缓存

        Args:
            key: 缓存键
            data: 图片数据
        """
        with self._lock:
            if key in self._cache:
                # 已存在，移到末尾
                self._cache.move_to_end(key)
            else:
                # 新增，超容量则淘汰最旧的
                if len(self._cache) >= self._max_size:
                    self._cache.popitem(last=False)
                self._cache[key] = data

    def remove(self, key: str) -> None:
        """
        从缓存中移除指定条目

        Args:
            key: 缓存键
        """
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        """清空所有缓存"""
        with self._lock:
            self._cache.clear()

    def get_stats(self) -> Tuple[int, int, float]:
        """
        获取缓存统计信息

        Returns:
            (命中数, 未命中数, 命中率)
        """
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0.0
            return (self._hits, self._misses, hit_rate)

    def __len__(self) -> int:
        """返回当前缓存大小"""
        with self._lock:
            return len(self._cache)


# 全局缓存实例（延迟加载模式）
_global_cache: Optional[ImageCache] = None
_cache_lock = threading.Lock()


def get_global_cache(max_size: int = 666) -> ImageCache:
    """
    获取全局缓存实例（单例模式）

    Args:
        max_size: 最大缓存条目数

    Returns:
        全局缓存实例
    """
    global _global_cache
    with _cache_lock:
        if _global_cache is None:
            _global_cache = ImageCache(max_size=max_size)
        return _global_cache


def reset_global_cache() -> None:
    """重置全局缓存（主要用于测试）"""
    global _global_cache
    with _cache_lock:
        if _global_cache is not None:
            _global_cache.clear()
        _global_cache = None
