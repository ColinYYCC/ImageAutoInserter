"""文件自动整理系统主程序"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import time
import shutil
from pathlib import Path
from typing import Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from classifier import Classifier, load_config
from indexer import FileIndexer


class FileChangeHandler(FileSystemEventHandler):
    """文件变化处理器"""

    def __init__(self, organizer: 'FileOrganizer'):
        self.organizer = organizer

    def on_created(self, event: FileSystemEvent):
        """文件创建事件"""
        if event.is_directory:
            return

        # 忽略隐藏文件
        if os.path.basename(event.src_path).startswith('.'):
            return

        # 延迟处理
        time.sleep(self.organizer.config.get("delay_seconds", 3))

        # 检查文件是否稳定（不再被写入）
        if self.organizer._is_file_stable(event.src_path):
            self.organizer._organize_file(event.src_path)


class FileOrganizer:
    """文件整理器"""

    def __init__(self, config_path: str = "file_organizer/config.yaml"):
        # 加载配置
        if config_path and os.path.exists(config_path):
            self.config = load_config(config_path)
        else:
            self.config = {
                "watch_paths": ["."],
                "exclude_dirs": ["src/", ".trae/", "node_modules/", ".git/"],
                "delay_seconds": 3,
                "rules": []
            }

        # 初始化分类器
        self.classifier = Classifier(self.config.get("rules", []))

        # 初始化索引器
        self.indexer = FileIndexer()

        # 排除目录集合
        self.exclude_dirs = set(self.config.get("exclude_dirs", []))

        # 观察者
        self.observer: Optional[Observer] = None

    def _should_exclude(self, path: str) -> bool:
        """检查是否应该排除"""
        path_parts = Path(path).parts

        for exclude in self.exclude_dirs:
            exclude = exclude.rstrip('/')
            if exclude in path_parts:
                return True

        return False

    def _is_file_stable(self, file_path: str, max_attempts: int = 3) -> bool:
        """检查文件是否已稳定（不再被写入）"""
        if not os.path.exists(file_path):
            return False

        for _ in range(max_attempts):
            try:
                size1 = os.path.getsize(file_path)
                time.sleep(0.5)
                size2 = os.path.getsize(file_path)

                if size1 == size2:
                    return True
            except (OSError, IOError):
                return False

        return True

    def _organize_file(self, file_path: str):
        """整理单个文件"""
        if self._should_exclude(file_path):
            print(f"跳过（排除目录）: {file_path}")
            return

        filename = os.path.basename(file_path)
        source_dir = os.path.dirname(file_path)

        # 分类
        target_dir = self.classifier.classify(filename, source_dir)

        if not target_dir:
            print(f"无匹配规则: {file_path}")
            return

        # 如果目标目录是相对路径，则相对于源文件目录
        if not os.path.isabs(target_dir):
            target_dir = os.path.join(source_dir, target_dir)

        # 确保目标目录存在
        os.makedirs(target_dir, exist_ok=True)

        # 移动文件
        target_path = os.path.join(target_dir, filename)

        if self._safe_move_file(file_path, target_path):
            # 更新索引
            self.indexer.add_entry(
                original_path=file_path,
                organized_path=target_path,
                category=target_dir.strip('./')
            )
            print(f"已整理: {file_path} -> {target_path}")
        else:
            print(f"移动失败: {file_path}")

    def _safe_move_file(self, source: str, target: str) -> bool:
        """安全移动文件"""
        try:
            # 如果目标已存在，添加数字后缀
            if os.path.exists(target):
                base, ext = os.path.splitext(target)
                counter = 1
                while os.path.exists(target):
                    target = f"{base}_{counter}{ext}"
                    counter += 1

            shutil.move(source, target)
            return True
        except Exception as e:
            print(f"移动文件出错: {e}")
            return False

    def start(self):
        """启动文件监听"""
        print("启动文件监听...")

        handler = FileChangeHandler(self)
        self.observer = Observer()

        watch_paths = self.config.get("watch_paths", ["."])

        for path in watch_paths:
            self.observer.schedule(handler, path, recursive=True)

        self.observer.start()
        print("文件监听已启动，按 Ctrl+C 停止")

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        """停止文件监听"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
        print("文件监听已停止")

    def scan_and_organize(self, root_path: str = "."):
        """扫描并整理现有文件"""
        print(f"扫描目录: {root_path}")
        
        for dirpath, dirnames, filenames in os.walk(root_path):
            # 检查是否在排除目录中
            if self._should_exclude(dirpath):
                continue
            
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                
                # 跳过隐藏文件和 .organized 目录
                if filename.startswith('.') or '.organized' in dirpath:
                    continue
                
                # 跳过目录本身
                if os.path.isdir(file_path):
                    continue
                
                self._organize_file(file_path)
        
        print("扫描完成！")


def main():
    """主入口"""
    import argparse

    parser = argparse.ArgumentParser(description="文件自动整理系统")
    parser.add_argument("command", choices=["start", "stop", "status", "find", "scan"], help="命令")
    parser.add_argument("--config", default="file_organizer/config.yaml", help="配置文件路径")
    parser.add_argument("--query", help="搜索关键词")
    parser.add_argument("--path", default=".", help="扫描路径（用于 scan 命令）")

    args = parser.parse_args()

    organizer = FileOrganizer(config_path=args.config)

    if args.command == "start":
        organizer.start()
    elif args.command == "status":
        files = organizer.indexer.list_all()
        print(f"索引文件数: {len(files)}")
        for f in files:
            print(f"  {f['original_path']} -> {f['organized_path']}")
    elif args.command == "find":
        if args.query:
            results = organizer.indexer.find_by_original(args.query)
            print(f"找到 {len(results)} 个结果:")
            for r in results:
                print(f"  {r['original_path']} -> {r['organized_path']}")
        else:
            print("请提供搜索关键词 --query")
    elif args.command == "scan":
        organizer.scan_and_organize(args.path)


if __name__ == "__main__":
    main()
