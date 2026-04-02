"""
文件夹图片加载器模块
"""

import logging
from typing import List
from pathlib import Path
from io import BytesIO
import mmap

from PIL import Image

from .base_loader import BaseImageLoader
from ..models import ImageInfo
from utils.security import SecurityValidator

logger = logging.getLogger(__name__)


class FolderImageLoader(BaseImageLoader):
    """
    文件夹图片加载器

    从文件夹加载图片（支持內存映射處理大文件）
    """

    # 大文件閾值 (10MB)，超過此值使用內存映射
    LARGE_FILE_THRESHOLD = 10 * 1024 * 1024
    # 最大允許文件大小 (100MB)
    MAX_FILE_SIZE = 100 * 1024 * 1024

    def _read_file_with_mmap(self, file_path: Path) -> bytes:
        """
        使用內存映射讀取大文件（僅在文件>10MB時使用）

        Args:
            file_path: 文件路徑

        Returns:
            bytes: 文件內容
        """
        # 小文件直接讀取，避免 mmap 額外開銷
        file_size = file_path.stat().st_size
        if file_size <= self.LARGE_FILE_THRESHOLD:
            with open(file_path, 'rb') as f:
                return f.read()

        # 大文件使用內存映射
        with open(file_path, 'rb') as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                return bytes(mm)

    def _read_file_safely(self, file_path: Path) -> bytes:
        """
        安全地讀取文件，根據文件大小選擇最優方法

        Args:
            file_path: 文件路徑

        Returns:
            bytes: 文件內容

        Raises:
            ValueError: 文件過大
        """
        file_size = file_path.stat().st_size

        # 檢查文件大小限制
        if file_size > self.MAX_FILE_SIZE:
            raise ValueError(
                f"文件過大: {file_path.name} ({file_size / 1024 / 1024:.2f}MB)，"
                f"最大允許 {self.MAX_FILE_SIZE / 1024 / 1024}MB"
            )

        # 大文件使用內存映射，小文件直接讀取
        if file_size > self.LARGE_FILE_THRESHOLD:
            return self._read_file_with_mmap(file_path)
        else:
            with open(file_path, 'rb') as f:
                return f.read()

    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        从文件夹加载图片（支持內存映射處理大文件）

        Args:
            source_path: 文件夹路径

        Returns:
            List[ImageInfo]: 图片信息列表

        Raises:
            FileNotFoundError: 文件夹不存在
            ValueError: 文件夹中没有有效图片或文件過大
        """
        folder = SecurityValidator.validate_path(source_path)

        if not folder.exists():
            raise FileNotFoundError(f"文件夹不存在：{source_path}")

        if not folder.is_dir():
            raise ValueError(f"路径不是文件夹：{source_path}")

        images = []

        for file_path in folder.rglob('*'):
            if not file_path.is_file():
                continue

            if file_path.suffix.lower()[1:] not in self.SUPPORTED_FORMATS:
                continue

            parsed = self.parse_image_filename(file_path.name)
            if not parsed:
                continue

            product_code, sequence, image_format = parsed

            try:
                # 延迟加载：默认不预读图片数据，由 ImageMatcher 按需加载
                info = self._create_image_info(
                    product_code=product_code,
                    sequence=sequence,
                    image_format=image_format,
                    source_path=str(file_path),
                    image_data=None,
                    load_image=False  # 禁用预加载，启用延迟加载
                )

                images.append(info)

            except ValueError as e:
                logger.warning(f"跳过无效图片: {e}")
                continue

        if not images:
            raise ValueError("文件夹中没有找到有效图片（支持 JPG/PNG/JPEG）")

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
        """
        创建 ImageInfo 对象

        Args:
            product_code: 商品编码
            sequence: 序号
            image_format: 图片格式
            source_path: 图片来源路径
            image_data: 图片二进制数据
            load_image: 是否加载图片数据（False 时只保存路径，按需加载）

        Returns:
            ImageInfo: 图片信息对象
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

    def load_image_data(self, file_path: str) -> bytes:
        """
        按需加载单个图片的二进制数据

        Args:
            file_path: 图片文件路径

        Returns:
            bytes: 图片二进制数据
        """
        path = Path(file_path)
        return self._read_file_safely(path)

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """
        调整图片尺寸到固定大小

        Args:
            image: PIL Image 对象

        Returns:
            Image.Image: 调整尺寸后的图片
        """
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        return resized
