"""
安全验证工具模块

提供路径验证、文件类型检查等安全功能，防止：
1. 路径遍历攻击
2. 命令注入
3. 危险文件类型
4. 符号链接攻击

注意: RAR 文件由 TypeScript 端 (node-unrar-js) 提取后，
Python 只接收已提取的文件夹路径，因此 RAR 验证在 TypeScript 端完成。
"""

import os
import re
import stat
from pathlib import Path
from typing import Optional, List, Set
from functools import lru_cache


class SecurityValidator:
    """安全验证工具类"""

    DANGEROUS_PATTERNS = [
        r'\.\.',
        r'C:\\Windows',
        r'C:\\Program Files',
    ]

    ALLOWED_IMAGE_EXTENSIONS: Set[str] = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    ALLOWED_ARCHIVE_EXTENSIONS: Set[str] = {'.zip'}
    ALLOWED_EXCEL_EXTENSIONS: Set[str] = {'.xlsx', '.xls'}

    @classmethod
    def is_symlink(cls, path: Path) -> bool:
        """
        检查路径是否为符号链接（使用 lstat 防止 TOCTOU 攻擊）

        Args:
            path: 要检查的路径

        Returns:
            bool: 是否为符号链接
        """
        try:
            # 使用 lstat 而不是 is_symlink()，避免 race condition
            # lstat 不跟隨符號鏈接，直接返回鏈接本身的信息
            file_stat = os.lstat(path)
            return stat.S_ISLNK(file_stat.st_mode)
        except (OSError, ValueError):
            return False

    @classmethod
    def _is_path_within_allowed_dirs(cls, path: Path, allowed_base_dirs: List[str]) -> bool:
        """
        檢查路徑是否在允許的目錄內（安全版本，防止 TOCTOU）

        Args:
            path: 要檢查的路徑（已解析的絕對路徑）
            allowed_base_dirs: 允許的基礎目錄列表

        Returns:
            bool: 是否在允許的目錄內
        """
        try:
            for allowed_dir in allowed_base_dirs:
                allowed_path = Path(allowed_dir).resolve()
                # 確保路徑以允許目錄開頭，並且不是通過 .. 跳出的
                try:
                    path.relative_to(allowed_path)
                    return True
                except ValueError:
                    continue
            return False
        except (OSError, ValueError):
            return False

    @classmethod
    def validate_path(
        cls,
        path: str,
        allowed_base_dirs: Optional[List[str]] = None
    ) -> Path:
        """
        验证路径安全，防止路径遍历攻击和符号链接攻击（TOCTOU 安全版本）

        Args:
            path: 用户提供的路径
            allowed_base_dirs: 允许的基础目录列表

        Returns:
            验证后的 Path 对象

        Raises:
            ValueError: 路径不安全
        """
        if not path:
            raise ValueError("路径不能为空")

        try:
            # 先獲取原始路徑對象
            original_path = Path(path)
            # 使用 resolve() 獲取絕對路徑（解析所有符號鏈接和 ..）
            resolved = original_path.resolve()
        except (OSError, ValueError) as e:
            raise ValueError(f"无效的路径: {path}") from e

        # 檢查原始路徑是否為符號鏈接（使用 lstat 防止 TOCTOU）
        if cls.is_symlink(original_path):
            if allowed_base_dirs:
                # 獲取符號鏈接指向的目標
                try:
                    link_target = os.readlink(original_path)
                    link_target_resolved = Path(link_target).resolve()
                    if not cls._is_path_within_allowed_dirs(link_target_resolved, allowed_base_dirs):
                        raise ValueError(f"符号链接指向不允许的位置: {path}")
                except (OSError, ValueError) as e:
                    raise ValueError(f"无法解析符号链接: {path}") from e
            else:
                raise ValueError(f"不允许使用符号链接: {path}")

        path_str = str(resolved)

        # 檢查路徑遍歷（解析後的路徑不應包含 ..）
        if '..' in resolved.parts:
            raise ValueError("不允许使用路径遍历: ..")

        # 檢查危險模式
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, path_str, re.IGNORECASE):
                raise ValueError(f"不允许访问的系统路径: {path}")

        # 檢查是否在允許的目錄內
        if allowed_base_dirs:
            if not cls._is_path_within_allowed_dirs(resolved, allowed_base_dirs):
                raise ValueError(
                    f"路径不在允许的目录内。允许的目录: {allowed_base_dirs}"
                )

        return resolved

    @classmethod
    def validate_file_type(
        cls,
        file_path: str,
        allowed_extensions: Set[str]
    ) -> bool:
        """
        验证文件类型

        Args:
            file_path: 文件路径
            allowed_extensions: 允许的扩展名集合

        Returns:
            是否允许

        Raises:
            ValueError: 文件类型不允许
        """
        ext = Path(file_path).suffix.lower()

        if ext not in allowed_extensions:
            raise ValueError(
                f"不支持的文件类型: {ext}。"
                f"允许的类型: {', '.join(allowed_extensions)}"
            )

        return True

    @classmethod
    def validate_image_file(cls, file_path: str) -> Path:
        """验证图片文件安全性"""
        path = cls.validate_path(file_path)
        cls.validate_file_type(file_path, cls.ALLOWED_IMAGE_EXTENSIONS)

        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        if not path.is_file():
            raise ValueError(f"不是有效的文件: {file_path}")

        return path

    @classmethod
    def validate_archive_file(cls, file_path: str) -> Path:
        """验证压缩包文件安全性"""
        path = cls.validate_path(file_path)
        cls.validate_file_type(file_path, cls.ALLOWED_ARCHIVE_EXTENSIONS)

        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        if not path.is_file():
            raise ValueError(f"不是有效的文件: {file_path}")

        return path

    @classmethod
    def validate_excel_file(cls, file_path: str) -> Path:
        """验证 Excel 文件安全性"""
        path = cls.validate_path(file_path)
        cls.validate_file_type(file_path, cls.ALLOWED_EXCEL_EXTENSIONS)

        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        if not path.is_file():
            raise ValueError(f"不是有效的文件: {file_path}")

        return path

    @classmethod
    @lru_cache(maxsize=32)
    def validate_image_source(
        cls,
        source_path: str,
        allowed_base_dirs: Optional[List[str]] = None
    ) -> Path:
        """
        验证图片来源路径安全性（带缓存）

        Args:
            source_path: 图片来源路径
            allowed_base_dirs: 允许的基础目录

        Returns:
            验证后的路径
        """
        return cls.validate_path(source_path, allowed_base_dirs)


class SensitiveDataMask:
    """敏感数据脱敏工具"""

    SENSITIVE_PATTERNS = [
        (r'/Users/[\w.-]+/', '/Users/***/'),
        (r'C:\\Users\\[\w.-]+\\', 'C:\\Users\\***\\'),
        (r'api[_-]?key["\s:=]+["\']?[\w-]+', 'api_key=***'),
        (r'password["\s:=]+["\']?[^\s"\']+', 'password=***'),
        (r'token["\s:=]+["\']?[\w-]+', 'token=***'),
        (r'secret["\s:=]+["\']?[^\s"\']+', 'secret=***'),
    ]

    @classmethod
    def mask(cls, text: str) -> str:
        """
        脱敏处理

        Args:
            text: 原始文本

        Returns:
            脱敏后的文本
        """
        if not text:
            return text

        masked = text
        for pattern, replacement in cls.SENSITIVE_PATTERNS:
            masked = re.sub(pattern, replacement, masked, flags=re.IGNORECASE)

        return masked

    @classmethod
    def mask_file_path(cls, file_path: str) -> str:
        """脱敏文件路径"""
        if not file_path:
            return file_path

        home = os.path.expanduser('~')
        if home != '~':
            file_path = file_path.replace(home, '~')

        return file_path
