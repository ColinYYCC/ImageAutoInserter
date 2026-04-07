"""
流程编排器模块

负责整合各个组件，协调完整的处理流程
"""

import logging
import time
import threading
from typing import Optional, Callable, List, Dict
from dataclasses import dataclass
from datetime import datetime

from ..models import ProcessResult, ProgressInfo, ErrorRecord
from ..image_processor import ImageProcessor
from ..excel_processor import ExcelProcessor
from ..matchers import ImageMatcher
from ..reporters import ProgressReporter, ErrorReporter
from ..picture_variant import recognize_variant
from utils.config import ImageConfig, ProcessingConfig

logger = logging.getLogger(__name__)


@dataclass
class ProcessContext:
    """处理上下文"""
    excel_path: str
    image_source: str
    output_path: Optional[str]
    matcher: ImageMatcher
    reporter: ProgressReporter
    log_callback: Optional[Callable[[str], None]]
    result: ProcessResult


class ThreadSafeProgressReporter:
    """线程安全的进度报告器"""

    def __init__(self, callback: Optional[Callable[[ProgressInfo], None]]) -> None:
        self.callback = callback
        self._lock = threading.Lock()
        self._last_report_time: float = 0

    def report(self, info: ProgressInfo) -> None:
        if not self.callback:
            return

        with self._lock:
            now = time.time()
            # 节流：最多每 100ms 报告一次
            if now - self._last_report_time < 0.1:
                return
            self._last_report_time = now

            try:
                self.callback(info)
            except Exception as e:
                logger.warning(f"进度回调出错: {e}")


