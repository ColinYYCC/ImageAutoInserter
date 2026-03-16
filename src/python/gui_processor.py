#!/usr/bin/env python3
"""
GUI 版本的图片自动插入处理器

这个文件与现有的 CLI 工具集成，提供进度更新和错误处理。
"""

import sys
import json
import os
import time
from pathlib import Path
from dataclasses import asdict

# 导入现有的处理引擎
# 智能检测运行环境并添加正确的路径
script_path = Path(__file__).resolve()
python_dir = script_path.parent

# 检测是否在打包后的环境（dist/python/）运行
# 在打包环境中，core 和 utils 目录与 gui_processor.py 在同一目录
if (python_dir / 'core').exists() and (python_dir / 'utils').exists():
    # 打包后的环境：直接使用同级目录的模块
    sys.path.insert(0, str(python_dir))
    try:
        from core.process_engine import ProcessEngine
        from core.excel_processor import ProgressInfo
        from core.progress_emitter import create_stdout_emitter
    except ImportError as e:
        print(f"[DEBUG] 打包环境导入失败: {e}", file=sys.stderr)
        raise
else:
    # 开发环境：从项目根目录导入
    project_root = script_path.parent.parent.parent
    sys.path.insert(0, str(project_root))
    try:
        from src.core.process_engine import ProcessEngine
        from src.core.excel_processor import ProgressInfo
        from src.core.progress_emitter import create_stdout_emitter
    except ImportError as e:
        print(f"[DEBUG] 开发环境导入失败: {e}", file=sys.stderr)
        raise

def send_message(message_type: str, payload: dict):
    """发送消息到 Electron 主进程"""
    message = {
        'type': message_type,
        'payload': payload
    }
    print(json.dumps(message, ensure_ascii=False), flush=True)


def send_error(error_type: str, message: str, resolution: str, details: dict = None):
    """发送错误消息到主进程"""
    error_payload = {
        'type': error_type,
        'message': message,
        'resolution': resolution
    }
    if details:
        error_payload['details'] = details
    
    send_message('error', error_payload)


def process_excel_gui(excel_path: str, image_source: str):
    """
    GUI 版本的处理函数，带进度更新
    
    参数:
        excel_path: Excel 文件路径
        image_source: 图片源路径（文件夹/ZIP/RAR）
    """
    # 创建进度发射器（最小间隔 100ms）
    emitter = create_stdout_emitter(min_interval=0.1)
    emitter.start()
    
    try:
        # 创建处理引擎
        engine = ProcessEngine()
        
        # 定义进度回调
        def on_progress(progress: ProgressInfo):
            """进度更新回调"""
            emitter.emit(
                percent=progress.percentage,
                current_action=progress.current_action,
                total_rows=progress.total_rows,
                current_row=progress.current_row
            )
        
        # 执行处理
        result = engine.process(
            excel_path=excel_path,
            image_source=image_source,
            progress_callback=on_progress
        )
        
        # 确保所有进度消息都已发送
        emitter.stop()
        
        # 发送完成消息
        send_message('complete', {
            'total': result.total_rows,
            'success': result.success_rows,
            'failed': result.failed_rows,
            'successRate': round(result.success_rows / result.total_rows * 100, 2) if result.total_rows > 0 else 0,
            'outputPath': str(result.output_path) if result.output_path else excel_path.replace('.xlsx', '_processed.xlsx'),
            'errors': [asdict(e) for e in result.errors] if result.errors else []
        })
        
    except FileNotFoundError as e:
        emitter.stop()
        send_error(
            'FILE_NOT_FOUND',
            f'文件未找到：{str(e)}',
            '请检查文件路径是否正确'
        )
        sys.exit(1)
    except PermissionError as e:
        emitter.stop()
        send_error(
            'PERMISSION_DENIED',
            f'权限不足：{str(e)}',
            '请确保对文件和目录有读写权限'
        )
        sys.exit(1)
    except OSError as e:
        emitter.stop()
        send_error(
            'OS_ERROR',
            f'系统错误：{str(e)}',
            '请检查磁盘空间和文件系统状态'
        )
        sys.exit(1)
    except ImportError as e:
        emitter.stop()
        send_error(
            'IMPORT_ERROR',
            f'模块导入失败：{str(e)}',
            '请确保所有依赖包已正确安装'
        )
        sys.exit(1)
    except Exception as e:
        emitter.stop()
        # 获取异常详细信息
        import traceback
        error_details = {
            'exception_type': type(e).__name__,
            'traceback': traceback.format_exc(),
            'args': str(e.args)
        }
        
        # 根据异常类型提供更具体的错误信息
        error_type = 'PROCESS_ERROR'
        message = f'处理过程中发生错误：{str(e)}'
        resolution = '请检查输入文件和日志，如有需要请重试'
        
        if "Permission denied" in str(e):
            error_type = 'PERMISSION_DENIED'
            message = f'权限不足：{str(e)}'
            resolution = '请确保对文件和目录有读写权限'
        elif "No such file" in str(e) or "does not exist" in str(e).lower():
            error_type = 'FILE_NOT_FOUND'
            message = f'文件未找到：{str(e)}'
            resolution = '请检查文件路径是否正确'
        elif "read-only" in str(e).lower() or "write" in str(e).lower():
            error_type = 'WRITE_ERROR'
            message = f'写入错误：{str(e)}'
            resolution = '请确保输出目录有写入权限'
        elif "memory" in str(e).lower() or "out of memory" in str(e).lower():
            error_type = 'MEMORY_ERROR'
            message = f'内存不足：{str(e)}'
            resolution = '请关闭其他应用程序释放内存，或处理较小的文件'
        
        send_error(error_type, message, resolution, error_details)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        send_message('error', {
            'type': 'INVALID_ARGUMENTS',
            'message': '需要两个参数：Excel 文件路径和图片源路径',
            'resolution': '用法：python gui_processor.py <excel_path> <image_source>'
        })
        sys.exit(1)
    
    excel_path = sys.argv[1]
    image_source = sys.argv[2]
    
    # 验证文件存在
    if not os.path.exists(excel_path):
        send_message('error', {
            'type': 'FILE_NOT_FOUND',
            'message': f'Excel 文件不存在：{excel_path}',
            'resolution': '请检查文件路径是否正确'
        })
        sys.exit(1)
    
    if not os.path.exists(image_source):
        send_message('error', {
            'type': 'FILE_NOT_FOUND',
            'message': f'图片源不存在：{image_source}',
            'resolution': '请检查文件路径是否正确'
        })
        sys.exit(1)
    
    # 开始处理
    process_excel_gui(excel_path, image_source)
