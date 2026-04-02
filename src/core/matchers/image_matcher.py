"""
图片匹配器模块

负责建立商品编码与图片的映射关系
"""

import os
from typing import List, Dict, Optional

from ..image_processor import ImageInfo
from ..utils.image_cache import get_global_cache


class ImageMatcher:
    """
    图片匹配器类

    功能：
    1. 建立商品编码与图片的映射关系
    2. 快速查找指定商品的图片
    3. 支持多图片匹配（Picture 1/2/3）
    4. 延迟加载图片数据，使用 LRU 缓存

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

    def _build_index(self) -> None:
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

    def get_original_image_data(
        self,
        product_code: str,
        picture_column: int
    ) -> Optional[bytes]:
        """
        获取原始图片数据（不进行 resize，用于效果B）

        使用延迟加载和 LRU 缓存：
        1. 先检查缓存是否存在
        2. 缓存不存在则从文件读取
        3. 读取后存入缓存供后续使用

        Args:
            product_code (str): 商品编码
            picture_column (int): Picture 列号（1/2/3）

        Returns:
            Optional[bytes]: 原始图片数据，未找到返回 None
        """
        img_info = self.get_image(product_code, picture_column)
        if not img_info:
            return None

        # 如果已经有数据（预加载模式），直接返回
        if img_info.image_data is not None:
            return img_info.image_data

        # 延迟加载：从文件读取
        cache_key = f"{product_code}_{img_info.sequence}"
        cache = get_global_cache()

        # 先查缓存
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            # 缓存命中，写回 ImageInfo（供 release() 使用）
            img_info.image_data = cached_data
            return cached_data

        # 缓存未命中，从文件读取
        try:
            with open(img_info.source_path, 'rb') as f:
                data = f.read()
        except (IOError, OSError):
            return None

        # 存入缓存
        cache.put(cache_key, data)
        # 写回 ImageInfo
        img_info.image_data = data
        return data

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
