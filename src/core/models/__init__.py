"""
Models module - Shared data structures

This module consolidates all data model classes to avoid circular imports.
Do NOT import from ..models (models.py) here to prevent circular import issues.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List
from PIL import Image


@dataclass
class ImageInfo:
    """
    图片信息数据类

    Attributes:
        product_code (str): 商品编码
        sequence (str): 序号（01/02/03）
        picture_column (int): 对应的 Picture 列号（1/2/3）
        image_format (str): 图片格式（JPG/PNG/JPEG）
        source_path (str): 图片来源路径
        image_data (Optional[bytes]): 图片二进制数据
        image (Optional[Image.Image]): PIL Image 对象
    """
    product_code: str
    sequence: str
    picture_column: int
    image_format: str
    source_path: str
    image_data: Optional[bytes] = None
    image: Optional[Image.Image] = field(default=None, repr=False)

    def __post_init__(self) -> None:
        """数据验证和标准化"""
        if self.sequence not in [f'{i:02d}' for i in range(1, 11)]:
            raise ValueError(f"无效的序号：{self.sequence}，必须是 01-10")

        if self.picture_column not in range(1, 11):
            raise ValueError(f"无效的 Picture 列号：{self.picture_column}，必须是 1-10")

        self.image_format = self.image_format.lower()
        if self.image_format not in ['jpg', 'jpeg', 'png']:
            raise ValueError(f"不支持的图片格式：{self.image_format}")

    def release(self) -> None:
        """释放图片数据内存，用于处理大量图片时节省内存"""
        self.image_data = None
        self.image = None


@dataclass
class ProgressInfo:
    """
    进度信息数据类

    Attributes:
        current_row (int): 当前处理行
        total_rows (int): 总行数
        current_action (str): 当前处理动作
        product_code (Optional[str]): 当前商品编码
        image_source (Optional[str]): 图片来源
        percentage (float): 完成百分比（0-100）
        estimated_remaining_seconds (float): 预估剩余时间（秒）
    """
    current_row: int
    total_rows: int
    current_action: str
    product_code: Optional[str] = None
    image_source: Optional[str] = None
    percentage: float = 0.0
    estimated_remaining_seconds: float = 0.0


@dataclass
class ErrorRecord:
    """
    错误记录数据类

    Attributes:
        row (int): 行号
        product_code (str): 商品编码
        error_type (str): 错误类型
        error_message (str): 错误消息
        timestamp (str): 时间戳
        retry_count (int): 重试次数
    """
    row: int
    product_code: str
    error_type: str
    error_message: str
    timestamp: str
    retry_count: int = 0


@dataclass
class ProcessResult:
    """
    处理结果数据类

    Attributes:
        success (bool): 是否成功
        output_path (Optional[Path]): 输出文件路径
        total_rows (int): 总处理行数
        success_rows (int): 成功行数
        failed_rows (int): 失败行数
        skipped_rows (int): 跳过行数
        errors (List[ErrorRecord]): 错误记录列表
        start_time (str): 开始时间
        end_time (str): 结束时间
        duration_seconds (float): 耗时（秒）
    """
    success: bool
    output_path: Optional[Path] = None
    total_rows: int = 0
    success_rows: int = 0
    failed_rows: int = 0
    skipped_rows: int = 0
    errors: List[ErrorRecord] = field(default_factory=list)
    start_time: str = ""
    end_time: str = ""
    duration_seconds: float = 0.0


__all__ = ['ImageInfo', 'ProgressInfo', 'ProcessResult', 'ErrorRecord']
