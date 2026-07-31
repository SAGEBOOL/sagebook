/* ============================================================
   SageBook 体验增强层（Phase 1 / 2）— 纯加法，零侵入
   挂载：首次引导向导 / 帮助浮钮 / 命令面板(Cmd/Ctrl+K)
   所有 UI 使用 design-system.css 的 token，风格与站点一致
   ============================================================ */
(function () {
  'use strict';

  var LS = {
    onboarded: 'sagebook_onboarded',
    helpSeen: 'sagebook_help_seen'
  };

  /* 引导完成标志：多兜底持久化（localStorage 主，cookie 备，sessionStorage / 内存兜底）
     原因：个别浏览器或隐私模式下 localStorage.setItem 会抛错，导致"跳过"后标志丢失、
     返回默认页又弹出欢迎页。任一存储成功即可跨页 / 跨会话抑制引导。 */
  var _onboardedMem = false;
  function setOnboarded() {
    _onboardedMem = true;
    try { localStorage.setItem(LS.onboarded, '1'); } catch (e) {}
    try { sessionStorage.setItem(LS.onboarded, '1'); } catch (e) {}
    try {
      var exp = new Date(Date.now() + 365 * 86400000).toUTCString();
      document.cookie = LS.onboarded + '=1; path=/; expires=' + exp + '; SameSite=Lax';
    } catch (e) {}
  }
  function isOnboarded() {
    if (_onboardedMem) return true;
    try { if (localStorage.getItem(LS.onboarded)) return true; } catch (e) {}
    try { if (sessionStorage.getItem(LS.onboarded)) return true; } catch (e) {}
    try {
      if (document.cookie && document.cookie.indexOf(LS.onboarded + '=1') >= 0) return true;
    } catch (e) {}
    return false;
  }

  /* 每页的「这是什么 / 先做什么 / 去哪」帮助内容 */
  var PAGES = {
    'index.html': { ico: '🏠', label: '首页',
      steps: ['这里是所有创作工具的入口', '点「开始写作」直接动笔，或展开「更多创作工具」', '按 ⌘K / Ctrl+K 随时打开命令面板跳转'] },
    'main-editor.html': { ico: '✍️', label: '主编辑器',
      steps: ['左侧管理章节 / 文件夹，中间动笔写作', '选中文字 → 右侧「⚡技能」调用 AI 或导出', '不配置 AI 也能纯手写；配置后技能更强'] },
    'character-management.html': { ico: '👤', label: '角色管理',
      steps: ['建立人物卡：姓名、外貌、性格、关系', '写好后可在主编辑器的 AI 技能里被引用', '建议先填 3-5 个核心角色'] },
    'world-builder.html': { ico: '🌍', label: '世界观管理',
      steps: ['梳理地点、势力、设定百科等世界观要素', '为长篇 / 系列作提供一致的世界背景', '可在角色卡中引用世界观条目'] },
    'outline-editor.html': { ico: '📋', label: '知识库',
      steps: ['上传或创建你的专有资料：世界观、人物、剧情设定', '作为写作时的资料依据与 AI 上下文', '先把核心设定填进来，再去写作'] },
    'knowledge-graph.html': { ico: '🕸️', label: '知识图谱',
      steps: ['把人物、地点、事件连成关系网络', '直观查看剧情脉络与伏笔', '从知识库 / 角色导入数据后自动成图'] },
    'writing-analysis.html': { ico: '📊', label: '写作分析',
      steps: ['对正文做节奏、对话比、用词等体检', '发现可优化的段落与结构问题', '写完一章后回来分析效果最好'] },
    'platform-tools.html': { ico: '📱', label: '网文平台工具',
      steps: ['对接主流网文平台的发布 / 格式辅助', '查看各平台规则与排版要求', '导出前先在这里校对格式'] },
    'book-deconstruction.html': { ico: '📖', label: '拆书技能',
      steps: ['粘贴一段优质小说，拆解其结构配方', '「本地速览」离线可用；「AI 拆书」生成模板', '拆完的模板可拿去当自己的写作骨架'] },
    'short-drama.html': { ico: '🎬', label: '短剧 / 漫剧创作',
      steps: ['把灵感拆成爽点密集的短剧本', '自动分镜、人物设定与定型形象图', '需先在设置配置多模态模型出图 / 出视频'] },
    'template-gallery.html': { ico: '📚', label: '模板库',
      steps: ['浏览 / 套用各类写作与结构模板', '也可把自己常用的结构存为自定义模板', '新写作项目先挑个模板起步更快'] },
    'ai-suite.html': { ico: '🤖', label: 'AI 深度集成',
      steps: ['查看 AI 能力如何贯穿各工具', '了解本地 Ollama 与云端模型的取舍', '配置入口在「设置」'] },
    'settings.html': { ico: '⚙️', label: '设置',
      steps: ['配置 AI：本地 Ollama 或云端模型（自带 Key）', '多模态模型（图像 / 视频）也在此设置', '配置同步（Gist / Gitee）实现电脑手机打通'] },
    'docs.html': { ico: '📘', label: '使用帮助',
      steps: ['九节图文详解：从配 AI 到手机云同步', '遇到问题先来这里查', '命令面板 ⌘K / Ctrl+K 可快速跳转'] }
  };

  /* 命令面板条目：页面跳转 + 快捷动作 */
  var COMMANDS = [
    { ico: '✍️', label: '开始写作', url: 'main-editor.html', meta: '编辑器' },
    { ico: '📋', label: '知识库', url: 'outline-editor.html', meta: '资料' },
    { ico: '👤', label: '角色管理', url: 'character-management.html', meta: '资料' },
    { ico: '🌍', label: '世界观管理', url: 'world-builder.html', meta: '资料' },
    { ico: '🕸️', label: '知识图谱', url: 'knowledge-graph.html', meta: '资料' },
    { ico: '📖', label: '拆书技能', url: 'book-deconstruction.html', meta: '写作' },
    { ico: '🎬', label: '短剧 / 漫剧创作', url: 'short-drama.html', meta: '写作' },
    { ico: '📚', label: '模板库', url: 'template-gallery.html', meta: '结构' },
    { ico: '📊', label: '写作分析', url: 'writing-analysis.html', meta: '发布' },
    { ico: '📱', label: '网文平台工具', url: 'platform-tools.html', meta: '发布' },
    { ico: '🤖', label: 'AI 深度集成', url: 'ai-suite.html', meta: 'AI' },
    { ico: '⚙️', label: '设置', url: 'settings.html', meta: '系统' },
    { ico: '📘', label: '使用帮助', url: 'docs.html', meta: '系统' },
    { ico: '🧭', label: '推荐创作流', url: 'workflow.html', meta: '导航' },
    { ico: '🏠', label: '返回首页', url: 'index.html', meta: '系统' }
  ];

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------------- 首次引导向导 ---------------- */
  var ONBOARD_STEPS = [
    {
      ico: '👋', title: '欢迎来到 SAGEBOOK',
      sub: '你的智能创作伙伴 · 三步上手，不绕弯',
      body: '<p>这是一个<strong>纯前端</strong>的写作台：你所有的文字与设定都存在<strong>自己的浏览器</strong>里，不上传、不泄露。</p>' +
            '<p>第一步，先决定要不要接 AI。不接也能写，接了技能更强。</p>',
      actions: [
        { t: '⚙️ 配置 AI（推荐）', cls: 'sb-btn-primary', url: 'settings.html' },
        { t: '✍️ 跳过，纯手写直接写', cls: 'sb-btn-accent', url: 'main-editor.html' }
      ]
    },
    {
      ico: '📚', title: '先建点「资料」',
      sub: '让 AI 和你的写作有据可依',
      body: '<p>在动笔前，建议先往<strong>知识库 / 角色 / 世界观</strong>里填一些你自己的设定。</p>' +
            '<p>这些资料会被写作时的 AI 技能引用，人物、背景更一致。也可以先跳过，写完再补。</p>',
      actions: [
        { t: '📋 去知识库', cls: 'sb-btn', url: 'outline-editor.html' },
        { t: '👤 去角色管理', cls: 'sb-btn', url: 'character-management.html' },
        { t: '🌍 去世界观', cls: 'sb-btn', url: 'world-builder.html' }
      ]
    },
    {
      ico: '🚀', title: '开始动笔',
      sub: '打开即写，选中文字即可调 AI / 导出',
      body: '<p>一切就绪。打开编辑器，左侧管章节，中间写作，右侧「⚡技能」随时帮你扩写、润色、导出。</p>' +
            '<p>随时按 <span class="sb-help-kbd">⌘K</span> / <span class="sb-help-kbd">Ctrl K</span> 打开命令面板，秒跳任意工具。</p>',
      actions: [
        { t: '✍️ 进入编辑器', cls: 'sb-btn-primary', url: 'main-editor.html' }
      ]
    }
  ];

  function showOnboarding() {
    if (isOnboarded()) return;
    var idx = 0;
    var overlay = el('div', 'sb-overlay');
    overlay.id = 'sb-onboard';
    var card = el('div', 'sb-onboard-card');

    var head = el('div', 'sb-onboard-head');
    var ico = el('div', 'sb-onboard-ico');
    var title = el('div', 'sb-onboard-title');
    head.appendChild(ico); head.appendChild(title);

    var sub = el('div', 'sb-onboard-sub');
    var body = el('div', 'sb-onboard-body');
    var actions = el('div', 'sb-onboard-actions');
    var dots = el('div', 'sb-onboard-dots');
    var skip = el('button', 'sb-onboard-skip', '跳过引导，以后再说');
    skip.type = 'button';

    function render() {
      var s = ONBOARD_STEPS[idx];
      ico.textContent = s.ico;
      title.textContent = s.title;
      sub.textContent = s.sub;
      body.innerHTML = s.body;
      actions.innerHTML = '';
      s.actions.forEach(function (a) {
        var b = el('a', 'sb-btn ' + a.cls, a.t);
        b.href = a.url;
        // 关键修复：点击后先持久化标志、移除浮层，再显式跳转。
        // 若依赖 <a> 默认导航，移除浮层（锚点祖先）会取消跳转，按钮表现为"无反应"。
        b.addEventListener('click', function (e) {
          e.preventDefault();
          setOnboarded();
          closeOverlay();
          location.href = a.url;
        });
        actions.appendChild(b);
      });
      dots.innerHTML = '';
      for (var i = 0; i < ONBOARD_STEPS.length; i++) {
        dots.appendChild(el('i', i === idx ? 'on' : ''));
      }
      back.style.visibility = idx === 0 ? 'hidden' : 'visible';
      skip.textContent = idx === ONBOARD_STEPS.length - 1 ? '完成并进入' : '跳过引导，以后再说';
    }

    function next() { if (idx < ONBOARD_STEPS.length - 1) { idx++; render(); } else finish(); }
    function prev() { if (idx > 0) { idx--; render(); } }
    function closeOverlay() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function finish() {
      setOnboarded();
      closeOverlay();
    }

    skip.addEventListener('click', finish);
    // 底部加 上一步 / 下一步
    var nav = el('div', 'sb-onboard-actions');
    var back = el('button', 'sb-btn', '← 上一步'); back.type = 'button';
    var fwd = el('button', 'sb-btn sb-btn-primary', '下一步 →'); fwd.type = 'button';
    back.addEventListener('click', prev);
    fwd.addEventListener('click', next);
    nav.appendChild(back); nav.appendChild(fwd);

    card.appendChild(head); card.appendChild(sub); card.appendChild(body);
    card.appendChild(actions); card.appendChild(nav); card.appendChild(dots); card.appendChild(skip);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) finish(); });
    render();
  }

  /* ---------------- 帮助浮钮 + 弹层 ---------------- */
  function mountHelp() {
    var page = currentPage();
    var info = PAGES[page] || { ico: '❓', label: 'SAGEBOOK', steps: ['按 ⌘K / Ctrl+K 打开命令面板快速跳转任意工具'] };

    var fab = el('button', 'sb-help-fab', '?');
    fab.id = 'sb-help-fab';
    fab.type = 'button';
    fab.title = '新手帮助 / 命令面板提示';

    var pop = el('div', 'sb-help-pop');
    pop.id = 'sb-help-pop';
    var h = el('h4', null, info.ico + ' ' + info.label + ' · 新手提示');
    var ol = el('ol');
    info.steps.forEach(function (s) { ol.appendChild(el('li', null, s)); });
    var kbd = el('div', null, '快捷跳转：按 <span class="sb-help-kbd">⌘K</span> / <span class="sb-help-kbd">Ctrl K</span> 打开命令面板');
    kbd.style.marginTop = '8px';
    kbd.style.fontSize = '11px';
    kbd.style.color = 'var(--fg-muted)';
    pop.appendChild(h); pop.appendChild(ol); pop.appendChild(kbd);

    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (pop.classList.contains('open') && !pop.contains(e.target) && e.target !== fab) {
        pop.classList.remove('open');
      }
    });

    document.body.appendChild(fab);
    document.body.appendChild(pop);
  }

  /* ---------------- 命令面板 ---------------- */
  function mountPalette() {
    var overlay = el('div', 'sb-palette');
    overlay.id = 'sb-palette';
    var box = el('div', 'sb-palette-box');
    var input = el('input', 'sb-palette-input');
    input.placeholder = '搜索工具或跳转到…（输入关键字）';
    input.id = 'sb-palette-input';
    var list = el('div', 'sb-palette-list');
    list.id = 'sb-palette-list';
    var foot = el('div', 'sb-palette-foot');
    foot.innerHTML = '<span><span class="sb-help-kbd">↑↓</span> 选择</span><span><span class="sb-help-kbd">↵</span> 打开</span><span><span class="sb-help-kbd">esc</span> 关闭</span>';

    box.appendChild(input); box.appendChild(list); box.appendChild(foot);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var active = 0;
    var filtered = COMMANDS.slice();

    function paint() {
      list.innerHTML = '';
      if (!filtered.length) {
        list.appendChild(el('div', 'sb-palette-empty', '没有匹配的工具'));
        return;
      }
      filtered.forEach(function (c, i) {
        var item = el('div', 'sb-palette-item' + (i === active ? ' active' : ''));
        item.innerHTML = '<span class="sb-pi-ico">' + c.ico + '</span><span>' + c.label +
          '</span><span class="sb-pi-meta">' + (c.meta || '') + '</span>';
        item.addEventListener('click', function () { go(c); });
        item.addEventListener('mousemove', function () { active = i; paint(); });
        list.appendChild(item);
      });
    }

    function go(c) {
      overlay.classList.remove('open');
      if (c.url) location.href = c.url;
    }

    function filter(q) {
      q = (q || '').trim().toLowerCase();
      filtered = !q ? COMMANDS.slice() : COMMANDS.filter(function (c) {
        return c.label.toLowerCase().indexOf(q) >= 0 || (c.meta || '').toLowerCase().indexOf(q) >= 0;
      });
      active = 0;
      paint();
    }

    function open() {
      overlay.classList.add('open');
      input.value = '';
      filter('');
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() { overlay.classList.remove('open'); }

    input.addEventListener('input', function () { filter(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) go(filtered[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (overlay.classList.contains('open')) close(); else open();
      } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
        close();
      }
    });
  }

  /* ---------------- 编辑器 @ 提及（角色 / 世界观）---------------- */
  /* 仅当页面存在 #editor 文本域时挂载；纯加法，不动现有编辑器逻辑 */
  var MENTION_TYPE = {
    char: '角色', loc: '地点', fac: '势力', lvl: '等级', enc: '词条'
  };
  var MENTION_ICO = {
    char: '👤', loc: '📍', fac: '⚔️', lvl: '🎚️', enc: '📖'
  };

  function readList(key) {
    var arr = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { return []; }
    if (!Array.isArray(arr)) return [];
    return arr.map(function (x) {
      if (typeof x === 'string') return { name: x };
      if (x && typeof x === 'object') return { name: x.name || x.title || x.text || '' };
      return null;
    }).filter(function (x) { return x && x.name; });
  }

  function collectMentionItems() {
    var items = [];
    var chars = readList('sagebook_characters');
    chars.forEach(function (c) { items.push({ type: 'char', name: c.name }); });
    readList('sagebook_wb_loc').forEach(function (x) { items.push({ type: 'loc', name: x.name }); });
    readList('sagebook_wb_factions').forEach(function (x) { items.push({ type: 'fac', name: x.name }); });
    readList('sagebook_wb_levels').forEach(function (x) { items.push({ type: 'lvl', name: x.name }); });
    readList('sagebook_wb_enc').forEach(function (x) { items.push({ type: 'enc', name: x.name }); });
    return items;
  }

  function getCaretCoordinates(textarea, position) {
    var div = document.createElement('div');
    var style = window.getComputedStyle(textarea);
    var props = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight',
      'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing',
      'tabSize', 'whiteSpace', 'wordWrap', 'wordBreak'];
    props.forEach(function (p) { div.style[p] = style[p]; });
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'hidden';
    div.textContent = textarea.value.substring(0, position);
    var span = document.createElement('span');
    span.textContent = textarea.value.substring(position) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    var lh = parseInt(style.lineHeight, 10);
    if (isNaN(lh)) lh = parseFloat(style.fontSize) * 1.4;
    var coords = {
      top: span.offsetTop + (parseInt(style.borderTopWidth, 10) || 0),
      left: span.offsetLeft + (parseInt(style.borderLeftWidth, 10) || 0),
      height: lh
    };
    document.body.removeChild(div);
    return coords;
  }

  function mountMentions() {
    var editor = document.getElementById('editor');
    if (!editor || editor.tagName !== 'TEXTAREA') return;

    var ALL = collectMentionItems();
    var popup = el('div', 'sb-mention');
    popup.id = 'sb-mention';
    popup.innerHTML = '<div class="sb-mention-hint">输入 <b>@</b> 引用角色 / 世界观 · ↑↓ 选择 · ↵ 插入</div>';
    var list = el('div');
    list.id = 'sb-mention-list';
    popup.appendChild(list);
    document.body.appendChild(popup);

    var open = false, items = [], active = 0, startIdx = -1;

    function getQuery() {
      var pos = editor.selectionStart;
      if (pos == null) return null;
      var before = editor.value.slice(0, pos);
      var m = before.match(/(^|[\s\u4e00-\u9fa5，。、；：！？,.!?])@([\u4e00-\u9fa5\w]*)$/);
      if (!m) return null;
      return { query: m[2], start: pos - m[2].length - 1 };
    }

    function filter(q) {
      q = (q || '').trim().toLowerCase();
      var pool = ALL.length ? ALL : collectMentionItems();
      if (!pool.length) return [];
      var r = !q ? pool : pool.filter(function (it) {
        return it.name.toLowerCase().indexOf(q) >= 0;
      });
      return r.slice(0, 12);
    }

    function paint() {
      list.innerHTML = '';
      if (!items.length) {
        list.appendChild(el('div', 'sb-mention-empty', '没有匹配的角色或世界观'));
        return;
      }
      items.forEach(function (it, i) {
        var row = el('div', 'sb-mention-item' + (i === active ? ' active' : ''));
        row.innerHTML = '<span class="sb-mi-ico">' + (MENTION_ICO[it.type] || '•') + '</span>' +
          '<span class="sb-mi-name">' + it.name.replace(/</g, '&lt;') + '</span>' +
          '<span class="sb-mi-type">' + (MENTION_TYPE[it.type] || '') + '</span>';
        row.addEventListener('mousedown', function (e) { e.preventDefault(); apply(i); });
        row.addEventListener('mousemove', function () { if (active !== i) { active = i; paint(); } });
        list.appendChild(row);
      });
    }

    function position() {
      var rect = editor.getBoundingClientRect();
      var c = getCaretCoordinates(editor, startIdx);
      var top = rect.top - editor.scrollTop + c.top + c.height + 4;
      var left = rect.left - editor.scrollLeft + c.left;
      popup.style.top = Math.min(top, window.innerHeight - 260) + 'px';
      popup.style.left = Math.max(8, Math.min(left, window.innerWidth - 266)) + 'px';
    }

    function show() { open = true; popup.classList.add('open'); }
    function hide() { open = false; popup.classList.remove('open'); }

    function update() {
      var q = getQuery();
      if (!q) { hide(); return; }
      startIdx = q.start;
      items = filter(q.query);
      active = 0;
      if (!items.length) { hide(); return; }
      paint();
      position();
      show();
    }

    function apply(i) {
      var it = items[i];
      if (!it) return;
      var pos = editor.selectionStart;
      var v = editor.value;
      var next = v.slice(0, startIdx) + it.name + ' ' + v.slice(pos);
      editor.value = next;
      var caret = startIdx + it.name.length + 1;
      editor.setSelectionRange(caret, caret);
      editor.focus();
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      hide();
    }

    editor.addEventListener('input', update);
    editor.addEventListener('keyup', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) >= 0) update();
    });
    editor.addEventListener('click', update);
    editor.addEventListener('blur', function () { setTimeout(hide, 120); });
    editor.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); paint(); position(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paint(); position(); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); apply(active); }
      else if (e.key === 'Escape') { e.preventDefault(); hide(); }
    });

    // 数据可能随编辑过程变化，离开编辑器时刷新候选池
    editor.addEventListener('blur', function () { ALL = collectMentionItems(); });
  }

  /* ---------------- PWA：注册 Service Worker（离线壳 / 可安装）---------------- */
  /* 仅 http(s) 同源环境注册；file:// 直接打开或浏览器不支持时静默跳过，不影响页面 */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var p = location.protocol;
    if (p !== 'https:' && p !== 'http:') return;
    if (typeof window.addEventListener !== 'function') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* 注册失败不影响使用 */ });
    });
  }

  /* ---------------- 章节深链：?chapter= 跳主编辑器对应章节 ---------------- */
  function mountChapterDeepLink() {
    // 仅主编辑器（暴露了 openFile）需要此能力；其他页面无 openFile 自动跳过
    if (typeof window.openFile !== 'function') return;
    function resolve() {
      try {
        var p = new URLSearchParams(location.search).get('chapter');
        if (!p) return;
        var novel = JSON.parse(localStorage.getItem('sagebook_novel') || 'null');
        if (!novel || !novel.chapters) return;
        var ids = Object.keys(novel.chapters);
        var target = null;
        if (novel.chapters[p]) {                      // 1) 精确 id
          target = p;
        } else {
          var idx = parseInt(p, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= ids.length) {  // 2) 1-based 序号
            target = ids[idx - 1];
          } else {                                    // 3) 标题包含匹配
            var t = p.replace(/\.(md|txt)$/i, '');
            target = ids.filter(function (id) {
              return (novel.chapters[id].title || '').indexOf(t) >= 0;
            })[0] || null;
          }
        }
        if (target) window.openFile(target);
      } catch (e) { /* 不影响页面 */ }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', boot); return; }
    try { mountPalette(); } catch (e) { /* 不影响页面 */ }
    try { mountHelp(); } catch (e) { /* 不影响页面 */ }
    try { mountMentions(); } catch (e) { /* 不影响页面 */ }
    try { mountChapterDeepLink(); } catch (e) { /* 不影响页面 */ }
    try { showOnboarding(); } catch (e) { /* 不影响页面 */ }
    try { registerServiceWorker(); } catch (e) { /* 不影响页面 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
