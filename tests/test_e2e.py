"""端到端测试"""
import pytest
import os
import sys
import tempfile
import time
import shutil

sys.path.insert(0, 'file_organizer')

from organizer import FileOrganizer
from indexer import FileIndexer


def test_full_workflow(tmp_path):
    """完整工作流测试"""
    # 创建临时配置
    config = {
        "watch_paths": [str(tmp_path)],
        "exclude_dirs": ["src/", ".git/"],
        "delay_seconds": 1,
        "rules": [
            {
                "name": "测试输出",
                "patterns": ["TEST_OUTPUT_*.xlsx"],
                "target_dir": str(tmp_path / ".organized/outputs/test-results")
            },
            {
                "name": "错误报告",
                "patterns": ["错误报告_*.txt"],
                "target_dir": str(tmp_path / ".organized/logs/errors")
            }
        ]
    }

    # 创建配置和分类器
    from classifier import Classifier
    classifier = Classifier(config["rules"])

    # 测试分类
    assert classifier.classify("TEST_OUTPUT_1.xlsx") == str(tmp_path / ".organized/outputs/test-results")
    assert classifier.classify("错误报告_20260312.txt") == str(tmp_path / ".organized/logs/errors")

    print("集成测试通过")


def test_classifier_with_source_dir(tmp_path):
    """测试带源目录限制的分类"""
    config = {
        "rules": [
            {
                "name": "特定目录的测试输出",
                "patterns": ["TEST_OUTPUT_*.xlsx"],
                "target_dir": ".organized/outputs",
                "source_dir": str(tmp_path / "source")
            }
        ]
    }

    from classifier import Classifier
    classifier = Classifier(config["rules"])

    # 匹配源目录
    result1 = classifier.classify("TEST_OUTPUT_1.xlsx", source_dir=str(tmp_path / "source"))
    assert result1 == ".organized/outputs"

    # 不匹配源目录
    result2 = classifier.classify("TEST_OUTPUT_1.xlsx", source_dir=str(tmp_path / "other"))
    assert result2 is None


def test_indexer_operations(tmp_path):
    """测试索引器操作"""
    index_path = tmp_path / "test_index.json"
    indexer = FileIndexer(index_path=str(index_path))

    # 添加条目
    indexer.add_entry(
        original_path="/path/to/original.txt",
        organized_path="/path/to/.organized/original.txt",
        category="test"
    )

    # 查询
    results = indexer.find_by_original("original")
    assert len(results) == 1
    assert results[0]["original_path"] == "/path/to/original.txt"

    # 按分类查询
    results = indexer.find_by_category("test")
    assert len(results) == 1

    # 列出全部
    all_files = indexer.list_all()
    assert len(all_files) == 1


def test_classifier_no_match(tmp_path):
    """测试无匹配情况"""
    config = {
        "rules": [
            {
                "name": "测试输出",
                "patterns": ["TEST_OUTPUT_*.xlsx"],
                "target_dir": ".organized/outputs"
            }
        ]
    }

    from classifier import Classifier
    classifier = Classifier(config["rules"])

    # 无匹配的文件
    result = classifier.classify("random_file.txt")
    assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
