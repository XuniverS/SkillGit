# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- *(Your next feature here)*

### Fixed
- *(Your next fix here)*

---

## [1.0.0] — 2026-03-12

### Added
- `init` — initialize a SkillGit repository with interactive prompts (`-y` to skip)
- `add` — stage skill files or entire workspace (`.` glob support via `fast-glob`)
- `commit` — record staged changes with a message; auto-generates SHA-based object hashes
- `status` — display untracked, modified, and staged files
- `diff` — show line-level diff between working copy and last commit (powered by `diff`)
- `log` — formatted commit history with author, date, and message
- `push` / `pull` / `fetch` — sync commits with a remote SkillGit server over HTTP
- `clone` — clone a remote repository locally
- `merge` — three-way skill conflict resolution; `--ai` flag calls OpenClaw API
- `merge --show-prompt` — preview the AI merge prompt without calling the API
- `config set/get/list` — per-repo JSON config (name, email, model, openapiKey, apiBase)
- `remote set-url/get-url/list` — manage named remotes
- `server` — built-in HTTP server for team collaboration (`--port`, `--token`, `--data-dir`)
- `whoami` — display current user and API key status
- `ski` — the primary CLI command (installed as `skillgit` on npm)
- `DEBUG=1` environment variable for verbose stack traces
- MIT License

[Unreleased]: https://github.com/XuniverS/skillgit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/XuniverS/skillgit/releases/tag/v1.0.0
