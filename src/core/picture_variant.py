"""
Picture 变体识别模块

这个模块提供了 Picture 列变体识别、拼写纠错和列映射管理功能。

功能:
1. 识别 24 种 Picture 变体（英文 16 种 + 中文 8 种）
2. 自动纠正常见拼写错误
3. 提取编号（1-10）
4. 管理已存在的 Picture 列
5. 计算需要添加的列

变体支持:
- 英文：Picture, Photo, Image, Figure（及复数形式、缩写）
- 中文：图片，照片，图像，图
- 格式：无空格（Picture1）、有空格（Picture 1）、缩写（Pic.）

Example:
    >>> from picture_variant import recognize_variant, correct_spelling
    >>> recognize_variant("Picture1")
    ("Picture", 1)
    >>> recognize_variant("Photo 2")
    ("Picture", 2)
    >>> recognize_variant("图片 1")
    ("图片", 1)
    >>> recognize_variant("照片1")
    ("照片", 1)
    >>> correct_spelling("Photoes")
    "Photos"
"""

from typing import Optional, Tuple, Dict, List, Any, TYPE_CHECKING
from dataclasses import dataclass, field
from functools import lru_cache
import re

# 预编译正则表达式 (性能优化)
_NUMBER_PATTERN = re.compile(r'(\d+)\s*$')
_BRACKET_NUMBER_PATTERN = re.compile(r'\((\d+)\)')
_DIGIT_STRIP_PATTERN = re.compile(r'\d+\s*$')
_BRACKET_STRIP_PATTERN = re.compile(r'\(\d+\)')
_SEPARATOR_PATTERN = re.compile(r'[\s.\-\_]+')


@dataclass
class PictureColumn:
    """
    Picture 列信息

    Attributes:
        number (int): 编号（1-10）
        original_header (str): 原始表头
        column_index (int): Excel 列索引
        is_existing (bool): 是否已存在
    """
    number: int
    original_header: str
    column_index: int
    is_existing: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'number': self.number,
            'original_header': self.original_header,
            'column_index': self.column_index,
            'is_existing': self.is_existing
        }


@dataclass
class ColumnAdditionResult:
    """
    列添加结果

    Attributes:
        added_columns (List[PictureColumn]): 新增的列
        existing_columns (List[PictureColumn]): 已存在的列
        total_columns (int): 总列数
    """
    added_columns: List[PictureColumn] = field(default_factory=list)
    existing_columns: List[PictureColumn] = field(default_factory=list)
    total_columns: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'added': [col.to_dict() for col in self.added_columns],
            'existing': [col.to_dict() for col in self.existing_columns],
            'total': self.total_columns
        }

    def get_column_mapping(self) -> Dict[str, int]:
        """
        获取列名到列号的映射字典

        Returns:
            Dict[str, int]: {"Picture 1": 列号, "图片 1": 列号, ...}
        """
        mapping = {}

        # 收集所有列
        all_columns = list(self.existing_columns) + list(self.added_columns)

        for col in all_columns:
            if col.original_header:
                # 使用 recognize_variant 获取标准化的基础词
                result = recognize_variant(col.original_header)
                if result:
                    base_word, number = result
                    mapping[f"{base_word} {number}"] = col.column_index
                else:
                    mapping[f"Picture {col.number}"] = col.column_index
            else:
                mapping[f"Picture {col.number}"] = col.column_index

        return mapping

    def keys(self) -> List[str]:
        """获取所有列名"""
        return list(self.get_column_mapping().keys())

    def items(self) -> List[tuple]:
        """获取所有列名和列号的键值对"""
        return list(self.get_column_mapping().items())

    def __getitem__(self, key: str) -> int:
        """通过列名获取列号"""
        return self.get_column_mapping()[key]


