# 项目资料库设计规范

> 状态：已确认的开发基线
> 日期：2026-10-14
> 范围：新增"项目资料库"：上传项目资料并持久保存，从中提炼简历素材草稿，并在面试准备与模拟面试中作为深挖证据；提炼结果为草稿，写入简历需用户逐次确认。

## 1. 目标

此前系统只支持上传"整份简历文件"（导入解析）和"JD 文件"（匹配输入）。用户无法把项目总结、技术方案、PRD、复盘文档等资料交给系统复用。本规范新增"项目资料库"，满足两个方向：

1. **项目资料 → 简历素材**：从资料中提炼出可直接放入简历的建议条目；
2. **项目资料 → 面试准备/模拟面试**：生成时附加资料作为经历深挖的事实依据。

核心约束（用户确认）：

- 资料与提炼草稿**持久保存**在本机 SQLite；
- 提炼结果**不直接写入简历正文**，用户确认后才进入编辑器（以未保存状态预填，由用户手动保存）。

## 2. 数据模型

新增 Prisma model `ProjectMaterial`（迁移 `20261014193000_add_project_materials`）：

| 字段 | 说明 |
| --- | --- |
| name | 展示名，用户可改，默认取文件名去扩展名 |
| sourceFileName / sourceKind | 原始文件名与类型（text / pdf / word） |
| content | 提取的纯文本，上限 200,000 字符 |
| charCount | 字符数 |
| generations | 简历素材提炼草稿数组（JSON，含 id、createdAt、targetRole、summary、suggestedSection、item、missing、truncated） |

设计要点：

1. 草稿存资料行内，删除资料即删除全部草稿，无级联表。
2. 面试准备与模拟面试的 context 存资料**内容快照**（≤3 份、合计 60,000 字符、单份截断），历史记录与导出不受后续资料删除影响。
3. 上传解析**不走 AI**：txt/md 直接读取，pdf/doc/docx 复用 `resume-file-parsers.ts` 的本地文本提取；提取失败（扫描件）明确报错。图片与扫描件首版不支持（需要 Qwen 多模态，列入后续增强）。

## 3. 资料管理页（导航"项目资料"，/materials）

- 导航 `workflow` 组新增"项目资料"（NavKey `materials`），复用 `[view]` 动态路由。
- 页面能力：上传（≤10MB，支持 txt/md/pdf/doc/docx）、列表与搜索、详情抽屉（重命名、修正提取文本、删除）、提炼对话框（可选目标岗位）、草稿列表（应用/删除）。
- 隐私说明固定展示：资料仅存本机；"生成草稿"或生成面试资料时，相关文本会发送给用户配置的模型服务。

## 4. 简历素材提炼

- AI 任务 `src/lib/ai/material-draft.ts`：输入资料文本（>30,000 字符截断并标注）+ 可选目标岗位；输出建议模块（projects / experiences / internships）、条目（title、subtitle、period、highlights、technologies、description）、summary、missing（放入简历前建议补充的信息）。
- 事实边界：只重组资料已有事实；数字不得外推或平均化；"参与"不得写成"主导"；资料未提及的结果不写。
- 社招场景（careerScene=experienced）下 system 强调职责边界、量化业绩与业务结果；校招场景强调个人贡献与成长证据。
- 每次生成 append 为新草稿（id 递增 `g-N`），可删除单份草稿。

## 5. 应用到简历（确认写入）

1. 草稿"应用到简历" → 确认抽屉展示完整条目 + 选择目标简历版本；
2. 确认后跳转 `/resume/edit`（目标版本），编辑器强制重挂载，把新条目预填到建议模块的**未保存**内容中；已有未保存修改时以预填内容为准（确认抽屉已提示先保存）；
3. 用户在编辑器检查、调整并手动保存——数据库写入仍由编辑器既有保存流程负责，系统不产生任何隐藏写入。
4. 草稿结构到简历条目的映射：projects → `{name, role(副标题或期间), highlights(+technologies/description)}`；experiences/internships → `{company, role, start, end(从期间拆分), highlights}`。

## 6. 面试准备与模拟面试注入

- `interviewPreparationInputSchema` 与 `interviewContextSchema` 增加可选 `materials: [{name, content}]` 快照。
- 面试准备 prompt 新增资料段与规则：deepDives 优先基于资料事实展开，标注来源（项目资料/简历），冲突标 confirm，不得编造。
- 模拟面试出题与复盘 prompt 同样注入资料，作为项目深挖题的事实依据。
- 面试助手 setup 在模式选择下方提供"附加项目资料（可选）"多选（最多 3 份），提交时按预算生成快照。
- 导出：deepDives 随现有 Word/PDF 导出自然包含，无需改导出逻辑。

## 7. 应用内 Agent

- 新只读工具 `search_project_materials`：关键词检索（名称/来源文件/内容），`materialId` 读取完整文本。
- `create_interview_preparation` / `create_mock_interview` 增加 `materialIds`（≤3），由系统解析为内容快照，照常走审批边界。
- instructions 更新：项目深挖类需求先检索资料；无匹配时明确说明，不猜测 ID。
- 简历素材提炼首版仅页面流程，Agent 化列入后续。

## 8. API

| 路由 | 方法 | 说明 |
| --- | --- | --- |
| `/api/materials` | GET / POST | 列表；上传（multipart）或直接创建（JSON） |
| `/api/materials/[id]` | GET / PATCH / DELETE | 详情；改名/修文；删除（`?generationId=` 删除单份草稿） |
| `/api/materials/[id]/generations` | POST | 提炼生成草稿（需 AI 配置） |

## 9. 后续迭代（不在本版）

- 图片与扫描件支持（依赖 Qwen 多模态解析）。
- 简历素材提炼的 Agent 化与批量提炼。
- 资料与岗位档案（career-library）的关联展示。
- 多文件合并提炼、资料版本历史。
