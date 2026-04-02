"""
进度报告器模块

负责报告处理进度和计算预估剩余时间
"""

from typing import Optional, Callable
from ..models import ProgressInfo


class ProgressReporter:
    """
    进度报告器

    负责：
    1. 发送进度更新
    2. 计算预估剩余时间
    3. 节流控制（避免过于频繁的更新）
    """

    PROGRESS_INTERVAL_TIME = 0.2
    PROGRESS_INTERVAL_ROWS = 5

    def __init__(self, progress_callback: Optional[Callable[[ProgressInfo], None]] = None):
        self._progress_callback = progress_callback
        self._last_report_time = 0.0
        self._last_row_update = 0

    def report(
        self,
        percentage: float,
        current_row: int,
        total_rows: int,
        current_action: str,
        elapsed_time: float = 0,
        product_code: Optional[str] = None
    ) -> None:
        """
        报告进度

        Args:
            percentage: 完成百分比
            current_row: 当前处理行
            total_rows: 总行数
            current_action: 当前动作描述
            elapsed_time: 已用时间（秒）
            product_code: 当前商品编码
        """
        if not self._progress_callback:
            return

        eta = 0.0
        if percentage > 0 and percentage < 100 and elapsed_time > 0:
            estimated_total = elapsed_time / (percentage / 100.0)
            eta = max(0, estimated_total - elapsed_time)

        info = ProgressInfo(
            current_row=current_row,
            total_rows=total_rows,
            current_action=current_action,
            percentage=percentage,
            estimated_remaining_seconds=eta,
            product_code=product_code
        )

        self._progress_callback(info)

    def report_progress(
        self,
        percentage: float,
        current_row: int,
        total_rows: int,
        current_action: str
    ) -> None:
        """
        报告进度的简化方法（不计算 ETA）

        Args:
            percentage: 完成百分比
            current_row: 当前处理行
            total_rows: 总行数
            current_action: 当前动作描述
        """
        self.report(
            percentage=percentage,
            current_row=current_row,
            total_rows=total_rows,
            current_action=current_action,
            elapsed_time=0,
            product_code=None
        )

    def should_report_row_update(self, current_row: int, total_rows: int) -> bool:
        """
        判断是否应该触发基于行数的进度更新

        Args:
            current_row: 当前行
            total_rows: 总行数

        Returns:
            bool: 是否应该报告
        """
        return (current_row - self._last_row_update >= self.PROGRESS_INTERVAL_ROWS
                or current_row == total_rows)

    def update_last_row(self, current_row: int) -> None:
        """更新最后报告的行数"""
        self._last_row_update = current_row
