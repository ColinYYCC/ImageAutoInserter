"""
图片处理器单元测试
"""

import pytest
from pathlib import Path
from src.core.image_processor import ImageProcessor, ImageInfo


class TestImageProcessor:
    """图片处理器测试类"""
    
    @pytest.fixture
    def processor(self):
        """创建 ImageProcessor 实例"""
        return ImageProcessor()
    
    def test_parse_filename_valid(self, processor):
        """测试解析有效的图片文件名"""
        # 测试标准格式
        result = processor.parse_image_filename("C000641234100-01.jpg")
        assert result == ("C000641234100", "01", "jpg")
        
        # 测试 PNG 格式
        result = processor.parse_image_filename("C000641234100-02.png")
        assert result == ("C000641234100", "02", "png")
        
        # 测试 JPEG 格式
        result = processor.parse_image_filename("C000641234100-03.jpeg")
        assert result == ("C000641234100", "03", "jpeg")
    
    def test_parse_filename_invalid(self, processor):
        """测试解析无效的图片文件名"""
        # 序号无效 (超过 10)
        result = processor.parse_image_filename("C001-11.jpg")
        assert result is None
        
        # 序号无效 (00)
        result = processor.parse_image_filename("C001-00.jpg")
        assert result is None
        
        # 格式不支持
        result = processor.parse_image_filename("C001-01.gif")
        assert result is None
        
        # 没有序号
        result = processor.parse_image_filename("C001.jpg")
        assert result is None
        
        # 空商品编码
        result = processor.parse_image_filename("-01.jpg")
        assert result is None
    
    def test_load_images_from_folder_not_exists(self, processor):
        """测试从不存在的文件夹加载图片"""
        with pytest.raises(FileNotFoundError):
            processor.load_images_from_folder("/non/existent/path")
    
    def test_load_images_from_folder_empty(self, processor, tmp_path):
        """测试从空文件夹加载图片"""
        # 创建临时空目录
        temp_dir = tmp_path / "empty_images"
        temp_dir.mkdir()
        
        with pytest.raises(ValueError, match="文件夹中没有找到有效图片"):
            processor.load_images_from_folder(str(temp_dir))
    
    def test_load_images_from_folder_with_images(self, processor, tmp_path):
        """测试从文件夹加载图片"""
        from PIL import Image
        import io
        
        # 创建临时目录和图片
        temp_dir = tmp_path / "images"
        temp_dir.mkdir()
        
        # 创建测试图片
        img = Image.new('RGB', (100, 100), color='red')
        img_path = temp_dir / "C001-01.jpg"
        img.save(img_path)
        
        # 加载图片
        images = processor.load_images_from_folder(str(temp_dir))
        
        assert len(images) == 1
        assert images[0].product_code == "C001"
        assert images[0].sequence == "01"
        assert images[0].picture_column == 1
        assert images[0].image_format == "jpg"
    
    def test_image_info_validation(self):
        """测试 ImageInfo 数据验证"""
        # 有效的 ImageInfo
        info = ImageInfo(
            product_code="C001",
            sequence="01",
            picture_column=1,
            image_format="jpg",
            source_path="/path/to/image.jpg"
        )
        assert info.product_code == "C001"
        
        # 有效的序号 (04 现在是有效的)
        info2 = ImageInfo(
            product_code="C001",
            sequence="04",
            picture_column=4,
            image_format="jpg",
            source_path="/path/to/image.jpg"
        )
        assert info2.sequence == "04"
        
        # 无效的序号 (超过 10)
        with pytest.raises(ValueError, match="无效的序号"):
            ImageInfo(
                product_code="C001",
                sequence="11",
                picture_column=11,
                image_format="jpg",
                source_path="/path/to/image.jpg"
            )
        
        # 无效的 Picture 列 (超过 10)
        with pytest.raises(ValueError, match="无效的 Picture 列号"):
            ImageInfo(
                product_code="C001",
                sequence="01",
                picture_column=11,
                image_format="jpg",
                source_path="/path/to/image.jpg"
            )
        
        # 不支持的图片格式
        with pytest.raises(ValueError, match="不支持的图片格式"):
            ImageInfo(
                product_code="C001",
                sequence="01",
                picture_column=1,
                image_format="gif",
                source_path="/path/to/image.jpg"
            )


class TestImageMatcher:
    """图片匹配器测试类"""
    
    @pytest.fixture
    def sample_images(self):
        """创建示例图片列表"""
        return [
            ImageInfo(
                product_code="C001",
                sequence="01",
                picture_column=1,
                image_format="jpg",
                source_path="/path/to/C001-01.jpg"
            ),
            ImageInfo(
                product_code="C001",
                sequence="02",
                picture_column=2,
                image_format="jpg",
                source_path="/path/to/C001-02.jpg"
            ),
            ImageInfo(
                product_code="C002",
                sequence="01",
                picture_column=1,
                image_format="jpg",
                source_path="/path/to/C002-01.jpg"
            ),
        ]
    
    def test_matcher_creation(self, sample_images):
        """测试匹配器创建"""
        from src.core.process_engine import ImageMatcher
        
        matcher = ImageMatcher(sample_images)
        assert matcher is not None
    
    def test_get_image(self, sample_images):
        """测试获取图片"""
        from src.core.process_engine import ImageMatcher
        
        matcher = ImageMatcher(sample_images)
        
        # 获取存在的图片
        img = matcher.get_image("C001", 1)
        assert img is not None
        assert img.product_code == "C001"
        
        # 获取不存在的图片
        img = matcher.get_image("C003", 1)
        assert img is None
    
    def test_has_image(self, sample_images):
        """测试检查图片是否存在"""
        from src.core.process_engine import ImageMatcher
        
        matcher = ImageMatcher(sample_images)
        
        assert matcher.has_image("C001", 1) is True
        assert matcher.has_image("C001", 3) is False
        assert matcher.has_image("C003", 1) is False
    
    def test_get_statistics(self, sample_images):
        """测试获取统计信息"""
        from src.core.process_engine import ImageMatcher
        
        matcher = ImageMatcher(sample_images)
        stats = matcher.get_statistics()
        
        assert stats['total_images'] == 3
        assert stats['unique_products'] == 2
        assert stats['picture_1_count'] == 2
        assert stats['picture_2_count'] == 1
        assert stats['picture_3_count'] == 0
