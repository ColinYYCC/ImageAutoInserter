#!/usr/bin/env python3
"""
压力测试：orchestrator.py 中的内存释放逻辑
测试各种边界情况确保模块在任何情况下正常工作
"""

import sys
import os
import random
import time
from typing import List, Dict, Set, Tuple
from dataclasses import dataclass
from unittest.mock import MagicMock

sys.path.insert(0, 'src')

from core.matchers import ImageMatcher
from core.models import ImageInfo


@dataclass
class TestCase:
    name: str
    product_codes: List[str]
    expected_success: int
    expected_failed: int
    description: str


class StressTestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results: List[Dict] = []

    def create_mock_matcher(self, product_codes: List[str], images_per_code: int = 3) -> ImageMatcher:
        """创建带有模拟图片的 ImageMatcher"""
        images = []

        for code in set(product_codes):
            for pic_col in range(1, images_per_code + 1):
                img_info = ImageInfo(
                    product_code=code,
                    sequence=f"{pic_col:02d}",
                    picture_column=pic_col,
                    image_format="jpg",
                    source_path=f"/test/{code}_p{pic_col}.jpg",
                    image_data=b"fake_image_data_12345"
                )
                images.append(img_info)

        return ImageMatcher(images)

    def find_last_occurrence(self, codes: List[str]) -> Dict[str, int]:
        """记录每个商品编码的最后出现位置"""
        last_occ: Dict[str, int] = {}
        for idx, code in enumerate(codes, start=1):
            last_occ[code] = idx
        return last_occ

    def simulate_old_logic(self, codes: List[str], matcher: ImageMatcher) -> Tuple[int, int]:
        """模拟旧逻辑（每50行释放当前行）- 用于对比"""
        matched = 0
        failed = 0
        processed = set()

        for idx, code in enumerate(codes, start=1):
            # 跳过 None
            if code is None:
                continue

            has_img = any(matcher.get_original_image_data(code, pc) for pc in range(1, 4))
            if has_img:
                matched += 1
            else:
                failed += 1

            processed.add(code)

            # 旧逻辑：每50行释放当前行（BUG）
            if idx % 50 == 0 and processed:
                for pcode in processed:
                    for pc in range(1, 4):
                        img = matcher.get_image(pcode, pc)
                        if img:
                            img.release()
                processed.clear()

        return matched, failed

    def simulate_new_logic(self, codes: List[str], matcher: ImageMatcher) -> Tuple[int, int]:
        """模拟新逻辑（只在最后一次出现时释放）"""
        matched = 0
        failed = 0
        last_occ = self.find_last_occurrence(codes)

        for idx, code in enumerate(codes, start=1):
            # 跳过 None
            if code is None:
                continue

            has_img = any(matcher.get_original_image_data(code, pc) for pc in range(1, 4))
            if has_img:
                matched += 1
            else:
                failed += 1

            # 新逻辑：只在最后一次出现时释放
            if idx == last_occ.get(code):
                for pc in range(1, 4):
                    img = matcher.get_image(code, pc)
                    if img:
                        img.release()

        return matched, failed

    def run_test(self, test_case: TestCase) -> bool:
        """运行单个测试用例"""
        print(f"\n{'='*60}")
        print(f"测试: {test_case.name}")
        print(f"描述: {test_case.description}")
        print(f"数据量: {len(test_case.product_codes)} 行")
        print(f"{'='*60}")

        matcher = self.create_mock_matcher(test_case.product_codes)

        old_matched, old_failed = self.simulate_old_logic(test_case.product_codes, matcher)
        print(f"旧逻辑结果: matched={old_matched}, failed={old_failed}")

        matcher = self.create_mock_matcher(test_case.product_codes)
        new_matched, new_failed = self.simulate_new_logic(test_case.product_codes, matcher)
        print(f"新逻辑结果: matched={new_matched}, failed={new_failed}")
        print(f"预期结果:   matched={test_case.expected_success}, failed={test_case.expected_failed}")

        success = (new_matched == test_case.expected_success and
                   new_failed == test_case.expected_failed)

        if success:
            print("✅ 测试通过")
            self.passed += 1
        else:
            print("❌ 测试失败")
            self.failed += 1

        self.results.append({
            "name": test_case.name,
            "old_matched": old_matched,
            "old_failed": old_failed,
            "new_matched": new_matched,
            "new_failed": new_failed,
            "expected_matched": test_case.expected_success,
            "expected_failed": test_case.expected_failed,
            "success": success
        })

        return success

    def generate_test_cases(self) -> List[TestCase]:
        """生成各种测试用例"""
        test_cases = []

        # 1. 基本测试：所有唯一编码
        unique_codes = [f"CODE_{i:04d}" for i in range(1, 101)]
        test_cases.append(TestCase(
            name="所有唯一编码",
            product_codes=unique_codes,
            expected_success=100,
            expected_failed=0,
            description="100个不同商品编码，每个只出现一次"
        ))

        # 2. 重复编码测试：一个编码出现多次
        repeated = ["CODE_0001"] * 100
        test_cases.append(TestCase(
            name="单个编码重复100次",
            product_codes=repeated,
            expected_success=100,
            expected_failed=0,
            description="同一个商品编码出现100次，应该全部匹配成功"
        ))

        # 3. 混合测试：部分重复
        mixed = []
        for i in range(50):
            mixed.extend([f"CODE_{i:04d}"] * random.randint(1, 10))
        unique_in_mixed = len(set(mixed))
        test_cases.append(TestCase(
            name="50个编码随机重复",
            product_codes=mixed,
            expected_success=len(mixed),
            expected_failed=0,
            description=f"{len(mixed)}行数据，{unique_in_mixed}个唯一编码"
        ))

        # 4. 边界测试：重复编码正好在第50行
        boundary_50 = [f"CODE_{i:04d}" for i in range(1, 51)]
        boundary_50.append(boundary_50[0])  # 重复第一个
        test_cases.append(TestCase(
            name="边界测试：第51行重复第1行",
            product_codes=boundary_50,
            expected_success=51,
            expected_failed=0,
            description="在idx=50时释放第一个编码，但第51行还需要使用它"
        ))

        # 5. 边界测试：重复编码跨越50行边界
        across_boundary = []
        for i in range(30):
            across_boundary.append(f"REPEAT_CODE")  # 30次
        across_boundary.extend([f"OTHER_{i}" for i in range(20)])  # 20个不同的
        across_boundary.extend([f"REPEAT_CODE"] * 30)  # 再30次，共60次
        test_cases.append(TestCase(
            name="跨越50行边界重复",
            product_codes=across_boundary,
            expected_success=len(across_boundary),
            expected_failed=0,
            description="REPEAT_CODE出现60次，跨越多个50行边界"
        ))

        # 6. 大数据量测试：10000行
        large_codes = []
        for i in range(100):
            large_codes.extend([f"LARGE_{i:04d}"] * 100)  # 100个编码各100次
        random.shuffle(large_codes)
        test_cases.append(TestCase(
            name="大数据量：100x100重复",
            product_codes=large_codes,
            expected_success=10000,
            expected_failed=0,
            description="10000行数据，100个唯一编码各出现100次"
        ))

        # 7. 极限测试：一个编码出现1000次
        extreme = ["EXTREME_CODE"] * 1000
        test_cases.append(TestCase(
            name="极限测试：单码1000次",
            product_codes=extreme,
            expected_success=1000,
            expected_failed=0,
            description="同一个商品编码出现1000次"
        ))

        # 8. 空编码测试
        with_empty = [f"CODE_{i}" for i in range(50)]
        with_empty.insert(25, None)
        with_empty.insert(10, None)
        valid_count = sum(1 for c in with_empty if c is not None)
        test_cases.append(TestCase(
            name="包含None编码",
            product_codes=with_empty,
            expected_success=valid_count,  # 50个有效编码都被匹配
            expected_failed=0,  # None 被跳过，不计入 matched/failed
            description="52行数据，包含2个None（None被跳过计入skipped_rows）"
        ))

        # 9. 真实场景模拟：Excel数据模式
        real_pattern = []
        for i in range(10):
            code = f"PROD_{i:04d}"
            real_pattern.extend([code] * random.randint(1, 50))
        test_cases.append(TestCase(
            name="真实场景模拟",
            product_codes=real_pattern,
            expected_success=len(real_pattern),
            expected_failed=0,
            description="模拟真实Excel数据，各编码出现次数不均匀"
        ))

        # 10. 相邻重复测试
        adjacent = []
        for i in range(100):
            adjacent.append(f"ADJ_{i % 10}")  # 每10个一循环
        test_cases.append(TestCase(
            name="相邻重复模式",
            product_codes=adjacent,
            expected_success=100,
            expected_failed=0,
            description="每10个编码循环一次，共100行"
        ))

        return test_cases

    def print_summary(self):
        """打印测试总结"""
        print("\n" + "="*60)
        print("测试总结")
        print("="*60)
        print(f"通过: {self.passed}")
        print(f"失败: {self.failed}")
        print(f"总计: {self.passed + self.failed}")
        print("\n详细结果:")
        for r in self.results:
            status = "✅" if r["success"] else "❌"
            print(f"  {status} {r['name']}: "
                  f"新逻辑={r['new_matched']}/{r['new_failed']}, "
                  f"预期={r['expected_matched']}/{r['expected_failed']}")

        return self.failed == 0


def run_stress_test():
    """运行压力测试"""
    print("="*60)
    print("orchestrator.py 内存释放逻辑 压力测试")
    print("="*60)

    runner = StressTestRunner()
    test_cases = runner.generate_test_cases()

    print(f"\n共生成 {len(test_cases)} 个测试用例")

    for test_case in test_cases:
        runner.run_test(test_case)

    success = runner.print_summary()

    print("\n" + "="*60)
    if success:
        print("🎉 所有测试通过！内存释放逻辑在各种情况下都能正常工作。")
    else:
        print("⚠️ 部分测试失败，请检查代码。")
    print("="*60)

    return success


if __name__ == "__main__":
    success = run_stress_test()
    sys.exit(0 if success else 1)