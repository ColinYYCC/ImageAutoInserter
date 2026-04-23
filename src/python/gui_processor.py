#!/usr/bin/env python3
"""
GUI 版本的图片自动插入处理器

这个文件与现有的 CLI 工具集成，提供进度更新和错误处理。
"""

import sys
import json
import os
from pathlib import Path
from dataclasses import asdict
from typing import Optional

# Windows 下 stdout/stderr 默认编码为 GBK，无法输出 emoji 等 Unicode 字符
# 必须在所有输出操作之前强制设置为 UTF-8
_stdout_utf8 = True
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        try:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
        except Exception:
            _stdout_utf8 = False
            try:
                sys.stderr.write('[WARN] Failed to set stdout/stderr to UTF-8, using ASCII fallback\n')
            except Exception:
                pass

# 导入现有的处理引擎
# 智能检测运行环境并添加正确的路径
script_path = Path(__file__).resolve()
python_dir = script_path.parent

if getattr(sys, 'frozen', False):
    script_path = Path(sys.executable).resolve()
    python_dir = script_path.parent


def send_debug(msg):
    try:
        print(json.dumps({'type': 'debug', 'payload': msg}, ensure_ascii=False), flush=True)
    except UnicodeEncodeError:
        print(json.dumps({'type': 'debug', 'payload': msg}, ensure_ascii=True), flush=True)


send_debug({
    'stage': 'path_detection',
    'script_path': str(script_path),
    'python_dir': str(python_dir),
    'cwd': os.getcwd(),
    'sys.path': sys.path
})

# 检测是否在打包后的环境（dist/python/）运行
# 在打包环境中，core 和 utils 目录与 gui_processor.py 在同一目录
import_success = False

if (python_dir / 'core').exists() and (python_dir / 'utils').exists():
    # 打包后的环境：直接使用同级目录的模块
    sys.path.insert(0, str(python_dir))
    send_debug({'stage': 'import_attempt', 'mode': 'packaged', 'path': str(python_dir)})
    try:
        from core.process_engine import ProcessEngine
        from core.models import ProgressInfo
        from core.progress_emitter import create_stdout_emitter
        import_success = True
        send_debug({'stage': 'import_success', 'mode': 'packaged'})
    except ImportError as e:
        send_debug({'stage': 'import_failed', 'mode': 'packaged', 'error': str(e)})

if not import_success:
    # 开发环境：从项目根目录导入
    project_root = script_path.parent.parent.parent
    sys.path.insert(0, str(project_root))
    sys.path.insert(0, str(project_root / 'src'))
    send_debug({'stage': 'import_attempt', 'mode': 'development', 'path': str(project_root)})
    try:
        from core.process_engine import ProcessEngine  # noqa: F811
        from core.models import ProgressInfo  # noqa: F811
        from core.progress_emitter import create_stdout_emitter  # noqa: F811
        import_success = True
        send_debug({'stage': 'import_success', 'mode': 'development'})
    except ImportError as e:
        send_debug({'stage': 'import_failed', 'mode': 'development', 'error': str(e)})
        # 最后尝试：尝试所有可能的路径
        possible_paths = [
            Path.cwd(),
            Path.cwd() / 'src',
            Path.cwd().parent,
            Path.cwd().parent / 'src',
        ]
        for path in possible_paths:
            if path.exists() and (path / 'core').exists():
                sys.path.insert(0, str(path))
                send_debug({'stage': 'import_attempt', 'mode': 'fallback', 'path': str(path)})
                try:
                    from core.process_engine import ProcessEngine  # noqa: F811
                    from core.models import ProgressInfo  # noqa: F401,F811
                    from core.progress_emitter import create_stdout_emitter  # noqa: F811
                    import_success = True
                    send_debug({'stage': 'import_success', 'mode': 'fallback'})
                    break
                except ImportError:
                    continue

        if not import_success:
            raise ImportError(f"无法导入核心模块，请检查安装。sys.path: {sys.path}")


def send_message(message_type: str, payload: dict):
    """发送消息到 Electron 主进程"""
    message = {
        'type': message_type,
        'payload': payload
    }
    try:
        print(json.dumps(message, ensure_ascii=False), flush=True)
    except UnicodeEncodeError:
        print(json.dumps(message, ensure_ascii=True), flush=True)


def send_error(error_type: str, message: str, resolution: str, details: Optional[dict] = None) -> None:
    """发送错误消息到主进程"""
    error_payload = {
        'type': error_type,
        'message': message,
        'resolution': resolution
    }
    if details:
        error_payload['details'] = details

    send_message('error', error_payload)


def _validate_file_paths(excel_path: str, image_source: str) -> None:
    """
    验证文件路径是否存在

    Raises:
        FileNotFoundError: 文件路径不存在时抛出
    """
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel 文件不存在: {excel_path}")
    if not os.path.exists(image_source):
        raise FileNotFoundError(f"图片来源不存在: {image_source}")


def _send_debug_message(stage: str, extra_data: dict = None) -> None:
    """发送调试消息"""
    data = {'stage': stage}
    if extra_data:
        data.update(extra_data)
    send_message('debug', data)


