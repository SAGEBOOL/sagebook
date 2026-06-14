#!/usr/bin/env python3
import re, os

files = [
    'index.html',
    'main-editor.html', 
    'character-management.html',
    'world-builder.html',
    'writing-analysis.html',
    'platform-tools.html',
    'ai-suite.html',
    'knowledge-graph.html',
    'template-gallery.html',
    'outline-editor.html',
    'settings.html'
]

page_icons = {
    'index.html': '🏠 首页',
    'main-editor.html': '📝 编辑器',
    'character-management.html': '👥 角色',
    'world-builder.html': '🌍 世界观',
    'writing-analysis.html': '📊 分析',
    'platform-tools.html': '📱 平台',
    'ai-suite.html': '🤖 AI',
    'knowledge-graph.html': '🕸️ 图谱',
    'template-gallery.html': '📚 模板',
    'outline-editor.html': '📋 大纲',
    'settings.html': '⚙️ 设置',
}

all_css = []
all_js = []
body_contents = {}

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if style_match:
        all_css.append("/* ===== " + f + " ===== */\n" + style_match.group(1))
    
    script_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
    if script_match:
        all_js.append("// ===== " + f + " =====\n" + script_match.group(1))
    
    body_match = re.search(r'<body>(.*?)</body>', content, re.DOTALL)
    if body_match:
        body_contents[f] = body_match.group(1)

# Build nav buttons
nav_btns = ""
for f in files:
    icon = page_icons[f]
    cls = " active" if f == "index.html" else ""
    nav_btns += '<button class="nav-btn' + cls + '" onclick="showPage(\'' + f + '\')">' + icon + '</button>\n'

# Build page views
page_views = ""
for f in files:
    page_id = "page-" + f.replace(".html", "")
    active = " active" if f == "index.html" else ""
    body = body_contents.get(f, "")
    page_views += '        <div id="' + page_id + '" class="page-view' + active + '">' + body + "\n        </div>\n"

