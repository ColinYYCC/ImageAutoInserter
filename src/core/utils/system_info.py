"""
系统信息检测模块

提供硬件能力检测，用于智能调度决策
"""

import os
import platform
import psutil
from typing import Tuple


def get_cpu_core_count() -> int:
    """获取 CPU 逻辑核心数"""
    return os.cpu_count() or 4


def get_system_memory_info() -> Tuple[int, int]:
    """
    获取系统内存信息

    Returns:
        Tuple[总内存 MB, 可用内存 MB]
    """
    mem = psutil.virtual_memory()
    return (int(mem.total / (1024 * 1024)), int(mem.available / (1024 * 1024)))


def is_ssd() -> bool:
    """
    检测系统盘是否为 SSD

    通过测量磁盘 I/O 速度判断
    """
    try:
        import time
        import tempfile
        import sys
        # 使用跨平台临时目录，Windows 使用 %TEMP%，Unix 使用 /tmp
        test_file = os.path.join(tempfile.gettempdir(), 'ssd_test_tmp')
        test_size = 100 * 1024 * 1024

        start_time = time.time()
        with open(test_file, 'wb') as f:
            f.write(b'0' * test_size)
        write_time = time.time() - start_time

        os.remove(test_file)

        write_speed_mbps = (test_size / (1024 * 1024)) / write_time

        return write_speed_mbps > 50
    except Exception:
        return True


def get_optimal_thread_count(
    min_threads: int = 2,
    max_threads: int = 16,
    memory_per_thread_mb: int = 50
) -> int:
    """
    计算最优线程数

    Args:
        min_threads: 最小线程数
        max_threads: 最大线程数
        memory_per_thread_mb: 每个线程预估内存占用

    Returns:
        int: 推荐线程数
    """
    cpu_cores = get_cpu_core_count()
    _, available_mem_mb = get_system_memory_info()

    memory_based_threads = available_mem_mb // memory_per_thread_mb

    if is_ssd():
        io_multiplier = 2.0
    else:
        io_multiplier = 1.0

    optimal = int(min(cpu_cores * io_multiplier, memory_based_threads, max_threads))

    return max(min_threads, optimal)


def get_system_info() -> dict:
    """
    获取完整系统信息

    Returns:
        dict: 系统信息
    """
    cpu_cores = get_cpu_core_count()
    total_mem, available_mem = get_system_memory_info()

    return {
        'cpu_cores': cpu_cores,
        'total_memory_mb': total_mem,
        'available_memory_mb': available_mem,
        'is_ssd': is_ssd(),
        'optimal_threads': get_optimal_thread_count(),
        'platform': platform.system(),
    }
