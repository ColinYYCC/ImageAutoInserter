"""
配置管理模块

负责管理应用配置
支持配置的读取、保存和验证

功能：
1. 配置读取/保存（QSettings）
2. 默认配置
3. 配置验证
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field, asdict

from PyQt6.QtCore import QSettings, QStandardPaths


@dataclass
class AppConfig:
    """
    应用配置数据类
    
    Attributes:
        language (str): 界面语言（zh_CN/en_US）
        auto_check_update (bool): 自动检查更新
        max_retry_attempts (int): 最大重试次数
        progress_update_interval (int): 进度更新间隔（行数）
        image_width (int): 图片宽度（像素）
        image_height (int): 图片高度（像素）
        last_excel_path (str): 上次使用的 Excel 路径
        last_image_path (str): 上次使用的图片路径
        last_output_path (str): 上次的输出路径
    """
    language: str = 'zh_CN'
    auto_check_update: bool = True
    max_retry_attempts: int = 3
    progress_update_interval: int = 5
    image_width: int = 180
    image_height: int = 138
    last_excel_path: str = ''
    last_image_path: str = ''
    last_output_path: str = ''


class ConfigManager:
    """
    配置管理器类
    
    功能：
    1. 读取配置
    2. 保存配置
    3. 恢复默认配置
    4. 配置验证
    
    Example:
        >>> config = ConfigManager()
        >>> language = config.get('language')
        >>> config.set('last_excel_path', '/path/to/file.xlsx')
        >>> config.save()
    """
    
    # 配置键名
    KEYS = {
        'language': 'language',
        'auto_check_update': 'autoCheckUpdate',
        'max_retry_attempts': 'maxRetryAttempts',
        'progress_update_interval': 'progressUpdateInterval',
        'image_width': 'imageWidth',
        'image_height': 'imageHeight',
        'last_excel_path': 'lastExcelPath',
        'last_image_path': 'lastImagePath',
        'last_output_path': 'lastOutputPath',
    }
    
    # 默认配置
    DEFAULTS = AppConfig()
    
    def __init__(self, organization: str = "ImageAutoInserter", application: str = "ImageAutoInserter"):
        """
        初始化配置管理器
        
        Args:
            organization (str): 组织名称
            application (str): 应用名称
        """
        self._config = AppConfig()
        
        # 创建 QSettings 对象
        self.settings = QSettings(
            QSettings.Format.IniFormat,
            QSettings.Scope.UserScope,
            organization,
            application
        )
        
        # 加载配置
        self.load()
    
    def load(self):
        """
        从配置文件加载配置
        
        如果配置文件不存在，使用默认配置
        """
        # 读取配置
        self._config.language = self.settings.value(
            self.KEYS['language'],
            self.DEFAULTS.language,
            type=str
        )
        
        self._config.auto_check_update = self.settings.value(
            self.KEYS['auto_check_update'],
            self.DEFAULTS.auto_check_update,
            type=bool
        )
        
        self._config.max_retry_attempts = self.settings.value(
            self.KEYS['max_retry_attempts'],
            self.DEFAULTS.max_retry_attempts,
            type=int
        )
        
        self._config.progress_update_interval = self.settings.value(
            self.KEYS['progress_update_interval'],
            self.DEFAULTS.progress_update_interval,
            type=int
        )
        
        self._config.image_width = self.settings.value(
            self.KEYS['image_width'],
            self.DEFAULTS.image_width,
            type=int
        )
        
        self._config.image_height = self.settings.value(
            self.KEYS['image_height'],
            self.DEFAULTS.image_height,
            type=int
        )
        
        self._config.last_excel_path = self.settings.value(
            self.KEYS['last_excel_path'],
            self.DEFAULTS.last_excel_path,
            type=str
        )
        
        self._config.last_image_path = self.settings.value(
            self.KEYS['last_image_path'],
            self.DEFAULTS.last_image_path,
            type=str
        )
        
        self._config.last_output_path = self.settings.value(
            self.KEYS['last_output_path'],
            self.DEFAULTS.last_output_path,
            type=str
        )
    
    def save(self):
        """
        保存配置到文件
        """
        self.settings.setValue(self.KEYS['language'], self._config.language)
        self.settings.setValue(self.KEYS['auto_check_update'], self._config.auto_check_update)
        self.settings.setValue(self.KEYS['max_retry_attempts'], self._config.max_retry_attempts)
        self.settings.setValue(self.KEYS['progress_update_interval'], self._config.progress_update_interval)
        self.settings.setValue(self.KEYS['image_width'], self._config.image_width)
        self.settings.setValue(self.KEYS['image_height'], self._config.image_height)
        self.settings.setValue(self.KEYS['last_excel_path'], self._config.last_excel_path)
        self.settings.setValue(self.KEYS['last_image_path'], self._config.last_image_path)
        self.settings.setValue(self.KEYS['last_output_path'], self._config.last_output_path)
        
        self.settings.sync()
    
    def reset(self):
        """
        重置为默认配置
        """
        self._config = AppConfig()
        self.save()
    
    def get(self, key: str) -> Any:
        """
        获取配置值
        
        Args:
            key (str): 配置键名
        
        Returns:
            Any: 配置值
        
        Raises:
            KeyError: 键名不存在
        """
        if key not in self.KEYS:
            raise KeyError(f"无效的配置键：{key}")
        
        return getattr(self._config, key)
    
    def set(self, key: str, value: Any):
        """
        设置配置值
        
        Args:
            key (str): 配置键名
            value (Any): 配置值
        
        Raises:
            KeyError: 键名不存在
        """
        if key not in self.KEYS:
            raise KeyError(f"无效的配置键：{key}")
        
        setattr(self._config, key, value)
    
    def get_all(self) -> Dict[str, Any]:
        """
        获取所有配置
        
        Returns:
            Dict[str, Any]: 配置字典
        """
        return asdict(self._config)
    
    def set_all(self, config_dict: Dict[str, Any]):
        """
        批量设置配置
        
        Args:
            config_dict (Dict[str, Any]): 配置字典
        """
        for key, value in config_dict.items():
            if key in self.KEYS:
                setattr(self._config, key, value)
    
    @property
    def config(self) -> AppConfig:
        """
        获取配置对象
        
        Returns:
            AppConfig: 配置对象
        """
        return self._config
