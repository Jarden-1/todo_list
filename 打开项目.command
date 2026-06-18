#!/bin/zsh

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

SCRIPT_PATH="${0:A}"
PROJECT_DIR="${SCRIPT_PATH:h}"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PORT="${PORT:-5173}"
URL="http://localhost:$PORT"

pause() {
  echo ""
  echo "按任意键关闭窗口..."
  read -k 1 -s
}

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "没有找到前端目录：$FRONTEND_DIR"
  pause
  exit 1
fi

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "没有找到 npm。请先安装 Node.js，或确认 npm 可以在终端中运行。"
  pause
  exit 1
fi

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "第一次运行，正在安装依赖..."
  npm install
fi

if lsof -iTCP:"$PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "项目服务看起来已经在运行，正在打开：$URL"
  open "$URL"
  pause
  exit 0
fi

echo "正在启动项目：$URL"
open "$URL"
npm run dev -- --port "$PORT"
