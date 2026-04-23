"""
命令行接口 - 供 Electron 调用

使用方式:
    python cli.py process_excel <excel_path> <image_source> [output_path]

进度输出格式:
    进度：X% - 描述
    ℹ️ 日志消息
    ⚠️ 警告消息
    ❌ 错误消息

结果输出格式 (JSON):
    {"success": true, "output_path": "...", "stats": {...}}
"""

import sys
import os
import json
from pathlib import Path

# Windows 下 stdout/stderr 默认编码为 GBK，无法输出 emoji 等 Unicode 字符
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
            try:
                sys.stderr.write('[WARN] Failed to set stdout/stderr to UTF-8, using ASCII fallback\n')
            except Exception:
                pass

script_path = Path(__file__).resolve()
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

import_success = False

if (python_dir / 'core').exists() and (python_dir / 'utils').exists():
    sys.path.insert(0, str(python_dir))
    send_debug({'stage': 'import_attempt', 'mode': 'packaged', 'path': str(python_dir)})
    try:
        from core.process_engine import ProcessEngine
        from core.models import ProgressInfo
        import_success = True
        send_debug({'stage': 'import_success', 'mode': 'packaged'})
    except ImportError as e:
        send_debug({'stage': 'import_failed', 'mode': 'packaged', 'error': str(e)})

if not import_success:
    project_root = script_path.parent.parent.parent
    sys.path.insert(0, str(project_root))
    sys.path.insert(0, str(project_root / 'src'))
    send_debug({'stage': 'import_attempt', 'mode': 'development', 'path': str(project_root)})
    try:
        from core.process_engine import ProcessEngine  # noqa: F811
        from core.models import ProgressInfo  # noqa: F811
        import_success = True
        send_debug({'stage': 'import_success', 'mode': 'development'})
    except ImportError as e:
        send_debug({'stage': 'import_failed', 'mode': 'development', 'error': str(e)})
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
                    from core.models import ProgressInfo  # noqa: F811
                    import_success = True
                    send_debug({'stage': 'import_success', 'mode': 'fallback'})
                    break
                except ImportError:
                    continue

        if not import_success:
            raise ImportError(f"无法导入核心模块，请检查安装。sys.path: {sys.path}")

from utils.logger import setup_logging  # noqa: E402
setup_logging()


def _safe_print(text: str, **kwargs) -> None:
    """安全输出，遇到编码错误时替换非 ASCII 字符"""
    try:
        print(text, **kwargs)
    except UnicodeEncodeError:
        print(text.encode('ascii', errors='replace').decode('ascii'), **kwargs)


def print_progress(info: ProgressInfo) -> None:
    percent = int(info.percentage)
    _safe_print(f"进度：{percent}% - {info.current_action}", flush=True)


def print_log(message: str):
    _safe_print(message, flush=True)


def process_excel_cli(excel_path: str, image_source: str, output_path: str = None):
    send_debug({
        'stage': 'start',
        'excel_path': excel_path,
        'image_source': image_source,
        'cwd': os.getcwd(),
        'python_version': sys.version
    })

    try:
        engine = ProcessEngine()

        print(f"ℹ️ 开始处理：{excel_path}", flush=True)
        print(f"ℹ️ 图片来源：{image_source}", flush=True)

        result = engine.process(
            excel_path=excel_path,
            image_source=image_source,
            output_path=output_path,
            progress_callback=print_progress,
            log_callback=print_log
        )

        output = {
            "success": result.success,
            "message": "处理完成" if result.success else "处理失败",
            "output_path": str(result.output_path) if result.output_path else None,
            "stats": {
                "total": result.total_rows,
                "success": result.success_rows,
                "failed": result.failed_rows,
                "skipped": result.skipped_rows,
                "successRate": round(result.success_rows / result.total_rows * 100, 2) if result.total_rows > 0 else 0
            },
            "durationSeconds": round(result.duration_seconds, 2)
        }

        print("\n___RESULT_START___", flush=True)
        try:
            print(json.dumps(output, ensure_ascii=False), flush=True)
        except UnicodeEncodeError:
            print(json.dumps(output, ensure_ascii=True), flush=True)
        print("___RESULT_END___", flush=True)

        return output

    except Exception as e:
        print(f"❌ 处理失败：{e}", flush=True)

        error_output = {
            "success": False,
            "message": str(e),
            "error_type": type(e).__name__
        }

        print("\n___RESULT_START___", flush=True)
        try:
            print(json.dumps(error_output, ensure_ascii=False), flush=True)
        except UnicodeEncodeError:
            print(json.dumps(error_output, ensure_ascii=True), flush=True)
        print("___RESULT_END___", flush=True)

        return error_output


def main():
    if len(sys.argv) < 2:
        print("使用方法：python cli.py <command> [arguments]")
        print("命令:")
        print("  process_excel <excel_path> <image_source> [output_path]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "process_excel":
        if len(sys.argv) < 4:
            print("❌ 参数不足")
            print("使用方法：python cli.py process_excel <excel_path> <image_source> [output_path]")
            sys.exit(1)

        excel_path = sys.argv[2]
        image_source = sys.argv[3]
        output_path = sys.argv[4] if len(sys.argv) > 4 else None

        result = process_excel_cli(excel_path, image_source, output_path)

        sys.exit(0 if result["success"] else 1)

    else:
        print(f"❌ 未知命令：{command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
