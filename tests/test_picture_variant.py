"""
Picture 变体识别单元测试

测试模块：src/core/picture_variant.py
"""

import pytest
from src.core.picture_variant import (
    SpellingCorrector,
    VariantRecognizer,
    PictureColumnMapper,
    PictureColumn,
    ColumnAdditionResult,
    recognize_variant,
    correct_spelling,
    is_picture_variant
)


class TestSpellingCorrector:
    """测试拼写纠错器"""
    
    def setup_method(self):
        """每个测试前的设置"""
        self.corrector = SpellingCorrector()
    
    def test_photo_corrections(self):
        """测试 Photo 相关拼写纠错"""
        assert self.corrector.correct("Photoes") == "Photos"
        assert self.corrector.correct("Foto") == "Photo"
        assert self.corrector.correct("Fotos") == "Photos"
    
    def test_picture_corrections(self):
        """测试 Picture 相关拼写纠错"""
        assert self.corrector.correct("Pitures") == "Pictures"
        assert self.corrector.correct("Piture") == "Picture"
        assert self.corrector.correct("Picure") == "Picture"
        assert self.corrector.correct("Picures") == "Pictures"
    
    def test_image_corrections(self):
        """测试 Image 相关拼写纠错"""
        assert self.corrector.correct("Imgs") == "Images"
        assert self.corrector.correct("Imge") == "Image"
    
    def test_figure_corrections(self):
        """测试 Figure 相关拼写纠错"""
        assert self.corrector.correct("Fig") == "Figure"
    
    def test_chinese_corrections(self):
        """测试中文拼写纠错"""
        assert self.corrector.correct("图片片") == "图片"
        assert self.corrector.correct("照照片") == "照片"
    
    def test_no_correction_needed(self):
        """测试不需要纠错的情况"""
        assert self.corrector.correct("Picture") == "Picture"
        assert self.corrector.correct("Photo") == "Photo"
        assert self.corrector.correct("图片") == "图片"
    
    def test_case_preservation(self):
        """测试大小写保持"""
        # 全大写
        assert self.corrector.correct("PHOTOES") == "PHOTOS"
        # 首字母大写
        assert self.corrector.correct("Photoes") == "Photos"
        # 全小写
        assert self.corrector.correct("photoes") == "photos"
    
    def test_get_base_word(self):
        """测试获取基础词（复数转单数）"""
        assert self.corrector.get_base_word("Pictures") == "Picture"
        assert self.corrector.get_base_word("Photos") == "Photo"
        assert self.corrector.get_base_word("Images") == "Image"
        assert self.corrector.get_base_word("Figures") == "Figure"
        # 中文无复数
        assert self.corrector.get_base_word("图片") == "图片"


class TestVariantRecognizer:
    """测试变体识别器"""
    
    def setup_method(self):
        """每个测试前的设置"""
        self.recognizer = VariantRecognizer()
    
    def test_picture_no_space(self):
        """测试无空格 Picture 变体"""
        assert self.recognizer.recognize("Picture1") == ("Picture", 1)
        assert self.recognizer.recognize("Picture2") == ("Picture", 2)
        assert self.recognizer.recognize("Picture3") == ("Picture", 3)
    
    def test_picture_with_space(self):
        """测试有空格 Picture 变体"""
        assert self.recognizer.recognize("Picture 1") == ("Picture", 1)
        assert self.recognizer.recognize("Picture 2") == ("Picture", 2)
    
    def test_photo_variants(self):
        """测试 Photo 变体"""
        assert self.recognizer.recognize("Photo1") == ("Photo", 1)
        assert self.recognizer.recognize("Photo 2") == ("Photo", 2)
        assert self.recognizer.recognize("Photos1") == ("Photo", 1)
    
    def test_image_variants(self):
        """测试 Image 变体"""
        assert self.recognizer.recognize("Image1") == ("Image", 1)
        assert self.recognizer.recognize("Image 2") == ("Image", 2)
    
    def test_figure_variants(self):
        """测试 Figure 变体"""
        assert self.recognizer.recognize("Figure1") == ("Figure", 1)
        assert self.recognizer.recognize("Figure 2") == ("Figure", 2)
    
    def test_chinese_variants(self):
        """测试中文变体"""
        assert self.recognizer.recognize("图片 1") == ("图片", 1)
        assert self.recognizer.recognize("照片 2") == ("照片", 2)
        assert self.recognizer.recognize("图像 3") == ("图像", 3)
        assert self.recognizer.recognize("图 1") == ("图", 1)
    
    def test_case_insensitive(self):
        """测试大小写不敏感"""
        assert self.recognizer.recognize("PICTURE1") == ("Picture", 1)
        assert self.recognizer.recognize("picture1") == ("Picture", 1)
        assert self.recognizer.recognize("Photo1") == ("Photo", 1)
        assert self.recognizer.recognize("photo1") == ("Photo", 1)
    
    def test_spelling_correction_in_recognition(self):
        """测试识别过程中的拼写纠错"""
        assert self.recognizer.recognize("Photoes1") == ("Photo", 1)
        assert self.recognizer.recognize("Pitures2") == ("Picture", 2)
    
    def test_invalid_number_range(self):
        """测试无效编号范围"""
        assert self.recognizer.recognize("Picture0") is None
        assert self.recognizer.recognize("Picture11") is None
        assert self.recognizer.recognize("Picture100") is None
    
    def test_not_picture_variant(self):
        """测试非 Picture 变体"""
        assert self.recognizer.recognize("Name") is None
        assert self.recognizer.recognize("Price") is None
        assert self.recognizer.recognize("商品编码") is None
    
    def test_is_picture_variant(self):
        """测试判断方法"""
        assert self.recognizer.is_picture_variant("Picture1") is True
        assert self.recognizer.is_picture_variant("Photo 2") is True
        assert self.recognizer.is_picture_variant("图片 1") is True
        assert self.recognizer.is_picture_variant("Name") is False
    
    def test_cache_performance(self):
        """测试缓存性能（LRU cache）"""
        import time
        
        # 第一次识别（未缓存）
        start = time.time()
        self.recognizer.recognize("Picture1")
        first_time = time.time() - start
        
        # 第二次识别（已缓存）
        start = time.time()
        self.recognizer.recognize("Picture1")
        second_time = time.time() - start
        
        # 缓存应该更快
        assert second_time <= first_time


