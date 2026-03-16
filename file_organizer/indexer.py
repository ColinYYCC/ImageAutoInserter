"""文件索引管理"""
import json
import os
from datetime import datetime
from typing import List, Optional
from filelock import FileLock


class FileIndexer:
    """文件索引管理器"""

    def __init__(self, index_path: str = ".organized/index.json"):
        self.index_path = index_path
        self.lock_path = index_path + ".lock"
        self._ensure_index()

    def _ensure_index(self):
        """确保索引文件存在"""
        if not os.path.exists(self.index_path) or os.path.getsize(self.index_path) == 0:
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            self._save({
                "index_version": 1,
                "last_updated": datetime.now().isoformat(),
                "files": []
            })

    def _load(self) -> dict:
        """加载索引"""
        with open(self.index_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save(self, data: dict):
        """保存索引"""
        data["last_updated"] = datetime.now().isoformat()
        with open(self.index_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def add_entry(self, original_path: str, organized_path: str, category: str):
        """添加索引条目"""
        lock = FileLock(self.lock_path)
        with lock:
            data = self._load()

            # 检查是否已存在
            for entry in data["files"]:
                if entry["original_path"] == original_path:
                    entry["organized_path"] = organized_path
                    entry["category"] = category
                    entry["moved_at"] = datetime.now().isoformat()
                    break
            else:
                data["files"].append({
                    "original_path": original_path,
                    "organized_path": organized_path,
                    "category": category,
                    "moved_at": datetime.now().isoformat()
                })

            self._save(data)

    def find_by_original(self, query: str) -> List[dict]:
        """通过原路径搜索"""
        data = self._load()
        query_lower = query.lower()
        results = []

        for entry in data["files"]:
            if query_lower in entry["original_path"].lower():
                results.append(entry)

        return results

    def find_by_category(self, category: str) -> List[dict]:
        """通过分类搜索"""
        data = self._load()
        return [e for e in data["files"] if e["category"] == category]

    def list_all(self) -> List[dict]:
        """列出所有文件"""
        return self._load()["files"]
