"""
ZIP 图片加载器模块

从 ZIP 压缩包加载图片，支持并行读取
"""

import logging
from typing import List, Optional
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed
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

    从 ZIP 压缩包加载图片（完全内存处理，不解压到磁盘），支持并行读取
    """

    MAX_ENTRY_PATH_LENGTH = 4096

    def _is_safe_zip_entry(self, entry_name: str) -> bool:
        """验证 ZIP 条目路径是否安全（防止路径遍历攻击）"""
        if len(entry_name) > self.MAX_ENTRY_PATH_LENGTH:
            return False

        normalized = os.path.normpath(entry_name)

        if '..' in normalized:
            return False

        if normalized.startswith('/') or normalized.startswith('\\'):
            return False

        if len(normalized) >= 2 and normalized[1] == ':':
            return False

        return True

    def _get_safe_filename(self, entry_name: str) -> str:
        """从 ZIP 条目路径中提取安全的文件名"""
        return Path(entry_name).name

    def _scan_zip_entries(
        self,
        zip_path: str
    ) -> List[tuple]:
        """扫描 ZIP 中的有效图片条目，返回 (entry_filename, parsed, source_path) 列表"""
        candidates = []

        with zipfile.ZipFile(zip_path, 'r') as zf:
            for file_info in zf.infolist():
                if file_info.is_dir():
                    continue

                if not self._is_safe_zip_entry(file_info.filename):
                    logger.warning(f"跳过不安全的 ZIP 條目: {file_info.filename}")
                    continue

                filename = self._get_safe_filename(file_info.filename)

                if not filename or filename.lower().endswith(('/', '\\')):
                    continue

                suffix = Path(filename).suffix.lower()
                if suffix[1:] not in self.SUPPORTED_FORMATS:
                    continue

                parsed = self.parse_image_filename(filename)
                if not parsed:
                    continue

                source_path = f"{zip_path}:{filename}"
                candidates.append((file_info.filename, parsed, source_path))

        return candidates

    def _load_single_zip_entry(
        self,
        zip_path: str,
        entry_name: str,
        parsed: tuple,
        source_path: str
    ) -> Optional[ImageInfo]:
        """加载单个 ZIP 条目，用于线程池并发调用"""
        product_code, sequence, image_format = parsed

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                image_data = zf.read(entry_name)

            info = self._create_image_info(
                product_code=product_code,
                sequence=sequence,
                image_format=image_format,
                source_path=source_path,
                image_data=image_data
            )
            return info
        except Exception as e:
            logger.warning(f"读取图片失败 {entry_name}: {e}")
            return None

    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        从 ZIP 压缩包加载图片（支持并行模式）

        少量文件（≤4）自动串行处理，大量文件使用线程池并行处理

        Args:
            source_path: ZIP 文件路径

        Returns:
            List[ImageInfo]: 图片信息列表

        Raises:
            FileNotFoundError: ZIP 文件不存在
            zipfile.BadZipFile: ZIP 文件损坏
            ValueError: 发现不安全的 ZIP 条目
        """
        zip_file = SecurityValidator.validate_archive_file(source_path)

        try:
            candidates = self._scan_zip_entries(zip_file)
        except zipfile.BadZipFile as e:
            raise zipfile.BadZipFile(f"ZIP 文件损坏：{source_path}") from e

        if not candidates:
            raise ValueError("ZIP 包中没有找到有效图片（支持 JPG/PNG/JPEG）")

        workers = self.get_workers(len(candidates))
        images = self._load_images_parallel(zip_file, candidates, workers)

        if not images:
            raise ValueError("ZIP 包中没有找到有效图片（支持 JPG/PNG/JPEG）")

        return images

    def _load_images_parallel(
        self,
        zip_path: str,
        candidates: List[tuple],
        workers: int
    ) -> List[ImageInfo]:
        """使用线程池并行加载 ZIP 中的图片"""
        images: List[ImageInfo] = []

        if workers <= 1:
            for entry_name, parsed, source_path in candidates:
                info = self._load_single_zip_entry(zip_path, entry_name, parsed, source_path)
                if info is not None:
                    images.append(info)
            return images

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(
                    self._load_single_zip_entry,
                    zip_path, entry_name, parsed, source_path
                ): (entry_name, parsed)
                for entry_name, parsed, source_path in candidates
            }

            for future in as_completed(futures):
                try:
                    info = future.result()
                    if info is not None:
                        images.append(info)
                except Exception as e:
                    entry_name, _ = futures[future]
                    logger.warning(f"加载 ZIP 条目失败 {entry_name}: {e}")

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
        """调整图片尺寸"""
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        return resized
