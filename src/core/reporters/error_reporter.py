"""
错误报告生成器模块

负责生成错误报告文件
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

from ..models import ProcessResult

logger = logging.getLogger(__name__)


class ErrorReporter:
    """
    错误报告生成器

    负责生成用户友好的错误报告
    """

    def __init__(self, result: ProcessResult):
        self._result = result

    def generate_report_path(self) -> Optional[Path]:
        """
        生成报告文件路径

        Returns:
            Optional[Path]: 报告文件路径，如果没有输出路径则返回 None
        """
        if not self._result.output_path:
            return None

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return self._result.output_path.parent / f"错误报告_{timestamp}.txt"

    def generate(self) -> Optional[Path]:
        """
        生成错误报告文件

        Returns:
            Optional[Path]: 报告文件路径
        """
        report_path = self.generate_report_path()
        if not report_path:
            return None

        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write("ImageAutoInserter 错误报告\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"生成时间：{self._result.end_time}\n")
                f.write(f"总处理行数：{self._result.total_rows}\n")
                f.write(f"成功行数：{self._result.success_rows}\n")
                f.write(f"失败行数：{self._result.failed_rows}\n")
                f.write(f"跳过行数：{self._result.skipped_rows}\n")
                f.write(f"错误数量：{len(self._result.errors)}\n")
                f.write("\n" + "=" * 80 + "\n\n")

                f.write("错误详情:\n")
                f.write("-" * 80 + "\n")

                for error in self._result.errors:
                    f.write(f"\n行号：{error.row}\n")
                    f.write(f"商品编码：{error.product_code}\n")
                    f.write(f"错误类型：{error.error_type}\n")
                    f.write(f"错误消息：{error.error_message}\n")
                    f.write(f"重试次数：{error.retry_count}\n")
                    f.write(f"发生时间：{error.timestamp}\n")
                    f.write("-" * 80 + "\n")

            logger.info(f"错误报告已生成：{report_path}")
            return report_path

        except Exception as e:
            logger.error(f"生成错误报告失败：{e}")
            return None
