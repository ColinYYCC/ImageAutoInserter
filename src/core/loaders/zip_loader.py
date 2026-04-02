"""
ZIP 图片加载器模块

从 ZIP 压缩包加载图片
"""

import logging
from typing import List
from pathlib import Path
from io import BytesIO
import zipfile
import os

from PIL import Image

from .base_loader import BaseImageLoader
from ..models import ImageInfo
from utils.security import SecurityValidator

logger = logging.getLogger(__name__)


class ZipImageLoader(BaseImageLoader):
    """
    ZIP 图片加载器

    从 ZIP 压缩包加载图片（完全内存处理，不解压到磁盘）
    """

    # 最大允許的 ZIP 條目路徑長度
    MAX_ENTRY_PATH_LENGTH = 4096

    def _is_safe_zip_entry(self, entry_name: str) -> bool:
        """
        驗證 ZIP 條目路徑是否安全（防止路徑遍歷攻擊）

        Args:
            entry_name: ZIP 條目名稱

        Returns:
            bool: 是否安全
        """
        # 檢查路徑長度
        if len(entry_name) > self.MAX_ENTRY_PATH_LENGTH:
            return False

        # 檢查是否包含路徑遍歷序列
        # 使用 os.path.normpath 和純路徑檢查
        normalized = os.path.normpath(entry_name)

        # 檢查 .. 序列（多種形式）
        if '..' in normalized:
            return False

        # 檢查絕對路徑（Unix 和 Windows）
        if normalized.startswith('/') or normalized.startswith('\\'):
            return False

        # 檢查 Windows 絕對路徑（如 C:\, D:\）
        if len(normalized) >= 2 and normalized[1] == ':':
            return False

        # 只使用文件名部分進行後續處理
        return True

    def _get_safe_filename(self, entry_name: str) -> str:
        """
        從 ZIP 條目路徑中提取安全的文件名

        Args:
            entry_name: ZIP 條目名稱

        Returns:
            str: 安全的文件名
        """
        # 只使用文件名部分，丟棄路徑
        return Path(entry_name).name

    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        从 ZIP 压缩包加载图片（安全版本，防止路徑遍歷）

        Args:
            source_path: ZIP 文件路径

        Returns:
            List[ImageInfo]: 图片信息列表

        Raises:
            FileNotFoundError: ZIP 文件不存在
            zipfile.BadZipFile: ZIP 文件损坏
            ValueError: 發現不安全的 ZIP 條目
        """
        zip_file = SecurityValidator.validate_archive_file(source_path)

        images = []

        try:
            with zipfile.ZipFile(zip_file, 'r') as zf:
                for file_info in zf.infolist():
                    if file_info.is_dir():
                        continue

                    # 驗證 ZIP 條目路徑安全
                    if not self._is_safe_zip_entry(file_info.filename):
                        logger.warning(f"跳过不安全的 ZIP 條目: {file_info.filename}")
                        continue

                    # 只使用文件名部分
                    filename = self._get_safe_filename(file_info.filename)

                    if not filename or filename.lower().endswith(('/', '\\')):
                        continue

                    suffix = Path(filename).suffix.lower()
                    if suffix[1:] not in self.SUPPORTED_FORMATS:
                        continue

                    parsed = self.parse_image_filename(filename)
                    if not parsed:
                        continue

                    product_code, sequence, image_format = parsed

                    try:
                        image_data = zf.read(file_info.filename)

                        info = self._create_image_info(
                            product_code=product_code,
                            sequence=sequence,
                            image_format=image_format,
                            source_path=f"{source_path}:{filename}",
                            image_data=image_data
                        )

                        images.append(info)

                    except Exception as e:
                        logger.warning(f"读取图片失败 {filename}: {e}")
                        continue

        except zipfile.BadZipFile as e:
            raise zipfile.BadZipFile(f"ZIP 文件损坏：{source_path}") from e

        if not images:
            raise ValueError("ZIP 包中没有找到有效图片（支持 JPG/PNG/JPEG）")

        return images

    def _create_image_info(
        self,
        product_code: str,
        sequence: str,
        image_format: str,
        source_path: str,
        image_data: bytes,
        load_image: bool = True
    ) -> ImageInfo:
        """创建 ImageInfo 对象

        Args:
            product_code: 商品编码
            sequence: 序号
            image_format: 图片格式
            source_path: 图片来源路径
            image_data: 图片二进制数据
            load_image: 是否加载图片数据（False 时只保存路径，按需加载）
        """
        picture_column = int(sequence)

        info = ImageInfo(
            product_code=product_code,
            sequence=sequence,
            picture_column=picture_column,
            image_format=image_format,
            source_path=source_path,
            image_data=image_data if load_image else None
        )

        # 只有需要时才加载和 resize 图片
        if load_image and image_data:
            image = Image.open(BytesIO(image_data))
            info.image = self._resize_image(image)

        return info

    def load_image_data_from_zip(self, zip_path: str, filename: str) -> bytes:
        """
        按需从 ZIP 中加载单个图片的二进制数据

        Args:
            zip_path: ZIP 文件路径
            filename: 文件名

        Returns:
            bytes: 图片二进制数据
        """
        with zipfile.ZipFile(zip_path, 'r') as zf:
            return zf.read(filename)

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """调整图片尺寸"""
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        return resized