class SpellingCorrector:
    """
    拼写纠错器

    功能:
    1. 常见拼写错误纠正
    2. 大小写统一
    3. 复数形式识别

    Attributes:
        CORRECTIONS (Dict[str, str]): 拼写纠错映射表
        PLURAL_FORMS (Dict[str, str]): 复数形式映射表
    """

    # 拼写纠错映射表
    CORRECTIONS = {
        # Photo 相关
        'photoes': 'photos',
        'foto': 'photo',
        'fotos': 'photos',

        # Picture 相关
        'pitures': 'pictures',
        'piture': 'picture',
        'picure': 'picture',
        'picures': 'pictures',
        'pictue': 'picture',
        'pictuers': 'pictures',

        # Image 相关
        'imgs': 'images',
        'imge': 'image',
        'imges': 'images',

        # Figure 相关
        'fig': 'figure',

        # 中文常见错误
        '图片片': '图片',
        '照照片': '照片',
    }

    # 复数形式映射表
    PLURAL_FORMS = {
        'pictures': 'picture',
        'photos': 'photo',
        'images': 'image',
        'figures': 'figure',
        # 中文无复数
        '图片': '图片',
        '照片': '照片',
        '图像': '图像',
        '图': '图',
    }

    def __init__(self) -> None:
        """初始化纠错器"""
        pass

    def correct(self, text: str) -> str:
        """
        纠正拼写错误

        Args:
            text (str): 原始文本

        Returns:
            str: 纠正后的文本

        Example:
            >>> corrector = SpellingCorrector()
            >>> corrector.correct("Photoes")
            "Photos"
            >>> corrector.correct("Pitures")
            "Pictures"
        """
        # 转小写查找
        lower_text = text.lower()

        # 查找纠错映射
        if lower_text in self.CORRECTIONS:
            corrected = self.CORRECTIONS[lower_text]
            # 保持原始大小写格式
            return self._preserve_case(text, corrected)

        return text

    def _preserve_case(self, original: str, corrected: str) -> str:
        """
        保持原始大小写格式

        Args:
            original (str): 原始文本
            corrected (str): 纠正后的文本

        Returns:
            str: 保持原始大小写格式的纠正文本
        """
        if original.isupper():
            return corrected.upper()
        elif original.istitle():
            return corrected.title()
        else:
            return corrected

    def get_base_word(self, text: str) -> Optional[str]:
        """
        获取基础词（去除复数）

        Args:
            text (str): 文本

        Returns:
            Optional[str]: 基础词

        Example:
            >>> corrector = SpellingCorrector()
            >>> corrector.get_base_word("Pictures")
            "Picture"
            >>> corrector.get_base_word("图片")
            "图片"
        """
        lower_text = text.lower()

        if lower_text in self.PLURAL_FORMS:
            base = self.PLURAL_FORMS[lower_text]
            return self._preserve_case(text, base)

        return text


