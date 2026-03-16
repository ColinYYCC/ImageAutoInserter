"""
图片处理器模块

负责从不同来源（文件夹、ZIP、RAR）加载和处理图片
支持商品编码自动识别和图片尺寸调整

功能：
1. 从文件夹读取图片
2. 从 ZIP 压缩包提取图片（内存处理）
3. 从 RAR 压缩包提取图片（内存处理）
4. 图片命名解析（商品编码 - 序号。格式）
5. 图片尺寸调整（固定 180×138 像素）
6. 图片数据管理
"""

import os
import zipfile
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass, field

from PIL import Image
import rarfile


@dataclass
class ImageInfo:
    """
    图片信息数据类
    
    Attributes:
        product_code (str): 商品编码
        sequence (str): 序号（01/02/03）
        picture_column (int): 对应的 Picture 列号（1/2/3）
        image_format (str): 图片格式（JPG/PNG/JPEG）
        source_path (str): 图片来源路径（文件路径或压缩包内路径）
        image_data (Optional[bytes]): 图片二进制数据（可选，用于内存处理）
        image (Optional[Image.Image]): PIL Image 对象（可选）
    
    Example:
        >>> info = ImageInfo(
        ...     product_code="C000641234100",
        ...     sequence="01",
        ...     picture_column=1,
        ...     image_format="jpg",
        ...     source_path="/path/to/image.jpg"
        ... )
    """
    product_code: str
    sequence: str
    picture_column: int
    image_format: str
    source_path: str
    image_data: Optional[bytes] = field(default=None)
    image: Optional[Image.Image] = field(default=None, repr=False)
    
    def __post_init__(self):
        """
        数据验证和标准化
        
        Validates:
        - 序号范围：01-10 (支持最多 10 个 Picture 列)
        - Picture 列号：1-10
        - 图片格式：jpg/jpeg/png
        """
        # 验证序号 (支持 01-10)
        if self.sequence not in [f'{i:02d}' for i in range(1, 11)]:
            raise ValueError(f"无效的序号：{self.sequence}，必须是 01-10")
        
        # 验证图片列 (1-10)
        if self.picture_column not in range(1, 11):
            raise ValueError(f"无效的 Picture 列号：{self.picture_column}，必须是 1-10")
        
        # 标准化图片格式
        self.image_format = self.image_format.lower()
        if self.image_format not in ['jpg', 'jpeg', 'png']:
            raise ValueError(f"不支持的图片格式：{self.image_format}")


