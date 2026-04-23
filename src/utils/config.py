"""
集中配置管理模块

统一管理所有配置项，消除魔法数字，便于集中调整
"""

from dataclasses import dataclass, field
from typing import Set, List
from utils.version import get_package_version


@dataclass
class ImageConfig:
    """图片处理配置"""
    WIDTH: int = 180
    HEIGHT: int = 138
    QUALITY: int = 85
    SUPPORTED_FORMATS: Set[str] = field(default_factory=lambda: {'jpg', 'jpeg', 'png'})
    MAX_DIMENSION: int = 4096


@dataclass
class ExcelConfig:
    """Excel 处理配置"""
    MAX_FILE_SIZE_MB: int = 2048
    DEFAULT_PICTURE_COLUMNS: int = 3
    MAX_PICTURE_COLUMNS: int = 10
    SUPPORTED_EXTENSIONS: Set[str] = field(default_factory=lambda: {'.xlsx', '.xls'})
    READ_ONLY_THRESHOLD_MB: int = 50


@dataclass
class ProcessingConfig:
    """处理流程配置"""
    MAX_RETRY: int = 3
    PROGRESS_INTERVAL: int = 5
    BUFFER_SIZE: int = 8192
    TIMEOUT_SECONDS: int = 300


@dataclass
class CacheConfig:
    """缓存配置"""
    VALIDATION_CACHE_SIZE: int = 32
    IMAGE_CACHE_SIZE: int = 100
    ENABLED: bool = True


@dataclass
class SecurityConfig:
    """安全配置"""
    ALLOWED_BASE_DIRS: List[str] = field(default_factory=list)
    BLOCKED_PATTERNS: List[str] = field(default_factory=lambda: [
        r'\.\.',
        r'^/etc',
        r'^/proc',
        r'^/sys',
        r'C:\\Windows',
        r'C:\\Program Files',
    ])


@dataclass
class AppConfig:
    """应用全局配置"""
    VERSION: str = field(default_factory=get_package_version)
    APP_NAME: str = "ImageAutoInserter"

    image: ImageConfig = field(default_factory=ImageConfig)
    excel: ExcelConfig = field(default_factory=ExcelConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)


config = AppConfig()
