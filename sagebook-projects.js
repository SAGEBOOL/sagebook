/* ============================================================
   SAGEBOOK 多项目管理（Phase 4）—— 纯加法，零改现有页面逻辑
   实现方式：在 <head> 早期重写 Storage 方法，对「项目作用域键」
   （当前仅手稿 sagebook_novel）透明加 projectId 后缀；
   角色/世界观/图谱/模板等「资料」保持全局共享（不切项目）。
   - 现有页面代码一行不动，仍按原键名读写，由本层重定向。
   - 现有设置页 Gist 同步无需修改：它读写 sagebook_novel 会自动落到
     当前项目的手稿键。
   - 每项目可绑定自己的 Gist（在书架面板里操作），实现"每项目独立 Gist"。
   首次升级：把旧 sagebook_novel 迁移进默认项目，并在面板提示命名。
   ============================================================ */
(function () {
  'use strict';

  var REG_KEY = 'sagebook_projects';
  // 仅这些键按项目隔离；其余（资料/设置/同步配置）全局共享
  var SCOPED = { 'sagebook_novel': true };
  var DEFAULT_NAME = '我的第一本书';

  function readReg() {
    try { return JSON.parse(localStorage.getItem(REG_KEY)) || null; } catch (e) { return null; }
  }
  function writeReg(r) {
    try { localStorage.setItem(REG_KEY, JSON.stringify(r)); } catch (e) {}
  }
  function getActiveId() {
    var r = readReg();
    return r && r.activeId ? r.activeId : 'default';
  }

  var FIRST_RUN = false;
  function ensure() {
    var r = readReg();
    if (r && r.projects && r.projects.length) return r;
    FIRST_RUN = true;
    // 迁移：把升级前已有的手稿归入默认项目
    var legacy = null;
    try { legacy = localStorage.getItem('sagebook_novel'); } catch (e) {}
    if (legacy != null) {
      try { localStorage.setItem('sagebook_novel_default', legacy); } catch (e) {}
    }
    r = {
      activeId: 'default',
      projects: [{ id: 'default', name: DEFAULT_NAME, gistId: null, createdAt: Date.now() }]
    };
    writeReg(r);
    return r;
  }
  ensure();

  function remap(key) {
    return SCOPED[key] ? key + '_' + getActiveId() : key;
  }

  // 只打一次补丁，避免重复
  if (!Storage.prototype.__sb_proj_patched) {
    ['getItem', 'setItem', 'removeItem'].forEach(function (m) {
      var orig = Storage.prototype[m];
      Storage.prototype[m] = function (key) {
        return orig.call(this, remap(key));
      };
    });
    Storage.prototype.__sb_proj_patched = true;
  }

  /* 公共 API */
  function findProject(id) {
    var r = readReg(); if (!r) return null;
    for (var i = 0; i < r.projects.length; i++) if (r.projects[i].id === id) return r.projects[i];
    return null;
  }
  window.SBProjects = {
    REG_KEY: REG_KEY,
    SCOPED: SCOPED,
    getActiveId: getActiveId,
    getRegistry: function () { return readReg(); },
    list: function () { var r = readReg(); return r ? r.projects : []; },
    getActive: function () { return findProject(getActiveId()); },
    isFirstRun: function () { return FIRST_RUN; },
    create: function (name) {
      var r = ensure();
      var id = 'p' + Date.now();
      r.projects.push({ id: id, name: name || '未命名项目', gistId: null, createdAt: Date.now() });
      r.activeId = id; writeReg(r);
      try { localStorage.setItem('sagebook_novel_' + id, ''); } catch (e) {}
      return id;
    },
    rename: function (id, name) {
      var p = findProject(id); if (!p) return;
      p.name = name || p.name; writeReg(readReg());
    },
    setGist: function (id, gistId) {
      var p = findProject(id); if (!p) return;
      p.gistId = gistId || null; writeReg(readReg());
    },
    remove: function (id) {
      var r = readReg(); if (!r || r.projects.length <= 1) return false;
      r.projects = r.projects.filter(function (p) { return p.id !== id; });
      try { localStorage.removeItem('sagebook_novel_' + id); } catch (e) {}
      if (r.activeId === id) r.activeId = r.projects[0].id;
      writeReg(r);
      return true;
    },
    switchTo: function (id) {
      var r = readReg(); if (!r) return;
      r.activeId = id; writeReg(r);
      location.reload();
    }
  };

  /* ---------------- 书架浮层 UI（加法，不碰现有 nav）---------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function gistToken() { try { return localStorage.getItem('sagebook_gist_token') || ''; } catch (e) { return ''; } }

  function mountBookshelf() {
    var fab = el('button', 'sb-bs-fab', '📚');
    fab.id = 'sb-bs-fab'; fab.type = 'button'; fab.title = '书架 / 多项目管理';

    var panel = el('div', 'sb-bs-panel'); panel.id = 'sb-bs-panel';
    var head = el('div', 'sb-bs-head');
    head.appendChild(el('span', 'sb-bs-title', '📚 书架'));
    var close = el('button', 'sb-bs-x', '×'); close.type = 'button';
    head.appendChild(close);
    panel.appendChild(head);

    var note = el('div', 'sb-bs-note');
    panel.appendChild(note);

    var list = el('div', 'sb-bs-list'); list.id = 'sb-bs-list';
    panel.appendChild(list);

    var actions = el('div', 'sb-bs-actions');
    var newBtn = el('button', 'sb-btn sb-btn-primary', '＋ 新建项目');
    newBtn.type = 'button';
    actions.appendChild(newBtn);
    panel.appendChild(actions);

    fab.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.toggle('open'); render(); });
    close.addEventListener('click', function () { panel.classList.remove('open'); });
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== fab) panel.classList.remove('open');
    });
    newBtn.addEventListener('click', function () {
      var name = prompt('新项目名称：', '新项目 ' + (SBProjects.list().length + 1));
      if (name == null) return;
      SBProjects.create(name);
      location.reload();
    });

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    function render() {
      var active = SBProjects.getActive();
      var isFirst = SBProjects.isFirstRun();
      note.style.display = isFirst ? 'block' : 'none';
      if (isFirst) note.innerHTML = '检测到你升级前已有的书，已归入下方默认项目。点 <b>✎</b> 给它起个名字。';
      list.innerHTML = '';
      SBProjects.list().forEach(function (p) {
        var row = el('div', 'sb-bs-row' + (p.id === active.id ? ' on' : ''));
        var nameWrap = el('div', 'sb-bs-name');
        nameWrap.innerHTML = '<span class="sb-bs-dot"></span>' + (p.name || '未命名').replace(/</g, '&lt;') +
          (p.id === active.id ? ' <em>当前</em>' : '');
        nameWrap.addEventListener('click', function () {
          if (p.id !== active.id) SBProjects.switchTo(p.id);
        });
        row.appendChild(nameWrap);

        var tools = el('div', 'sb-bs-tools');
        var ren = el('button', 'sb-bs-ic', '✎'); ren.type = 'button'; ren.title = '重命名';
        ren.addEventListener('click', function (e) {
          e.stopPropagation();
          var n = prompt('项目名称：', p.name); if (n == null) return;
          SBProjects.rename(p.id, n); render();
        });
        var sync = el('button', 'sb-bs-ic', '☁'); sync.type = 'button'; sync.title = '同步到本项目专属 Gist';
        sync.addEventListener('click', function (e) { e.stopPropagation(); doSync(p); });
        tools.appendChild(ren); tools.appendChild(sync);
        if (SBProjects.list().length > 1) {
          var del = el('button', 'sb-bs-ic', '🗑'); del.type = 'button'; del.title = '删除项目（含其手稿）';
          del.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!confirm('删除项目「' + p.name + '」？其手稿将一并清除，不可恢复。')) return;
            if (SBProjects.remove(p.id)) location.reload();
          });
          tools.appendChild(del);
        }
        row.appendChild(tools);
        list.appendChild(row);
      });
    }

    function doSync(p) {
      var token = gistToken();
      if (!token) { alert('请先在「设置」配置 GitHub Gist Token，才能同步。'); return; }
      var btn = panel.querySelector('.sb-bs-tools .sb-bs-ic[title="同步到本项目专属 Gist"]');
      var content = {};
      try { content['sagebook_novel_' + p.id] = localStorage.getItem('sagebook_novel_' + p.id) || ''; } catch (e) {}
      var body = {
        description: 'SAGEBOOK 项目手稿：' + (p.name || p.id),
        public: false,
        files: {}
      };
      body.files['sagebook_project_' + p.id + '.json'] = { content: JSON.stringify(content) };
      var url = p.gistId ? ('https://api.github.com/gists/' + p.gistId) : 'https://api.github.com/gists';
      var method = p.gistId ? 'PATCH' : 'POST';
      sync.textContent = '⏳';
      fetch(url, {
        method: method,
        headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (res) {
        if (!res.ok) throw new Error('Gist ' + res.status);
        return res.json();
      }).then(function (data) {
        if (!p.gistId && data.id) SBProjects.setGist(p.id, data.id);
        sync.textContent = '☁';
        alert('已同步到本项目专属 Gist。');
      }).catch(function (err) {
        sync.textContent = '☁';
        alert('同步失败：' + err.message + '\n（请检查 Token 权限或网络）');
      });
    }

    // 首次升级自动展开，提示命名
    if (SBProjects.isFirstRun()) {
      setTimeout(function () { panel.classList.add('open'); render(); }, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBookshelf);
  } else {
    mountBookshelf();
  }
})();
