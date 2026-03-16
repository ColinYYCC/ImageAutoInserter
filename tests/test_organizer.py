import pytest
import sys
import tempfile
import time
import os
import shutil

sys.path.insert(0, 'file_organizer')

from organizer import FileOrganizer

def test_safe_move_file(tmp_path):
    """测试安全移动文件"""
    # 创建测试文件
    source = tmp_path / "test.txt"
    source.write_text("test content")

    target_dir = tmp_path / "organized"
    target_dir.mkdir()

    organizer = FileOrganizer(config_path=None)

    # 模拟移动
    result = organizer._safe_move_file(str(source), str(target_dir / "test.txt"))

    assert result is True
    assert (target_dir / "test.txt").exists()
    assert (target_dir / "test.txt").read_text() == "test content"


def test_safe_move_file_with_duplicate(tmp_path):
    """测试移动重复文件（目标已存在）"""
    # 创建源文件
    source = tmp_path / "test.txt"
    source.write_text("test content")

    # 创建目标目录和已存在的文件
    target_dir = tmp_path / "organized"
    target_dir.mkdir()

    existing_file = target_dir / "test.txt"
    existing_file.write_text("existing content")

    organizer = FileOrganizer(config_path=None)

    # 移动文件（目标已存在，应该自动添加数字后缀）
    result = organizer._safe_move_file(str(source), str(existing_file))

    assert result is True
    # 验证源文件被移动
    assert not source.exists()
    # 验证新文件被创建
    assert (target_dir / "test_1.txt").exists()
    # 验证原有文件未被覆盖
    assert (target_dir / "test.txt").read_text() == "existing content"


def test_should_exclude(tmp_path):
    """测试排除目录检查"""
    organizer = FileOrganizer(config_path=None)

    # 测试应该排除的路径
    assert organizer._should_exclude("src/file.py") == True
    assert organizer._should_exclude(".trae/file.py") == True
    assert organizer._should_exclude("node_modules/file.py") == True

    # 测试不应该排除的路径
    assert organizer._should_exclude("documents/file.py") == False
    assert organizer._should_exclude("downloads/file.py") == False


def test_is_file_stable(tmp_path):
    """测试文件稳定性检查"""
    organizer = FileOrganizer(config_path=None)

    # 创建测试文件
    test_file = tmp_path / "stable.txt"
    test_file.write_text("content")

    # 文件应该是稳定的（大小不变）
    result = organizer._is_file_stable(str(test_file))
    assert result == True

    # 测试不存在的文件
    result = organizer._is_file_stable(str(tmp_path / "nonexistent.txt"))
    assert result == False


def test_organize_file_no_rule(tmp_path):
    """测试文件整理（无匹配规则）"""
    # 创建测试文件
    test_file = tmp_path / "unknown.xyz"
    test_file.write_text("content")

    organizer = FileOrganizer(config_path=None)

    # 尝试整理（无规则匹配）
    organizer._organize_file(str(test_file))

    # 文件应该仍然存在（因为没有匹配规则）
    assert test_file.exists()


def test_organize_file_with_rule(tmp_path):
    """测试文件整理（有匹配规则）"""
    # 创建临时配置文件
    config_content = """
watch_paths:
  - "."
exclude_dirs:
  - "src/"
  - ".trae/"
delay_seconds: 0
rules:
  - name: "text"
    patterns:
      - "*.txt"
    target_dir: ".organized/texts/"
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)

    # 创建测试文件
    test_file = tmp_path / "document.txt"
    test_file.write_text("hello world")

    # 创建 organizer
    organizer = FileOrganizer(config_path=str(config_file))

    # 整理文件
    organizer._organize_file(str(test_file))

    # 验证文件被移动到目标目录
    target_file = tmp_path / ".organized" / "texts" / "document.txt"
    assert target_file.exists()
    assert target_file.read_text() == "hello world"


def test_classifier_integration(tmp_path):
    """测试分类器集成"""
    config_content = """
watch_paths:
  - "."
exclude_dirs: []
delay_seconds: 0
rules:
  - name: "excel"
    patterns:
      - "*.xlsx"
    target_dir: ".organized/excel/"
  - name: "images"
    patterns:
      - "*.jpg"
      - "*.png"
    target_dir: ".organized/images/"
"""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(config_content)

    organizer = FileOrganizer(config_path=str(config_file))

    # 测试分类
    assert organizer.classifier.classify("test.xlsx", ".") == ".organized/excel/"
    assert organizer.classifier.classify("photo.jpg", ".") == ".organized/images/"
    assert organizer.classifier.classify("unknown.xyz", ".") is None
