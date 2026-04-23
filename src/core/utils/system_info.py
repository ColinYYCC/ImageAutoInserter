"""
智能线程调度模块

检测系统硬件信息（CPU 核心数、物理核心数、可用内存、存储类型），
根据任务类型自动计算最优并行度。
"""

import logging
import os
import platform
import subprocess
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class TaskType(Enum):
    IO_BOUND = "io_bound"
    CPU_BOUND = "cpu_bound"


class StorageType(Enum):
    SSD = "ssd"
    HDD = "hdd"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class SystemInfo:
    logical_cores: int
    physical_cores: int
    available_memory_gb: float
    storage_type: StorageType


def _detect_physical_cores() -> int:
    """检测物理核心数"""
    try:
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["sysctl", "-n", "hw.physicalcpu"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return int(result.stdout.strip())
        elif platform.system() == "Linux":
            cpu_info = os.cpu_count() or 1
            try:
                with open("/proc/cpuinfo", "r") as f:
                    lines = f.readlines()
                siblings = None
                cores = None
                for line in lines:
                    if line.startswith("siblings"):
                        siblings = int(line.split(":")[1].strip())
                    elif line.startswith("cpu cores"):
                        cores = int(line.split(":")[1].strip())
                if siblings and cores:
                    sockets = cpu_info // siblings
                    return sockets * cores
            except (IOError, ValueError):
                pass
        elif platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "cpu", "get", "NumberOfCores"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
                if len(lines) > 1:
                    return sum(int(l) for l in lines[1:] if l.isdigit())
    except (subprocess.TimeoutExpired, ValueError, OSError) as e:
        logger.debug(f"物理核心数检测失败: {e}")

    logical = os.cpu_count() or 2
    return max(1, logical // 2)


def _detect_available_memory_gb() -> float:
    """检测可用内存（GB）"""
    try:
        import psutil
        return psutil.virtual_memory().available / (1024 ** 3)
    except ImportError:
        pass

    try:
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["vm_stat"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if "Pages free" in line or "page size of" in line.lower():
                        parts = line.split(":")
                        if len(parts) == 2:
                            value = int(parts[1].strip().rstrip("."))
                            if "page size" in line.lower():
                                continue
                            return value * 4096 / (1024 ** 3)
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemAvailable:"):
                        return int(line.split()[1]) / (1024 ** 2)
        elif platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "OS", "get", "FreePhysicalMemory"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
                if len(lines) > 1 and lines[1].isdigit():
                    return int(lines[1]) / (1024 ** 2)
    except (subprocess.TimeoutExpired, ValueError, OSError, IOError) as e:
        logger.debug(f"内存检测失败: {e}")

    return 4.0


def _detect_storage_type(path: str = ".") -> StorageType:
    """检测存储类型（SSD/HDD）"""
    try:
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["diskutil", "info", "/"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                output = result.stdout.lower()
                if "solid state" in output or "ssd" in output:
                    return StorageType.SSD
                if "hard disk" in output or "hdd" in output or "rotational" in output:
                    return StorageType.HDD
        elif platform.system() == "Linux":
            try:
                rotational_path = "/sys/block/sda/queue/rotational"
                if os.path.exists(rotational_path):
                    with open(rotational_path, "r") as f:
                        return StorageType.HDD if f.read().strip() == "1" else StorageType.SSD
            except (OSError, IOError):
                pass
        elif platform.system() == "Windows":
            result = subprocess.run(
                ["powershell", "-Command",
                 "Get-PhysicalDisk | Select-Object -First 1 -ExpandProperty MediaType"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                media_type = result.stdout.strip().lower()
                if "ssd" in media_type:
                    return StorageType.SSD
                if "hdd" in media_type:
                    return StorageType.HDD
    except (subprocess.TimeoutExpired, OSError) as e:
        logger.debug(f"存储类型检测失败: {e}")

    return StorageType.UNKNOWN


def get_system_info(path: str = ".") -> SystemInfo:
    """获取系统信息"""
    logical_cores = os.cpu_count() or 2
    physical_cores = _detect_physical_cores()
    available_memory_gb = _detect_available_memory_gb()
    storage_type = _detect_storage_type(path)

    return SystemInfo(
        logical_cores=logical_cores,
        physical_cores=physical_cores,
        available_memory_gb=available_memory_gb,
        storage_type=storage_type,
    )


def calculate_optimal_workers(
    task_type: TaskType = TaskType.IO_BOUND,
    file_count: int = 0,
    system_info: Optional[SystemInfo] = None,
) -> int:
    """
    根据任务类型和系统信息计算最优并行度

    策略：
    - I/O 密集型：SSD 环境可达 3 倍物理核心数，HDD 环境使用物理核心数
    - CPU 密集型：使用物理核心数
    - 少量文件（≤4）自动切换串行模式避免线程池开销
    - 并行度不超过文件数量

    Args:
        task_type: 任务类型
        file_count: 待处理文件数量
        system_info: 系统信息，None 时自动检测

    Returns:
        最优线程数（最少为 1）
    """
    if file_count <= 4:
        return 1

    if system_info is None:
        system_info = get_system_info()

    if task_type == TaskType.IO_BOUND:
        if system_info.storage_type == StorageType.SSD:
            workers = system_info.physical_cores * 3
        elif system_info.storage_type == StorageType.HDD:
            workers = max(1, system_info.physical_cores // 2)
        else:
            workers = system_info.physical_cores * 2
    else:
        workers = system_info.physical_cores

    workers = min(workers, file_count)
    workers = max(1, workers)

    logger.debug(
        f"最优并行度计算: task_type={task_type.value}, "
        f"storage={system_info.storage_type.value}, "
        f"physical_cores={system_info.physical_cores}, "
        f"file_count={file_count}, workers={workers}"
    )

    return workers
