"""
临时文件管理模块

提供临时文件的创建、追踪和全局清理功能
"""

import os
import shutil
import atexit
import logging
from typing import Set, Optional
from threading import Lock

logger = logging.getLogger(__name__)


class TempFileManager:
    """
    临时文件管理器

    追踪所有创建的临时目录和文件，在应用退出时统一清理

    Example:
        >>> manager = TempFileManager.get_instance()
        >>> temp_dir = manager.create_temp_dir('image_processing')
        >>> # ... 使用临时目录
        >>> # 应用退出时自动清理
    """

    _instance: Optional['TempFileManager'] = None
    _lock = Lock()

    def __init__(self) -> None:
        self._temp_dirs: Set[str] = set()
        self._registered = False

    @classmethod
    def get_instance(cls) -> 'TempFileManager':
        """获取单例实例"""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
                cls._instance._register_cleanup()
            return cls._instance

    def _register_cleanup(self) -> None:
        """注册清理函数到 atexit"""
        if self._registered:
            return

        atexit.register(self._cleanup_all)
        self._registered = True

    def create_temp_dir(self, prefix: str = 'imginserter') -> str:
        """
        创建临时目录

        Args:
            prefix: 目录名前缀

        Returns:
            临时目录的绝对路径
        """
        import tempfile
        temp_dir = tempfile.mkdtemp(prefix=f'{prefix}_')
        self._temp_dirs.add(temp_dir)
        return temp_dir

    def register_temp_dir(self, dir_path: str) -> None:
        """
        注册已有的临时目录

        Args:
            dir_path: 临时目录路径
        """
        if os.path.isdir(dir_path):
            self._temp_dirs.add(dir_path)

    def register_temp_file(self, file_path: str) -> None:
        """
        注册已有的临时文件

        Args:
            file_path: 临时文件路径
        """
        if os.path.isfile(file_path):
            self._temp_dirs.add(os.path.dirname(file_path))

    def unregister_temp_dir(self, dir_path: str) -> None:
        """
        取消注册临时目录（保留目录，不删除）

        Args:
            dir_path: 目录路径
        """
        self._temp_dirs.discard(dir_path)

    def cleanup_temp_dir(self, dir_path: str) -> bool:
        """
        清理指定的临时目录

        Args:
            dir_path: 目录路径

        Returns:
            是否成功清理
        """
        try:
            if os.path.isdir(dir_path):
                shutil.rmtree(dir_path, ignore_errors=True)
            self._temp_dirs.discard(dir_path)
            return True
        except Exception:
            logger.warning(f"清理临时目录失败: {dir_path}", exc_info=True)
            return False

    def _cleanup_all(self) -> None:
        """清理所有注册的临时目录"""
        for temp_dir in list(self._temp_dirs):
            try:
                if os.path.isdir(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                logger.warning(f"清理临时目录时出错: {temp_dir}", exc_info=True)

        self._temp_dirs.clear()

    def get_registered_dirs(self) -> Set[str]:
        """获取所有已注册的临时目录"""
        return set(self._temp_dirs)

    def size(self) -> int:
        """获取已注册临时目录数量"""
        return len(self._temp_dirs)


# ============ 便捷函数（使用类级单例）===========

def get_temp_manager() -> TempFileManager:
    """获取临时文件管理器实例"""
    return TempFileManager.get_instance()


def create_temp_dir(prefix: str = 'imginserter') -> str:
    """创建临时目录的便捷函数"""
    return get_temp_manager().create_temp_dir(prefix)


def register_temp_dir(dir_path: str) -> None:
    """注册临时目录的便捷函数"""
    get_temp_manager().register_temp_dir(dir_path)


def cleanup_all_temp() -> None:
    """清理所有临时目录的便捷函数"""
    get_temp_manager()._cleanup_all()
