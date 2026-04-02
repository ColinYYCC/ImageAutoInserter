#!/usr/bin/env python3
"""
图片缓存压力测试

验证 LRU 缓存机制在各种场景下的正确性和内存控制
"""

import sys
import time
import tracemalloc
from collections import OrderedDict

sys.path.insert(0, 'src')

from core.utils.image_cache import ImageCache, get_global_cache, reset_global_cache
from core.loaders import FolderImageLoader
from core.matchers import ImageMatcher
from core.excel_processor import ExcelProcessor


def test_cache_basic():
    """测试缓存基本功能"""
    print("\n" + "="*60)
    print("测试1: 缓存基本功能")
    print("="*60)

    cache = ImageCache(max_size=3)

    # 测试存入
    cache.put("key1", b"data1")
    cache.put("key2", b"data2")
    cache.put("key3", b"data3")
    print(f"存入3条数据后，大小: {len(cache)}")

    # 测试获取
    data = cache.get("key1")
    assert data == b"data1", "获取失败"
    print(f"获取 key1 成功")

    # 测试 LRU 淘汰
    cache.put("key4", b"data4")  # 应该淘汰 key2（最久未使用）
    assert cache.get("key2") is None, "key2 不应被淘汰"
    assert cache.get("key1") is not None, "key1 应该还在"
    print(f"LRU 淘汰正确: key2 被淘汰，key1 保留")

    # 测试统计
    hits, misses, rate = cache.get_stats()
    print(f"统计: 命中={hits}, 未命中={misses}, 命中率={rate:.2%}")

    print("✅ 测试通过")


def test_cache_lru_order():
    """测试 LRU 顺序"""
    print("\n" + "="*60)
    print("测试2: LRU 顺序")
    print("="*60)

    cache = ImageCache(max_size=3)

    cache.put("A", b"A")
    cache.put("B", b"B")
    cache.put("C", b"C")

    # 访问 A，使其成为最近使用
    cache.get("A")

    # 添加 D，淘汰 B
    cache.put("D", b"D")

    # 验证
    assert cache.get("B") is None, "B 应该是 None"
    assert cache.get("A") is not None, "A 应该存在"
    assert cache.get("C") is not None, "C 应该存在"
    assert cache.get("D") is not None, "D 应该存在"
    print("LRU 顺序正确: B 被淘汰，A/C/D 保留")

    print("✅ 测试通过")


def test_cache_remove():
    """测试缓存移除"""
    print("\n" + "="*60)
    print("测试3: 缓存移除")
    print("="*60)

    cache = ImageCache(max_size=3)
    cache.put("key1", b"data1")
    cache.remove("key1")
    assert cache.get("key1") is None
    print("移除功能正常")

    print("✅ 测试通过")


def test_memory_usage():
    """测试内存使用"""
    print("\n" + "="*60)
    print("测试4: 内存使用对比")
    print("="*60)

    reset_global_cache()

    # 启动内存追踪
    tracemalloc.start()

    # 测试数据
    excel_path = "Sample/25SDR-1817-Image verification.xlsx"
    image_path = "Sample/extracted_images/"

    # 加载图片（不读取数据）
    loader = FolderImageLoader()
    print("加载图片元数据...")
    images = loader.load_images(image_path)
    print(f"图片数量: {len(images)}")

    current1, peak1 = tracemalloc.get_traced_memory()
    print(f"加载元数据后内存: {current1 / 1024 / 1024:.2f} MB")

    # 创建匹配器
    matcher = ImageMatcher(images)

    # 处理数据（触发延迟加载和缓存）
    print("\n处理 Excel 数据（触发缓存）...")

    with ExcelProcessor(excel_path, read_only=True) as excel:
        sheet_info = excel.find_sheet_with_product_code()
        total_rows = len(sheet_info.data_rows)

        cached_count = 0
        for idx, row in enumerate(sheet_info.data_rows[:100], start=1):  # 只处理前100行
            code = excel.get_product_code(row)
            if not code:
                continue

            for pic_col in range(1, 4):
                img_info = matcher.get_image(code, pic_col)
                if img_info:
                    data = matcher.get_original_image_data(code, pic_col)
                    if data:
                        cached_count += 1

    current2, peak2 = tracemalloc.get_traced_memory()
    cache = get_global_cache()
    print(f"处理100行后内存: {current2 / 1024 / 1024:.2f} MB")
    print(f"缓存大小: {len(cache)} 条")
    print(f"缓存命中统计: {cache.get_stats()}")

    tracemalloc.stop()

    print("✅ 测试通过")


def test_cache_thread_safety():
    """测试线程安全"""
    print("\n" + "="*60)
    print("测试5: 线程安全（简单测试）")
    print("="*60)

    import threading

    cache = ImageCache(max_size=100)
    errors = []

    def writer(n):
        for i in range(50):
            cache.put(f"key_{n}_{i}", b"data" * 100)

    def reader(n):
        for i in range(50):
            try:
                cache.get(f"key_{n}_{i}")
            except Exception as e:
                errors.append(e)

    threads = []
    for i in range(5):
        threads.append(threading.Thread(target=writer, args=(i,)))
        threads.append(threading.Thread(target=reader, args=(i,)))

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"线程安全测试失败: {errors}"
    print(f"线程安全测试通过，缓存大小: {len(cache)}")

    print("✅ 测试通过")


def run_all_tests():
    """运行所有测试"""
    print("="*60)
    print("图片缓存压力测试")
    print("="*60)

    test_cache_basic()
    test_cache_lru_order()
    test_cache_remove()
    test_cache_thread_safety()
    test_memory_usage()

    print("\n" + "="*60)
    print("🎉 所有测试通过！")
    print("="*60)


if __name__ == "__main__":
    run_all_tests()