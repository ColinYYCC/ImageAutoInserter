"""
业务逻辑整合模块

负责整合图片处理器和 Excel 处理器
实现完整的业务流程

功能：
1. 商品编码与图片匹配（ImageMatcher 类）
2. 完整处理流程（输入→处理→输出）
3. 错误处理机制（重试、跳过、错误报告）
4. 进度显示机制
"""

import os
import sys
import time
from pathlib import Path
from typing import Optional, List, Dict, Callable
from dataclasses import dataclass, field
from datetime import datetime

from .image_processor import ImageProcessor, ImageInfo
from .excel_processor import ExcelProcessor, ProgressInfo
from .picture_variant import recognize_variant


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


class ImageMatcher:
    """
    图片匹配器类
    
    功能：
    1. 建立商品编码与图片的映射关系
    2. 快速查找指定商品的图片
    3. 支持多图片匹配（Picture 1/2/3）
    
    Example:
        >>> images = processor.load_images('/path/to/images')
        >>> matcher = ImageMatcher(images)
        >>> img = matcher.get_image('C000641234100', 1)  # 获取 Picture 1
    """
    
    def __init__(self, images: List[ImageInfo]):
        """
        初始化图片匹配器
        
        Args:
            images (List[ImageInfo]): ImageInfo 对象列表
        """
        self.images = images
        self._image_map: Dict[str, Dict[int, ImageInfo]] = {}
        self._build_index()
    
    def _build_index(self):
        """
        建立商品编码到图片的索引
        
        数据结构：
        {
            '商品编码 1': {
                1: ImageInfo(...),  # Picture 1
                2: ImageInfo(...),  # Picture 2
                3: ImageInfo(...),  # Picture 3
            },
            '商品编码 2': {...},
            ...
        }
        """
        for img in self.images:
            if img.product_code not in self._image_map:
                self._image_map[img.product_code] = {}
            
            self._image_map[img.product_code][img.picture_column] = img
    
    def get_image(
        self,
        product_code: str,
        picture_column: int
    ) -> Optional[ImageInfo]:
        """
        获取指定商品编码和 Picture 列的图片
        
        Args:
            product_code (str): 商品编码
            picture_column (int): Picture 列号（1/2/3）
        
        Returns:
            Optional[ImageInfo]: 匹配的 ImageInfo，未找到返回 None
        """
        if product_code not in self._image_map:
            return None
        
        return self._image_map[product_code].get(picture_column)
    
    def has_image(
        self,
        product_code: str,
        picture_column: int
    ) -> bool:
        """
        检查指定商品编码是否有图片
        
        Args:
            product_code (str): 商品编码
            picture_column (int): Picture 列号（1/2/3）
        
        Returns:
            bool: 是否有图片
        """
        return self.get_image(product_code, picture_column) is not None
    
    def get_all_product_codes(self) -> List[str]:
        """
        获取所有有图片的商品编码
        
        Returns:
            List[str]: 商品编码列表
        """
        return list(self._image_map.keys())
    
    def get_statistics(self) -> Dict[str, int]:
        """
        获取统计信息
        
        Returns:
            Dict[str, int]: 统计信息
                - total_images: 总图片数
                - unique_products: 唯一商品数
                - picture_1_count: Picture 1 数量
                - picture_2_count: Picture 2 数量
                - picture_3_count: Picture 3 数量
        """
        stats = {
            'total_images': len(self.images),
            'unique_products': len(self._image_map),
            'picture_1_count': 0,
            'picture_2_count': 0,
            'picture_3_count': 0
        }
        
        for product_images in self._image_map.values():
            if 1 in product_images:
                stats['picture_1_count'] += 1
            if 2 in product_images:
                stats['picture_2_count'] += 1
            if 3 in product_images:
                stats['picture_3_count'] += 1
        
        return stats
    
    def get_max_picture_column(self) -> int:
        """
        获取最大的 Picture 列号
        
        Returns:
            int: 最大的 Picture 列号（如果没有图片返回 0）
        """
        max_col = 0
        for product_images in self._image_map.values():
            if product_images:
                max_col = max(max_col, max(product_images.keys()))
        return max_col