class VariantRecognizer:
    """
    Picture 变体识别器

    功能:
    1. 识别 24 种变体
    2. 提取编号
    3. 标准化映射

    Attributes:
        SUPPORTED_BASE_WORDS (Set[str]): 支持的基础词集合
        MAX_NUMBER (int): 最大编号（10）
    """

    # 支持的基础词（识别后保留原始词汇）
    SUPPORTED_BASE_WORDS = {
        # 英文（基础形式）
        'picture', 'photo', 'image', 'figure',
        # 英文（复数形式，用于拼写纠错后识别）
        'pictures', 'photos', 'images', 'figures',
        # 英文（缩写形式）
        'pic', 'img', 'fig',
        # 中文
        '图片', '照片', '图像', '图'
    }

    # 缩写映射表
    ABBREVIATIONS = {
        'pic': 'picture',
        'img': 'image',
        'fig': 'figure',
    }

    # 最大编号
    MAX_NUMBER = 10

    def __init__(self) -> None:
        """初始化识别器"""
        self.corrector = SpellingCorrector()

    @lru_cache(maxsize=1024)
    def recognize(self, header: str) -> Optional[Tuple[str, int]]:
        """
        识别表头是否为 Picture 变体

        Args:
            header (str): 原始表头字符串

        Returns:
            Optional[Tuple[str, int]]: (标准化名称，编号)
            - 如："Picture", 1
            - 如不是变体，返回 None

        Example:
            >>> recognizer = VariantRecognizer()
            >>> recognizer.recognize("Picture1")
            ("Picture", 1)
            >>> recognizer.recognize("Photo 2")
            ("Picture", 2)
            >>> recognizer.recognize("图片 1")
            ("Picture", 1)
            >>> recognizer.recognize("Name")
            None
        """
        if not header or not isinstance(header, str):
            return None

        # 步骤 1: 标准化文本（纠错、大小写、去空格）
        normalized = self._normalize(header)

        # 步骤 2: 提取编号
        number = self._extract_number(normalized)

        # 步骤 3: 验证编号
        if number is None or number < 1 or number > self.MAX_NUMBER:
            return None

        # 步骤 4: 提取基础词
        base_word = self._extract_base_word(normalized, number)

        # 步骤 5: 验证基础词
        if not base_word or base_word.lower() not in self.SUPPORTED_BASE_WORDS:
            return None

        # 步骤 6: 缩写转换（如 pic -> picture）
        lower_base = base_word.lower()
        if lower_base in self.ABBREVIATIONS:
            base_word = self.ABBREVIATIONS[lower_base]

        # 步骤 7: 返回原始基础词（保留变体）
        return (base_word, number)

    def _normalize(self, text: str) -> str:
        """
        标准化文本（纠错、大小写、去空格）

        Args:
            text (str): 原始文本

        Returns:
            str: 标准化后的文本
        """
        # 去除首尾空格
        text = text.strip()

        # 拼写纠错
        text = self.corrector.correct(text)

        # 统一为首字母大写（英文）或保持原样（中文）
        # 注意：中文不需要 title()
        if text.isascii():
            text = text.title()

        return text

    def _extract_number(self, text: str) -> Optional[int]:
        """
        提取编号

        支持的格式:
        - Picture1, Photo2, Image3
        - Picture 1, Photo 2, Image 3
        - Pic.1, Fig.1
        - Picture(1), Photo(2)

        Args:
            text (str): 文本

        Returns:
            Optional[int]: 编号（1-10），无法提取返回 None
        """
        # 模式 1: 数字在末尾（可能有空格）- 使用预编译正则
        match = _NUMBER_PATTERN.search(text)
        if match:
            return int(match.group(1))

        # 模式 2: 括号中的数字 - 使用预编译正则
        match = _BRACKET_NUMBER_PATTERN.search(text)
        if match:
            return int(match.group(1))

        return None

    def _extract_base_word(self, text: str, number: int) -> Optional[str]:
        """
        提取基础词（去除编号和分隔符）

        Args:
            text (str): 文本
            number (int): 编号

        Returns:
            Optional[str]: 基础词
        """
        # 移除数字 - 使用预编译正则
        base = _DIGIT_STRIP_PATTERN.sub('', text)
        base = _BRACKET_STRIP_PATTERN.sub('', base)

        # 移除分隔符（空格、点、横线等）- 使用预编译正则
        base = _SEPARATOR_PATTERN.sub('', base)

        # 再次纠错（可能移除数字后需要纠错）
        base = self.corrector.correct(base)

        # 获取基础词（去除复数）
        base = self.corrector.get_base_word(base)

        return base.strip() if base else None

    def is_picture_variant(self, header: str) -> bool:
        """
        判断是否为 Picture 变体

        Args:
            header (str): 表头

        Returns:
            bool: 是否为 Picture 变体
        """
        return self.recognize(header) is not None


