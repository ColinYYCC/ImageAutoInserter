"""
核心业务逻辑模块

包含图片处理、Excel 处理、业务整合等核心功能

重构说明 (2024-03):
- ProcessEngine 重构为 ProcessOrchestrator (见 pipeline/orchestrator.py)
- ErrorRecord, ProcessResult, ProgressInfo 移至 models.py
- ImageInfo 移至 models.image_info
- ImageMatcher 移至 matchers/image_matcher.py
- ProgressReporter, ErrorReporter 移至 reporters/
- ImageProcessor 缓存移至 cache/
- ImageProcessor 加载器移至 loaders/
"""

from .image_processor import ImageProcessor
from .excel_processor import ExcelProcessor, SheetInfo
from .models import ImageInfo, ProgressInfo, ProcessResult, ErrorRecord
from .process_engine import ProcessOrchestrator, ImageMatcher
from .picture_variant import (
    VariantRecognizer,
    SpellingCorrector,
    PictureColumnMapper,
    PictureColumn,
    ColumnAdditionResult,
    recognize_variant,
    correct_spelling,
    is_picture_variant
)

__all__ = [
    # 图片处理
    'ImageProcessor',
    # Excel 处理
    'ExcelProcessor',
    'SheetInfo',
    # 数据模型
    'ImageInfo',
    'ProgressInfo',
    'ProcessResult',
    'ErrorRecord',
    # 业务整合
    'ProcessOrchestrator',
    'ImageMatcher',
    # Picture 变体识别
    'VariantRecognizer',
    'SpellingCorrector',
    'PictureColumnMapper',
    'PictureColumn',
    'ColumnAdditionResult',
    'recognize_variant',
    'correct_spelling',
    'is_picture_variant',
]
