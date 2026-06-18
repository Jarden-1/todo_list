#!/bin/zsh

set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

SCRIPT_PATH="${0:A}"
PROJECT_DIR="${SCRIPT_PATH:h}"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
BACKEND_URL="http://localhost:$BACKEND_PORT"

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

if [ ! -d "$BACKEND_DIR" ]; then
  echo "没有找到后端目录：$BACKEND_DIR"
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

escape_applescript() {
  printf "%s" "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

run_in_terminal() {
  local title="$1"
  local command="$2"
  local escaped_command

  escaped_command="$(escape_applescript "$command")"
  osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "$escaped_command"
  set custom title of front window to "$title"
end tell
APPLESCRIPT
}

is_port_listening() {
  local port="$1"
  lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local seconds="${2:-30}"
  local i=0

  while [ "$i" -lt "$seconds" ]; do
    if is_port_listening "$port"; then
      return 0
    fi

    sleep 1
    i=$((i + 1))
  done

  return 1
}

common_prefix='export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi; '

backend_command="${common_prefix}cd ${(q)BACKEND_DIR}; if [ ! -d node_modules ]; then echo '正在安装后端依赖...'; npm install; fi; if [ ! -f .env ]; then cp .env.example .env; echo '已根据 .env.example 创建 backend/.env，请按需修改数据库等配置。'; fi; echo '后端启动地址：${BACKEND_URL}'; PORT=${BACKEND_PORT} npm run dev"
frontend_command="${common_prefix}cd ${(q)FRONTEND_DIR}; if [ ! -d node_modules ]; then echo '正在安装前端依赖...'; npm install; fi; echo '前端启动地址：${FRONTEND_URL}'; npm run dev -- --port ${FRONTEND_PORT}"

echo "项目目录：$PROJECT_DIR"
echo "后端地址：$BACKEND_URL"
echo "前端地址：$FRONTEND_URL"
echo ""

if is_port_listening "$BACKEND_PORT"; then
  echo "后端端口 $BACKEND_PORT 已经在运行，跳过启动。"
else
  echo "正在打开后端开发服务窗口..."
  run_in_terminal "SmartTodo Backend" "$backend_command"
fi

if is_port_listening "$FRONTEND_PORT"; then
  echo "前端端口 $FRONTEND_PORT 已经在运行，跳过启动。"
else
  echo "正在打开前端开发服务窗口..."
  run_in_terminal "SmartTodo Frontend" "$frontend_command"
fi

echo ""
echo "等待前端服务可访问..."
if wait_for_port "$FRONTEND_PORT" 45; then
  open "$FRONTEND_URL"
  echo "已打开：$FRONTEND_URL"
else
  echo "前端服务暂时还没有监听端口 $FRONTEND_PORT，请查看前端 Terminal 窗口日志。"
fi

echo ""
echo "后端如果启动失败，请先检查 backend/.env 里的 DATABASE_URL / REDIS_URL。"
pause