class ProcessEngine:
    """
    处理引擎类
    
    功能：
    1. 完整处理流程（输入→处理→输出）
    2. 错误处理机制（重试、跳过、错误报告）
    3. 进度显示机制
    4. 日志记录
    
    Example:
        >>> engine = ProcessEngine()
        >>> result = engine.process(
        ...     excel_path='/path/to/file.xlsx',
        ...     image_source='/path/to/images',
        ...     output_path='/path/to/output.xlsx',
        ...     progress_callback=on_progress,
        ...     log_callback=log
        ... )
    """
    
    # 最大重试次数
    MAX_RETRY = 3
    
    # 进度更新间隔（每处理 N 行更新一次）
    PROGRESS_INTERVAL = 5
    
    def __init__(self):
        """
        初始化处理引擎
        """
        self.image_processor = ImageProcessor()
        self._current_retry = 0
    
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
            excel_path (str): Excel 文件路径
            image_source (str): 图片源路径（文件夹/ZIP/RAR）
            output_path (Optional[str]): 输出文件路径（默认自动生成）
            progress_callback (Optional[Callable]): 进度回调函数
            log_callback (Optional[Callable]): 日志回调函数
        
        Returns:
            ProcessResult: 处理结果
        
        Example:
            >>> def on_progress(info: ProgressInfo):
            ...     print(f"进度：{info.percentage:.1f}% - {info.current_action}")
            ...
            >>> def log(message: str):
            ...     print(f"[LOG] {message}")
            ...
            >>> result = engine.process(
            ...     excel_path='销售表.xlsx',
            ...     image_source='images.zip',
            ...     progress_callback=on_progress,
            ...     log_callback=log
            ... )
            >>> print(f"处理完成：{result.success}")
        """
        result = ProcessResult(
            success=False,
            start_time=datetime.now().isoformat()
        )
        
        start_time = time.time()
        
        # ============================================================================
        # 进度条动画设计说明
        # ============================================================================
        # 问题背景：
        #   - 后端同步发送进度时，前端 React 渲染周期无法捕获中间值，导致跳跃
        #   - 100% 后立即切换到结果页面，动画被中断，用户体验差
        #
        # 解决方案：
        #   1. 后端发送关键进度节点，中间添加 time.sleep() 延迟
        #   2. 前端使用 requestAnimationFrame 实现平滑动画
        #   3. 结果页面延迟显示，让用户看到 100% 完成状态
        #
        # 阶段划分：
        #   - 解析阶段: 0% → 5% → 10% (加载图片、创建匹配器)
        #   - 处理阶段: 10% → ... → 90% (处理 Excel 行数据)
        #   - 保存阶段: 90% → 95% → 99% → 100% (保存文件，渐进显示)
        #
        # 延迟策略：
        #   - 关键节点 (5%, 10%)：150ms，让用户感知阶段切换
        #   - 保存阶段 (90%→95%→99%)：150ms，渐进效果
        #   - 完成前 (99%→100%)：300ms，让用户看到接近完成
        #   - 完成后 (100%)：500ms，让用户看到完成状态
        # ============================================================================
        
        # 发送初始进度 0% - 解析开始
        if progress_callback:
            progress_callback(ProgressInfo(
                current_row=0,
                total_rows=1,
                current_action="解析中",
                percentage=0.0
            ))
        
        try:
            # 步骤 1：加载图片（解析阶段 0% -> 5%）
            self._log(log_callback, "🔄 正在加载图片...")
            images = self.image_processor.load_images(image_source)
            self._log(log_callback, f"✅ 加载 {len(images)} 张图片成功")
            
            # 解析阶段进度 5%
            if progress_callback:
                progress_callback(ProgressInfo(
                    current_row=0,
                    total_rows=1,
                    current_action="解析中",
                    percentage=5.0
                ))
                # 延迟 150ms 确保前端有时间渲染 5%，避免 0% → 10% 跳跃
                time.sleep(0.15)
            
            # 步骤 2：创建图片匹配器（解析阶段 5% -> 10%）
            matcher = ImageMatcher(images)
            stats = matcher.get_statistics()
            self._log(
                log_callback,
                f"📊 图片统计：{stats['unique_products']} 个商品，"
                f"Picture 1: {stats['picture_1_count']}, "
                f"Picture 2: {stats['picture_2_count']}, "
                f"Picture 3: {stats['picture_3_count']}"
            )
            
            # 解析阶段完成 10%，进入处理阶段
            if progress_callback:
                progress_callback(ProgressInfo(
                    current_row=0,
                    total_rows=1,
                    current_action="处理中",
                    percentage=10.0
                ))
                # 延迟 150ms 确保前端有时间渲染 10%，让用户感知阶段切换
                time.sleep(0.15)
            
            # 步骤 3：处理 Excel
            self._log(log_callback, "🔄 正在处理 Excel 文件...")
            
            with ExcelProcessor(excel_path, read_only=False) as excel:
                # 查找包含商品编码的工作表
                sheet_info = excel.find_sheet_with_product_code()
                if not sheet_info:
                    raise ValueError(
                        "未找到包含「商品编码」列的工作表\n"
                        "请确保 Excel 表格包含精确的「商品编码」列名"
                    )
                
                self._log(
                    log_callback,
                    f"✅ 找到工作表：{sheet_info.name}，"
                    f"表头行：{sheet_info.header_row}，"
                    f"数据行：{len(sheet_info.data_rows)}"
                )
                
                result.total_rows = len(sheet_info.data_rows)
                
                # 添加 Picture 列（处理阶段 10% -> 15%，准备行处理）
                self._log(log_callback, "🔄 正在添加 Picture 列...")
                
                # 计算需要的最大列数
                max_pictures = matcher.get_max_picture_column()
                if max_pictures < 3:
                    max_pictures = 3  # 至少 3 列
                
                column_result = excel.add_picture_columns(max_pictures=max_pictures)
                picture_columns = column_result.get_column_mapping()
                self._log(
                    log_callback,
                    f"✅ 添加 Picture 列成功：{list(picture_columns.keys())}"
                )
                
                # 准备阶段完成 15%，开始处理行数据
                if progress_callback:
                    progress_callback(ProgressInfo(
                        current_row=0,
                        total_rows=len(sheet_info.data_rows),
                        current_action="处理中",
                        percentage=15.0
                    ))
                
                # 逐行处理
                empty_product_rows = []  # 记录未匹配到任何图片的商品行
                
                for idx, row in enumerate(sheet_info.data_rows, start=1):
                    try:
                        # 获取商品编码
                        product_code = excel.get_product_code(row)
                        if not product_code:
                            self._log(
                                log_callback,
                                f"⚠️  行 {row}：商品编码为空，跳过"
                            )
                            result.skipped_rows += 1
                            continue
                        
                        # 更新进度（每 PROGRESS_INTERVAL 行更新一次）
                        # 处理阶段：15% - 90%，基于行数计算
                        if idx % self.PROGRESS_INTERVAL == 0 or idx == len(sheet_info.data_rows):
                            # 计算行处理进度 (0-100%)
                            row_progress = (idx / len(sheet_info.data_rows)) * 100
                            # 映射到处理阶段范围 15% - 90%
                            adjusted_percentage = 15.0 + (row_progress * 0.75)
                            
                            if progress_callback:
                                progress_callback(ProgressInfo(
                                    current_row=row,
                                    total_rows=len(sheet_info.data_rows),
                                    current_action=f"正在处理第 {idx} 行",
                                    percentage=adjusted_percentage
                                ))
                        
                        # 标记该行是否匹配到任何图片
                        row_has_any_image = False
                        
                        # 获取所有 Picture 列的键（保留原始格式）
                        picture_keys = list(picture_columns.keys())
                        
                        # 为每个 Picture 列嵌入图片
                        for picture_column in range(1, 4):
                            # 查找对应的列键
                            target_key = None
                            for key in picture_columns.keys():
                                variant_result = recognize_variant(key)
                                if variant_result and variant_result[1] == picture_column:
                                    target_key = key
                                    break
                            
                            if not target_key:
                                continue
                            
                            img = matcher.get_image(product_code, picture_column)
                            
                            if img:
                                # 有匹配图片
                                row_has_any_image = True
                                excel.embed_image(
                                    row=row,
                                    column=picture_columns[target_key],
                                    source=img.image_data,
                                    width=180,
                                    height=138
                                )
                                self._log(
                                    log_callback,
                                    f"✓ 行{row} {product_code}: "
                                    f"嵌入 {target_key} "
                                    f"(来源：{img.source_path})"
                                )
                            else:
                                # 无匹配图片，留空
                                self._log(
                                    log_callback,
                                    f"⚠️  行{row} {product_code}: "
                                    f"{target_key} 无匹配图片，留空"
                                )
                        
                        # 如果该行未匹配到任何图片，记录为失败
                        if not row_has_any_image:
                            empty_product_rows.append(row)
                            result.failed_rows += 1
                            self._log(
                                log_callback,
                                f"⚠️  行{row} {product_code}: 未匹配到任何图片，将高亮显示",
                                level="warning"
                            )
                        else:
                            result.success_rows += 1
                        
                    except Exception as e:
                        # 记录错误
                        error_record = ErrorRecord(
                            row=row,
                            product_code=product_code or "未知",
                            error_type=type(e).__name__,
                            error_message=str(e),
                            timestamp=datetime.now().isoformat(),
                            retry_count=self._current_retry
                        )
                        result.errors.append(error_record)
                        result.failed_rows += 1
                        
                        self._log(
                            log_callback,
                            f"❌ 行{row}处理失败：{e}",
                            level="error"
                        )
                
                # 高亮显示未匹配到任何图片的商品编码
                if empty_product_rows:
                    self._log(
                        log_callback,
                        f"🔄 正在高亮 {len(empty_product_rows)} 个未匹配到图片的商品编码..."
                    )
                    excel.highlight_empty_product_codes(empty_product_rows)
                    self._log(
                        log_callback,
                        f"✅ 高亮完成，共高亮 {len(empty_product_rows)} 个商品编码"
                    )
                
                # ============================================================================
                # 保存阶段：90% → 95% → 99% → 100%（渐进式进度显示）
                # ============================================================================
                # 设计意图：
                #   - 避免 90% → 100% 的跳跃，提供视觉上的连续感
                #   - 让用户感知保存过程的存在，增强系统响应感
                #   - 100% 后停留片刻，让用户确认处理完成
                #
                # 实现细节：
                #   - 90% → 95%：150ms，开始保存
                #   - 95% → 99%：150ms，保存进行中
                #   - 99% → 100%：300ms，即将完成
                #   - 100% 停留：500ms，确认完成状态
                # ============================================================================
                
                if progress_callback:
                    progress_callback(ProgressInfo(
                        current_row=result.total_rows,
                        total_rows=result.total_rows,
                        current_action="正在保存文件",
                        percentage=90.0
                    ))
                
                # 保存文件
                self._log(log_callback, "🔄 正在保存文件...")
                
                # 步骤 1：90% → 95%，让用户看到保存开始
                time.sleep(0.15)
                if progress_callback:
                    progress_callback(ProgressInfo(
                        current_row=result.total_rows,
                        total_rows=result.total_rows,
                        current_action="正在保存文件",
                        percentage=95.0
                    ))
                
                output = excel.save(output_path)
                result.output_path = output
                
                # 步骤 2：95% → 99%，保存进行中
                time.sleep(0.15)
                if progress_callback:
                    progress_callback(ProgressInfo(
                        current_row=result.total_rows,
                        total_rows=result.total_rows,
                        current_action="正在保存文件",
                        percentage=99.0
                    ))
                
                # 步骤 3：99% → 100%，较长的延迟让用户看到即将完成
                time.sleep(0.3)
                
                self._log(log_callback, f"✅ 文件保存成功：{output}")
                
                # 步骤 4：发送 100%，并停留片刻让用户确认完成
                if progress_callback:
                    progress_callback(ProgressInfo(
                        current_row=result.total_rows,
                        total_rows=result.total_rows,
                        current_action="处理完成",
                        percentage=100.0
                    ))
                
                # 100% 停留片刻，让用户看到完成状态
                time.sleep(0.5)
            
            # 处理成功
            result.success = True
            
        except Exception as e:
            # 处理失败 - 只在尚未统计失败行数时，将剩余行数标记为失败
            result.success = False
            error_record = ErrorRecord(
                row=0,
                product_code="",
                error_type=type(e).__name__,
                error_message=str(e),
                timestamp=datetime.now().isoformat()
            )
            result.errors.append(error_record)
            # 只有在还没有统计任何失败行数时，才将剩余行数标记为失败
            if result.failed_rows == 0:
                result.failed_rows = result.total_rows - result.success_rows
            
            self._log(log_callback, f"❌ 处理失败：{e}", level="error")
        
        # 计算耗时
        end_time = time.time()
        result.end_time = datetime.now().isoformat()
        result.duration_seconds = end_time - start_time
        
        # 生成错误报告
        if result.errors:
            self._generate_error_report(result)
        
        return result
    
    def _log(
        self,
        callback: Optional[Callable[[str], None]],
        message: str,
        level: str = "info"
    ):
        """
        发送日志消息
        
        Args:
            callback (Optional[Callable]): 日志回调函数
            message (str): 日志消息
            level (str): 日志级别（info/warning/error）
        """
        if callback:
            prefix = {
                'info': 'ℹ️',
                'warning': '⚠️',
                'error': '❌'
            }.get(level, 'ℹ️')
            
            callback(f"{prefix} {message}")
    
    def _generate_error_report(self, result: ProcessResult):
        """
        生成错误报告文件
        
        Args:
            result (ProcessResult): 处理结果
        """
        if not result.output_path:
            return
        
        # 生成报告路径
        report_path = result.output_path.parent / f"错误报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write("=" * 80 + "\n")
                f.write("ImageAutoInserter 错误报告\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"生成时间：{result.end_time}\n")
                f.write(f"总处理行数：{result.total_rows}\n")
                f.write(f"成功行数：{result.success_rows}\n")
                f.write(f"失败行数：{result.failed_rows}\n")
                f.write(f"跳过行数：{result.skipped_rows}\n")
                f.write(f"错误数量：{len(result.errors)}\n")
                f.write("\n" + "=" * 80 + "\n\n")
                
                f.write("错误详情:\n")
                f.write("-" * 80 + "\n")
                
                for error in result.errors:
                    f.write(f"\n行号：{error.row}\n")
                    f.write(f"商品编码：{error.product_code}\n")
                    f.write(f"错误类型：{error.error_type}\n")
                    f.write(f"错误消息：{error.error_message}\n")
                    f.write(f"重试次数：{error.retry_count}\n")
                    f.write(f"发生时间：{error.timestamp}\n")
                    f.write("-" * 80 + "\n")
            
            print(f"📄 错误报告已生成：{report_path}", file=sys.stderr)
            
        except Exception as e:
            print(f"⚠️  生成错误报告失败：{e}", file=sys.stderr)
