# CONSENSUS_Picture 变体支持

**创建日期**: 2026-03-11  
**状态**: ✅ 已确认  
**参与人员**: @shimengyu

---

## 📋 需求确认总结

### ✅ 已确认的需求

| 编号 | 需求项 | 确认内容 | 状态 |
|------|--------|----------|------|
| 1 | 变体范围 | 支持 24 种变体（英文 16 种 + 中文 8 种） | ✅ 已确认 |
| 2 | 拼写纠错 | 15+ 个常见拼写错误纠正 | ✅ 已确认 |
| 3 | 编号范围 | 1-10（超过视为无效） | ✅ 已确认 |
| 4 | 动态扩展策略 | **严格按需**（1 张图片只添加 1 列） | ✅ 已确认 (4B) |
| 5 | 实施优先级 | **完整实施** 24 种变体 | ✅ 已确认 (5B) |
| 6 | 表头保持 | 不允许修改原始表头 | ✅ 已确认 |
| 7 | 错误处理 | 无法识别的变体跳过，不报错 | ✅ 已确认 |
| 8 | 标准化策略 | 统一映射到 "Picture"（内部处理） | ✅ 已确认 |

---

## 📊 技术方案确认

### 核心架构

```
三层架构:
1. 变体识别层 (picture_variant.py)
   - SpellingCorrector (拼写纠错)
   - VariantRecognizer (变体识别)
   - PictureColumnMapper (列映射)

2. 业务逻辑层 (excel_processor.py 增强)
   - _column_exists() 增强
   - scan_product_images() 新增
   - add_picture_columns() 增强

3. 数据处理层 (process_engine.py 增强)
   - 图片扫描逻辑
   - 动态列扩展
```

### 关键决策点

| 决策点 | 选项 A | 选项 B | 选择 |
|--------|--------|--------|------|
| 动态扩展策略 | 至少 3 列 | 严格按需 | ✅ 选项 B (4B) |
| 实施优先级 | 快速修复 | 完整实施 | ✅ 选项 B (5B) |
| 表头修改 | 允许 | 不允许 | ✅ 不允许 |
| 错误处理 | 报错 | 跳过 | ✅ 跳过 |

---

## 📁 文档交付物

### 已完成文档

| 文档 | 位置 | 状态 |
|------|------|------|
| ALIGNMENT | [`docs/ALIGNMENT_Picture 变体支持.md`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/ALIGNMENT_Picture 变体支持.md) | ✅ 已完成 |
| DESIGN | [`docs/DESIGN_Picture 变体支持.md`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/DESIGN_Picture 变体支持.md) | ✅ 已完成 |
| TASK | [`docs/TASK_Picture 变体支持.md`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/TASK_Picture 变体支持.md) | ✅ 已完成 |

### 待交付文档

| 文档 | 预计完成时间 | 负责人 |
|------|--------------|--------|
| ACCEPTANCE | 实施完成后 | @shimengyu |
| FINAL | 项目完成后 | @shimengyu |
| TODO | 项目完成后 | @shimengyu |

---

## 🎯 实施计划确认

### 阶段划分

**阶段 1: 核心变体识别** (3-4 小时)
- ✅ Task 1.1: 创建 picture_variant.py
- ✅ Task 1.2: 实现 SpellingCorrector
- ✅ Task 1.3: 实现 VariantRecognizer
- ✅ Task 1.4: 实现 PictureColumnMapper

**阶段 2: 动态列扩展** (2-3 小时)
- ✅ Task 2.1: 增强 _column_exists 方法
- ✅ Task 2.2: 实现 scan_product_images
- ✅ Task 2.3: 增强 add_picture_columns

**阶段 3: 测试与优化** (2-3 小时)
- ✅ Task 3.1: 编写单元测试
- ✅ Task 3.2: 编写集成测试
- ✅ Task 3.3: 性能优化
- ✅ Task 3.4: 文档更新

### 总工期

- **预计时间**: 8-10 小时
- **任务数**: 11 个
- **关键路径**: 1.1 → 1.2 → 1.3 → 1.4 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3 → 3.4

---

## ✅ 验收标准确认

### 功能验收

- [ ] 支持 24 种变体识别
- [ ] 支持拼写纠错（15+ 个错误）
- [ ] 支持动态列扩展（严格按需）
- [ ] 支持编号 1-10
- [ ] 保持原始表头不变
- [ ] 向后兼容（现有 "Picture 1/2/3" 继续工作）

### 测试验收

- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试全部通过
- [ ] 回归测试全部通过
- [ ] 性能测试达标（识别 < 1ms，扫描 < 50ms）

### 文档验收

- [ ] README.md 更新
- [ ] spec.md 更新
- [ ] CHANGELOG.md 更新
- [ ] 代码注释完整

---

## 🔍 支持的 24 种变体确认

