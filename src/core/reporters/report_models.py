"""
报告模型模块

定义报告相关的数据模型
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportType(Enum):
    """报告类型枚举"""
    ERROR = "error"
    SUMMARY = "summary"
    PERFORMANCE = "performance"


class ReportStatus(Enum):
    """报告状态枚举"""
    PENDING = "pending"
    GENERATED = "generated"
    ARCHIVED = "archived"
    DELETED = "deleted"


@dataclass
class ReportMetadata:
    """
    报告元数据

    Attributes:
        report_id (str): 报告唯一标识符
        report_type (ReportType): 报告类型
        created_at (datetime): 创建时间
        file_path (Optional[Path]): 文件路径
        file_size_bytes (int): 文件大小（字节）
        status (ReportStatus): 报告状态
    """
    report_id: str
    report_type: ReportType
    created_at: datetime
    file_path: Optional[Path] = None
    file_size_bytes: int = 0
    status: ReportStatus = ReportStatus.PENDING


@dataclass
class ErrorReportData:
    """
    错误报告数据

    Attributes:
        total_rows (int): 总处理行数
        success_rows (int): 成功行数
        failed_rows (int): 失败行数
        skipped_rows (int): 跳过行数
        error_count (int): 错误数量
        errors (List[Dict[str, Any]]): 错误详情列表
    """
    total_rows: int = 0
    success_rows: int = 0
    failed_rows: int = 0
    skipped_rows: int = 0
    error_count: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SummaryReportData:
    """
    摘要报告数据

    Attributes:
        app_version (str): 应用版本
        start_time (datetime): 开始时间
        end_time (datetime): 结束时间
        duration_seconds (float): 总耗时
        input_file (str): 输入文件路径
        output_file (str): 输出文件路径
        image_source (str): 图片来源路径
        total_images_found (int): 找到的图片总数
        matched_images (int): 匹配的图片数
        processing_stats (Dict[str, Any]): 处理统计信息
    """
    app_version: str = ""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    input_file: str = ""
    output_file: str = ""
    image_source: str = ""
    total_images_found: int = 0
    matched_images: int = 0
    processing_stats: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceReportData:
    """
    性能报告数据

    Attributes:
        app_start_time_ms (int): 应用启动时间
        memory_usage_mb (Dict[str, float]): 内存使用情况
        python_process_time_ms (int): Python 进程耗时
        metrics (Dict[str, Any]): 性能指标
    """
    app_start_time_ms: int = 0
    memory_usage_mb: Dict[str, float] = field(default_factory=dict)
    python_process_time_ms: int = 0
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Report:
    """
    统一报告数据类

    Attributes:
        metadata (ReportMetadata): 报告元数据
        error_data (Optional[ErrorReportData]): 错误报告数据
        summary_data (Optional[SummaryReportData]): 摘要报告数据
        performance_data (Optional[PerformanceReportData]): 性能报告数据
    """
    metadata: ReportMetadata
    error_data: Optional[ErrorReportData] = None
    summary_data: Optional[SummaryReportData] = None
    performance_data: Optional[PerformanceReportData] = None
