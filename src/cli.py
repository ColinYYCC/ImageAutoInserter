"""
命令行接口 - 供 Electron 調用

使用方式:
    python cli.py process_excel <excel_path> <image_source> [output_path]
    
進度輸出格式:
    進度：X% - 描述
    ℹ️ 日志消息
    ⚠️ 警告消息
    ❌ 錯誤消息
    
結果輸出格式 (JSON):
    {"success": true, "output_path": "...", "stats": {...}}
"""

import sys
import os
import json

# 添加項目根目錄到 Python 路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

from src.core.process_engine import ProcessEngine
from src.core.excel_processor import ProgressInfo


def print_progress(info: ProgressInfo):
    """
    打印進度信息
    
    Args:
        info (ProgressInfo): 進度信息對象
    """
    # 計算百分比
    percent = int(info.percentage)
    print(f"進度：{percent}% - {info.current_action}", flush=True)


def print_log(message: str):
    """
    打印日志消息
    
    Args:
        message (str): 日志消息
    """
    # 直接輸出，讓 Electron 捕獲
    print(message, flush=True)


def process_excel_cli(excel_path: str, image_source: str, output_path: str = None):
    """
    命令行處理 Excel
    
    Args:
        excel_path (str): Excel 文件路徑
        image_source (str): 圖片源路徑
        output_path (str, optional): 輸出文件路徑
    
    Returns:
        dict: 處理結果
    """
    try:
        engine = ProcessEngine()
        
        print(f"ℹ️ 開始處理：{excel_path}", flush=True)
        print(f"ℹ️ 圖片來源：{image_source}", flush=True)
        
        result = engine.process(
            excel_path=excel_path,
            image_source=image_source,
            output_path=output_path,
            progress_callback=print_progress,
            log_callback=print_log
        )
        
        # 輸出結果 (JSON 格式)
        output = {
            "success": result.success,
            "message": "处理完成" if result.success else "处理失败",
            "output_path": str(result.output_path) if result.output_path else None,
            "stats": {
                "total": result.total_rows,
                "success": result.success_rows,
                "failed": result.failed_rows,
                "skipped": result.skipped_rows,
                "success_rate": round(result.success_rows / result.total_rows * 100, 2) if result.total_rows > 0 else 0
            },
            "duration_seconds": round(result.duration_seconds, 2)
        }
        
        # 使用特殊標記包裹 JSON 結果，方便 Electron 解析
        print(f"\n___RESULT_START___", flush=True)
        print(json.dumps(output, ensure_ascii=False), flush=True)
        print(f"___RESULT_END___", flush=True)
        
        return output
        
    except Exception as e:
        # 輸出錯誤
        print(f"❌ 處理失敗：{e}", flush=True)
        
        error_output = {
            "success": False,
            "message": str(e),
            "error_type": type(e).__name__
        }
        
        print(f"\n___RESULT_START___", flush=True)
        print(json.dumps(error_output, ensure_ascii=False), flush=True)
        print(f"___RESULT_END___", flush=True)
        
        return error_output


def main():
    """
    主函數
    """
    if len(sys.argv) < 2:
        print("使用方法：python cli.py <command> [arguments]")
        print("命令:")
        print("  process_excel <excel_path> <image_source> [output_path]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "process_excel":
        if len(sys.argv) < 4:
            print("❌ 參數不足")
            print("使用方法：python cli.py process_excel <excel_path> <image_source> [output_path]")
            sys.exit(1)
        
        excel_path = sys.argv[2]
        image_source = sys.argv[3]
        output_path = sys.argv[4] if len(sys.argv) > 4 else None
        
        result = process_excel_cli(excel_path, image_source, output_path)
        
        # 根據結果設置退出碼
        sys.exit(0 if result["success"] else 1)
    
    else:
        print(f"❌ 未知命令：{command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
