"""分类规则引擎"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fnmatch
from dataclasses import dataclass
from typing import List, Optional
import yaml


@dataclass
class ClassificationRule:
    """分类规则"""
    name: str
    patterns: List[str]
    target_dir: str
    source_dir: Optional[str] = None

    def matches(self, filename: str) -> bool:
        """检查文件名是否匹配规则"""
        for pattern in self.patterns:
            if fnmatch.fnmatch(filename, pattern):
                return True
        return False


class Classifier:
    """分类器"""

    def __init__(self, rules_config: List[dict]):
        self.rules = []
        for rule_config in rules_config:
            rule = ClassificationRule(
                name=rule_config["name"],
                patterns=rule_config["patterns"],
                target_dir=rule_config["target_dir"],
                source_dir=rule_config.get("source_dir")
            )
            self.rules.append(rule)

    def classify(self, filename: str, source_dir: str = None) -> Optional[str]:
        """
        分类文件

        Args:
            filename: 文件名
            source_dir: 源目录（可选）

        Returns:
            目标目录路径，如果无匹配返回 None
        """
        for rule in self.rules:
            # 检查源目录限制
            if rule.source_dir and source_dir:
                if not source_dir.startswith(rule.source_dir):
                    continue

            # 检查文件名模式
            if rule.matches(filename):
                return rule.target_dir

        return None


def load_config(config_path: str = "file_organizer/config.yaml") -> dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)
