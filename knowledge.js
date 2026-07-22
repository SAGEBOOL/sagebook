/* ============================================================
 * knowledge.js — SageBook 共享知识层
 * 暴露 window.SageKB：跨页读取「角色管理 / 世界观 / 图谱 / 知识库编辑器」
 * 的知识库，为写作入口提供 (A) 上下文注入 与 (B) 一致性扫描。
 * 纯浏览器、无框架、无构建；仅依赖同 origin 的 localStorage。
 * ============================================================ */
window.SageKB = (function () {
  'use strict';

  // 知识库数据源（直接读各页面写入的 key，不依赖 sagebook_graph 聚合）
  const KEYS = {
    characters: 'sagebook_characters',        // 角色管理（角色全字段）
    loc: 'sagebook_wb_loc',                   // world-builder 地点（字符串数组）
    factions: 'sagebook_wb_factions',         // 势力 {name,desc,power}
    enc: 'sagebook_wb_enc',                   // 设定百科 {title,content,heat}
    timeline: 'sagebook_wb_timeline',         // 时间线（可选）
    levels: 'sagebook_wb_levels',             // 力量体系（可选）
    rules: 'sagebook_wb_rules',               // 世界规则（可选）
    outline: 'sagebook_outline'               // 知识库编辑器（用户上传/创建的结构化写作资料）
  };

  function getArr(k) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function getObj(k) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v && typeof v === 'object' ? v : null;
    } catch (e) { return null; }
  }

  // 把知识库编辑器的节点树拍平为列表（保留层级 depth）
  function flattenNodes(nodes, depth) {
    const out = [];
    (nodes || []).forEach(function (n) {
      if (!n) return;
      out.push({ title: n.title || '', content: n.content || '', type: n.type || '', depth: depth || 0 });
      if (n.children && n.children.length) {
        out.push.apply(out, flattenNodes(n.children, (depth || 0) + 1));
      }
    });
    return out;
  }

  // 读取并归一化全部知识库
  function loadKB() {
    const chars = getArr(KEYS.characters);
    const characters = chars.map(c => ({
      name: c.name || '',
      role: c.role || '',
      identity: c.occupation || c.identity || c.description || '',
      appearance: c.appearance || '',
      personality: c.personality || '',
      relations: resolveRelationNames(c.relationships, chars)
    })).filter(c => c.name);

    const locations = getArr(KEYS.loc).map(s => String(s).trim()).filter(Boolean);
    const factions = getArr(KEYS.factions).map(f => ({ name: f.name || '', desc: f.desc || '' }));
    const encyclopedia = getArr(KEYS.enc).map(e => ({ title: e.title || '', content: e.content || '' }));
    const timeline = getArr(KEYS.timeline);
    const levels = getArr(KEYS.levels);
    const rules = getArr(KEYS.rules);

    // 知识库编辑器（用户上传/创建的内容）
    const outlineObj = getObj(KEYS.outline) || {};
    const outlineNodes = flattenNodes(outlineObj.nodes, 0);
    const outlineTitle = outlineObj.title || '';

    return { characters, locations, factions, encyclopedia, timeline, levels, rules, outlineNodes, outlineTitle };
  }

  const ROLE_LABEL = { protagonist: '主角', antagonist: '反派', supporting: '配角', male: '男', female: '女' };

  // 紧凑注入文本（控制 token，避免超出模型 context）
  function buildKBContext(opt) {
    opt = opt || {};
    const charLimit = opt.charLimit || 40;
    const clip = opt.clip || 60;
    const kb = loadKB();
    const out = [];
    out.push('【角色】');
    if (kb.characters.length) {
      out.push(kb.characters.slice(0, charLimit).map(c =>
        '- ' + c.name + (ROLE_LABEL[c.role] ? '（' + ROLE_LABEL[c.role] + '）' : '') +
        '：' + (c.identity || '').slice(0, clip) +
        (c.relations.length ? '；关系 ' + c.relations.slice(0, 6).join('、') : '')
      ).join('\n'));
    } else out.push('（暂无角色）');
    out.push('【地点】');
    out.push(kb.locations.length ? kb.locations.slice(0, charLimit).join('、') : '（暂无）');
    out.push('【势力】');
    out.push(kb.factions.length ? kb.factions.map(f => f.name + '：' + (f.desc || '').slice(0, clip)).join('；') : '（暂无）');
    out.push('【设定百科】');
    out.push(kb.encyclopedia.length ? kb.encyclopedia.map(e => e.title + '：' + (e.content || '').slice(0, clip)).join('；') : '（暂无）');
    out.push('【知识库大纲】');
    if (kb.outlineNodes.length) {
      out.push(kb.outlineNodes.slice(0, charLimit).map(function (n) {
        const indent = n.depth ? new Array(Math.min(n.depth, 3) + 1).join('  ') : '';
        return indent + '- ' + (n.title || '(未命名)') + (n.content ? '：' + String(n.content).slice(0, clip) : '');
      }).join('\n'));
    } else out.push('（暂无知识库大纲）');
    return out.join('\n');
  }

  // 知识库统计（用于状态徽标）
  function getStats() {
    const kb = loadKB();
    return {
      characters: kb.characters.length,
      locations: kb.locations.length,
      factions: kb.factions.length,
      encyclopedia: kb.encyclopedia.length,
      outline: kb.outlineNodes.length,
      outlineTitle: kb.outlineTitle,
      total: kb.characters.length + kb.locations.length + kb.factions.length + kb.encyclopedia.length + kb.outlineNodes.length
    };
  }

  // 标准 Levenshtein 编辑距
  function lev(a, b) {
    a = a || ''; b = b || '';
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  /* 客户端轻量一致性扫描（零网络，秒级）
   * 返回 { used:[{type,name}], suspicious:[{text,like}] }
   *   used        —— 正文中出现、且命中知识库的角色/地点/知识库节点（确认贴合）
   *   suspicious  —— 正文中疑似库外/笔误的词（与某库名编辑距=1）
   */
  function scanConsistency(text, kb) {
    kb = kb || loadKB();
    const used = [], suspicious = [];
    if (!text) return { used, suspicious };
    const lower = text.toLowerCase();

    // (a) 库中角色/地点/知识库节点命中正文 -> used
    kb.characters.forEach(c => {
      if (c.name && lower.indexOf(c.name.toLowerCase()) !== -1) used.push({ type: '角色', name: c.name });
    });
    kb.locations.forEach(l => {
      if (l && lower.indexOf(l.toLowerCase()) !== -1) used.push({ type: '地点', name: l });
    });
    kb.outlineNodes.forEach(n => {
      if (n.title && lower.indexOf(n.title.toLowerCase()) !== -1) used.push({ type: '知识库', name: n.title });
    });

    // (b) 滑动窗口：找与已知名编辑距=1 的中文/英文片段（疑似笔误或新造名）
    const names = kb.characters.map(c => c.name).concat(kb.locations).concat(kb.outlineNodes.map(n => n.title)).filter(n => n && n.length >= 2);
    if (!names.length) return { used, suspicious };
    const seen = new Set();
    const hasCJK = /[一-鿿A-Za-z]/;
    for (const nm of names) {
      const L = nm.length;
      for (let i = 0; i + L <= text.length; i++) {
        const w = text.substr(i, L);
        if (w === nm) continue;
        if (!hasCJK.test(w)) continue;
        if (lev(w, nm) === 1) {
          const key = w + '|' + nm;
          if (seen.has(key)) continue;
          // 排除已作为 used 命中的窗口（已被精确包含）
          if (used.some(u => u.name === w)) continue;
          seen.add(key);
          suspicious.push({ text: w, like: nm });
        }
      }
    }
    return { used, suspicious };
  }

  return {
    KEYS, loadKB, buildKBContext, getStats, scanConsistency, lev
  };
})();
