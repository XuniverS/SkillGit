#!/bin/bash
# SkillGit Install Script
# Usage: bash install.sh

set -e

INSTALL_DIR="$HOME/.skillgit"
BIN_DIR="$HOME/.local/bin"
REPO_URL="https://github.com/XuniverS/skillgit"

echo "🐾 Installing SkillGit..."

# 检查 node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required (>= 16). Install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VERSION" -lt "16" ]; then
  echo "❌ Node.js >= 16 required (found v$NODE_VERSION)"
  exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm is required"
  exit 1
fi

# 如果是从源码目录安装
if [ -f "package.json" ] && grep -q '"name": "skillgit"' package.json; then
  echo "📦 Installing from local source..."
  npm install --production
  npm link
  echo "✅ SkillGit installed! Run: ski --help"
  exit 0
fi

# 从 npm 安装（发布后）
# npm install -g skillgit

echo "✅ SkillGit installed successfully!"
echo ""
echo "Quick start:"
echo "  mkdir my-skills && cd my-skills"
echo "  ski init"
echo "  # ... add your skill directories ..."
echo "  ski add ."
echo "  ski commit -m 'initial skills'"
echo ""
echo "Start a server:"
echo "  ski server --port 3000 --token mytoken"
