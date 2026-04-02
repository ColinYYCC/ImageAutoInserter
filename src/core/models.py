"""
Models module - Shared data structures

This module should NOT import from core.models to avoid circular imports.
Each model class should be defined directly here or imported from its own file.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List


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