monolith = """<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>SAGE BOOK - 智能创作平台</title>
    <style>
        /* ===== 全局基础样式 ===== */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }

        :root[data-theme="dark"] {
            --bg-primary: #1a1a2e;
            --bg-secondary: #16213e;
            --bg-card: #1e2a45;
            --bg-hover: #253352;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0b0;
            --accent: #7c5cbf;
            --accent-hover: #9b7fd4;
            --accent-glow: rgba(124, 92, 191, 0.3);
            --border: #2a2a4a;
            --success: #4ade80;
            --warning: #fbbf24;
            --error: #f87171;
        }

        :root[data-theme="light"] {
            --bg-primary: #f5f0ff;
            --bg-secondary: #ffffff;
            --bg-card: #ffffff;
            --bg-hover: #f0e8ff;
            --text-primary: #1a1a2e;
            --text-secondary: #666680;
            --accent: #7c5cbf;
            --accent-hover: #6a4dac;
            --accent-glow: rgba(124, 92, 191, 0.15);
            --border: #e0d8f0;
            --success: #22c55e;
            --warning: #f59e0b;
            --error: #ef4444;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* ===== 顶部导航栏 ===== */
        .top-nav {
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 50px;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            display: flex; align-items: center;
            padding: 0 20px; z-index: 1000;
            gap: 4px; overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .nav-brand {
            font-size: 18px; font-weight: 800;
            background: linear-gradient(135deg, #7c5cbf, #a78bfa);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
            margin-right: 20px; white-space: nowrap;
        }

        .nav-btn {
            padding: 6px 14px; border: none; background: transparent;
            color: var(--text-secondary); border-radius: 8px; cursor: pointer;
            font-size: 13px; transition: all 0.2s; white-space: nowrap;
        }
        .nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .nav-btn.active { background: var(--accent); color: white; }

        /* ===== 主题切换 ===== */
        .theme-switcher {
            position: fixed; top: 10px; right: 15px;
            display: flex; gap: 4px; z-index: 1001;
        }
        .theme-btn {
            padding: 4px 10px; border: 1px solid var(--border);
            background: var(--bg-card); color: var(--text-secondary);
            border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s;
        }
        .theme-btn:hover { border-color: var(--accent); }
        .theme-btn.active { background: var(--accent); color: white; border-color: var(--accent); }

        /* ===== 主内容区 ===== */
        .main-content { padding-top: 60px; min-height: 100vh; }

        .page-view { display: none; animation: fadeIn 0.3s ease; }
        .page-view.active { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

        /* ===== 首页模块网格 ===== */
        .module-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px; padding: 20px 0;
        }
        .module-card {
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: 16px; padding: 24px; cursor: pointer;
            transition: all 0.3s ease; position: relative; overflow: hidden;
            text-decoration: none; color: var(--text-primary); display: block;
        }
        .module-card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 8px 30px var(--accent-glow); }
        .module-icon { font-size: 36px; margin-bottom: 16px; }
        .module-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .module-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
        .module-badge {
            display: inline-block; padding: 3px 10px; border-radius: 20px;
            font-size: 11px; font-weight: 600; margin-top: 12px;
            background: var(--accent-glow); color: var(--accent);
        }

        .header { text-align: center; padding: 60px 20px 30px; }
        .header .logo { font-size: 48px; margin-bottom: 10px; }
        .header .title {
            font-size: 36px; font-weight: 800;
            background: linear-gradient(135deg, var(--accent), #a78bfa, #7c5cbf);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .header .subtitle { font-size: 16px; color: var(--text-secondary); margin-top: 12px; }

        .status-bar { display: flex; justify-content: center; gap: 30px; padding: 20px 0; flex-wrap: wrap; }
        .status-item {
            text-align: center; padding: 15px 25px;
            background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); min-width: 120px;
        }
        .status-value { font-size: 24px; font-weight: 700; color: var(--accent); }
        .status-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

        .footer {
            text-align: center; padding: 30px; color: var(--text-secondary);
            font-size: 13px; border-top: 1px solid var(--border); margin-top: 40px;
        }

        /* ===== 通用组件 ===== */
        .toolbar {
            height: 40px; background: var(--bg-card); border-bottom: 1px solid var(--border);
            display: flex; align-items: center; padding: 0 15px; gap: 5px;
        }
        .toolbar-btn {
            width: 32px; height: 28px; display: flex; align-items: center; justify-content: center;
            background: transparent; border: none; border-radius: 4px; cursor: pointer;
            color: var(--text-secondary); font-size: 14px; transition: all 0.15s;
        }
        .toolbar-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .btn { padding: 8px 16px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .2s; }
        .btn:hover { border-color: var(--accent); }
        .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
        .btn-primary:hover { background: var(--accent-hover); }
        .btn-secondary { background: var(--bg-tertiary, #2a2a4a); color: var(--text-primary); border: 1px solid var(--border); }
        .btn-secondary:hover { background: var(--bg-hover); }
        .btn-group { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
        .input { width: 100%; padding: 10px 12px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; margin-bottom: 12px; }
        .input:focus { outline: none; border-color: var(--accent); }
        .panel-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin: 12px 0; }
        .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .stat-label { color: var(--text-secondary); }
        .card-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

        .editor-pane {
            flex: 1; padding: 40px 60px; overflow-y: auto; font-size: 16px;
            line-height: 1.8; outline: none;
        }
        .editor-pane h1 { font-size: 28px; margin-bottom: 20px; }
        .editor-pane h2 { font-size: 22px; margin-top: 30px; margin-bottom: 15px; color: var(--accent-hover); }
        .editor-pane p { margin-bottom: 15px; }
        .editor-pane blockquote { border-left: 3px solid var(--accent); padding-left: 15px; margin: 15px 0; color: var(--text-secondary); font-size: 14px; }
        .editor-pane hr { border: none; border-top: 1px solid var(--border); margin: 30px 0; }

        .modal {
            display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); align-items: center; justify-content: center; z-index: 2000;
        }
        .modal.show { display: flex; }
        .modal-content {
            background: var(--bg-card); border-radius: 12px; padding: 24px;
            max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; border: 1px solid var(--border);
        }

        .toast {
            position: fixed; bottom: 50px; right: 20px;
            background: var(--bg-card); border: 1px solid var(--border);
            border-radius: 8px; padding: 12px 20px;
            display: flex; align-items: center; gap: 10px; z-index: 3000;
            transform: translateY(100px); opacity: 0; transition: all 0.3s ease;
        }
        .toast.show { transform: translateY(0); opacity: 1; }
        .toast.success { border-left: 3px solid var(--success); }
        .toast.error { border-left: 3px solid var(--error); }

        /* ===== 响应式 ===== */
        @media (max-width: 768px) {
            .module-grid { grid-template-columns: 1fr; gap: 16px; }
            .header { padding: 50px 20px 20px; }
            .header .logo { font-size: 36px; }
            .header .title { font-size: 28px; }
            .top-nav { padding: 0 10px; gap: 2px; }
            .nav-brand { margin-right: 10px; font-size: 16px; }
            .nav-btn { padding: 5px 10px; font-size: 12px; }
            .container { padding: 15px; }
            .editor-pane { padding: 20px; font-size: 16px; }
        }

"""

