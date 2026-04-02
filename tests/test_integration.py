"""
端到端集成测试

使用 Sample 文件测试完整的处理流程
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.image_processor import ImageProcessor
from src.core.process_engine import ProcessEngine, ImageMatcher


def test_sample_files():
    """
    使用 Sample 文件进行端到端测试
    """
    print("=" * 80)
    print("ImageAutoInserter 端到端测试")
    print("=" * 80)
    
    # Sample 文件路径
    rar_path = project_root / "Sample" / "0076 xxx.rar"
    excel_path = project_root / "Sample" / "PL-26SDR-0076-带图.xlsx"
    output_path = project_root / "Sample" / "PL-26SDR-0076-带图_测试输出.xlsx"
    
    # 检查文件是否存在
    print("\n📁 检查文件...")
    print(f"  RAR 文件：{rar_path}")
    print(f"    存在：{rar_path.exists()}")
    
    print(f"  Excel 文件：{excel_path}")
    print(f"    存在：{excel_path.exists()}")
    
    if not rar_path.exists():
        print(f"\n❌ 错误：RAR 文件不存在：{rar_path}")
        return False
    
    if not excel_path.exists():
        print(f"\n❌ 错误：Excel 文件不存在：{excel_path}")
        return False
    
    # 测试 1：图片加载
    print("\n" + "=" * 80)
    print("测试 1: 从 RAR 压缩包加载图片")
    print("=" * 80)
    
    try:
        processor = ImageProcessor()
        images = processor.load_images_from_rar(str(rar_path))
        
        print(f"\n✅ 成功加载 {len(images)} 张图片")
        
        # 显示图片信息
        print("\n图片列表:")
        for img in images:
            print(f"  - 商品编码：{img.product_code}")
            print(f"    序号：{img.sequence}")
            print(f"    Picture 列：{img.picture_column}")
            print(f"    格式：{img.image_format}")
            print(f"    来源：{img.source_path}")
            print()
        
        # 统计信息
        matcher = ImageMatcher(images)
        stats = matcher.get_statistics()
        print(f"📊 统计信息:")
        print(f"  总图片数：{stats['total_images']}")
        print(f"  唯一商品数：{stats['unique_products']}")
        print(f"  Picture 1 数量：{stats['picture_1_count']}")
        print(f"  Picture 2 数量：{stats['picture_2_count']}")
        print(f"  Picture 3 数量：{stats['picture_3_count']}")
        
    except Exception as e:
        print(f"\n❌ 图片加载失败：{e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试 2：Excel 处理
    print("\n" + "=" * 80)
    print("测试 2: Excel 文件处理")
    print("=" * 80)
    
    try:
        from src.core.excel_processor import ExcelProcessor
        
        print(f"\n📄 处理 Excel 文件：{excel_path}")
        
        with ExcelProcessor(str(excel_path), read_only=False) as excel:
            # 查找包含商品编码的工作表
            print("\n🔍 查找商品编码列...")
            sheet_info = excel.find_sheet_with_product_code()
            
            if not sheet_info:
                print("❌ 未找到包含「商品编码」列的工作表")
                return False
            
            print(f"✅ 找到工作表：{sheet_info.name}")
            print(f"  表头行：{sheet_info.header_row}")
            print(f"  商品编码列：{sheet_info.product_code_column}")
            print(f"  数据行数：{len(sheet_info.data_rows)}")
            
            # 获取商品编码列表
            print("\n📋 商品编码列表:")
            codes = excel.get_product_codes()
            for i, code in enumerate(codes, 1):
                print(f"  {i}. {code}")
            
            # 添加 Picture 列
            print("\n🖼️  添加 Picture 列...")
            picture_columns = excel.add_picture_columns()
            print(f"✅ 添加成功：{list(picture_columns.keys())}")
            print(f"  Picture 1 列号：{picture_columns['Picture 1']}")
            print(f"  Picture 2 列号：{picture_columns['Picture 2']}")
            print(f"  Picture 3 列号：{picture_columns['Picture 3']}")
            
            # 测试图片嵌入（仅测试第一行）
            if codes and images:
                print("\n📌 测试图片嵌入...")
                first_code = codes[0]
                print(f"  测试商品：{first_code}")
                
                # 查找匹配的图片
                for pic_col in [1, 2, 3]:
                    img = matcher.get_image(first_code, pic_col)
                    if img:
                        print(f"    ✓ 找到 Picture {pic_col}: {img.source_path}")
                        # 嵌入图片
                        excel.embed_image(
                            row=sheet_info.data_rows[0],
                            column=picture_columns[f"Picture {pic_col}"],
                            source=img.image_data,
                            width=180,
                            height=138
                        )
                        print(f"      ✅ 嵌入成功")
                    else:
                        print(f"    ⚠️  Picture {pic_col}: 无匹配图片")
            
            # 保存文件
            print(f"\n💾 保存文件...")
            saved_path = excel.save(str(output_path))
            print(f"✅ 文件已保存：{saved_path}")
            print(f"  文件大小：{saved_path.stat().st_size / 1024:.2f} KB")
            
    except Exception as e:
        print(f"\n❌ Excel 处理失败：{e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试 3：完整流程
    print("\n" + "=" * 80)
    print("测试 3: 完整处理流程")
    print("=" * 80)
    
    try:
        engine = ProcessEngine()
        
        # 定义回调函数
        def on_progress(info):
            print(f"\r  进度：{info.percentage:5.1f}% | "
                  f"行 {info.current_row}/{info.total_rows} | "
                  f"{info.current_action} | "
                  f"商品：{info.product_code or 'N/A'}", 
                  end='', flush=True)
        
        def log(message):
            print(f"  {message}")
        
        print(f"\n🚀 开始处理...")
        print(f"  Excel: {excel_path}")
        print(f"  图片：{rar_path}")
        print(f"  输出：{output_path}")
        print()
        
        result = engine.process(
            excel_path=str(excel_path),
            image_source=str(rar_path),
            output_path=str(output_path),
            progress_callback=on_progress,
            log_callback=log
        )
        
        print("\n")
        print("=" * 80)
        print("处理结果")
        print("=" * 80)
        print(f"  成功：{result.success}")
        print(f"  总行数：{result.total_rows}")
        print(f"  成功行数：{result.success_rows}")
        print(f"  失败行数：{result.failed_rows}")
        print(f"  跳过行数：{result.skipped_rows}")
        print(f"  错误数量：{len(result.errors)}")
        print(f"  耗时：{result.duration_seconds:.2f} 秒")
        print(f"  输出文件：{result.output_path}")
        
        if result.errors:
            print("\n  错误详情:")
            for error in result.errors:
                print(f"    - 行{error.row}: {error.error_type} - {error.error_message}")
        
        if result.success:
            print("\n✅ 测试成功！")
            return True
        else:
            print("\n❌ 测试失败！")
            return False
            
    except Exception as e:
        print(f"\n❌ 完整流程测试失败：{e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_sample_files()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 所有测试通过！")
    else:
        print("❌ 测试失败，请检查错误信息")
    print("=" * 80)
    
    sys.exit(0 if success else 1)
