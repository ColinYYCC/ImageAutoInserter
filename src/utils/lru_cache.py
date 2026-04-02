"""
通用 LRU 缓存模块

提供通用的 LRU (Least Recently Used) 缓存功能
"""

import sys
import logging
from typing import Dict, List, Optional, Any
from threading import Lock

logger = logging.getLogger(__name__)


class LRUCache:
    """
    通用 LRU 缓存类

    使用 LRU 算法管理缓存，支持线程安全操作

    Attributes:
        max_items: 最大缓存条目数
        max_size_bytes: 最大缓存总大小（字节）
    """

    def __init__(self, max_items: int = 100, max_size_bytes: int = 0):
        self._cache: Dict[str, Any] = {}
        self._cache_order: List[str] = []
        self._max_items = max_items
        self._max_size_bytes = max_size_bytes
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值

        Args:
            key: 缓存键

        Returns:
            缓存值，如果不存在返回 None
        """
        with self._lock:
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
        with self._lock:
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
        with self._lock:
            self._cache.clear()
            self._cache_order.clear()

    def has(self, key: str) -> bool:
        """检查缓存键是否存在"""
        with self._lock:
            return key in self._cache

    def size(self) -> int:
        """获取缓存条目数"""
        with self._lock:
            return len(self._cache)

    def remove(self, key: str) -> None:
        """删除指定缓存项"""
        with self._lock:
            if key in self._cache:
                self._cache.pop(key, None)
            if key in self._cache_order:
                self._cache_order.remove(key)

    def get_keys(self) -> List[str]:
        """获取所有缓存键"""
        with self._lock:
            return list(self._cache.keys())

    def __len__(self) -> int:
        return self.size()

    def __contains__(self, key: str) -> bool:
        return self.has(key)


class SizedLRUCache(LRUCache):
    """
    支持按大小管理的 LRU 缓存类

    除了按条目数管理缓存，还支持按总大小管理
    使用 sys.getsizeof 更準確地估算對象大小
    """

    def __init__(self, max_items: int = 100, max_size_bytes: int = 50 * 1024 * 1024):
        super().__init__(max_items, max_size_bytes)
        self._total_size = 0

    def _get_value_size(self, value: Any) -> int:
        """
        計算值的實際內存大小

        Args:
            value: 緩存值

        Returns:
            int: 對象大小（字節）
        """
        try:
            return sys.getsizeof(value)
        except (TypeError, AttributeError) as e:
            logger.debug(f"无法获取对象大小: {type(value)}, 错误: {e}")
            try:
                return len(value) if hasattr(value, '__len__') else 0
            except (TypeError, AttributeError):
                logger.debug(f"无法获取对象长度: {type(value)}")
                return 0

    def set(self, key: str, value: Any) -> None:
        """设置缓存值，支持大小管理（使用 sys.getsizeof）"""
        with self._lock:
            value_size = self._get_value_size(value)

            if key in self._cache:
                old_value = self._cache[key]
                old_size = self._get_value_size(old_value)
                self._total_size -= old_size

                if key in self._cache_order:
                    self._cache_order.remove(key)
                self._cache_order.append(key)
                self._cache[key] = value
                self._total_size += value_size
                return

            # 按條目數限制清理
            while len(self._cache) >= self._max_items and self._cache_order:
                oldest_key = self._cache_order.pop(0)
                oldest_data = self._cache.pop(oldest_key, None)
                if oldest_data is not None:
                    oldest_size = self._get_value_size(oldest_data)
                    self._total_size -= oldest_size

            # 按大小限制清理
            while (self._max_size_bytes > 0 and
                   self._total_size + value_size > self._max_size_bytes and
                   self._cache_order):
                oldest_key = self._cache_order.pop(0)
                oldest_data = self._cache.pop(oldest_key, None)
                if oldest_data is not None:
                    oldest_size = self._get_value_size(oldest_data)
                    self._total_size -= oldest_size

            self._cache[key] = value
            self._cache_order.append(key)
            self._total_size += value_size

    def clear(self) -> None:
        """清空缓存"""
        super().clear()
        self._total_size = 0

    def get_total_size(self) -> int:
        """获取当前缓存总大小"""
        with self._lock:
            return self._total_size
