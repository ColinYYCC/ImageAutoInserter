"""
统一异常定义模块

提供层次化的异常类，便于错误处理和前端展示
"""

from typing import Optional, Type


class ImageAutoInserterError(Exception):
    """基础异常类"""

    def __init__(self, message: str, resolution: Optional[str] = None) -> None:
        self.message = message
        self.resolution = resolution or "请检查输入后重试"
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "type": self.__class__.__name__,
            "message": self.message,
            "resolution": self.resolution
        }


class FileError(ImageAutoInserterError):
    """文件相关错误基类"""
    pass


class FileNotFoundError(FileError):
    """文件不存在错误"""

    def __init__(self, path: str):
        super().__init__(
            message=f"文件不存在: {path}",
            resolution="请检查文件路径是否正确"
        )
        self.path = path


class InvalidFileTypeError(FileError):
    """文件类型错误"""

    def __init__(self, file_type: str, allowed_types: list):
        super().__init__(
            message=f"不支持的文件类型: {file_type}",
            resolution=f"允许的类型: {', '.join(allowed_types)}"
        )
        self.file_type = file_type
        self.allowed_types = allowed_types


class ExcelError(ImageAutoInserterError):
    """Excel 处理错误基类"""
    pass


class ExcelFormatError(ExcelError):
    """Excel 格式错误"""

    def __init__(self, message: str = "Excel 文件格式不正确"):
        super().__init__(
            message=message,
            resolution="请确保文件是有效的 Excel 文件 (.xlsx)"
        )


class ExcelNoProductCodeError(ExcelError):
    """Excel 中未找到商品编码列"""

    def __init__(self):
        super().__init__(
            message="未找到「商品编码」列",
            resolution="请确保 Excel 表格包含精确的「商品编码」列名"
        )


class ImageError(ImageAutoInserterError):
    """图片处理错误基类"""
    pass


class ImageNotFoundError(ImageError):
    """图片未找到错误"""

    def __init__(self, product_code: str = None):
        if product_code:
            message = f"未找到商品编码 {product_code} 对应的图片"
        else:
            message = "未找到对应的图片"
        super().__init__(
            message=message,
            resolution="请检查图片命名格式是否为「商品编码-序号.扩展名」"
        )
        self.product_code = product_code


class UnsupportedImageFormatError(ImageError):
    """不支持的图片格式错误"""

    def __init__(self, format: str):
        super().__init__(
            message=f"不支持的图片格式: {format}",
            resolution="支持的格式: JPG, JPEG, PNG"
        )
        self.format = format


class ProcessingError(ImageAutoInserterError):
    """处理过程错误"""

    def __init__(self, message: str, row: Optional[int] = None) -> None:
        super().__init__(
            message=message,
            resolution="请检查输入文件后重试"
        )
        self.row = row


class SecurityError(ImageAutoInserterError):
    """安全相关错误"""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            resolution="请检查文件路径是否安全"
        )


class PathTraversalError(SecurityError):
    """路径遍历攻击"""

    def __init__(self):
        super().__init__(
            message="检测到不安全的路径"
        )


class PermissionError(ImageAutoInserterError):
    """权限错误"""

    def __init__(self, path: str = None):
        if path:
            message = f"权限不足，无法访问: {path}"
        else:
            message = "权限不足"
        super().__init__(
            message=message,
            resolution="请确保对文件和目录有读写权限"
        )
        self.path = path


ERROR_TYPE_MAP = {
    "FileNotFoundError": FileNotFoundError,
    "InvalidFileTypeError": InvalidFileTypeError,
    "ExcelFormatError": ExcelFormatError,
    "ExcelNoProductCodeError": ExcelNoProductCodeError,
    "ImageNotFoundError": ImageNotFoundError,
    "UnsupportedImageFormatError": UnsupportedImageFormatError,
    "ProcessingError": ProcessingError,
    "SecurityError": SecurityError,
    "PathTraversalError": PathTraversalError,
    "PermissionError": PermissionError,
}


def get_error_class(error_type: str) -> Type[ImageAutoInserterError]:
    """根据错误类型获取异常类"""
    return ERROR_TYPE_MAP.get(error_type, ImageAutoInserterError)


def from_exception(error: Exception) -> ImageAutoInserterError:
    """将任意异常转换为应用异常"""
    if isinstance(error, ImageAutoInserterError):
        return error

    error_type = type(error).__name__
    error_class = get_error_class(error_type)

    if error_class == ImageAutoInserterError:
        return ImageAutoInserterError(
            message=str(error),
            resolution="请检查输入后重试"
        )

    return error_class()
