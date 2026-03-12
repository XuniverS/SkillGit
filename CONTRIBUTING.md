# Contributing to SkillSync / 贡献指南

[English](#english) · [中文](#中文)

---

## English

Thank you for your interest in contributing to SkillSync! 🎉

### Code of Conduct

By participating in this project, you agree to be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) code of conduct.

### Ways to Contribute

- 🐛 **Report bugs** — open a [Bug Report issue](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 **Request features** — open a [Feature Request issue](./.github/ISSUE_TEMPLATE/feature_request.md)
- 📝 **Improve documentation** — fix typos, add examples, translate
- 🔧 **Submit a pull request** — fix a bug or implement a feature

### Development Setup

```bash
# 1. Fork this repo on GitHub, then clone your fork
git clone https://github.com/XuniverS/skillSync.git
cd skillSync

# 2. Install dependencies
npm install

# 3. Link for local testing
npm link

# 4. Run tests
npm test

# 5. Make your changes, then test the CLI
ski --help
```

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, release-ready code |
| `dev` | Integration branch for features |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation changes |

Always branch off `main` and open PRs back to `main`.

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(merge): add streaming support for AI conflict resolution
fix(push): handle token expiry gracefully
docs(readme): update quick-start instructions
```

### Pull Request Process

1. **Fork** the repository and create your branch from `main`.
2. **Write clear, focused commits** — one logical change per commit.
3. **Add or update tests** if your change affects behaviour.
4. **Run `npm test`** and make sure all tests pass.
5. **Update `CHANGELOG.md`** under the `[Unreleased]` section.
6. **Open a Pull Request** — fill in the PR template.
7. A maintainer will review within a few days. Be patient! 😊

### Code Style

- Standard Node.js / CommonJS (`'use strict'` at the top)
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Meaningful variable names — avoid single-letter names except loop indices

### Running Tests

```bash
npm test
```

### Reporting Security Vulnerabilities

Please **do not** open a public GitHub issue for security vulnerabilities.  
Email the maintainers directly via a [GitHub Security Advisory](https://github.com/XuniverS/skillSync/security/advisories/new) or reach out through [GitHub Issues](https://github.com/XuniverS/skillSync/issues) with the `security` label. Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to respond within 48 hours.

---

## 中文

感谢你对 SkillSync 的关注！🎉

### 贡献方式

- 🐛 **报告 Bug** — 提交 [Bug Report Issue](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 **提功能建议** — 提交 [Feature Request Issue](./.github/ISSUE_TEMPLATE/feature_request.md)
- 📝 **改进文档** — 修正错别字、补充示例、翻译
- 🔧 **提交 Pull Request** — 修复 Bug 或实现新功能

### 开发环境搭建

```bash
# 1. 在 GitHub fork 本仓库，然后克隆你的 fork
git clone https://github.com/XuniverS/skillSync.git
cd skillSync

# 2. 安装依赖
npm install

# 3. 链接到全局用于本地测试
npm link

# 4. 运行测试
npm test

# 5. 修改代码后测试 CLI
ski --help
```

### 分支策略

| 分支 | 用途 |
|---|---|
| `main` | 稳定、可发布代码 |
| `dev` | 功能集成分支 |
| `feat/<name>` | 新功能 |
| `fix/<name>` | Bug 修复 |
| `docs/<name>` | 文档变更 |

请从 `main` 切分支，并向 `main` 提 PR。

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范：

```
<类型>(<范围>): <简短描述>

[可选正文]

[可选尾部]
```

**类型：** `feat`、`fix`、`docs`、`style`、`refactor`、`test`、`chore`

示例：
```
feat(merge): 为 AI 冲突解决添加流式支持
fix(push): 优雅处理 token 过期
docs(readme): 更新快速上手说明
```

### Pull Request 流程

1. **Fork** 仓库并从 `main` 创建分支。
2. **编写清晰、聚焦的提交** — 每个提交对应一个逻辑变更。
3. **如果修改影响行为，请添加或更新测试。**
4. **运行 `npm test`** 确保所有测试通过。
5. **更新 `CHANGELOG.md`** 的 `[Unreleased]` 部分。
6. **提交 Pull Request** — 填写 PR 模板。
7. 维护者会在几天内 Review，请耐心等待 😊

### 代码风格

- 标准 Node.js / CommonJS（顶部 `'use strict'`）
- 2 空格缩进
- 字符串使用单引号
- 多行对象/数组使用尾随逗号
- 使用有意义的变量名，避免单字母命名（循环下标除外）

### 安全漏洞报告

请**不要**通过公开 GitHub Issue 报告安全漏洞。  
请通过 [GitHub Security Advisory](https://github.com/XuniverS/skillSync/security/advisories/new) 或带 `security` 标签的 [GitHub Issue](https://github.com/XuniverS/skillSync/issues) 联系我们，说明：
- 漏洞描述
- 复现步骤
- 潜在影响

我们承诺在 48 小时内回复。
