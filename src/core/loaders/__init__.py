"""
Loaders module - Image loading functionality

注意: RAR 文件由 TypeScript 端 (node-unrar-js) 提取后，
Python 只接收已提取的文件夹路径，因此不需要 RarImageLoader。
"""

from .base_loader import BaseImageLoader
from .folder_loader import FolderImageLoader
from .zip_loader import ZipImageLoader

__all__ = [
    'BaseImageLoader',
    'FolderImageLoader',
    'ZipImageLoader'
]
