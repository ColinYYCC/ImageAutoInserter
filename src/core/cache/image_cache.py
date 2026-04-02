"""
图片验证缓存模块

提供 LRU 缓存功能，用于缓存验证结果
"""

from typing import Dict, List, Optional, Any


class ImageValidationCache:
    """
    图片验证缓存类

    使用 LRU (Least Recently Used) 算法管理缓存，
    防止无限增长的缓存占用过多内存

    Attributes:
        max_items (int): 最大缓存条目数
    """

    def __init__(self, max_items: int = 100):
        self._cache: Dict[str, Any] = {}
        self._cache_order: List[str] = []
        self._max_items = max_items

    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值

        Args:
            key: 缓存键

        Returns:
            缓存值，如果不存在返回 None
        """
        if key in self._cache:
            if key in self._cache_order:
                self._cache_order.remove(key)
            self._cache_order.append(key)
            return self._cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        """
        设置缓存值

        Args:
            key: 缓存键
            value: 缓存值
        """
        if key in self._cache:
            if key in self._cache_order:
                self._cache_order.remove(key)
            self._cache_order.append(key)
            self._cache[key] = value
            return

        while len(self._cache) >= self._max_items and self._cache_order:
            oldest_key = self._cache_order.pop(0)
            self._cache.pop(oldest_key, None)

        self._cache[key] = value
        self._cache_order.append(key)

    def clear(self) -> None:
        """清空缓存"""
        self._cache.clear()
        self._cache_order.clear()

    def has(self, key: str) -> bool:
        """检查缓存键是否存在"""
        return key in self._cache

    def size(self) -> int:
        """获取缓存条目数"""
        return len(self._cache)