class ProcessOrchestrator:
    """
    流程编排器

    协调各个组件完成完整的图片插入 Excel 处理流程
    """

    ROWS_PER_PROGRESS = ProcessingConfig.PROGRESS_INTERVAL
    # 每处理 20 行报告一次进度（分批报告，避免频繁回调）
    BATCH_REPORT_SIZE = 20
    # 每批预加载的商品数量
    PRELOAD_BATCH_SIZE = 100

    def __init__(self) -> None:
        self._image_processor = ImageProcessor()
        self._reporter: Optional[ProgressReporter] = None

    def process(
        self,
        excel_path: str,
        image_source: str,
        output_path: Optional[str] = None,
        progress_callback: Optional[Callable[[ProgressInfo], None]] = None,
        log_callback: Optional[Callable[[str], None]] = None
    ) -> ProcessResult:
        """
        执行完整处理流程

        Args:
            excel_path: Excel 文件路径
            image_source: 图片源路径
            output_path: 输出文件路径
            progress_callback: 进度回调
            log_callback: 日志回调

        Returns:
            ProcessResult: 处理结果
        """
        result = ProcessResult(
            success=False,
            start_time=datetime.now().isoformat()
        )

        start_time = time.time()
        reporter = ProgressReporter(progress_callback)
        self._reporter = reporter

        if progress_callback:
            progress_callback(ProgressInfo(
                current_row=0,
                total_rows=1,
                current_action="加载图片...",
                percentage=2.0
            ))

        try:
            images = self._load_images(image_source, log_callback, progress_callback)
            matcher = ImageMatcher(images)
            self._log(log_callback, f"✅ 加载 {len(images)} 张图片成功")

            ctx = ProcessContext(
                excel_path=excel_path,
                image_source=image_source,
                output_path=output_path,
                matcher=matcher,
                reporter=reporter,
                log_callback=log_callback,
                result=result
            )

            result = self._process_excel(ctx)

        except Exception as e:
            result.success = False
            self._log(log_callback, f"❌ 处理失败：{e}", "error")
            result.errors.append(ErrorRecord(
                row=0,
                product_code='',
                error_type=type(e).__name__,
                error_message=str(e),
                timestamp=datetime.now().isoformat(),
                retry_count=0
            ))

        result.end_time = datetime.now().isoformat()
        result.duration_seconds = time.time() - start_time

        if result.errors:
            error_reporter = ErrorReporter(result)
            error_reporter.generate()

        return result

    def _load_images(
        self,
        image_source: str,
        log_callback: Optional[Callable[[str], None]] = None,
        progress_callback: Optional[Callable[[ProgressInfo], None]] = None
    ) -> List:
        """加载图片"""
        self._log(log_callback, "🔄 正在加载图片...")

        if progress_callback:
            progress_callback(ProgressInfo(
                current_row=0,
                total_rows=1,
                current_action=f"扫描: {image_source}",
                percentage=5.0
            ))

        images = self._image_processor.load_images(image_source)

        if progress_callback:
            progress_callback(ProgressInfo(
                current_row=0,
                total_rows=1,
                current_action=f"已加载 {len(images)} 张图片",
                percentage=14.0
            ))

        return images

    def _process_excel(self, ctx: ProcessContext) -> ProcessResult:
        """处理 Excel 文件"""
        self._log(ctx.log_callback, "🔄 正在处理 Excel 文件...")

        ctx.reporter.report_progress(
            percentage=15.0,
            current_row=0,
            total_rows=1,
            current_action="打开 Excel 文件..."
        )

        with ExcelProcessor(ctx.excel_path, read_only=False) as excel:
            sheet_info = excel.find_sheet_with_product_code()
            if not sheet_info:
                raise ValueError("未找到包含「商品编码」列的工作表")

            ctx.result.total_rows = len(sheet_info.data_rows)

            ctx.reporter.report_progress(
                percentage=20.0,
                current_row=0,
                total_rows=ctx.result.total_rows,
                current_action=f"已解析 {ctx.result.total_rows} 行数据"
            )

            picture_columns = self._setup_picture_columns(excel, ctx.matcher)

            ctx.reporter.report_progress(
                percentage=22.0,
                current_row=0,
                total_rows=ctx.result.total_rows,
                current_action="配置Picture列..."
            )

            column_for_picture = self._build_column_mapping(picture_columns)

            ctx.reporter.report_progress(
                percentage=24.0,
                current_row=0,
                total_rows=ctx.result.total_rows,
                current_action="预加载图片..."
            )

            empty_product_rows = self._process_data_rows(
                excel, sheet_info, ctx, column_for_picture, picture_columns
            )

            if empty_product_rows:
                ctx.reporter.report_progress(
                    percentage=88.0,
                    current_row=0,
                    total_rows=ctx.result.total_rows,
                    current_action=f"高亮标记 {len(empty_product_rows)} 个空编码..."
                )
                excel.highlight_empty_product_codes(empty_product_rows)
                self._log(ctx.log_callback, f"✅ 高亮完成，共高亮 {len(empty_product_rows)} 个商品编码")

            return self._save_and_finalize(excel, ctx)

    def _setup_picture_columns(self, excel: ExcelProcessor, matcher: ImageMatcher) -> Dict[str, int]:
        """设置 Picture 列"""
        max_pictures = max(matcher.get_max_picture_column(), 3)
        column_result = excel.add_picture_columns(max_pictures=max_pictures)
        return column_result.get_column_mapping()

    def _build_column_mapping(self, picture_columns: Dict[str, int]) -> Dict[int, Optional[str]]:
        """构建列映射"""
        column_for_picture: Dict[int, Optional[str]] = {}
        for key in picture_columns.keys():
            variant_result = recognize_variant(key)
            if variant_result:
                column_for_picture[variant_result[1]] = key
        return column_for_picture

    def _process_data_rows(
        self,
        excel: ExcelProcessor,
        sheet_info,
        ctx: ProcessContext,
        column_for_picture: Dict[int, Optional[str]],
        picture_columns: Dict[str, int]
    ) -> List[int]:
        """处理数据行（使用并行预加载优化）"""
        empty_product_rows: List[int] = []
        start_time = time.time()
        total_rows = len(sheet_info.data_rows)
        batch_report_size = max(self.BATCH_REPORT_SIZE, total_rows // 100)

        safe_reporter = ThreadSafeProgressReporter(ctx.reporter._progress_callback)

        code_last_occurrence: Dict[str, int] = {}
        for idx, row in enumerate(sheet_info.data_rows, start=1):
            product_code = excel.get_product_code(row)
            if product_code:
                code_last_occurrence[product_code] = idx

        preload_cache: Dict[str, Dict[int, bytes]] = {}

        for batch_start in range(0, len(sheet_info.data_rows), self.PRELOAD_BATCH_SIZE):
            batch_end = min(batch_start + self.PRELOAD_BATCH_SIZE, len(sheet_info.data_rows))
            batch_rows = sheet_info.data_rows[batch_start:batch_end]

            batch_codes = list(set(
                code for code in (
                    excel.get_product_code(row)
                    for row in batch_rows
                )
                if code
            ))

            codes_to_preload = [
                code for code in batch_codes
                if code not in preload_cache
            ]

            if codes_to_preload:
                new_cache = ctx.matcher.preload_images_parallel(
                    codes_to_preload,
                    progress_callback=None
                )
                preload_cache.update(new_cache)

            for idx, row in enumerate(batch_rows, start=batch_start + 1):
                product_code = excel.get_product_code(row)
                if not product_code:
                    self._log(ctx.log_callback, f"⚠️  行 {row}：商品编码为空，跳过")
                    ctx.result.skipped_rows += 1
                    continue

                should_report = (
                    idx == total_rows or
                    idx % batch_report_size == 0
                )

                if should_report:
                    row_progress = (idx / total_rows) * 45
                    adjusted_percentage = 25.0 + row_progress
                    current_time = time.time()
                    elapsed = current_time - start_time

                    safe_reporter.report(ProgressInfo(
                        current_row=row,
                        total_rows=total_rows,
                        current_action=f"正在处理第 {idx}/{total_rows} 行",
                        percentage=adjusted_percentage,
                        estimated_remaining_seconds=elapsed,
                        product_code=product_code
                    ))

                row_has_any_image = self._process_row_images(
                    excel, row, product_code, ctx.matcher,
                    column_for_picture, picture_columns, ctx.log_callback,
                    preload_cache.get(product_code)
                )

                if not row_has_any_image:
                    empty_product_rows.append(row)
                    ctx.result.failed_rows += 1
                else:
                    ctx.result.success_rows += 1

                if idx == code_last_occurrence.get(product_code):
                    if product_code in preload_cache:
                        del preload_cache[product_code]
                    for pic_col in range(1, 4):
                        img_info = ctx.matcher.get_image(product_code, pic_col)
                        if img_info:
                            img_info.release()

        return empty_product_rows

    def _process_row_images(
        self,
        excel: ExcelProcessor,
        row: int,
        product_code: str,
        matcher: ImageMatcher,
        column_for_picture: Dict[int, Optional[str]],
        picture_columns: Dict[str, int],
        log_callback: Optional[Callable[[str], None]],
        preloaded_data: Optional[Dict[int, bytes]] = None
    ) -> bool:
        """处理单行的图片（优先使用预加载的数据）"""
        row_has_any_image = False

        for picture_column in range(1, 4):
            target_key = column_for_picture.get(picture_column)

            if not target_key:
                continue

            original_data: Optional[bytes] = None

            if preloaded_data and picture_column in preloaded_data:
                original_data = preloaded_data[picture_column]
            else:
                original_data = matcher.get_original_image_data(product_code, picture_column)

            if original_data:
                row_has_any_image = True
                excel.embed_image(
                    row=row,
                    column=picture_columns[target_key],
                    source=original_data,
                    width=ImageConfig.WIDTH,
                    height=ImageConfig.HEIGHT
                )
            else:
                self._log(log_callback, f"⚠️  行{row} {product_code}: 无匹配图片，留空")

        return row_has_any_image

    def _save_and_finalize(self, excel: ExcelProcessor, ctx: ProcessContext) -> ProcessResult:
        """保存并完成处理"""
        ctx.reporter.report_progress(
            percentage=92.0,
            current_row=ctx.result.total_rows,
            total_rows=ctx.result.total_rows,
            current_action="正在保存文件..."
        )

        output = excel.save(ctx.output_path)
        ctx.result.output_path = output
        ctx.result.success = True
        self._log(ctx.log_callback, f"✅ 文件保存成功：{output}")

        return ctx.result

    def _log(
        self,
        callback: Optional[Callable[[str], None]],
        message: str,
        level: str = "info"
    ) -> None:
        """记录日志"""
        if callback:
            callback(message)