# Insert all page-specific CSS
monolith += "\n".join(all_css) + "\n"

monolith += """
    </style>
</head>
<body>
    <!-- 主题切换 -->
    <div class="theme-switcher">
        <button class="theme-btn active" onclick="setTheme('dark')">🌙</button>
        <button class="theme-btn" onclick="setTheme('light')">☀️</button>
        <button class="theme-btn" onclick="setTheme('system')">💻</button>
    </div>

    <!-- 顶部导航栏 -->
    <nav class="top-nav" id="topNav">
        <span class="nav-brand">📚 SAGE BOOK</span>
""" + nav_btns + """
    </nav>

    <!-- 主内容 -->
    <div class="main-content">
""" + page_views + """
    </div>

    <!-- 全局 Toast -->
    <div class="toast" id="globalToast"><span id="globalToastIcon">✓</span><span id="globalToastMsg">操作成功</span></div>

    <script>
"""

# Insert all page JS
monolith += "\n".join(all_js) + "\n"

monolith += r"""
        // ===== 全局页面导航 =====
        function showPage(pageFile) {
            document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const pageId = 'page-' + pageFile.replace('.html', '');
            const target = document.getElementById(pageId);
            if (target) target.classList.add('active');
            const btns = document.querySelectorAll('.nav-btn');
            btns.forEach(btn => {
                if (btn.getAttribute('onclick').includes(pageFile)) {
                    btn.classList.add('active');
                }
            });
            window.scrollTo(0, 0);
        }

        // ===== 全局主题切换 =====
        function setTheme(t) {
            const html = document.documentElement;
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            if (t === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            } else {
                html.setAttribute('data-theme', t);
            }
            document.querySelector('.theme-btn[onclick="setTheme(' + "'" + t + "'" + ')"]').classList.add('active');
            localStorage.setItem('theme', t);
        }
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);

        // ===== 全局 Toast =====
        function showToast(message, type) {
            type = type || 'success';
            const toast = document.getElementById('globalToast');
            document.getElementById('globalToastIcon').textContent = type === 'success' ? '✓' : (type === 'warning' ? '⚠' : '✗');
            document.getElementById('globalToastMsg').textContent = message;
            toast.className = 'toast ' + type + ' show';
            setTimeout(function() { toast.classList.remove('show'); }, 3000);
        }

        // ===== 拦截页面内链接 =====
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (href && href.match(/^[a-z-]+\.html$/)) {
                e.preventDefault();
                showPage(href);
            }
        });

        // ===== 初始化 =====
        (function() {
            var saved = localStorage.getItem('sagebook_novel');
            if (saved) console.log('已加载保存的创作数据');
        })();
    </script>
</body>
</html>
"""

output = 'SAGEBOOK.html'
with open(output, 'w', encoding='utf-8') as f:
    f.write(monolith)

size_kb = os.path.getsize(output) / 1024
print(f"✅ {output} 已生成")
print(f"   文件大小: {size_kb:.0f} KB")
for f in files:
    if f in monolith:
        print(f"   ✅ {f} 已包含")
    else:
        print(f"   ❌ {f} 缺失")
