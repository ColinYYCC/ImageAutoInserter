"""
业务逻辑整合模块

负责整合图片处理器和 Excel 处理器
实现完整的业务流程

功能：
1. 商品编码与图片匹配（ImageMatcher 类）
2. 完整处理流程（输入→处理→输出）
3. 错误处理机制（重试、跳过、错误报告）
4. 进度显示机制

重构说明：
- ErrorRecord, ProcessResult 已移至 models.py
- ImageMatcher 已移至 matchers/image_matcher.py
- ProgressReporter, ErrorReporter 已移至 reporters/
- ProcessOrchestrator 已移至 pipeline/orchestrator.py
- ProcessEngine 现在是 ProcessOrchestrator 的别名（向后兼容）
"""

from .models import ErrorRecord, ProcessResult, ProgressInfo
from .matchers import ImageMatcher
from .pipeline import ProcessOrchestrator

ProcessEngine = ProcessOrchestrator

__all__ = ['ErrorRecord', 'ProcessResult', 'ProgressInfo', 'ImageMatcher', 'ProcessOrchestrator', 'ProcessEngine']
