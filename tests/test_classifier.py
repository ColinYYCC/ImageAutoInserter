import pytest
import sys
sys.path.insert(0, 'file_organizer')

from classifier import Classifier, ClassificationRule

def test_match_pattern_simple():
    rule = ClassificationRule(
        name="test",
        patterns=["TEST_*.xlsx"],
        target_dir=".organized/outputs/test/"
    )
    assert rule.matches("TEST_OUTPUT_1.xlsx") == True
    assert rule.matches("test_output_1.xlsx") == False

def test_match_pattern_glob():
    rule = ClassificationRule(
        name="images",
        patterns=["*.jpg", "*.png"],
        target_dir=".organized/data/images/"
    )
    assert rule.matches("photo.jpg") == True
    assert rule.matches("photo.png") == True
    assert rule.matches("photo.gif") == False

def test_classifier_basic():
    config = {"rules": [
        {"name": "test", "patterns": ["TEST_*.xlsx"], "target_dir": ".organized/outputs/test/"},
        {"name": "error", "patterns": ["错误报告_*.txt"], "target_dir": ".organized/logs/errors/"}
    ]}
    classifier = Classifier(config["rules"])
    
    result = classifier.classify("TEST_OUTPUT_1.xlsx")
    assert result == ".organized/outputs/test/"
    
    result = classifier.classify("错误报告_20260312.txt")
    assert result == ".organized/logs/errors/"
