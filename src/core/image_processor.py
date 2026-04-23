"""
图片处理器模块

负责从不同来源（文件夹、ZIP）加载和处理图片
支持商品编码自动识别和图片尺寸调整

注意: RAR 文件由 TypeScript 端 (node-unrar-js) 提取后，
Python 只接收已提取的文件夹路径。

重构说明:
- 缓存功能移至 cache/image_cache.py
- 加载器移至 loaders/ 文件夹
- ImageInfo 移至 models.image_info
"""

from pathlib import Path
from typing import Optional, List

from PIL import Image

from utils.security import SecurityValidator
from utils.config import ImageConfig
from .cache import ImageValidationCache
from .loaders import FolderImageLoader, ZipImageLoader
from .models import ImageInfo


class ImageProcessor:
    """
    图片处理器类

    功能：
    1. 从文件夹加载图片
    2. 从 ZIP 压缩包加载图片
    3. 解析图片命名（商品编码 - 序号。格式）
    4. 调整图片尺寸（180×138 像素）
    5. 验证图片来源
    """

    SUPPORTED_FORMATS = {'jpg', 'jpeg', 'png'}
    TARGET_WIDTH = ImageConfig.WIDTH
    TARGET_HEIGHT = ImageConfig.HEIGHT

    def __init__(self):
        self._validation_cache = ImageValidationCache(max_items=100)
        self._folder_loader = FolderImageLoader()
        self._zip_loader = ZipImageLoader()

    def parse_image_filename(self, filename: str) -> Optional[tuple[str, str, str]]:
        """
        解析图片文件名

        期望格式：{商品编码}-{序号}.{格式}
        示例：C000641234100-01.jpg

        Args:
            filename: 文件名

        Returns:
            (商品编码, 序号, 格式) 元组，解析失败返回 None
        """
        name = Path(filename).stem
        suffix = Path(filename).suffix.lower()

        if suffix[1:] not in self.SUPPORTED_FORMATS:
            return None

        parts = name.rsplit('-', 1)
        if len(parts) != 2:
            return None

        product_code, sequence = parts

        if len(sequence) != 2 or not sequence.isdigit():
            return None

        seq_num = int(sequence)
        if seq_num < 1 or seq_num > 10:
            return None

        if not product_code.strip():
            return None

        return (product_code.strip(), sequence, suffix[1:])

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """调整图片尺寸到固定大小（180×138 像素）"""
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        return resized

    def load_images_from_folder(self, folder_path: str) -> List[ImageInfo]:
        """从文件夹加载图片"""
        return self._folder_loader.load_images(folder_path)

    def load_images_from_zip(self, zip_path: str) -> List[ImageInfo]:
        """从 ZIP 压缩包加载图片"""
        return self._zip_loader.load_images(zip_path)

    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        智能加载图片（自动识别来源类型）

        Args:
            source_path: 图片源路径（文件夹/ZIP）

        Returns:
            List[ImageInfo]: 图片信息列表

        Raises:
            FileNotFoundError: 路径不存在
            ValueError: 不支持的来源类型
        """
        source = Path(source_path)

        if not source.exists():
            raise FileNotFoundError(f"路径不存在：{source_path}")

        if source.is_dir():
            return self.load_images_from_folder(source_path)
        elif source.suffix.lower() == '.zip':
            return self.load_images_from_zip(source_path)
        else:
            raise ValueError(f"不支持的图片源类型：{source_path}，支持文件夹/ZIP")

    def validate_image_source(self, source_path: str) -> dict:
        """
        验证图片来源中是否包含支持的图片格式

        Args:
            source_path: 图片来源路径

        Returns:
            dict: 验证结果
                - valid (bool): 是否包含支持的图片
                - total_files (int): 扫描的文件总数
                - supported_count (int): 支持的图片数量
                - unsupported_files (list): 不支持的文件列表
                - error (str): 错误信息
        """
        cache_key = str(source_path)
        cached = self._validation_cache.get(cache_key)
        if cached:
            return cached

        try:
            source = SecurityValidator.validate_image_source(source_path)
        except (ValueError, FileNotFoundError) as e:
            return {
                'valid': False,
                'total_files': 0,
                'supported_count': 0,
                'unsupported_files': [],
                'error': str(e)
            }

        supported_files: List[str] = []
        unsupported_files: List[str] = []

        try:
            if source.is_dir():
                for file_path in source.iterdir():
                    if not file_path.is_file():
                        continue

                    ext = file_path.suffix.lower()[1:]
                    if ext in self.SUPPORTED_FORMATS:
                        supported_files.append(file_path.name)
                    elif ext in ['bmp', 'gif', 'webp', 'tiff', 'tif', 'svg', 'ico', 'png', 'jpg', 'jpeg']:
                        unsupported_files.append(file_path.name)

            elif source.suffix.lower() == '.zip':
                import zipfile
                with zipfile.ZipFile(source, 'r') as zf:
                    for file_info in zf.infolist():
                        if file_info.is_dir():
                            continue

                        filename = Path(file_info.filename).name
                        ext = Path(filename).suffix.lower()[1:]

                        if ext in self.SUPPORTED_FORMATS:
                            supported_files.append(filename)
                        elif ext in ['bmp', 'gif', 'webp', 'tiff', 'tif', 'svg', 'ico', 'png', 'jpg', 'jpeg']:
                            unsupported_files.append(filename)
            else:
                return {
                    'valid': False,
                    'total_files': 0,
                    'supported_count': 0,
                    'unsupported_files': [],
                    'error': f'不支持的图片来源类型：{source_path}'
                }

        except Exception as e:
            return {
                'valid': False,
                'total_files': 0,
                'supported_count': 0,
                'unsupported_files': [],
                'error': f'扫描失败：{str(e)}'
            }

        if len(supported_files) == 0:
            error_msg = '未找到支持的图片格式（Jpg/JPEG/PNG）'
            result: dict = {
                'valid': False,
                'total_files': len(supported_files) + len(unsupported_files),
                'supported_count': 0,
                'unsupported_files': unsupported_files,
                'error': error_msg
            }
        else:
            result = {
                'valid': True,
                'total_files': len(supported_files) + len(unsupported_files),
                'supported_count': len(supported_files),
                'unsupported_files': unsupported_files
            }

        self._validation_cache.set(cache_key, result)
        return result