### 英文变体（16 种）

| 基础词 | 无编号 | 无空格 | 有空格 | 缩写 |
|--------|--------|--------|--------|------|
| Picture | Picture | Picture1 | Picture 1 | Pic. |
| Photo | Photo | Photo1 | Photo 1 | - |
| Image | Image | Image1 | Image 1 | Img. |
| Figure | Figure | Figure1 | Figure 1 | Fig. |

**大小写变体**: `PICTURE` → `Picture`, `picture` → `Picture`  
**复数形式**: `Pictures`, `Photos`, `Images`, `Figures`

### 中文变体（8 种）

| 基础词 | 带编号 |
|--------|--------|
| 图片 | 图片 1 |
| 照片 | 照片 1 |
| 图像 | 图像 1 |
| 图 | 图 1 |

---

## 📝 拼写纠错映射表确认

### 已确认的纠错映射（15+ 个）

```python
{
    # Photo 相关
    'Photoes': 'Photos',
    'Foto': 'Photo',
    'Fotos': 'Photos',
    
    # Picture 相关
    'Pitures': 'Pictures',
    'Piture': 'Picture',
    'Picure': 'Picture',
    'Picures': 'Pictures',
    'Pictue': 'Picture',
    'Pictuers': 'Pictures',
    
    # Image 相关
    'Imgs': 'Images',
    'Imge': 'Image',
    'Imges': 'Images',
    
    # Figure 相关
    'Fig': 'Figure',
    
    # 中文常见错误
    '图片片': '图片',
    '照照片': '照片',
}
```

---

## ⚠️ 已知限制确认

### 不支持的功能

- ❌ 自定义前缀（如 `ProductImage`, `ItemPhoto`）
- ❌ 超过 10 的编号（如 `Picture11`）
- ❌ 嵌套表头（多行表头）
- ❌ 修改原始表头

### 技术债务

- ⚠️ 编号上限硬编码为 10
- ⚠️ 不支持用户自定义变体
- ⚠️ 不支持复合词识别

---

## 📊 风险评估确认

### 技术风险（已确认）

| 风险 | 概率 | 影响 | 缓解措施 | 接受度 |
|------|------|------|----------|--------|
| 变体识别复杂度高 | 中 | 低 | 使用 LRU 缓存 | ✅ 可接受 |
| 拼写纠错误判 | 低 | 中 | 白名单机制 | ✅ 可接受 |
| 动态扩展导致列过多 | 低 | 低 | 限制最多 10 列 | ✅ 可接受 |

### 兼容性风险（已确认）

| 风险 | 概率 | 影响 | 缓解措施 | 接受度 |
|------|------|------|----------|--------|
| 旧 Excel 处理失败 | 低 | 高 | 充分测试 | ✅ 可接受 |
| 自定义表头误识别 | 中 | 中 | 严格匹配规则 | ✅ 可接受 |

---

## 🚀 下一步行动

### 立即开始

1. ✅ ALIGNMENT 文档已完成
2. ✅ DESIGN 文档已完成
3. ✅ TASK 文档已完成
4. ⏸️ **等待审批** → 进入 A4 Approve 阶段
5. ⏸️ 开始实施 → 进入 A5 Automate 阶段

### 审批流程

- [ ] 需求完整性检查 → **待审批**
- [ ] 技术方案可行性检查 → **待审批**
- [ ] 任务拆分合理性检查 → **待审批**
- [ ] 验收标准明确性检查 → **待审批**

---

## 📋 审批清单

### A4 Approve（审批）检查项

- [ ] **完整性检查**: 覆盖所有需求
- [ ] **一致性检查**: 与前期文档一致
- [ ] **可行性检查**: 技术方案可实现
- [ ] **可控性检查**: 风险可接受
- [ ] **可测性检查**: 验收标准明确

### 审批结果

- [ ] ✅ 批准实施
- [ ] ⏸️ 需要调整
- [ ] ❌ 拒绝（需重新设计）

**审批人**: ___________  
**审批日期**: ___________  
**审批意见**: ___________

---

## 📎 附录

### 参考文档

- [ALIGNMENT_Picture 变体支持.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/ALIGNMENT_Picture 变体支持.md)
- [DESIGN_Picture 变体支持.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/DESIGN_Picture 变体支持.md)
- [TASK_Picture 变体支持.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/TASK_Picture 变体支持.md)

### 相关文件

- [`src/core/excel_processor.py`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/src/core/excel_processor.py) - 待修改
- [`src/core/process_engine.py`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/src/core/process_engine.py) - 待修改
- [`src/core/picture_variant.py`](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/src/core/picture_variant.py) - 待创建

---

**文档状态**: ⏸️ 待审批  
**最后更新**: 2026-03-11  
**负责人**: @shimengyu  
**下次更新**: 审批通过后