class ImageProcessor:
    """
    图片处理器类
    
    功能：
    1. 从文件夹加载图片
    2. 从 ZIP 压缩包加载图片
    3. 从 RAR 压缩包加载图片
    4. 解析图片命名（商品编码 - 序号。格式）
    5. 调整图片尺寸（180×138 像素）
    6. 保持原画质
    
    Example:
        >>> processor = ImageProcessor()
        >>> images = processor.load_images_from_folder('/path/to/images')
        >>> for img_info in images:
        ...     print(f"{img_info.product_code}-{img_info.sequence}")
    """
    
    # 支持的图片格式
    SUPPORTED_FORMATS = {'jpg', 'jpeg', 'png'}
    
    # 图片尺寸配置
    TARGET_WIDTH = 180
    TARGET_HEIGHT = 138
    
    def __init__(self, memory_optimized: bool = False):
        """
        初始化图片处理器
        
        Args:
            memory_optimized (bool): 是否启用内存优化模式（流式加载）
        """
        self.memory_optimized = memory_optimized
    
    def parse_image_filename(self, filename: str) -> Optional[tuple[str, str, str]]:
        """
        解析图片文件名
        
        期望格式：{商品编码}-{序号}.{格式}
        示例：C000641234100-01.jpg
        
        Args:
            filename (str): 文件名
        
        Returns:
            Optional[tuple[str, str, str]]: (商品编码，序号，格式) 元组，解析失败返回 None
        
        Example:
            >>> processor.parse_image_filename('C000641234100-01.jpg')
            ('C000641234100', '01', 'jpg')
        """
        # 移除路径，只保留文件名
        name = Path(filename).stem
        suffix = Path(filename).suffix.lower()
        
        # 检查格式
        if suffix[1:] not in self.SUPPORTED_FORMATS:
            return None
        
        # 分割文件名
        parts = name.rsplit('-', 1)
        if len(parts) != 2:
            return None
        
        product_code, sequence = parts
        
        # 验证序号 (支持 01-10)
        if len(sequence) != 2 or not sequence.isdigit():
            return None
        
        seq_num = int(sequence)
        if seq_num < 1 or seq_num > 10:
            return None
        
        # 验证商品编码（非空）
        if not product_code.strip():
            return None
        
        return (product_code.strip(), sequence, suffix[1:])
    
    def _resize_image(self, image: Image.Image) -> Image.Image:
        """
        调整图片尺寸到固定大小（180×138 像素）
        
        Args:
            image (Image.Image): PIL Image 对象
        
        Returns:
            Image.Image: 调整尺寸后的 Image 对象
        
        Note:
            - 使用 LANCZOS 重采样算法保持画质
            - 保持原画质，不进行有损压缩
        """
        # 调整尺寸
        resized = image.resize(
            (self.TARGET_WIDTH, self.TARGET_HEIGHT),
            Image.Resampling.LANCZOS
        )
        
        return resized
    
    def _create_image_info(
        self,
        product_code: str,
        sequence: str,
        image_format: str,
        source_path: str,
        image_data: Optional[bytes] = None
    ) -> ImageInfo:
        """
        创建 ImageInfo 对象
        
        Args:
            product_code (str): 商品编码
            sequence (str): 序号
            image_format (str): 图片格式
            source_path (str): 图片来源路径
            image_data (Optional[bytes]): 图片二进制数据
        
        Returns:
            ImageInfo: ImageInfo 对象
        """
        # 计算 Picture 列号
        picture_column = int(sequence)
        
        # 创建 ImageInfo
        info = ImageInfo(
            product_code=product_code,
            sequence=sequence,
            picture_column=picture_column,
            image_format=image_format,
            source_path=source_path,
            image_data=image_data
        )
        
        # 如果有二进制数据，加载为 PIL Image
        if image_data:
            image = Image.open(BytesIO(image_data))
            info.image = self._resize_image(image)
        
        return info
    
    def load_images_from_folder(self, folder_path: str) -> List[ImageInfo]:
        """
        从文件夹加载图片
        
        Args:
            folder_path (str): 文件夹路径
        
        Returns:
            List[ImageInfo]: ImageInfo 对象列表
        
        Raises:
            FileNotFoundError: 文件夹不存在
            ValueError: 文件夹中没有有效图片
        
        Example:
            >>> processor.load_images_from_folder('/path/to/images')
            [ImageInfo(product_code='C001', sequence='01', ...), ...]
        """
        folder = Path(folder_path)
        
        # 验证文件夹存在
        if not folder.exists():
            raise FileNotFoundError(f"文件夹不存在：{folder_path}")
        
        if not folder.is_dir():
            raise ValueError(f"路径不是文件夹：{folder_path}")
        
        images = []
        
        # 遍历文件夹
        for file_path in folder.iterdir():
            if not file_path.is_file():
                continue
            
            # 检查文件扩展名
            if file_path.suffix.lower()[1:] not in self.SUPPORTED_FORMATS:
                continue
            
            # 解析文件名
            parsed = self.parse_image_filename(file_path.name)
            if not parsed:
                continue
            
            product_code, sequence, image_format = parsed
            
            # 加载图片
            try:
                with open(file_path, 'rb') as f:
                    image_data = f.read()
                
                # 创建 ImageInfo
                info = self._create_image_info(
                    product_code=product_code,
                    sequence=sequence,
                    image_format=image_format,
                    source_path=str(file_path),
                    image_data=image_data
                )
                
                images.append(info)
                
            except Exception as e:
                # 记录错误，继续处理其他图片
                print(f"⚠️  加载图片失败 {file_path.name}: {e}")
                continue
        
        if not images:
            raise ValueError(f"文件夹中没有找到有效图片（支持 JPG/PNG/JPEG）")
        
        return images
    
    def load_images_from_zip(self, zip_path: str) -> List[ImageInfo]:
        """
        从 ZIP 压缩包加载图片（完全内存处理，不解压）
        
        Args:
            zip_path (str): ZIP 文件路径
        
        Returns:
            List[ImageInfo]: ImageInfo 对象列表
        
        Raises:
            FileNotFoundError: ZIP 文件不存在
            zipfile.BadZipFile: ZIP 文件损坏
        
        Example:
            >>> processor.load_images_from_zip('/path/to/images.zip')
            [ImageInfo(product_code='C001', sequence='01', ...), ...]
        """
        zip_file = Path(zip_path)
        
        # 验证文件存在
        if not zip_file.exists():
            raise FileNotFoundError(f"ZIP 文件不存在：{zip_path}")
        
        images = []
        
        try:
            with zipfile.ZipFile(zip_file, 'r') as zf:
                # 遍历压缩包内所有文件
                for file_info in zf.infolist():
                    # 跳过目录
                    if file_info.is_dir():
                        continue
                    
                    filename = Path(file_info.filename).name
                    
                    # 检查文件扩展名
                    suffix = Path(filename).suffix.lower()
                    if suffix[1:] not in self.SUPPORTED_FORMATS:
                        continue
                    
                    # 解析文件名
                    parsed = self.parse_image_filename(filename)
                    if not parsed:
                        continue
                    
                    product_code, sequence, image_format = parsed
                    
                    # 读取图片数据（完全内存处理）
                    try:
                        image_data = zf.read(file_info.filename)
                        
                        # 创建 ImageInfo
                        info = self._create_image_info(
                            product_code=product_code,
                            sequence=sequence,
                            image_format=image_format,
                            source_path=f"{zip_path}:{file_info.filename}",
                            image_data=image_data
                        )
                        
                        images.append(info)
                        
                    except Exception as e:
                        print(f"⚠️  读取图片失败 {filename}: {e}")
                        continue
        
        except zipfile.BadZipFile as e:
            raise zipfile.BadZipFile(f"ZIP 文件损坏：{zip_path}") from e
        
        if not images:
            raise ValueError(f"ZIP 包中没有找到有效图片（支持 JPG/PNG/JPEG）")
        
        return images
    
    def load_images_from_rar(self, rar_path: str) -> List[ImageInfo]:
        """
        从 RAR 压缩包加载图片（完全内存处理，不解压）
        
        Args:
            rar_path (str): RAR 文件路径
        
        Returns:
            List[ImageInfo]: ImageInfo 对象列表
        
        Raises:
            FileNotFoundError: RAR 文件不存在
            rarfile.BadRarFile: RAR 文件损坏
        
        Example:
            >>> processor.load_images_from_rar('/path/to/images.rar')
            [ImageInfo(product_code='C001', sequence='01', ...), ...]
        """
        rar_file = Path(rar_path)
        
        # 验证文件存在
        if not rar_file.exists():
            raise FileNotFoundError(f"RAR 文件不存在：{rar_path}")
        
        images = []
        
        try:
            with rarfile.RarFile(rar_file, 'r') as rf:
                # 遍历压缩包内所有文件
                for file_info in rf.infolist():
                    # 跳过目录
                    if file_info.is_dir():
                        continue
                    
                    filename = Path(file_info.filename).name
                    
                    # 检查文件扩展名
                    suffix = Path(filename).suffix.lower()
                    if suffix[1:] not in self.SUPPORTED_FORMATS:
                        continue
                    
                    # 解析文件名
                    parsed = self.parse_image_filename(filename)
                    if not parsed:
                        continue
                    
                    product_code, sequence, image_format = parsed
                    
                    # 读取图片数据（完全内存处理）
                    try:
                        image_data = rf.read(file_info.filename)
                        
                        # 创建 ImageInfo
                        info = self._create_image_info(
                            product_code=product_code,
                            sequence=sequence,
                            image_format=image_format,
                            source_path=f"{rar_path}:{file_info.filename}",
                            image_data=image_data
                        )
                        
                        images.append(info)
                        
                    except Exception as e:
                        print(f"⚠️  读取图片失败 {filename}: {e}")
                        continue
        
        except rarfile.BadRarFile as e:
            raise rarfile.BadRarFile(f"RAR 文件损坏：{rar_path}") from e
        
        if not images:
            raise ValueError(f"RAR 包中没有找到有效图片（支持 JPG/PNG/JPEG）")
        
        return images
    
    def load_images(self, source_path: str) -> List[ImageInfo]:
        """
        智能加载图片（自动识别来源类型）
        
        Args:
            source_path (str): 图片源路径（文件夹/ZIP/RAR）
        
        Returns:
            List[ImageInfo]: ImageInfo 对象列表
        
        Raises:
            FileNotFoundError: 路径不存在
            ValueError: 不支持的来源类型
        
        Example:
            >>> processor.load_images('/path/to/images')  # 文件夹
            >>> processor.load_images('/path/to/images.zip')  # ZIP
            >>> processor.load_images('/path/to/images.rar')  # RAR
        """
        source = Path(source_path)
        
        # 验证路径存在
        if not source.exists():
            raise FileNotFoundError(f"路径不存在：{source_path}")
        
        # 判断来源类型并加载
        if source.is_dir():
            return self.load_images_from_folder(source_path)
        elif source.suffix.lower() == '.zip':
            return self.load_images_from_zip(source_path)
        elif source.suffix.lower() == '.rar':
            return self.load_images_from_rar(source_path)
        else:
            raise ValueError(f"不支持的图片源类型：{source_path}，支持文件夹/ZIP/RAR")
    
    def get_image_for_product(
        self,
        images: List[ImageInfo],
        product_code: str,
        picture_column: int
    ) -> Optional[ImageInfo]:
        """
        获取指定商品编码和 Picture 列的图片
        
        Args:
            images (List[ImageInfo]): ImageInfo 对象列表
            product_code (str): 商品编码
            picture_column (int): Picture 列号（1/2/3）
        
        Returns:
            Optional[ImageInfo]: 匹配的 ImageInfo，未找到返回 None
        
        Example:
            >>> img = processor.get_image_for_product(images, 'C000641234100', 1)
            >>> if img:
            ...     print(f"找到图片：{img.source_path}")
        """
        for img in images:
            if img.product_code == product_code and img.picture_column == picture_column:
                return img
        return None
    
    def validate_image_source(self, source_path: str) -> dict:
        """
        验证图片来源中是否包含支持的图片格式

        Args:
            source_path (str): 图片来源路径（文件夹/ZIP/RAR）

        Returns:
            dict: 验证结果
                - valid (bool): 是否包含支持的图片
                - total_files (int): 扫描的文件总数
                - supported_count (int): 支持的图片数量
                - unsupported_files (list): 不支持的文件列表
                - error (str): 错误信息（如果没有支持的图片）

        Example:
            >>> result = processor.validate_image_source('/path/to/images')
            >>> print(result)
            {'valid': True, 'total_files': 10, 'supported_count': 5, 'unsupported_files': ['a.bmp', 'b.gif']}
        """
        source = Path(source_path)
        
        if not source.exists():
            return {
                'valid': False,
                'total_files': 0,
                'supported_count': 0,
                'unsupported_files': [],
                'error': f'路径不存在：{source_path}'
            }
        
        supported_files = []
        unsupported_files = []
        
        try:
            if source.is_dir():
                # 文件夹模式
                for file_path in source.iterdir():
                    if not file_path.is_file():
                        continue
                    
                    ext = file_path.suffix.lower()[1:]
                    if ext in self.SUPPORTED_FORMATS:
                        supported_files.append(file_path.name)
                    elif ext in ['bmp', 'gif', 'webp', 'tiff', 'tif', 'svg', 'ico', 'png', 'jpg', 'jpeg']:
                        # 记录常见图片格式但不支持
                        unsupported_files.append(file_path.name)
                    # 其他非图片文件忽略
                    
            elif source.suffix.lower() == '.zip':
                # ZIP 压缩包模式
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
                            
            elif source.suffix.lower() == '.rar':
                # RAR 压缩包模式
                with rarfile.RarFile(source, 'r') as rf:
                    for file_info in rf.infolist():
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
        
        # 判断是否有支持的图片
        if len(supported_files) == 0:
            error_msg = '未找到支持的图片格式（JPG/JPEG/PNG）'

            return {
                'valid': False,
                'total_files': len(supported_files) + len(unsupported_files),
                'supported_count': 0,
                'unsupported_files': unsupported_files,
                'error': error_msg
            }
        
        return {
            'valid': True,
            'total_files': len(supported_files) + len(unsupported_files),
            'supported_count': len(supported_files),
            'unsupported_files': unsupported_files
        }


# 需要导入 BytesIO，放在文件末尾避免循环导入
from io import BytesIO