class TestPictureColumnMapper:
    """测试 Picture 列映射管理器"""
    
    def setup_method(self):
        """每个测试前的设置"""
        self.mapper = PictureColumnMapper()
    
    def test_calculate_needed_columns(self):
        """测试计算需要添加的列"""
        # 已存在 Picture 1/2，需要 5 列
        self.mapper.existing_columns = {1: 18, 2: 19}
        needed = self.mapper.calculate_needed_columns(5)
        assert needed == [3, 4, 5]
        
        # 已存在 Picture 1/2/3，需要 3 列
        self.mapper.existing_columns = {1: 18, 2: 19, 3: 20}
        needed = self.mapper.calculate_needed_columns(3)
        assert needed == []
        
        # 无已存在列，需要 3 列
        self.mapper.existing_columns = {}
        needed = self.mapper.calculate_needed_columns(3)
        assert needed == [1, 2, 3]
    
    def test_get_max_existing_number(self):
        """测试获取最大已存在编号"""
        self.mapper.existing_columns = {1: 18, 2: 19, 3: 20}
        assert self.mapper.get_max_existing_number() == 3
        
        self.mapper.existing_columns = {}
        assert self.mapper.get_max_existing_number() == 0
    
    def test_to_picture_columns(self):
        """测试转换为 PictureColumn 列表"""
        self.mapper.existing_columns = {1: 18, 2: 19}
        self.mapper.original_headers = {1: "Picture1", 2: "Photo 2"}
        
        columns = self.mapper.to_picture_columns()
        
        assert len(columns) == 2
        assert columns[0].number == 1
        assert columns[0].original_header == "Picture1"
        assert columns[0].column_index == 18
        assert columns[1].number == 2
        assert columns[1].original_header == "Photo 2"
        assert columns[1].column_index == 19


class TestPictureColumn:
    """测试 PictureColumn 数据类"""
    
    def test_to_dict(self):
        """测试转换为字典"""
        col = PictureColumn(
            number=1,
            original_header="Picture1",
            column_index=18,
            is_existing=True
        )
        
        d = col.to_dict()
        
        assert d['number'] == 1
        assert d['original_header'] == "Picture1"
        assert d['column_index'] == 18
        assert d['is_existing'] is True


class TestColumnAdditionResult:
    """测试 ColumnAdditionResult 数据类"""
    
    def test_to_dict(self):
        """测试转换为字典"""
        result = ColumnAdditionResult(
            added_columns=[
                PictureColumn(3, "Picture 3", 20, False)
            ],
            existing_columns=[
                PictureColumn(1, "Picture1", 18, True),
                PictureColumn(2, "Photo 2", 19, True)
            ],
            total_columns=3
        )
        
        d = result.to_dict()
        
        assert len(d['added']) == 1
        assert len(d['existing']) == 2
        assert d['total'] == 3


class TestPublicAPI:
    """测试公共接口函数"""
    
    def test_recognize_variant(self):
        """测试 recognize_variant 函数"""
        assert recognize_variant("Picture1") == ("Picture", 1)
        assert recognize_variant("Photo 2") == ("Photo", 2)
        assert recognize_variant("图片 1") == ("图片", 1)
        assert recognize_variant("Name") is None
    
    def test_correct_spelling(self):
        """测试 correct_spelling 函数"""
        assert correct_spelling("Photoes") == "Photos"
        assert correct_spelling("Pitures") == "Pictures"
    
    def test_is_picture_variant(self):
        """测试 is_picture_variant 函数"""
        assert is_picture_variant("Picture1") is True
        assert is_picture_variant("Photo 2") is True
        assert is_picture_variant("Name") is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
