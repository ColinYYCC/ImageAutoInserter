"""
图片加载器基类模块
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from pathlib import Path

from ..models import ImageInfo
from ..utils.system_info import calculate_optimal_workers, TaskType
from utils.config import ImageConfig


class BaseImageLoader(ABC):
    """
    图片加载器基类

    所有图片加载器必须继承此类并实现 load_images 方法

    Attributes:
        max_workers: 最大并行线程数，None 时由系统自动计算
    """

    SUPPORTED_FORMATS = {'jpg', 'jpeg', 'png'}
    TARGET_WIDTH = ImageConfig.WIDTH
    TARGET_HEIGHT = ImageConfig.HEIGHT

    def __init__(self, max_workers: Optional[int] = None) -> None:
        """
        初始化加载器

        Args:
            max_workers: 最大并行线程数，None 时由系统自动计算
        """
        self._max_workers = max_workers

    @property
    def max_workers(self) -> Optional[int]:
        """获取最大并行线程数"""
        return self._max_workers

    @max_workers.setter
    def max_workers(self, value: Optional[int]) -> None:
        """设置最大并行线程数"""
        self._max_workers = value

    def get_workers(self, file_count: int) -> int:
        """
        获取实际使用的线程数

        优先使用用户设定的 max_workers，否则根据系统信息自动计算

        Args:
            file_count: 待处理文件数量

        Returns:
            实际线程数
        """
        if self._max_workers is not None:
            return max(1, min(self._max_workers, file_count))
        return calculate_optimal_workers(
            task_type=TaskType.IO_BOUND,
            file_count=file_count,
        )

    @abstractmethod
    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        从指定来源加载图片

        Args:
            source_path: 图片来源路径

        Returns:
            List[ImageInfo]: 图片信息列表
        """
        pass

    def parse_image_filename(self, filename: str) -> Optional[Tuple[str, str, str]]:
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
