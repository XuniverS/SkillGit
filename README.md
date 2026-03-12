<div align="center">

# 🐾 SkillGit

**Git-like version control for OpenClaw Skills — with AI-powered conflict resolution.**

**专为 OpenClaw Skills 设计的 Git 式版本控制工具 — 内置 AI 冲突解决。**

[![npm version](https://img.shields.io/npm/v/skillgit)](https://www.npmjs.com/package/skillgit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[English](#english) · [中文](#中文)

</div>

---

## English

### What is SkillGit?

SkillGit is a **Git-inspired CLI tool** for managing, versioning, and collaborating on [OpenClaw](https://openclaw.ai) Skill files. The command is `ski`.

Key features:
- 📦 **Full version control** — `ski init`, `ski add`, `ski commit`, `ski log`, `ski diff`
- 🌐 **Team collaboration** — `ski push`, `ski pull`, `ski fetch`, `ski clone` against a built-in HTTP server
- 🤖 **AI conflict resolution** — automatically merges diverged Skill files using OpenClaw models
- ⚙️ **Configurable** — custom API base, model, authentication token

### Requirements

- Node.js **≥ 16**
- npm **≥ 7**

### Installation

**Option A — from npm:**

```bash
npm install -g skillgit
```

**Option B — from source:**

```bash
git clone https://github.com/XuniverS/skillgit.git
cd skillgit
npm install
npm link        # registers the `ski` binary globally
```

**Option C — one-line install script:**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/XuniverS/skillgit/main/install.sh)
```

### Quick Start

```bash
# 1. Initialize a skill workspace
mkdir my-skills && cd my-skills
ski init

# 2. Stage and commit
ski add .
ski commit -m "initial skills"

# 3. Start a collaboration server (for your team)
ski server --port 3000 --token mytoken

# 4. Connect and push
ski remote set-url origin http://your-server:3000
ski push

# 5. Sync and auto-resolve conflicts with AI
ski pull   # AI merges conflicts automatically
```

### Commands Reference

| Command | Description |
|---|---|
| `ski init` | Initialize a new repository |
| `ski clone <url> [dir]` | Clone a remote repository |
| `ski add [skill\|.]` | Stage changes |
| `ski commit -m "msg"` | Commit staged changes |
| `ski status` | Show working tree status |
| `ski diff [skill]` | Show file differences |
| `ski log` | Display commit history |
| `ski push [remote] [branch]` | Push commits to remote |
| `ski pull [remote] [branch]` | Pull and AI-merge remote changes |
| `ski fetch [remote] [branch]` | Download without merging |
| `ski merge [skill] [--ai]` | Resolve conflicts (optionally with AI) |
| `ski merge --show-prompt` | Preview the AI merge prompt |
| `ski config set <key> <value>` | Set a config value |
| `ski config list` | List all config values |
| `ski remote set-url <name> <url>` | Set remote URL |
| `ski server` | Start the collaboration server |
| `ski whoami` | Show current user |

### Configuration

```bash
ski config set user.name      "Alice"
ski config set user.email     "alice@example.com"
ski config set user.openapiKey "sk-..."      # OpenClaw API key
ski config set user.model     "gpt-4o"       # model for AI conflict resolution
ski config set user.apiBase   "https://..."  # custom API endpoint (optional)
ski config list
```

> **Tip:** Get your OpenClaw API key at [openclaw.ai](https://openclaw.ai).

### AI Conflict Resolution

When two collaborators edit the same Skill file, SkillGit calls the configured OpenClaw model to intelligently merge the changes:

- ✅ Preserves both parties' intent
- ✅ Maintains semantic consistency of Markdown / SKILL.md format
- ✅ Marks truly unresolvable conflicts with `<!-- MERGE_CONFLICT -->`
- ✅ Works with any OpenAI-compatible API (OpenClaw, Azure OpenAI, local models, etc.)

### Project Structure

```
skillgit/
├── bin/
│   └── skillsync.js        # CLI entry point (command: ski)
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

[MIT](./LICENSE) © SkillGit Contributors

---

## 中文

### SkillGit 是什么？

SkillGit 是一个**类 Git 的命令行工具**，专为管理、版本化和团队协作 [OpenClaw](https://openclaw.ai) Skill 文件而设计。命令为 `ski`。

核心功能：
- 📦 **完整版本控制** — `ski init`、`ski add`、`ski commit`、`ski log`、`ski diff`
- 🌐 **团队协作** — 通过内置 HTTP 服务器进行 `ski push`、`ski pull`、`ski fetch`、`ski clone`
- 🤖 **AI 冲突解决** — 自动使用 OpenClaw 模型合并分叉的 Skill 文件
- ⚙️ **高度可配置** — 自定义 API 接口、模型、鉴权 Token

### 环境要求

- Node.js **≥ 16**
- npm **≥ 7**

### 安装

**方式一 — 通过 npm 安装：**

```bash
npm install -g skillgit
```

**方式二 — 从源码安装：**

```bash
git clone https://github.com/XuniverS/skillgit.git
cd skillgit
npm install
npm link        # 全局注册 ski 命令
```

**方式三 — 一键安装脚本：**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/XuniverS/skillgit/main/install.sh)
```

### 快速上手

```bash
# 1. 初始化技能工作区
mkdir my-skills && cd my-skills
ski init

# 2. 暂存并提交
ski add .
ski commit -m "初始技能"

# 3. 启动协作服务器（供团队使用）
ski server --port 3000 --token mytoken

# 4. 设置远程并推送
ski remote set-url origin http://your-server:3000
ski push

# 5. 拉取并自动 AI 解决冲突
ski pull
```

### 命令速查

| 命令 | 说明 |
|---|---|
| `ski init` | 初始化仓库 |
| `ski clone <url> [dir]` | 克隆远程仓库 |
| `ski add [skill\|.]` | 暂存变更 |
| `ski commit -m "msg"` | 提交暂存内容 |
| `ski status` | 查看工作树状态 |
| `ski diff [skill]` | 查看文件差异 |
| `ski log` | 提交历史 |
| `ski push [远程] [分支]` | 推送到远程 |
| `ski pull [远程] [分支]` | 拉取并 AI 合并 |
| `ski fetch [远程] [分支]` | 仅下载，不合并 |
| `ski merge [skill] [--ai]` | 解决冲突（可选 AI）|
| `ski merge --show-prompt` | 预览 AI 合并提示词 |
| `ski config set <键> <值>` | 设置配置项 |
| `ski config list` | 列出所有配置 |
| `ski remote set-url <名称> <url>` | 设置远程地址 |
| `ski server` | 启动协作服务器 |
| `ski whoami` | 显示当前用户 |

### 配置

```bash
ski config set user.name      "张三"
ski config set user.email     "zhangsan@example.com"
ski config set user.openapiKey "sk-..."      # OpenClaw API Key
ski config set user.model     "gpt-4o"       # AI 冲突解决所用模型
ski config set user.apiBase   "https://..."  # 自定义 API 端点（可选）
ski config list
```

> **提示：** 在 [openclaw.ai](https://openclaw.ai) 获取你的 API Key。

### AI 冲突解决原理

当两位协作者编辑同一 Skill 文件时，SkillGit 会调用配置的 OpenClaw 模型智能合并：

- ✅ 保留双方意图
- ✅ 维护 Markdown / SKILL.md 格式的语义一致性
- ✅ 对确实无法解决的冲突标记 `<!-- MERGE_CONFLICT -->`
- ✅ 兼容任何 OpenAI 兼容 API（OpenClaw、Azure OpenAI、本地模型等）

### 参与贡献

欢迎贡献代码！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 许可证

[MIT](./LICENSE) © SkillGit Contributors
