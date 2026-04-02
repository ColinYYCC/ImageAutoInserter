"""
集中版本管理模块

所有版本号必须从此模块获取，确保版本一致性。
实际版本从 package.json 读取，Python 模块可导入此模块获取版本。
"""

import json
from pathlib import Path
from typing import Optional

# 默认版本（仅作为后备）- 必须与 package.json 中的 version 保持一致
DEFAULT_VERSION = "1.0.6"


class _VersionCache:
    """
    版本缓存类（类级单例模式）

    用于缓存从 package.json 读取的版本号
    """
    _cached_version: Optional[str] = None


def get_package_version() -> str:
    """
    获取应用版本号

    优先从 package.json 读取，如果读取失败则返回默认版本。

    Returns:
        str: 应用版本号 (如 "1.0.3")
    """
    # 如果已有缓存，直接返回
    if _VersionCache._cached_version is not None:
        return _VersionCache._cached_version

    # 尝试多种方式找到 package.json
    possible_paths = [
        # 开发环境：从项目根目录
        Path(__file__).parent.parent.parent.parent / "package.json",
        # 打包环境：从应用根目录
        Path(__file__).parent.parent.parent / "package.json",
        # 当前工作目录
        Path.cwd() / "package.json",
    ]

    for package_json_path in possible_paths:
        try:
            if package_json_path.exists():
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                    version = package_data.get('version')
                    if version:
                        _VersionCache._cached_version = version
                        return version
        except (json.JSONDecodeError, IOError, KeyError):
            continue

    # 如果都失败，返回默认版本
    return DEFAULT_VERSION


def get_version_tuple() -> tuple:
    """
    获取版本号元组格式

    Returns:
        tuple: (major, minor, patch) 如 (1, 0, 3)
    """
    version = get_package_version()
    try:
        parts = version.split('.')
        return (int(parts[0]), int(parts[1]), int(parts[2]))
    except (ValueError, IndexError):
        return (1, 0, 5)


def reset_version_cache() -> None:
    """重置版本缓存（主要用于测试）"""
    _VersionCache._cached_version = None


# 便捷常量
VERSION = get_package_version()
APP_NAME = "ImageAutoInserter"
