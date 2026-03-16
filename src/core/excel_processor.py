"""
Excel 处理器模块

负责读取、处理和保存 Excel 文件
支持动态表头识别、Picture 列管理和图片嵌入

功能：
1. 读取 Excel 文件（支持 read_only 模式）
2. 动态识别表头位置（遍历查找"商品编码"所在行）
3. 处理合并单元格、不规则格式
4. 智能检查并添加 Picture 1/2/3 列
5. 图片嵌入（支持文件路径和二进制数据）
6. 保存带图 Excel 文件
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Tuple, Union, Any
from dataclasses import dataclass, field

from openpyxl import load_workbook, Workbook
from openpyxl.utils import get_column_letter, column_index_from_string
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Font, Alignment, PatternFill
from PIL import Image as PILImage
from io import BytesIO

from .image_processor import ImageProcessor, ImageInfo
from .picture_variant import VariantRecognizer, PictureColumnMapper, ColumnAdditionResult, PictureColumn


@dataclass
class SheetInfo:
    """
    工作表信息数据类
    
    Attributes:
        name (str): 工作表名称
        header_row (int): 表头行号（从 1 开始）
        product_code_column (int): 商品编码列号（从 1 开始）
        last_column (int): 最后一列的列号
        data_rows (List[int]): 数据行号列表
    """
    name: str
    header_row: int
    product_code_column: int
    last_column: int
    data_rows: List[int] = field(default_factory=list)


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


class ExcelProcessor:
    """
    Excel 处理器类
    
    功能：
    1. 读取 Excel 文件（read_only 模式）
    2. 动态识别表头位置
    3. 识别"商品编码"列
    4. 智能添加 Picture 1/2/3 列
    5. 嵌入图片到单元格
    6. 保存带图 Excel 文件
    
    Example:
        >>> processor = ExcelProcessor('/path/to/file.xlsx', read_only=True)
        >>> sheet_info = processor.find_sheet_with_product_code()
        >>> processor.add_picture_columns()
        >>> processor.embed_image(2, 'Picture 1', image_data)
        >>> processor.save('/path/to/output.xlsx')
    """
    
    # 商品编码列名（精确匹配）
    PRODUCT_CODE_COLUMN = '商品编码'
    
    # Picture 列名
    PICTURE_COLUMNS = ['Picture 1', 'Picture 2', 'Picture 3']
    
    # 图片尺寸
    IMAGE_WIDTH = 180  # 像素
    IMAGE_HEIGHT = 138  # 像素
    
    def __init__(self, file_path: str, read_only: bool = True):
        """
        初始化 Excel 处理器
        
        Args:
            file_path (str): Excel 文件路径
            read_only (bool): 是否使用只读模式（默认 True，处理大文件时优化内存）
        
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 文件格式不支持
        
        Example:
            >>> processor = ExcelProcessor('/path/to/file.xlsx', read_only=True)
        """
        self.file_path = Path(file_path)
        self.read_only = read_only
        
        # 验证文件
        self._validate_file()
        
        # 加载工作簿
        self.workbook = load_workbook(
            filename=self.file_path,
            read_only=read_only,
            data_only=True
        )
        
        # 工作表信息
        self.sheet_info: Optional[SheetInfo] = None
        
        # 输出路径
        self.output_path: Optional[Path] = None
        
        self._image_cache: Dict[str, bytes] = {}
    
    def _validate_file(self):
        """
        验证 Excel 文件
        
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 文件格式不支持
        """
        # 检查文件存在
        if not self.file_path.exists():
            raise FileNotFoundError(f"文件不存在：{self.file_path}")
        
        # 检查是否为文件
        if not self.file_path.is_file():
            raise ValueError(f"路径不是文件：{self.file_path}")
        
        # 检查扩展名
        if self.file_path.suffix.lower() not in ['.xlsx']:
            raise ValueError(
                f"不支持的文件格式：{self.file_path.suffix}，"
                f"仅支持 .xlsx 格式（Excel 2007+）"
            )
    
    def find_sheet_with_product_code(self) -> Optional[SheetInfo]:
        if self.sheet_info is not None:
            return self.sheet_info
        
        """
        查找包含"商品编码"列的工作表
        
        Returns:
            Optional[SheetInfo]: 工作表信息，未找到返回 None
        
        Example:
            >>> sheet_info = processor.find_sheet_with_product_code()
            >>> if sheet_info:
            ...     print(f"找到工作表：{sheet_info.name}")
            ...     print(f"表头行：{sheet_info.header_row}")
            ...     print(f"商品编码列：{sheet_info.product_code_column}")
        """
        for sheet_name in self.workbook.sheetnames:
            worksheet = self.workbook[sheet_name]
            
            # 遍历所有行查找表头
            header_row = None
            product_code_column = None
            
            # 读取前 100 行（足够找到表头）
            for row_idx, row in enumerate(worksheet.iter_rows(max_row=100), start=1):
                for cell in row:
                    if cell.value and self.PRODUCT_CODE_COLUMN in str(cell.value):
                        header_row = row_idx
                        product_code_column = cell.column
                        break
                
                if header_row:
                    break
            
            # 如果找到表头，返回工作表信息
            if header_row and product_code_column:
                # 获取最后一列
                last_column = worksheet.max_column
                
                # 获取数据行（表头后的所有非空行，排除汇总行）
                data_rows = []
                for row_idx in range(header_row + 1, worksheet.max_row + 1):
                    # 检查该行是否有数据
                    row_has_data = False
                    first_col_value = None
                    for col_idx in range(1, last_column + 1):
                        cell = worksheet.cell(row=row_idx, column=col_idx)
                        if cell.value is not None:
                            if first_col_value is None:
                                first_col_value = str(cell.value).strip()
                            row_has_data = True
                            break
                    
                    # 排除汇总行（第一列包含 Total、总计、合计等关键词）
                    if row_has_data and first_col_value:
                        is_summary_row = any(keyword in first_col_value.upper() 
                                           for keyword in ['TOTAL', '总计', '合计', 'SUM'])
                        if not is_summary_row:
                            data_rows.append(row_idx)
                
                self.sheet_info = SheetInfo(
                    name=sheet_name,
                    header_row=header_row,
                    product_code_column=product_code_column,
                    last_column=last_column,
                    data_rows=data_rows
                )
                
                return self.sheet_info
        
        return None
    
    def _check_last_column_content(self) -> bool:
        """
        检查表头行最后一列在数据行中是否有内容
        
        Returns:
            bool: 最后一列在数据行中有内容返回 True，否则返回 False
        
        Note:
            检查逻辑：
            1. 获取表头行的最后一列
            2. 遍历所有数据行，检查该列是否有内容
            3. 如果任一数据行有内容，返回 True
        """
        if not self.sheet_info:
            return False
        
        worksheet = self.workbook[self.sheet_info.name]
        last_column = self.sheet_info.last_column
        
        # 检查数据行
        for row_idx in self.sheet_info.data_rows:
            cell = worksheet.cell(row=row_idx, column=last_column)
            if cell.value is not None and str(cell.value).strip():
                return True
        
        return False
    
    def _column_exists(self, column_name: str) -> Optional[int]:
        """
        检查指定列名的列是否存在（支持变体识别）
        
        Args:
            column_name (str): 列名（如"Picture 1"）
        
        Returns:
            Optional[int]: 列号（从 1 开始），不存在返回 None
        """
        if not self.sheet_info:
            return None
        
        worksheet = self.workbook[self.sheet_info.name]
        recognizer = VariantRecognizer()
        
        # 遍历表头行查找
        for col_idx in range(1, worksheet.max_column + 1):
            cell = worksheet.cell(row=self.sheet_info.header_row, column=col_idx)
            if cell.value:
                cell_value = str(cell.value).strip()
                
                # 精确匹配（向后兼容）
                if cell_value == column_name:
                    return col_idx
                
                # 变体识别（新功能）
                result = recognizer.recognize(cell_value)
                if result:
                    base_word, number = result
                    expected_name = f"{base_word} {number}"
                    if expected_name == column_name:
                        return col_idx
        
        return None
    
    def add_picture_columns(
        self, 
        image_matcher: Optional[Any] = None,
        max_pictures: Optional[int] = None
    ) -> ColumnAdditionResult:
        """
        添加 Picture 列（支持动态扩展）
        
        Args:
            image_matcher (Optional[Any]): ImageMatcher 对象，用于扫描图片数量
            max_pictures (Optional[int]): 最大图片数（可选，默认扫描确定）
        
        Returns:
            ColumnAdditionResult: 列添加结果
        
        Note:
            添加规则：
            1. 使用 PictureColumnMapper 扫描已存在的 Picture 列
            2. 扫描商品图片数量（严格按需扩展）
            3. 计算需要添加的列
            4. 在空白列位置添加缺失的 Picture 列
            5. 保持原始表头不变
        
        Example:
            >>> images = processor.load_images('/path/to/images')
            >>> matcher = ImageMatcher(images)
            >>> result = processor.add_picture_columns(image_matcher=matcher)
            >>> print(f"已存在：{result.existing_columns}")
            >>> print(f"新增：{result.added_columns}")
        """
        if not self.sheet_info:
            raise ValueError("未找到包含商品编码的工作表")
        
        worksheet = self.workbook[self.sheet_info.name]
        
        # 步骤 1: 使用 PictureColumnMapper 扫描已存在的列
        mapper = PictureColumnMapper()
        mapper.scan_worksheet(worksheet, self.sheet_info.header_row)
        
        # 获取已存在列使用的基础词
        base_word = "Picture"  # 默认基础词
        if mapper.existing_columns:
            # 从已存在的列中提取基础词
            for number in mapper.existing_columns:
                orig = mapper.original_headers.get(number, "")
                if orig:
                    # 提取基础词（去掉数字和空格）
                    base = orig.strip()
                    for i in range(1, 20):
                        base = base.replace(str(i), "").strip()
                    if base:
                        base_word = base
                        break
        
        # 步骤 2: 确定最大图片数（严格按需）
        if max_pictures is not None:
            final_max = min(max_pictures, 10)  # 最多 10 列
        elif image_matcher:
            final_max = self.scan_product_images(image_matcher)
            final_max = min(final_max, 10)  # 最多 10 列
        else:
            final_max = 3  # 默认至少 3 列
        
        # 确保至少 1 列
        if final_max < 1:
            final_max = 1
        
        # 步骤 3: 计算需要添加的列
        needed_numbers = mapper.calculate_needed_columns(final_max)
        
        # 步骤 4: 找到合适的起始列位置
        if needed_numbers:
            # 检查最后一列内容
            has_content = self._check_last_column_content()
            
            # 确定起始列
            if has_content:
                start_column = self.sheet_info.last_column + 1
            else:
                start_column = self.sheet_info.last_column
        
        # 步骤 5: 添加缺失的列
        added_columns = []
        for idx, number in enumerate(needed_numbers):
            column_num = start_column + idx
            picture_name = f"{base_word} {number}"
            
            cell = worksheet.cell(row=self.sheet_info.header_row, column=column_num)
            cell.value = picture_name
            
            cell.font = Font(name='微软雅黑', size=11)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            
            self.sheet_info.last_column = column_num
            
            added_columns.append(PictureColumn(
                number=number,
                original_header=picture_name,
                column_index=column_num,
                is_existing=False
            ))
        
        # 步骤 6: 重命名已存在的列（添加空格格式）
        if base_word:
            for number, col_idx in mapper.existing_columns.items():
                old_header = mapper.original_headers.get(number, "")
                new_header = f"{base_word} {number}"
                if old_header != new_header:
                    worksheet.cell(row=self.sheet_info.header_row, column=col_idx).value = new_header
                    mapper.original_headers[number] = new_header
        
        # 步骤 7: 构建结果
        existing_columns = mapper.to_picture_columns()
        
        for idx, number in enumerate(needed_numbers):
            column_num = start_column + idx
            picture_name = f"{base_word} {number}"
            mapper.existing_columns[number] = column_num
            mapper.original_headers[number] = picture_name
        
        result = ColumnAdditionResult(
            added_columns=added_columns,
            existing_columns=existing_columns,
            total_columns=len(existing_columns) + len(added_columns)
        )
        
        return result
    
    def embed_image(
        self,
        row: int,
        column: Union[int, str],
        source: Union[str, bytes],
        width: int = 180,
        height: int = 138
    ):
        """
        嵌入图片到指定单元格
        
        Args:
            row (int): 行号（从 1 开始）
            column (Union[int, str]): 列号（从 1 开始）或列字母（如"A"）
            source (Union[str, bytes]): 图片来源
                - str: 文件路径
                - bytes: 图片二进制数据
            width (int): 图片宽度（像素，默认 180）
            height (int): 图片高度（像素，默认 138）
        
        Raises:
            FileNotFoundError: 文件路径不存在
            ValueError: 无效的图片源
        
        Example:
            # 使用文件路径
            >>> processor.embed_image(2, 'Picture 1', '/path/to/image.jpg')
            
            # 使用二进制数据
            >>> with open('/path/to/image.jpg', 'rb') as f:
            ...     processor.embed_image(2, 'Picture 1', f.read())
        """
        if not self.sheet_info:
            raise ValueError("未找到包含商品编码的工作表")
        
        worksheet = self.workbook[self.sheet_info.name]
        
        # 转换列字母为列号
        if isinstance(column, str):
            column_num = column_index_from_string(column)
        else:
            column_num = column
        
        # 处理图片源
        cache_key = f"{source}_{width}_{height}" if isinstance(source, str) else None
        xl_image = None
        buffer = None
        
        if cache_key and cache_key in self._image_cache:
            buffer = BytesIO(self._image_cache[cache_key])
            xl_image = XLImage(buffer)
        else:
            if isinstance(source, str):
                if not os.path.exists(source):
                    raise FileNotFoundError(f"图片文件不存在：{source}")
                pil_image = PILImage.open(source)
                pil_image = pil_image.resize((width, height), PILImage.Resampling.LANCZOS)
                buffer = BytesIO()
                pil_image.save(buffer, format='JPEG', quality=85)
                buffer.seek(0)
                self._image_cache[cache_key] = buffer.getvalue()
                xl_image = XLImage(buffer)
            elif isinstance(source, bytes):
                pil_image = PILImage.open(BytesIO(source))
                pil_image = pil_image.resize((width, height), PILImage.Resampling.LANCZOS)
                buffer = BytesIO()
                pil_image.save(buffer, format='JPEG', quality=85)
                buffer.seek(0)
                xl_image = XLImage(buffer)
            else:
                raise ValueError("无效的图片源，必须是文件路径（str）或二进制数据（bytes）")
        
        # 设置图片锚点
        cell = worksheet.cell(row=row, column=column_num)
        xl_image.anchor = cell.coordinate
        
        # 调整列宽以适配图片 (1 像素 ≈ 0.15 字符宽度)
        col_letter = get_column_letter(column_num)
        worksheet.column_dimensions[col_letter].width = width * 0.15
        
        # 调整行高以适配图片 (1 像素 ≈ 0.75 点高度)
        worksheet.row_dimensions[row].height = height * 0.75
        
        # 添加图片到工作表
        worksheet.add_image(xl_image)
    
    def get_product_code(self, row: int) -> Optional[str]:
        """
        获取指定行的商品编码
        
        Args:
            row (int): 行号
        
        Returns:
            Optional[str]: 商品编码，未找到返回 None
        """
        if not self.sheet_info:
            return None
        
        worksheet = self.workbook[self.sheet_info.name]
        cell = worksheet.cell(row=row, column=self.sheet_info.product_code_column)
        
        if cell.value:
            return str(cell.value).strip()
        
        return None
    
    def get_product_codes(self) -> List[str]:
        """
        获取所有商品编码
        
        Returns:
            List[str]: 商品编码列表
        """
        if not self.sheet_info:
            return []
        
        codes = []
        worksheet = self.workbook[self.sheet_info.name]
        
        for row in self.sheet_info.data_rows:
            code = self.get_product_code(row)
            if code:
                codes.append(code)
        
        return codes
    
    def scan_product_images(self, image_matcher: Any) -> int:
        """
        扫描商品的图片数量
        
        Args:
            image_matcher (Any): ImageMatcher 对象，用于查找商品对应的图片
        
        Returns:
            int: 最大图片数（所有商品中图片数量的最大值）
        
        Example:
            >>> images = processor.load_images('/path/to/images')
            >>> matcher = ImageMatcher(images)
            >>> max_pics = processor.scan_product_images(matcher)
            >>> print(f"最多需要 {max_pics} 个 Picture 列")
        """
        if not self.sheet_info:
            return 0
        
        max_pictures = 0
        
        # 遍历所有数据行
        for row in self.sheet_info.data_rows:
            product_code = self.get_product_code(row)
            if not product_code:
                continue
            
            # 统计该商品有多少张图片
            picture_count = 0
            for pic_num in range(1, 11):  # 最多检查 10 个
                if image_matcher.has_image(product_code, pic_num):
                    picture_count += 1
                else:
                    break
            
            max_pictures = max(max_pictures, picture_count)
        
        return max_pictures
    
    def save(self, output_path: Optional[str] = None) -> Path:
        """
        保存 Excel 文件
        
        Args:
            output_path (Optional[str]): 输出文件路径
                - 如未指定，自动生成（原文件名_含图.xlsx）
        
        Returns:
            Path: 输出文件路径
        
        特点：
            - 如果原始文件名已经包含"_含图"后缀，则先移除所有重复的后缀，确保只存在一个后缀
            - 避免出现无限叠加的情况（如"xxx_含图_含图_含图.xlsx"）
        
        Example:
            >>> output = processor.save()
            >>> print(f"输出文件：{output}")
            /path/to/销售表_含图.xlsx
            
            >>> output = processor.save('/custom/path/output.xlsx')
        """
        if output_path:
            self.output_path = Path(output_path)
        else:
            # 自动生成输出路径
            stem = self.file_path.stem
            suffix = self.file_path.suffix
            
            # 移除所有已存在的"_含图"后缀（避免重复）
            target_suffix = "_含图"
            while stem.endswith(target_suffix):
                stem = stem[:-len(target_suffix)]
            
            # 重新添加后缀
            self.output_path = self.file_path.parent / f"{stem}{target_suffix}{suffix}"
        
        # 保存工作簿
        self.workbook.save(str(self.output_path))
        
        return self.output_path
    
    def close(self):
        """
        关闭工作簿
        
        释放资源
        """
        if self.workbook:
            self.workbook.close()
    
    def __enter__(self):
        """上下文管理器入口"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.close()
    
    def highlight_empty_product_codes(
        self,
        rows: List[int],
        fill_color: str = "FFFF00"
    ):
        """
        高亮显示未匹配到图片的商品编码单元格
        
        Args:
            rows (List[int]): 需要高亮的行号列表
            fill_color (str): 填充颜色（十六进制，默认黄色 FFFF00）
        
        Raises:
            ValueError: 未找到包含商品编码的工作表
        
        Example:
            >>> processor.highlight_empty_product_codes([2, 5, 8])
        """
        if not self.sheet_info:
            raise ValueError("未找到包含商品编码的工作表")
        
        worksheet = self.workbook[self.sheet_info.name]
        
        # 创建黄色填充样式
        yellow_fill = PatternFill(
            start_color=fill_color,
            end_color=fill_color,
            fill_type="solid"
        )
        
        # 高亮指定行的商品编码单元格
        for row in rows:
            cell = worksheet.cell(
                row=row,
                column=self.sheet_info.product_code_column
            )
            # 应用黄色背景填充
            cell.fill = yellow_fill
            
            # 确保文本可读性（保持原有字体，或设置为黑色）
            if cell.font is None or cell.font.color is None:
                cell.font = Font(color="000000")  # 黑色字体
    

