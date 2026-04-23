"""
文件夹图片加载器模块

支持并行加载模式，使用 ThreadPoolExecutor 并行读取文件
"""

import logging
from typing import List, Optional
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed
import mmap

from PIL import Image

from .base_loader import BaseImageLoader
from ..models import ImageInfo
from utils.security import SecurityValidator

logger = logging.getLogger(__name__)


class FolderImageLoader(BaseImageLoader):
    """
    文件夹图片加载器

    从文件夹加载图片，支持并行读取和内存映射处理大文件
    """

    LARGE_FILE_THRESHOLD = 10 * 1024 * 1024
    MAX_FILE_SIZE = 100 * 1024 * 1024

    def _read_file_with_mmap(self, file_path: Path) -> bytes:
        """使用内存映射读取大文件（仅在文件>10MB时使用）"""
        file_size = file_path.stat().st_size
        if file_size <= self.LARGE_FILE_THRESHOLD:
            with open(file_path, 'rb') as f:
                return f.read()

        with open(file_path, 'rb') as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                return bytes(mm)

    def _read_file_safely(self, file_path: Path) -> bytes:
        """安全地读取文件，根据文件大小选择最优方法"""
        file_size = file_path.stat().st_size

        if file_size > self.MAX_FILE_SIZE:
            raise ValueError(
                f"文件过大: {file_path.name} ({file_size / 1024 / 1024:.2f}MB)，"
                f"最大允许 {self.MAX_FILE_SIZE / 1024 / 1024}MB"
            )

        if file_size > self.LARGE_FILE_THRESHOLD:
            return self._read_file_with_mmap(file_path)
        else:
            with open(file_path, 'rb') as f:
                return f.read()

    def _scan_image_files(self, folder: Path) -> List[tuple]:
        """扫描文件夹中的有效图片文件，返回解析结果列表"""
        candidates = []

        for file_path in folder.rglob('*'):
            if not file_path.is_file():
                continue

            if file_path.suffix.lower()[1:] not in self.SUPPORTED_FORMATS:
                continue

            parsed = self.parse_image_filename(file_path.name)
            if not parsed:
                continue

            candidates.append((file_path, parsed))

        return candidates

    def _load_single_image(self, file_path: Path, parsed: tuple) -> Optional[ImageInfo]:
        """加载单个图片文件，用于线程池并发调用"""
        product_code, sequence, image_format = parsed

        try:
            info = self._create_image_info(
                product_code=product_code,
                sequence=sequence,
                image_format=image_format,
                source_path=str(file_path),
                image_data=None,
                load_image=False
            )
            return info
        except ValueError as e:
            logger.warning(f"跳过无效图片: {e}")
            return None

    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        从文件夹加载图片（支持并行模式）

        少量文件（≤4）自动串行处理，大量文件使用线程池并行处理

        Args:
            source_path: 文件夹路径

        Returns:
            List[ImageInfo]: 图片信息列表

        Raises:
            FileNotFoundError: 文件夹不存在
            ValueError: 文件夹中没有有效图片或文件过大
        """
        folder = SecurityValidator.validate_path(source_path)

        if not folder.exists():
            raise FileNotFoundError(f"文件夹不存在：{source_path}")

        if not folder.is_dir():
            raise ValueError(f"路径不是文件夹：{source_path}")

        candidates = self._scan_image_files(folder)

        if not candidates:
            raise ValueError("文件夹中没有找到有效图片（支持 JPG/PNG/JPEG）")

        workers = self.get_workers(len(candidates))
        images = self._load_images_parallel(candidates, workers)

        if not images:
            raise ValueError("文件夹中没有找到有效图片（支持 JPG/PNG/JPEG）")

        return images

    def _load_images_parallel(
        self,
        candidates: List[tuple],
        workers: int
    ) -> List[ImageInfo]:
        """使用线程池并行加载图片"""
        images: List[ImageInfo] = []

        if workers <= 1:
            for file_path, parsed in candidates:
                info = self._load_single_image(file_path, parsed)
                if info is not None:
                    images.append(info)
            return images

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(self._load_single_image, file_path, parsed): (file_path, parsed)
                for file_path, parsed in candidates
            }

            for future in as_completed(futures):
                try:
                    info = future.result()
                    if info is not None:
                        images.append(info)
                except Exception as e:
                    file_path, _ = futures[future]
                    logger.warning(f"加载图片失败 {file_path.name}: {e}")

        return images

    def _create_image_info(
        self,
        product_code: str,
        sequence: str,
        image_format: str,
        source_path: str,
        image_data: Optional[bytes],
        load_image: bool = True
    ) -> ImageInfo:
        """创建 ImageInfo 对象"""
        picture_column = int(sequence)

        info = ImageInfo(
            product_code=product_code,
            sequence=sequence,
            picture_column=picture_column,
            image_format=image_format,
            source_path=source_path,
            image_data=image_data if load_image else None
        )

        if load_image and image_data:
            image = Image.open(BytesIO(image_data))
            info.image = self._resize_image(image)

        return info

    def _resize_image(self, image: Image.Image) -> Image.Image:
        """调整图片尺寸到固定大小"""
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        return resized
