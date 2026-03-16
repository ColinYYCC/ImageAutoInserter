import pytest
import json
import sys
import os
import tempfile

sys.path.insert(0, 'file_organizer')

from indexer import FileIndexer

def test_add_entry():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name

    try:
        indexer = FileIndexer(temp_path)
        indexer.add_entry(
            original_path="Sample/TEST_OUTPUT_1.xlsx",
            organized_path=".organized/outputs/test-results/TEST_OUTPUT_1.xlsx",
            category="test-results"
        )

        data = json.load(open(temp_path))
        assert len(data["files"]) == 1
        assert data["files"][0]["original_path"] == "Sample/TEST_OUTPUT_1.xlsx"
    finally:
        os.unlink(temp_path)

def test_find_by_original():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name

    try:
        indexer = FileIndexer(temp_path)
        indexer.add_entry(
            original_path="Sample/TEST_OUTPUT_1.xlsx",
            organized_path=".organized/outputs/test-results/TEST_OUTPUT_1.xlsx",
            category="test-results"
        )

        result = indexer.find_by_original("TEST_OUTPUT")
        assert len(result) == 1
        assert result[0]["original_path"] == "Sample/TEST_OUTPUT_1.xlsx"
    finally:
        os.unlink(temp_path)
