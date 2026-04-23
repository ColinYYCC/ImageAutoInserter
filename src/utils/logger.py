"""
统一日志管理模块
提供标准化的日志记录功能，替代 print 调试
"""

import logging
import os
import sys
from pathlib import Path
from typing import Optional


class LoggerManager:
    """日志管理器 - 统一管理应用日志"""

    _instance: Optional['LoggerManager'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if LoggerManager._initialized:
            return

        self._loggers: dict[str, logging.Logger] = {}
        self._log_dir: Optional[Path] = None
        LoggerManager._initialized = True

    def setup(
        self,
        log_dir: Optional[str] = None,
        level: int = logging.INFO,
        format_string: Optional[str] = None
    ) -> None:
        """
        设置日志配置

        Args:
            log_dir: 日志文件目录，None 则只输出到控制台
            level: 日志级别
            format_string: 自定义格式字符串
        """
        if format_string is None:
            format_string = '[%(asctime)s] [%(levelname)s] %(name)s: %(message)s'

        formatter = logging.Formatter(format_string, datefmt='%Y-%m-%d %H:%M:%S')

        # 根日志器配置
        root_logger = logging.getLogger()
        root_logger.setLevel(level)

        # 清除现有处理器
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

        # 文件处理器
        if log_dir:
            self._log_dir = Path(log_dir)
            self._log_dir.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(
                self._log_dir / 'app.log',
                encoding='utf-8'
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)

    def get_logger(self, name: str) -> logging.Logger:
        """获取指定名称的日志器"""
        if name not in self._loggers:
            self._loggers[name] = logging.getLogger(name)
        return self._loggers[name]


# 全局日志管理器实例
logger_manager = LoggerManager()


def get_logger(name: str) -> logging.Logger:
    """
    获取日志器

    Args:
        name: 日志器名称，通常使用 __name__

    Returns:
        logging.Logger: 配置好的日志器

    Example:
        >>> logger = get_logger(__name__)
        >>> logger.info("应用启动")
        >>> logger.error("发生错误", exc_info=True)
    """
    return logger_manager.get_logger(name)


def setup_logging(
    log_dir: Optional[str] = None,
    level: int = logging.INFO
) -> None:
    """
    初始化日志系统

    Args:
        log_dir: 日志目录路径，默认从 IMAGE_INSERTER_LOG_DIR 环境变量读取
        level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    if log_dir is None:
        log_dir = os.environ.get('IMAGE_INSERTER_LOG_DIR')
    logger_manager.setup(log_dir=log_dir, level=level)