class PictureColumnMapper:
    """
    Picture 列映射管理器

    功能:
    1. 管理已存在的 Picture 列
    2. 计算需要添加的列
    3. 维护原始表头与标准映射

    Attributes:
        existing_columns (Dict[int, int]): {编号：列号}
        original_headers (Dict[int, str]): {编号：原始表头}
    """

    def __init__(self) -> None:
        """初始化映射管理器"""
        self.recognizer = VariantRecognizer()
        self.existing_columns: Dict[int, int] = {}
        self.original_headers: Dict[int, str] = {}

    def scan_worksheet(self, worksheet: 'Worksheet', header_row: int) -> None:
        """
        扫描工作表，识别已存在的 Picture 列

        Args:
            worksheet: openpyxl 工作表对象
            header_row (int): 表头行号

        Example:
            >>> mapper = PictureColumnMapper()
            >>> mapper.scan_worksheet(worksheet, header_row=1)
        """
        # 批量读取表头行
        for col_idx in range(1, worksheet.max_column + 1):
            cell = worksheet.cell(row=header_row, column=col_idx)
            if cell.value:
                result = self.recognizer.recognize(str(cell.value))
                if result:
                    base_word, number = result
                    self.existing_columns[number] = col_idx
                    self.original_headers[number] = str(cell.value)

    def get_existing_columns(self) -> Dict[int, int]:
        """
        获取已存在的列

        Returns:
            Dict[int, int]: {编号：列号}
        """
        return self.existing_columns

    def get_max_existing_number(self) -> int:
        """
        获取已存在的最大编号

        Returns:
            int: 最大编号
        """
        return max(self.existing_columns.keys()) if self.existing_columns else 0

    def calculate_needed_columns(self, max_pictures: int) -> List[int]:
        """
        计算需要添加的列编号

        Args:
            max_pictures (int): 最大图片数

        Returns:
            List[int]: 需要添加的列编号列表

        Example:
            >>> mapper.existing_columns = {1: 18, 2: 19}
            >>> mapper.calculate_needed_columns(5)
            [3, 4, 5]
        """
        if max_pictures < 1:
            return []

        existing = set(self.existing_columns.keys())
        needed = set(range(1, max_pictures + 1))
        return sorted(needed - existing)

    def to_picture_columns(self) -> List[PictureColumn]:
        """
        转换为 PictureColumn 列表

        Returns:
            List[PictureColumn]: 已存在的列信息
        """
        columns = []
        for number, col_idx in sorted(self.existing_columns.items()):
            columns.append(PictureColumn(
                number=number,
                original_header=self.original_headers.get(number, ""),
                column_index=col_idx,
                is_existing=True
            ))
        return columns


# 公共接口函数

def recognize_variant(header: str) -> Optional[Tuple[str, int]]:
    """
    识别 Picture 变体（公共接口）

    Args:
        header (str): 表头字符串

    Returns:
        Optional[Tuple[str, int]]: (原始基础词, 编号) - 保留原始词汇拼写

    Example:
        >>> recognize_variant("Picture1")
        ("Picture", 1)
        >>> recognize_variant("Photo 2")
        ("Picture", 2)
        >>> recognize_variant("图片 1")
        ("图片", 1)
        >>> recognize_variant("照片1")
        ("照片", 1)
    """
    recognizer = VariantRecognizer()
    return recognizer.recognize(header)


def correct_spelling(text: str) -> str:
    """
    拼写纠错（公共接口）

    Args:
        text (str): 原始文本

    Returns:
        str: 纠正后的文本

    Example:
        >>> correct_spelling("Photoes")
        "Photos"
        >>> correct_spelling("Pitures")
        "Pictures"
    """
    corrector = SpellingCorrector()
    return corrector.correct(text)


def is_picture_variant(header: str) -> bool:
    """
    判断是否为 Picture 变体（公共接口）

    Args:
        header (str): 表头字符串

    Returns:
        bool: 是否为 Picture 变体

    Example:
        >>> is_picture_variant("Picture1")
        True
        >>> is_picture_variant("Photo 2")
        True
        >>> is_picture_variant("Name")
        False
    """
    recognizer = VariantRecognizer()
    return recognizer.is_picture_variant(header)