def _build_completion_payload(result) -> dict:
    """构建完成消息载荷"""
    return {
        'total': result.total_rows,
        'success': result.success_rows,
        'failed': result.failed_rows,
        'successRate': round(
            result.success_rows / result.total_rows * 100, 2
        ) if result.total_rows > 0 else 0,
        'outputPath': (
            str(result.output_path) if result.output_path
            else result.output_path.replace('.xlsx', '_processed.xlsx') if result.output_path else None
        ),
        'errors': [asdict(e) for e in result.errors] if result.errors else []
    }


def _determine_error_type_and_resolution(error: Exception) -> tuple:
    """
    根据异常类型确定错误码和解决方案

    Returns:
        tuple: (error_type, message, resolution)
    """
    error_msg = str(error)

    if "Permission denied" in error_msg:
        return ('PERMISSION_DENIED', f'权限不足：{error_msg}', '请确保对文件和目录有读写权限')
    elif "No such file" in error_msg or "does not exist" in error_msg.lower():
        return ('FILE_NOT_FOUND', f'文件未找到：{error_msg}', '请检查文件路径是否正确')
    elif "read-only" in error_msg.lower() or "write" in error_msg.lower():
        return ('WRITE_ERROR', f'写入错误：{error_msg}', '请确保输出目录有写入权限')
    elif "memory" in error_msg.lower() or "out of memory" in error_msg.lower():
        return ('MEMORY_ERROR', f'内存不足：{error_msg}', '请关闭其他应用程序释放内存，或处理较小的文件')

    return ('PROCESS_ERROR', f'处理过程中发生错误：{error_msg}', '请检查输入文件和日志，如有需要请重试')


def _handle_processing_exception(exception: Exception, emitter) -> None:
    """
    处理处理过程中的异常

    Args:
        exception: 捕获的异常
        emitter: 进度发射器
    """
    import traceback
    emitter.stop()

    error_details = {
        'exception_type': type(exception).__name__,
        'traceback': traceback.format_exc(),
        'args': str(exception.args)
    }

    error_type, message, resolution = _determine_error_type_and_resolution(exception)
    send_error(error_type, message, resolution, error_details)


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

    def on_progress(info) -> None:
        if isinstance(info, ProgressInfo):
            emitter.emit(
                percent=info.percentage,
                current_action=info.current_action,
                total_rows=info.total_rows,
                current_row=info.current_row
            )
        else:
            emitter.emit(percent=info, current_action='', total_rows=0, current_row=0)

    def _emit_progress(percent: float, action: str, total_rows: int = 0, current_row: int = 0) -> None:
        emitter.emit(
            percent=percent,
            current_action=action,
            total_rows=total_rows,
            current_row=current_row
        )

    try:
        # ============ 阶段 1: 启动进程 (0-2%) ============
        _emit_progress(0.1, "初始化 Python 运行时...")
        _send_debug_message('start', {'cwd': os.getcwd()})

        _emit_progress(0.5, "导入核心模块...")
        _send_debug_message('importing_modules')

        # 验证文件路径
        _emit_progress(1.0, "验证文件路径...")
        _validate_file_paths(excel_path, image_source)

        # ============ 阶段 2: 加载图片 (2-15%) ============
        _emit_progress(2.0, "创建处理引擎...")
        _send_debug_message('creating_engine')
        engine = ProcessEngine()

        _emit_progress(3.0, f"扫描图片来源: {image_source}")
        _send_debug_message('loading_images', {'source': image_source})

        # 定义日志回调
        def on_log(message: str):
            send_message('debug', {'stage': 'log', 'message': message})

        # ============ 阶段 3: 解析Excel (15-25%) ============
        _emit_progress(15.0, "打开 Excel 文件...")
        _send_debug_message('parsing_excel')

        # ============ 阶段 4: 处理数据 (25-70%) ============
        _send_debug_message('processing')

        # 执行处理
        _send_debug_message('calling_engine_process')
        result = engine.process(
            excel_path=excel_path,
            image_source=image_source,
            progress_callback=on_progress,
            log_callback=on_log
        )
        _send_debug_message('engine_process_returned', {
            'output_path': str(result.output_path) if result.output_path else None
        })

        # ============ 阶段 5-6: 嵌入图片 (70-90%) ============
        # 由 engine.process 内部通过 progress_callback 更新

        # ============ 阶段 7: 保存文件 (90-98%) ============
        _emit_progress(95.0, "保存文件...")
        _send_debug_message('saving_file')

        # 确保所有进度消息都已发送
        emitter.stop()

        # 发送完成消息
        completion_payload = _build_completion_payload(result)
        send_message('complete', completion_payload)

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
        _handle_processing_exception(e, emitter)
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

    # ============ 诊断日志：环境信息 ============
    import platform
    send_message('debug', {
        'stage': 'env_info',
        'platform': platform.platform(),
        'python_executable': sys.executable,
        'python_path': sys.path,
        'cwd': os.getcwd(),
        'excel_path_exists': os.path.exists(excel_path),
        'image_source_exists': os.path.exists(image_source),
        'excel_path_abs': os.path.abspath(excel_path),
        'image_source_abs': os.path.abspath(image_source)
    })
    # ==========================================

    # 开始处理
    process_excel_gui(excel_path, image_source)
