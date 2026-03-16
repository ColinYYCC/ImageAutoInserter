#!/usr/bin/env python3
"""
图片自动插入处理器 - GUI 版本

这个文件将在后续任务中实现完整功能。
当前是占位文件，用于测试 IPC 通信。
"""

import sys
import json
import time

def process_excel(excel_path: str, image_source: str):
    """处理 Excel 文件并插入图片"""
    
    # 阶段1：解析中（0% - 5%）
    parse_steps = 5
    for i in range(parse_steps):
        time.sleep(0.1)  # 模拟解析时间
        progress = {
            'type': 'progress',
            'payload': {
                'percent': (i + 1) / parse_steps * 5,  # 0% -> 5%
                'current': '解析中'
            }
        }
        print(json.dumps(progress), flush=True)
    
    # 阶段2：处理中（5% - 100%）
    total_rows = 100
    for i in range(total_rows):
        # 模拟处理
        time.sleep(0.05)
        
        # 发送进度更新
        progress = {
            'type': 'progress',
            'payload': {
                'percent': 5 + (i + 1) / total_rows * 95,  # 5% -> 100%
                'current': f'处理中'
            }
        }
        print(json.dumps(progress), flush=True)
    
    # 发送完成消息
    complete = {
        'type': 'complete',
        'payload': {
            'total': total_rows,
            'success': total_rows,
            'failed': 0,
            'successRate': 100.0,
            'outputPath': excel_path.replace('.xlsx', '_processed.xlsx'),
            'errors': []
        }
    }
    print(json.dumps(complete), flush=True)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        error = {
            'type': 'error',
            'payload': {
                'type': 'INVALID_ARGUMENTS',
                'message': '需要两个参数：Excel 文件路径和图片源路径',
                'resolution': '请确保正确传递参数'
            }
        }
        print(json.dumps(error), flush=True)
        sys.exit(1)
    
    excel_path = sys.argv[1]
    image_source = sys.argv[2]
    
    try:
        process_excel(excel_path, image_source)
    except Exception as e:
        error = {
            'type': 'error',
            'payload': {
                'type': 'PROCESS_ERROR',
                'message': str(e),
                'resolution': '请检查文件路径是否正确'
            }
        }
        print(json.dumps(error), flush=True)
        sys.exit(1)
