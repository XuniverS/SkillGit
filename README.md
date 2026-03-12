<div align="center">

# 🐾 SkillSync

**Git-like version control for OpenClaw Skills — with AI-powered conflict resolution.**

**专为 OpenClaw Skills 设计的 Git 式版本控制工具 — 内置 AI 冲突解决。**

[![npm version](https://img.shields.io/npm/v/skillsync)](https://www.npmjs.com/package/skillsync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[English](#english) · [中文](#中文)

</div>

---

## English

### What is SkillSync?

SkillSync is a **Git-inspired CLI tool** for managing, versioning, and collaborating on [OpenClaw](https://openclaw.ai) Skill files.

Key features:
- 📦 **Full version control** — `init`, `add`, `commit`, `log`, `diff`
- 🌐 **Team collaboration** — `push`, `pull`, `fetch`, `clone` against a built-in HTTP server
- 🤖 **AI conflict resolution** — automatically merges diverged Skill files using OpenClaw models
- ⚙️ **Configurable** — custom API base, model, authentication token

### Requirements

- Node.js **≥ 16**
- npm **≥ 7**

### Installation

**Option A — from npm (recommended after publish):**

```bash
npm install -g skillsync
```

**Option B — from source:**

```bash
git clone https://github.com/XuniverS/skillSync.git
cd skillSync
npm install
npm link        # registers the `skillsync` / `ski` binary globally
```

**Option C — one-line install script:**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/XuniverS/skillSync/main/install.sh)
```

### Quick Start

```bash
# 1. Initialize a skill workspace
mkdir my-skills && cd my-skills
skillsync init

# 2. Stage and commit
skillsync add .
skillsync commit -m "initial skills"

# 3. Start a collaboration server (for your team)
skillsync server --port 3000 --token mytoken

# 4. Connect and push
skillsync remote set-url origin http://your-server:3000
skillsync push

# 5. Sync and auto-resolve conflicts with AI
skillsync pull   # AI merges conflicts automatically
```

### Commands Reference

| Command | Description |
|---|---|
| `skillsync init` | Initialize a new repository |
| `skillsync clone <url> [dir]` | Clone a remote repository |
| `skillsync add [skill\|.]` | Stage changes |
| `skillsync commit -m "msg"` | Commit staged changes |
| `skillsync status` | Show working tree status |
| `skillsync diff [skill]` | Show file differences |
| `skillsync log` | Display commit history |
| `skillsync push [remote] [branch]` | Push commits to remote |
| `skillsync pull [remote] [branch]` | Pull and AI-merge remote changes |
| `skillsync fetch [remote] [branch]` | Download without merging |
| `skillsync merge [skill] [--ai]` | Resolve conflicts (optionally with AI) |
| `skillsync merge --show-prompt` | Preview the AI merge prompt |
| `skillsync config set <key> <value>` | Set a config value |
| `skillsync config list` | List all config values |
| `skillsync remote set-url <name> <url>` | Set remote URL |
| `skillsync server` | Start the collaboration server |
| `skillsync whoami` | Show current user |

### Configuration

```bash
skillsync config set user.name      "Alice"
skillsync config set user.email     "alice@example.com"
skillsync config set user.openapiKey "sk-..."      # OpenClaw API key
skillsync config set user.model     "gpt-4o"       # model for AI conflict resolution
skillsync config set user.apiBase   "https://..."  # custom API endpoint (optional)
skillsync config list
```

> **Tip:** Get your OpenClaw API key at [openclaw.ai](https://openclaw.ai).

### AI Conflict Resolution

When two collaborators edit the same Skill file, SkillSync calls the configured OpenClaw model to intelligently merge the changes:

- ✅ Preserves both parties' intent
- ✅ Maintains semantic consistency of Markdown / SKILL.md format
- ✅ Marks truly unresolvable conflicts with `<!-- MERGE_CONFLICT -->`
- ✅ Works with any OpenAI-compatible API (OpenClaw, Azure OpenAI, local models, etc.)

### Project Structure

```
skillSync/
├── bin/
│   └── skillsync.js        # CLI entry point
├── src/
│   ├── commands/           # One file per sub-command
│   ├── lib/                # Core logic (repository, merger, remote, …)
│   ├── server/             # Built-in HTTP collaboration server
│   └── utils/              # Shared utilities (hash, logger)
├── install.sh              # One-line install helper
├── package.json
└── README.md
```

### Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

### License

[MIT](./LICENSE) © SkillSync Contributors

---

## 中文

### SkillSync 是什么？

SkillSync 是一个**类 Git 的命令行工具**，专为管理、版本化和团队协作 [OpenClaw](https://openclaw.ai) Skill 文件而设计。

核心功能：
- 📦 **完整版本控制** — `init`、`add`、`commit`、`log`、`diff`
- 🌐 **团队协作** — 通过内置 HTTP 服务器进行 `push`、`pull`、`fetch`、`clone`
- 🤖 **AI 冲突解决** — 自动使用 OpenClaw 模型合并分叉的 Skill 文件
- ⚙️ **高度可配置** — 自定义 API 接口、模型、鉴权 Token

### 环境要求

- Node.js **≥ 16**
- npm **≥ 7**

### 安装

**方式一 — 通过 npm 安装（推荐，发布后）：**

```bash
npm install -g skillsync
```

**方式二 — 从源码安装：**

```bash
git clone https://github.com/XuniverS/skillSync.git
cd skillSync
npm install
npm link        # 全局注册 skillsync / ski 命令
```

**方式三 — 一键安装脚本：**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/XuniverS/skillSync/main/install.sh)
```

### 快速上手

```bash
# 1. 初始化技能工作区
mkdir my-skills && cd my-skills
skillsync init

# 2. 暂存并提交
skillsync add .
skillsync commit -m "初始技能"

# 3. 启动协作服务器（供团队使用）
skillsync server --port 3000 --token mytoken

# 4. 设置远程并推送
skillsync remote set-url origin http://your-server:3000
skillsync push

# 5. 拉取并自动 AI 解决冲突
skillsync pull
```

### 命令速查

| 命令 | 说明 |
|---|---|
| `skillsync init` | 初始化仓库 |
| `skillsync clone <url> [dir]` | 克隆远程仓库 |
| `skillsync add [skill\|.]` | 暂存变更 |
| `skillsync commit -m "msg"` | 提交暂存内容 |
| `skillsync status` | 查看工作树状态 |
| `skillsync diff [skill]` | 查看文件差异 |
| `skillsync log` | 提交历史 |
| `skillsync push [远程] [分支]` | 推送到远程 |
| `skillsync pull [远程] [分支]` | 拉取并 AI 合并 |
| `skillsync fetch [远程] [分支]` | 仅下载，不合并 |
| `skillsync merge [skill] [--ai]` | 解决冲突（可选 AI）|
| `skillsync merge --show-prompt` | 预览 AI 合并提示词 |
| `skillsync config set <键> <值>` | 设置配置项 |
| `skillsync config list` | 列出所有配置 |
| `skillsync remote set-url <名称> <url>` | 设置远程地址 |
| `skillsync server` | 启动协作服务器 |
| `skillsync whoami` | 显示当前用户 |

### 配置

```bash
skillsync config set user.name      "张三"
skillsync config set user.email     "zhangsan@example.com"
skillsync config set user.openapiKey "sk-..."      # OpenClaw API Key
skillsync config set user.model     "gpt-4o"       # AI 冲突解决所用模型
skillsync config set user.apiBase   "https://..."  # 自定义 API 端点（可选）
skillsync config list
```

> **提示：** 在 [openclaw.ai](https://openclaw.ai) 获取你的 API Key。

### AI 冲突解决原理

当两位协作者编辑同一 Skill 文件时，SkillSync 会调用配置的 OpenClaw 模型智能合并：

- ✅ 保留双方意图
- ✅ 维护 Markdown / SKILL.md 格式的语义一致性
- ✅ 对确实无法解决的冲突标记 `<!-- MERGE_CONFLICT -->`
- ✅ 兼容任何 OpenAI 兼容 API（OpenClaw、Azure OpenAI、本地模型等）

### 参与贡献

欢迎贡献代码！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 许可证

[MIT](./LICENSE) © SkillSync Contributors
