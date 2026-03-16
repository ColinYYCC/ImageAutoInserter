#!/usr/bin/env python3
"""
文本格式化工具 - Picture 术语空格规范化

功能：
1. 在基础词汇与数字后缀之间插入半角空格
2. 修正基础词汇的拼写错误
3. 支持 Picture/Pictures/Figure/Photo/Photos 等术语
4. 保持基础词汇正确拼写

转换规则：
- "Pitures1" → "Pictures 1"（修正拼写并添加空格）
- "Picture1" → "Picture 1"（仅添加空格）
- "Figure1" → "Figure 1"（仅添加空格）
- "Photoes1" → "Photos 1"（修正拼写并添加空格）
- "Pictures1" → "Pictures 1"（仅添加空格）
"""

import re
from typing import Optional, Tuple


class PictureTextFormatter:
    """
    Picture 术语文本格式化工具
    
    功能：
    1. 拼写纠错
    2. 添加空格分隔符
    3. 标准化输出
    """
    
    # 拼写纠错映射表
    SPELLING_CORRECTIONS = {
        # Photo 相关
        'photoes': 'photos',
        'foto': 'photo',
        'fotos': 'photos',
        
        # Picture 相关
        'pitures': 'pictures',
        'piture': 'picture',
        'picure': 'picture',
        'picures': 'pictures',
        'pictue': 'picture',
        'pictuers': 'pictures',
        
        # Image 相关
        'imgs': 'images',
        'imge': 'image',
        'imges': 'images',
        
        # Figure 相关
        'fig': 'figure',
    }
    
    # 支持的术语列表
    SUPPORTED_TERMS = {
        'picture', 'pictures',
        'photo', 'photos',
        'image', 'images',
        'figure', 'figures',
        'img', 'fig',
    }
    
    def __init__(self):
        """初始化工具"""
        pass
    
    def format_text(self, text: str) -> str:
        """
        格式化文本（处理整个文本字符串）
        
        Args:
            text (str): 输入文本
        
        Returns:
            str: 格式化后的文本
        
        Example:
            >>> formatter = PictureTextFormatter()
            >>> formatter.format_text("Pitures1")
            "Pictures 1"
            >>> formatter.format_text("Picture1")
            "Picture 1"
        """
        # 查找所有可能的术语 + 数字组合
        pattern = r'([A-Za-z]+)(\d+)'
        
        def replace_match(match):
            """替换匹配项"""
            word = match.group(1)
            number = match.group(2)
            
            # 格式化这个词
            formatted = self.format_word_with_number(word, number)
            
            if formatted:
                return formatted
            else:
                # 不是目标术语，保持原样
                return match.group(0)
        
        # 替换所有匹配项
        result = re.sub(pattern, replace_match, text)
        
        return result
    
    def format_word_with_number(self, word: str, number: str) -> Optional[str]:
        """
        格式化带数字的单词
        
        Args:
            word (str): 基础词汇
            number (str): 数字后缀
        
        Returns:
            Optional[str]: 格式化后的文本，如果不是目标术语返回 None
        
        Example:
            >>> formatter.format_word_with_number("Pitures", "1")
            "Pictures 1"
            >>> formatter.format_word_with_number("Picture", "1")
            "Picture 1"
        """
        # 转小写进行匹配
        word_lower = word.lower()
        
        # 步骤 1: 拼写纠错
        corrected_word = self.correct_spelling(word_lower)
        
        # 步骤 2: 检查是否为支持的术语
        if corrected_word not in self.SUPPORTED_TERMS:
            return None
        
        # 步骤 3: 保持原始大小写格式
        if word.isupper():
            # 全大写：PICTURE1 → PICTURE 1
            corrected_word = corrected_word.upper()
        elif word.istitle():
            # 首字母大写：Picture1 → Picture 1
            corrected_word = corrected_word.title()
        else:
            # 全小写：picture1 → picture 1
            corrected_word = corrected_word.lower()
        
        # 步骤 4: 添加空格
        return f"{corrected_word} {number}"
    
    def correct_spelling(self, word: str) -> str:
        """
        修正拼写错误
        
        Args:
            word (str): 原始单词
        
        Returns:
            str: 纠正后的单词（小写）
        
        Example:
            >>> formatter.correct_spelling("Photoes")
            "Photos"
            >>> formatter.correct_spelling("Pitures")
            "Pictures"
        """
        word_lower = word.lower()
        
        # 查找纠错映射
        if word_lower in self.SPELLING_CORRECTIONS:
            return self.SPELLING_CORRECTIONS[word_lower]
        
        # 无需纠正
        return word_lower
    
    def is_supported_term(self, text: str) -> bool:
        """
        判断是否为支持的术语
        
        Args:
            text (str): 输入文本
        
        Returns:
            bool: 是否为支持的术语
        
        Example:
            >>> formatter.is_supported_term("Picture1")
            True
            >>> formatter.is_supported_term("Name1")
            False
        """
        # 提取字母部分
        match = re.match(r'([A-Za-z]+)', text)
        if not match:
            return False
        
        word = match.group(1).lower()
        
        # 拼写纠错后检查
        corrected = self.correct_spelling(word)
        
        return corrected in self.SUPPORTED_TERMS


