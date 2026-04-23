"""
进度发射器模块

提供带缓冲的进度发送机制，避免阻塞主线程
同时控制发送频率，确保前端能平滑显示
"""

import threading
import queue
import time
import sys
from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class ProgressMessage:
    """进度消息数据类"""
    percent: float
    current_action: str
    total_rows: int = 0
    current_row: int = 0
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        if self.timestamp == 0.0:
            self.timestamp = time.time()


class ProgressEmitter:
    """
    进度发射器

    功能：
    1. 缓冲进度更新，避免阻塞主线程
    2. 控制发送频率（最小间隔）
    3. 自动合并短时间内的大量更新

    Example:
        >>> emitter = ProgressEmitter(min_interval=0.1)
        >>> emitter.start()
        >>>
        >>> # 在主循环中发送进度
        >>> for i in range(100):
        >>>     emitter.emit(percent=i, current_action=f"处理中... {i}%")
        >>>     time.sleep(0.01)  # 模拟工作
        >>>
        >>> emitter.stop()
    """

    def __init__(
        self,
        send_callback: Callable[[dict], None],
        min_interval: float = 0.1,  # 最小发送间隔 100ms
        max_queue_size: int = 100
    ):
        """
        初始化进度发射器

        Args:
            send_callback: 实际发送消息的回调函数
            min_interval: 最小发送间隔（秒）
            max_queue_size: 消息队列最大长度
        """
        self.send_callback = send_callback
        self.min_interval = min_interval
        self.max_queue_size = max_queue_size

        self._queue: queue.Queue[ProgressMessage] = queue.Queue(maxsize=max_queue_size)
        self._last_emit_time = 0.0
        self._running = False
        self._emit_thread: Optional[threading.Thread] = None

        # 用于合并快速更新的缓存
        self._pending_message: Optional[ProgressMessage] = None
        self._pending_timer: Optional[threading.Timer] = None

    def start(self):
        """启动发射器"""
        if not self._running:
            self._running = True
            self._emit_thread = threading.Thread(target=self._emit_loop, daemon=True)
            self._emit_thread.start()

    def stop(self):
        """停止发射器"""
        self._running = False

        # 取消待处理的定时器，防止泄漏
        if self._pending_timer:
            self._pending_timer.cancel()
            self._pending_timer = None

        # 发送队列中剩余的最后一个消息
        if self._pending_message:
            self._do_emit(self._pending_message)
            self._pending_message = None

        if self._emit_thread:
            self._emit_thread.join(timeout=1.0)

    def emit(
        self,
        percent: float,
        current_action: str,
        total_rows: int = 0,
        current_row: int = 0
    ):
        """
        发送进度更新

        Args:
            percent: 完成百分比（0-100）
            current_action: 当前处理动作描述
            total_rows: 总行数
            current_row: 当前行号
        """
        if not self._running:
            return

        message = ProgressMessage(
            percent=percent,
            current_action=current_action,
            total_rows=total_rows,
            current_row=current_row
        )

        # 尝试放入队列，如果队列满则丢弃最旧的消息
        try:
            self._queue.put_nowait(message)
        except queue.Full:
            # 队列满时，移除旧消息并放入新消息
            try:
                self._queue.get_nowait()
                self._queue.put_nowait(message)
            except queue.Empty:
                pass

    def _emit_loop(self):
        """发射循环（在独立线程中运行）"""
        while self._running:
            try:
                # 等待消息，超时 100ms
                message = self._queue.get(timeout=0.1)

                # 控制发送频率
                current_time = time.time()
                time_since_last = current_time - self._last_emit_time

                if time_since_last < self.min_interval:
                    # 更新待发送消息（合并快速更新）
                    self._pending_message = message

                    # 取消之前的定时器
                    if self._pending_timer:
                        self._pending_timer.cancel()

                    # 设置新的定时器
                    delay = self.min_interval - time_since_last
                    self._pending_timer = threading.Timer(delay, self._emit_pending)
                    self._pending_timer.start()
                else:
                    # 直接发送
                    self._do_emit(message)

            except queue.Empty:
                continue

    def _emit_pending(self) -> None:
        """发送待处理的消息"""
        if self._pending_message:
            self._do_emit(self._pending_message)
            self._pending_message = None

    def _do_emit(self, message: ProgressMessage) -> None:
        """实际执行发送"""
        try:
            self.send_callback({
                'type': 'progress',
                'payload': {
                    'percent': round(message.percent, 2),
                    'current': message.current_action,
                    'total': message.total_rows,
                    'current_row': message.current_row,
                    'timestamp': message.timestamp
                }
            })
            self._last_emit_time = time.time()
        except Exception as e:
            try:
                print(f"[ProgressEmitter] 发送失败: {e}", file=sys.stderr)
            except UnicodeEncodeError:
                print(f"[ProgressEmitter] send failed: {e}", file=sys.stderr)


# 便捷函数：创建标准输出发射器
def create_stdout_emitter(min_interval: float = 0.1) -> ProgressEmitter:
    """
    创建向 stdout 发送 JSON 的进度发射器

    Args:
        min_interval: 最小发送间隔（秒）

    Returns:
        ProgressEmitter: 配置好的发射器
    """
    def stdout_sender(data: dict) -> None:
        import sys
        import json
        try:
            sys.stdout.write(json.dumps(data, ensure_ascii=False) + '\n')
            sys.stdout.flush()
        except UnicodeEncodeError:
            sys.stdout.write(json.dumps(data, ensure_ascii=True) + '\n')
            sys.stdout.flush()

    return ProgressEmitter(
        send_callback=stdout_sender,
        min_interval=min_interval
    )
