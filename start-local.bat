@echo off
REM SageBook 一键本地启动器（Windows）
REM 双击本文件即可在本地启动静态服务器并打开浏览器，本地 Ollama 模型可正常使用。
cd /d "%~dp0"

set PORT=8000

where python >nul 2>nul
if errorlevel 1 (
    echo ❌ 未找到 python，请先安装 Python 并勾选“Add to PATH”。
    pause
    exit /b 1
)

echo ==================================================
echo   SageBook 本地模式启动中...
echo   目录: %cd%
echo   地址: http://localhost:%PORT%
echo ==================================================
echo.
echo 本地服务器已启动，浏览器将自动打开设置页。
echo 关闭此窗口即可停止本地服务器。
echo.

start "" "http://localhost:%PORT%/settings.html"
python -m http.server %PORT%