def format_picture_text(text: str) -> str:
    """
    格式化 Picture 术语文本（公共接口函数）
    
    Args:
        text (str): 输入文本
    
    Returns:
        str: 格式化后的文本
    
    Example:
        >>> format_picture_text("Pitures1")
        "Pictures 1"
        >>> format_picture_text("Picture1")
        "Picture 1"
        >>> format_picture_text("Photoes1")
        "Photos 1"
    """
    formatter = PictureTextFormatter()
    return formatter.format_text(text)


def test_formatting():
    """测试格式化功能"""
    print("=" * 80)
    print("Picture 术语空格规范化测试")
    print("=" * 80)
    print()
    
    formatter = PictureTextFormatter()
    
    # 测试用例
    test_cases = [
        # 用户指定的示例
        ("Pitures1", "Pictures 1", "修正拼写并添加空格"),
        ("Picture1", "Picture 1", "仅添加空格"),
        ("Figure1", "Figure 1", "仅添加空格"),
        ("Photoes1", "Photos 1", "修正拼写并添加空格"),
        ("Pictures1", "Pictures 1", "仅添加空格"),
        
        # 更多变体
        ("Photo1", "Photo 1", "Photo + 数字"),
        ("Photos2", "Photos 2", "Photos + 数字"),
        ("Image1", "Image 1", "Image + 数字"),
        ("Images3", "Images 3", "Images + 数字"),
        ("Figure2", "Figure 2", "Figure + 数字"),
        ("Figures4", "Figures 4", "Figures + 数字"),
        
        # 拼写错误
        ("Pitures2", "Pictures 2", "Pitures 拼写纠正"),
        ("Picure1", "Picture 1", "Picure 拼写纠正"),
        ("Foto1", "Photo 1", "Foto 拼写纠正"),
        ("Fotos2", "Photos 2", "Fotos 拼写纠正"),
        
        # 大小写变体
        ("PICTURE1", "PICTURE 1", "全大写"),
        ("picture1", "picture 1", "全小写"),
        ("Picture1", "Picture 1", "首字母大写"),
        
        # 多位数字
        ("Picture10", "Picture 10", "多位数字"),
        ("Pictures99", "Pictures 99", "多位数字"),
        
        # 非目标术语（不应处理）
        ("Name1", "Name1", "非目标术语"),
        ("Model2", "Model2", "非目标术语"),
    ]
    
    print(f"{'输入':15s} | {'输出':15s} | {'期望':15s} | {'状态':10s} | 说明")
    print("-" * 80)
    
    passed = 0
    failed = 0
    
    for input_text, expected, description in test_cases:
        result = formatter.format_text(input_text)
        
        if result == expected:
            status = "✅ 通过"
            passed += 1
        else:
            status = "❌ 失败"
            failed += 1
        
        print(f"{input_text:15s} | {result:15s} | {expected:15s} | {status:10s} | {description}")
    
    print()
    print("=" * 80)
    print("测试统计")
    print("=" * 80)
    print(f"总测试数：{len(test_cases)}")
    print(f"通过：{passed} ({passed/len(test_cases)*100:.1f}%)")
    print(f"失败：{failed} ({failed/len(test_cases)*100:.1f}%)")
    print()
    
    if failed == 0:
        print("✅ 所有测试通过！")
    else:
        print(f"❌ 有 {failed} 个测试失败")
    
    return failed == 0


if __name__ == '__main__':
    import sys
    
    # 运行测试
    success = test_formatting()
    
    if success:
        print()
        print("=" * 80)
        print("使用示例")
        print("=" * 80)
        print()
        
        formatter = PictureTextFormatter()
        
        examples = [
            "Pitures1",
            "Picture1",
            "Photoes1",
            "Pictures1",
            "Figure1",
        ]
        
        for example in examples:
            result = formatter.format_text(example)
            print(f"  {example:15s} → {result}")
    
    sys.exit(0 if success else 1)
