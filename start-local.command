#!/bin/bash
# SageBook 一键本地启动器（macOS）
# 双击本文件即可在本地启动静态服务器并打开浏览器，本地 Ollama 模型可正常使用。
cd "$(dirname "$0")" || exit 1

PORT=8000

if ! command -v python3 >/dev/null 2>&1; then
    osascript -e 'display dialog "未找到 python3。请先在终端运行 xcode-select --install 安装命令行工具。" buttons {"好"} default button "好"' >/dev/null 2>&1
    echo "❌ 未找到 python3，请先安装（macOS: xcode-select --install）"
    exit 1
fi

echo "=================================================="
echo "  SageBook 本地模式启动中…"
echo "  目录: $(pwd)"
echo "  地址: http://localhost:$PORT"
echo "=================================================="
echo ""
echo "本地服务器已启动。浏览器将自动打开设置页。"
echo "如需使用本地模型，请在设置页点「🔄 扫描本地模型」。"
echo ""
echo "关闭此窗口即可停止本地服务器。"
echo ""

# 启动本地服务器（后台）
python3 -m http.server "$PORT" &
SERVER_PID=$!

# 退出/中断时自动停止服务器
trap 'kill "$SERVER_PID" 2>/dev/null; echo; echo "已停止本地服务器。"' EXIT INT TERM

# 稍等服务器就绪后打开浏览器
sleep 1
open "http://localhost:$PORT/settings.html"

# 前台等待，便于 Ctrl+C 停止
wait "$SERVER_PID"
