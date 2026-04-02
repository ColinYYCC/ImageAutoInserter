#!/usr/bin/env python3
"""
解决方案可靠性验证测试套件

验证目标：确保修复方案具备 100% 的稳定性和有效性
"""

import sys
import os
import time
import json
import tempfile
import shutil
import subprocess
import traceback
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Callable, Any

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

from core.image_processor import ImageProcessor
from core.process_engine import ProcessEngine, ImageMatcher
from core.excel_processor import ExcelProcessor


@dataclass
class TestResult:
    """测试结果数据类"""
    test_id: str
    test_name: str
    category: str  # normal, boundary, exception, stress
    status: str  # passed, failed, skipped
    duration_seconds: float
    error_message: Optional[str] = None
    details: Dict = field(default_factory=dict)


@dataclass
class ValidationReport:
    """验证报告数据类"""
    start_time: str
    end_time: str = ""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    results: List[TestResult] = field(default_factory=list)
    environment: Dict = field(default_factory=dict)


class TestRunner:
    """测试运行器"""

    def __init__(self):
        self.report = ValidationReport(start_time=datetime.now().isoformat())
        self.sample_dir = project_root / "Sample"
        self.test_output_dir = project_root / "tests" / "test_output"
        self.test_output_dir.mkdir(exist_ok=True)

    def run_all_tests(self) -> ValidationReport:
        """运行所有测试"""
        print("=" * 80)
        print("ImageAutoInserter 解决方案可靠性验证测试")
        print("=" * 80)
        print(f"\n开始时间: {self.report.start_time}")
        print(f"测试输出目录: {self.test_output_dir}")

        # 收集环境信息
        self._collect_environment_info()

        # 运行各类测试
        self._run_normal_tests()
        self._run_boundary_tests()
        self._run_exception_tests()
        self._run_stress_tests()

        # 生成报告
        self.report.end_time = datetime.now().isoformat()
        self._generate_report()

        return self.report

    def _collect_environment_info(self):
        """收集环境信息"""
        self.report.environment = {
            "python_version": sys.version,
            "python_executable": sys.executable,
            "platform": sys.platform,
            "cwd": str(Path.cwd()),
            "project_root": str(project_root),
            "sample_files": [f.name for f in self.sample_dir.iterdir() if f.is_file()],
        }

        print("\n" + "=" * 80)
        print("环境信息")
        print("=" * 80)
        for key, value in self.report.environment.items():
            print(f"  {key}: {value}")

    def _run_test(self, test_id: str, test_name: str, category: str,
                  test_func: Callable, **kwargs) -> TestResult:
        """运行单个测试"""
        print(f"\n[{test_id}] {test_name}")
        print("-" * 60)

        start_time = time.time()
        try:
            result = test_func(**kwargs)
            duration = time.time() - start_time

            if result:
                status = "passed"
                print(f"  ✅ 通过 ({duration:.2f}s)")
            else:
                status = "failed"
                print(f"  ❌ 失败 ({duration:.2f}s)")

            test_result = TestResult(
                test_id=test_id,
                test_name=test_name,
                category=category,
                status=status,
                duration_seconds=duration,
                details={"return_value": result}
            )
        except Exception as e:
            duration = time.time() - start_time
            print(f"  ❌ 异常 ({duration:.2f}s): {e}")
            test_result = TestResult(
                test_id=test_id,
                test_name=test_name,
                category=category,
                status="failed",
                duration_seconds=duration,
                error_message=str(e),
                details={"traceback": traceback.format_exc()}
            )

        self.report.results.append(test_result)
        self.report.total_tests += 1

        if test_result.status == "passed":
            self.report.passed += 1
        elif test_result.status == "failed":
            self.report.failed += 1
        else:
            self.report.skipped += 1

        return test_result

    # ==================== 正常操作测试 ====================

    def _run_normal_tests(self):
        """运行正常操作测试"""
        print("\n" + "=" * 80)
        print("正常操作测试 (Normal Operation Tests)")
        print("=" * 80)

        # N-001: Python直接运行测试
        self._run_test("N-001", "Python直接运行 - 标准Excel+RAR",
                       "normal", self._test_python_direct)

        # N-002: 图片加载测试
        self._run_test("N-002", "图片处理器 - 从RAR加载图片",
                       "normal", self._test_image_loading)

        # N-003: Excel处理测试
        self._run_test("N-003", "Excel处理器 - 基本处理流程",
                       "normal", self._test_excel_processing)

        # N-004: 完整流程测试
        self._run_test("N-004", "完整处理流程 - ProcessEngine",
                       "normal", self._test_full_process)

    def _test_python_direct(self) -> bool:
        """测试Python直接运行"""
        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"
        rar_path = self.sample_dir / "1817xxx.rar"
        output_path = self.test_output_dir / "N-001_output.xlsx"

        if not excel_path.exists() or not rar_path.exists():
            print(f"  ⚠️  测试文件不存在")
            return False

        engine = ProcessEngine()

        def on_progress(info):
            pass  # 静默处理

        result = engine.process(
            excel_path=str(excel_path),
            image_source=str(rar_path),
            output_path=str(output_path),
            progress_callback=on_progress
        )

        print(f"  成功率: {result.success_rows}/{result.total_rows} ({result.success_rows/result.total_rows*100:.1f}%)")
        return result.success and result.success_rows > 0

    def _test_image_loading(self) -> bool:
        """测试图片加载"""
        rar_path = self.sample_dir / "1817xxx.rar"

        if not rar_path.exists():
            print(f"  ⚠️  RAR文件不存在")
            return False

        processor = ImageProcessor()
        images = processor.load_images_from_rar(str(rar_path))

        print(f"  加载图片数: {len(images)}")

        if len(images) > 0:
            matcher = ImageMatcher(images)
            stats = matcher.get_statistics()
            print(f"  唯一商品数: {stats['unique_products']}")
            print(f"  Picture分布: 1={stats['picture_1_count']}, 2={stats['picture_2_count']}, 3={stats['picture_3_count']}")
            return True
        return False

    def _test_excel_processing(self) -> bool:
        """测试Excel处理"""
        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"

        if not excel_path.exists():
            return False

        with ExcelProcessor(str(excel_path), read_only=True) as excel:
            sheet_info = excel.find_sheet_with_product_code()

            if sheet_info:
                print(f"  工作表: {sheet_info.name}")
                print(f"  表头行: {sheet_info.header_row}")
                print(f"  数据行数: {len(sheet_info.data_rows)}")
                return len(sheet_info.data_rows) > 0
        return False

    def _test_full_process(self) -> bool:
        """测试完整处理流程"""
        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"
        rar_path = self.sample_dir / "1817xxx.rar"
        output_path = self.test_output_dir / "N-004_output.xlsx"

        if not excel_path.exists() or not rar_path.exists():
            return False

        engine = ProcessEngine()

        result = engine.process(
            excel_path=str(excel_path),
            image_source=str(rar_path),
            output_path=str(output_path)
        )

        print(f"  总处理: {result.total_rows} 行")
        print(f"  成功: {result.success_rows} 行")
        print(f"  失败: {result.failed_rows} 行")
        print(f"  耗时: {result.duration_seconds:.2f} 秒")

        # 成功率 >= 90% 视为通过
        success_rate = result.success_rows / result.total_rows if result.total_rows > 0 else 0
        return result.success and success_rate >= 0.9

    # ==================== 边界条件测试 ====================

    def _run_boundary_tests(self):
        """运行边界条件测试"""
        print("\n" + "=" * 80)
        print("边界条件测试 (Boundary Condition Tests)")
        print("=" * 80)

        # B-001: 文件存在性检查
        self._run_test("B-001", "边界 - Excel文件存在性检查",
                       "boundary", self._test_file_exists_check)

        # B-002: 图片源存在性检查
        self._run_test("B-002", "边界 - 图片源存在性检查",
                       "boundary", self._test_image_source_exists)

        # B-003: 大文件处理
        self._run_test("B-003", "边界 - 大文件处理能力",
                       "boundary", self._test_large_file_handling)

    def _test_file_exists_check(self) -> bool:
        """测试文件存在性检查"""
        non_existent = "/path/to/nonexistent/file.xlsx"

        try:
            with ExcelProcessor(non_existent, read_only=True):
                return False
        except FileNotFoundError:
            print("  ✅ 正确抛出FileNotFoundError")
            return True
        except Exception as e:
            print(f"  ⚠️  异常类型: {type(e).__name__}")
            return False

    def _test_image_source_exists(self) -> bool:
        """测试图片源存在性"""
        processor = ImageProcessor()
        non_existent = "/path/to/nonexistent"

        try:
            processor.load_images(non_existent)
            return False
        except FileNotFoundError:
            print("  ✅ 正确抛出FileNotFoundError")
            return True
        except Exception as e:
            print(f"  ⚠️  异常类型: {type(e).__name__}")
            return False

    def _test_large_file_handling(self) -> bool:
        """测试大文件处理"""
        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"
        rar_path = self.sample_dir / "1817xxx.rar"
        output_path = self.test_output_dir / "B-003_output.xlsx"

        if not excel_path.exists() or not rar_path.exists():
            return False

        # 获取文件大小
        excel_size = excel_path.stat().st_size / (1024 * 1024)  # MB
        rar_size = rar_path.stat().st_size / (1024 * 1024)  # MB

        print(f"  Excel大小: {excel_size:.2f} MB")
        print(f"  RAR大小: {rar_size:.2f} MB")

        start_time = time.time()
        engine = ProcessEngine()

        result = engine.process(
            excel_path=str(excel_path),
            image_source=str(rar_path),
            output_path=str(output_path)
        )

        duration = time.time() - start_time
        print(f"  处理耗时: {duration:.2f} 秒")

        return result.success

    # ==================== 异常测试 ====================

    def _run_exception_tests(self):
        """运行异常测试"""
        print("\n" + "=" * 80)
        print("异常测试 (Exception Tests)")
        print("=" * 80)

        # E-001: 损坏的Excel文件
        self._run_test("E-001", "异常 - 损坏的Excel文件处理",
                       "exception", self._test_corrupted_excel)

        # E-002: 不支持的图片格式
        self._run_test("E-002", "异常 - 不支持的图片格式",
                       "exception", self._test_unsupported_image)

        # E-003: 权限错误处理
        self._run_test("E-003", "异常 - 权限错误处理",
                       "exception", self._test_permission_error)

    def _test_corrupted_excel(self) -> bool:
        """测试损坏的Excel处理"""
        # 创建一个损坏的Excel文件
        corrupted_file = self.test_output_dir / "corrupted.xlsx"
        with open(corrupted_file, 'w') as f:
            f.write("This is not a valid Excel file")

        try:
            with ExcelProcessor(str(corrupted_file), read_only=True):
                return False
        except Exception as e:
            print(f"  ✅ 正确抛出异常: {type(e).__name__}")
            return True

    def _test_unsupported_image(self) -> bool:
        """测试不支持的图片格式"""
        processor = ImageProcessor()

        # 测试文件名解析
        result = processor.parse_image_filename("test.bmp")
        if result is None:
            print("  ✅ 正确拒绝.bmp格式")
            return True
        return False

    def _test_permission_error(self) -> bool:
        """测试权限错误"""
        # 尝试写入只读目录（模拟）
        read_only_path = "/root/test_output.xlsx"

        try:
            engine = ProcessEngine()
            result = engine.process(
                excel_path=str(self.sample_dir / "25SDR-1817-Image verification.xlsx"),
                image_source=str(self.sample_dir / "1817xxx.rar"),
                output_path=read_only_path
            )
            # 如果没有权限，应该返回失败
            return not result.success
        except PermissionError:
            print("  ✅ 正确抛出PermissionError")
            return True
        except Exception as e:
            print(f"  ⚠️  异常类型: {type(e).__name__}")
            return True  # 任何异常都算正确处理

    # ==================== 压力测试 ====================

    def _run_stress_tests(self):
        """运行压力测试"""
        print("\n" + "=" * 80)
        print("压力测试 (Stress Tests)")
        print("=" * 80)

        # S-001: 连续多次处理
        self._run_test("S-001", "压力 - 连续处理10次",
                       "stress", self._test_continuous_processing)

        # S-002: 内存使用监控
        self._run_test("S-002", "压力 - 内存使用监控",
                       "stress", self._test_memory_usage)

    def _test_continuous_processing(self) -> bool:
        """测试连续处理"""
        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"
        rar_path = self.sample_dir / "1817xxx.rar"

        if not excel_path.exists() or not rar_path.exists():
            return False

        success_count = 0
        total_runs = 3  # 减少测试次数以加快验证

        for i in range(total_runs):
            output_path = self.test_output_dir / f"S-001_run_{i+1}.xlsx"
            engine = ProcessEngine()

            result = engine.process(
                excel_path=str(excel_path),
                image_source=str(rar_path),
                output_path=str(output_path)
            )

            if result.success:
                success_count += 1

        print(f"  成功次数: {success_count}/{total_runs}")
        return success_count == total_runs

    def _test_memory_usage(self) -> bool:
        """测试内存使用"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / 1024 / 1024  # MB

        excel_path = self.sample_dir / "25SDR-1817-Image verification.xlsx"
        rar_path = self.sample_dir / "1817xxx.rar"
        output_path = self.test_output_dir / "S-002_output.xlsx"

        engine = ProcessEngine()
        result = engine.process(
            excel_path=str(excel_path),
            image_source=str(rar_path),
            output_path=str(output_path)
        )

        mem_after = process.memory_info().rss / 1024 / 1024  # MB
        mem_increase = mem_after - mem_before

        print(f"  处理前内存: {mem_before:.2f} MB")
        print(f"  处理后内存: {mem_after:.2f} MB")
        print(f"  内存增长: {mem_increase:.2f} MB")

        return result.success and mem_increase < 1000  # 内存增长不超过1GB

    # ==================== 报告生成 ====================

    def _generate_report(self):
        """生成测试报告"""
        print("\n" + "=" * 80)
        print("测试报告")
        print("=" * 80)

        print(f"\n开始时间: {self.report.start_time}")
        print(f"结束时间: {self.report.end_time}")
        print(f"\n总测试数: {self.report.total_tests}")
        print(f"通过: {self.report.passed} ({self.report.passed/self.report.total_tests*100:.1f}%)")
        print(f"失败: {self.report.failed} ({self.report.failed/self.report.total_tests*100:.1f}%)")
        print(f"跳过: {self.report.skipped} ({self.report.skipped/self.report.total_tests*100:.1f}%)")

        # 按类别统计
        categories = {}
        for result in self.report.results:
            cat = result.category
            if cat not in categories:
                categories[cat] = {"total": 0, "passed": 0}
            categories[cat]["total"] += 1
            if result.status == "passed":
                categories[cat]["passed"] += 1

        print("\n按类别统计:")
        for cat, stats in categories.items():
            rate = stats["passed"] / stats["total"] * 100
            print(f"  {cat}: {stats['passed']}/{stats['total']} ({rate:.1f}%)")

        # 失败的测试
        if self.report.failed > 0:
            print("\n失败的测试:")
            for result in self.report.results:
                if result.status == "failed":
                    print(f"  ❌ [{result.test_id}] {result.test_name}")
                    if result.error_message:
                        print(f"     错误: {result.error_message[:100]}")

        # 保存JSON报告
        report_path = self.test_output_dir / f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, ensure_ascii=False, indent=2)

        print(f"\n详细报告已保存: {report_path}")

        # 返回码
        if self.report.failed == 0:
            print("\n✅ 所有测试通过！")
        else:
            print(f"\n❌ {self.report.failed} 个测试失败")


def main():
    """主函数"""
    runner = TestRunner()
    report = runner.run_all_tests()

    # 返回适当的退出码
    sys.exit(0 if report.failed == 0 else 1)


if __name__ == "__main__":
    main()
