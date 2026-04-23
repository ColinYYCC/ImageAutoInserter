"""
业务逻辑整合模块

ProcessEngine 是 ProcessOrchestrator 的别名（向后兼容）
"""

from .pipeline import ProcessOrchestrator

ProcessEngine = ProcessOrchestrator

__all__ = ['ProcessOrchestrator', 'ProcessEngine']
