"""
核心业务逻辑模块

包含图片处理、Excel 处理、业务整合等核心功能
"""

from .image_processor import ImageProcessor, ImageInfo
from .excel_processor import ExcelProcessor, SheetInfo, ProgressInfo
from .process_engine import ProcessEngine, ImageMatcher, ProcessResult, ErrorRecord
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
    # 原有模块
    'ImageProcessor',
    'ImageInfo',
    'ExcelProcessor',
    'SheetInfo',
    'ProgressInfo',
    'ProcessEngine',
    'ImageMatcher',
    'ProcessResult',
    'ErrorRecord',
    # 新增模块
    'VariantRecognizer',
    'SpellingCorrector',
    'PictureColumnMapper',
    'PictureColumn',
    'ColumnAdditionResult',
    'recognize_variant',
    'correct_spelling',
    'is_picture_variant',
]
