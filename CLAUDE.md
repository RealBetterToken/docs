# BetterToken 文档项目说明

## 项目背景

BetterToken 是一个 AI API 中转服务，聚合 12+ 家供应商，兼容 Anthropic SDK 和 OpenAI SDK。这是 BetterToken 的官方文档站，基于 Mintlify 构建，部署在 `docs.bettertoken.ai`。

GitHub 仓库：`RealBetterToken/docs`，分支：`main`

---

## 可用工具（已全部安装）

### 1. Mintlify MCP 服务器

用于搜索 Mintlify 官方文档，**优先使用**。当不确定某个组件、配置、导航结构怎么写时，先搜索文档，不要凭训练数据推断。

可用工具：
- `mcp__Mintlify__search_mintlify` — 关键词搜索文档
- `mcp__Mintlify__query_docs_filesystem_mintlify` — 读取文档文件（支持 `cat`、`head`、`rg` 等命令）

示例：
```
mcp__Mintlify__search_mintlify("custom CSS logo sidebar")
mcp__Mintlify__query_docs_filesystem_mintlify("cat /customize/custom-scripts.mdx")
mcp__Mintlify__query_docs_filesystem_mintlify("rg -il 'language' /")
```

### 2. Mintlify Skill（`/mintlify-docs`）

项目内已安装 `mintlify`、`mintlify-api`、`mintlify-docs` 三个 skill（见 `skills-lock.json`），包含组件用法、配置规范、写作标准的完整上下文。

### 3. Mintlify CLI

已全局安装，路径：`/Users/liuyi/.npm-global/bin/mint`

常用命令：
```bash
mint dev          # 本地预览，访问 http://localhost:3000
mint broken-links # 检查内链是否失效
mint validate     # 验证文档构建是否有报错
```

---

## 项目结构

```
docs/
├── docs.json              # 站点配置（主题、导航、颜色）
├── favicon.svg
├── logo/
│   ├── light.svg
│   └── dark.svg
├── index.mdx              # 中文首页
├── quickstart.mdx         # 快速接入
├── faq.mdx                # 常见问题
├── best-practices.mdx     # 最佳实践
├── ai-tools/              # 中文 AI 工具页（14 个）
├── api-reference/         # 中文 API 参考
├── en/                    # 英文版（结构与中文镜像对应）
│   ├── index.mdx
│   ├── quickstart.mdx
│   ├── faq.mdx
│   ├── best-practices.mdx
│   ├── ai-tools/          # 英文 AI 工具页（14 个）
│   └── api-reference/
└── custom.css             # 自定义样式（如存在）
```

## 导航结构

`docs.json` 使用 `navigation.languages` 实现双语，包含 `zh` 和 `en` 两个语言块，每个语言块内有 `tabs`（指南 / API 参考）。

- 中文页面路径不带前缀，如 `index`、`ai-tools/claude-code`
- 英文页面路径带 `en/` 前缀，如 `en/index`、`en/ai-tools/claude-code`
- 新增页面后必须同时更新 `docs.json` 对应语言的 `pages` 数组，否则不会出现在侧边栏

---

## 主题配置

| 配置项 | 值 |
|--------|-----|
| `theme` | `luma` |
| `colors.primary` | `#4F46E5` |
| `colors.light` | `#818CF8` |
| `colors.dark` | `#3730A3` |

---

## 关键规则

### 模型指定规则（核心差异）

- **Claude Code、Codex CLI**：接入 BetterToken 后**无需指定模型**，BetterToken 自动路由
- **其他工具**（Cursor、Cline、Roo Code、Kilo Code、Zed 等）：**必须手动指定模型**，如 `claude-sonnet-4-6`、`gpt-5.4`

### 写作风格

- 中文文档面向中国开发者，使用简体中文，语气直接
- 英文文档使用主动语态、第二人称（you）
- 标题用 sentence case（首字母大写，其余小写）
- 不使用营销语言（powerful、seamless、robust 等）
- 代码块必须注明语言标签

### 自定义样式

如需修改侧边栏、Logo 尺寸、语言切换器位置等，通过 `custom.css` 实现。Mintlify 会自动加载项目根目录下的 `.css` 文件。可用的 CSS 选择器参考官方文档（通过 MCP 搜索 `custom CSS identifiers selectors`）。

---

## 常见操作

### 新增工具接入页面

1. 在 `ai-tools/` 创建中文 `.mdx` 文件
2. 在 `en/ai-tools/` 创建英文 `.mdx` 文件
3. 在 `docs.json` 的 `zh` 和 `en` 两个语言块中分别加入页面路径
4. 运行 `mint validate` 确认无报错
5. `git add` 相关文件并 commit、push

### 修改样式

1. 先用 MCP 搜索 Mintlify 提供的 CSS 选择器
2. 在项目根目录创建或编辑 `custom.css`
3. `mint dev` 本地预览验证
4. commit 推送，Mintlify 自动部署

### 排查导航问题

运行 `mint broken-links` 检查失效链接；检查 `docs.json` 中是否缺少某个页面路径。
