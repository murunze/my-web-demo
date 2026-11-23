/* 学员端前端逻辑 */
const API = '/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let categories = [];
let tagsList = [];

function setAuth(t, u) {
  token = t; user = u;
  localStorage.setItem('token', t);
  localStorage.setItem('user', JSON.stringify(u));
  renderUserArea();
}
function logout() {
  token = null; user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  location.hash = '#/home';
  renderUserArea(); route();
}
function renderUserArea() {
  const el = document.getElementById('userArea');
  if (user) {
    const name = user.role === 'admin' ? '管理员 ' + user.username : (user.name || user.phone);
    el.innerHTML = `<span class="who">👤 ${name}</span><a class="btn-logout" onclick="logout()">退出</a>`;
  } else {
    el.innerHTML = `<a class="btn btn-outline btn-sm" href="#/login">登录</a>`;
  }
}

async function api(path, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  let bodyObj = null;
  if (opts.body) { try { bodyObj = JSON.parse(opts.body); } catch (e) {} }
  const data = await window.__staticRoute(method, path, bodyObj);
  if (data && data.__error) {
    if (data.__error === 401) { logout(); throw new Error(data.error || '请先登录'); }
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function stHtml(st) {
  const m = { pending: ['待审核', 'st-pending'], published: ['已发布', 'st-published'], rejected: ['已驳回', 'st-rejected'], online: ['已上线', 'st-online'], offline: ['已下线', 'st-offline'] };
  const [t, c] = m[st] || [st, ''];
  return `<span class="st ${c}">${t}</span>`;
}
function tagHtmls(entry) {
  let h = '';
  if (entry.parentCategoryName) h += `<span class="tag tag-cat">${esc(entry.parentCategoryName)}</span>`;
  if (entry.categoryName) h += `<span class="tag">${esc(entry.categoryName)}</span>`;
  (entry.tags || []).forEach(t => h += `<span class="tag">标签·${esc(t)}</span>`);
  return h;
}

// 列表项（含配图缩略图）
function entryItem(e, extraTitle) {
  const thumb = (e.images && e.images.length)
    ? `<div class="thumb"><img src="${esc(e.images[0])}" loading="lazy" alt="${esc(e.title)} 配图"></div>` : '';
  return `<div class="entry-item" onclick="location.hash='#/entry/${e.id}'">
      <div class="body">
        <div class="t">${esc(e.title)}${extraTitle || ''}</div>
        <div class="a">${esc(e.answer)}</div>
        <div class="meta">${tagHtmls(e)}<span class="tag-src">来源：${esc(e.source)}</span>${e.images && e.images.length ? '<span class="tag tag-img">含配图</span>' : ''}</div>
      </div>${thumb}
    </div>`;
}

// ============ 路由 ============
function route() {
  closeFeedback();   // 切换页面时关闭可能残留的纠错弹窗
  const hash = location.hash || '#/home';
  const parts = hash.slice(2).split('/');
  const page = parts[0] || 'home';
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + (page === 'list' ? 'category' : page));
  });
  const tabPage = page === 'list' ? 'category' : page;
  document.querySelectorAll('.tabbar a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === tabPage);
  });
  const tabbar = document.getElementById('tabbar');
  if (tabbar) tabbar.classList.toggle('hide', page === 'login');
  const needLogin = ['ask', 'my', 'list', 'entry', 'search', 'feedback'];
  if (needLogin.includes(page) && !user) {
    location.hash = '#/login';
    return;
  }
  const views = {
    home: viewHome, category: viewCategory, list: viewList, entry: viewEntry,
    ask: viewAsk, my: viewMy, about: viewAbout, login: viewLogin, search: viewSearch,
    feedback: viewFeedback
  };
  (views[page] || viewHome)(parts.slice(1));
}

function show(html) {
  document.getElementById('view').innerHTML = `<div class="container">${html}</div>`;
  window.scrollTo(0, 0);
}

// ============ 首页 ============
function viewHome() {
  show(`
  <div class="hero">
    <h1>钟表行业权威问答培训平台</h1>
    <p>面向研究院学员的钟表专业知识培训与答疑系统。知识库按六大品类（机械闹钟、机械摆钟、机械手表、指针石英钟、指针石英手表、液晶显示手表）组织，每个品类下按原理、结构、装配、维修、标准五个知识维度细分，由研究院专家审核发布，每条答案均标注权威资料来源。</p>
    <div class="search-box">
      <input type="text" id="homeQ" placeholder="输入关键词搜索问答，如：机械表 走时快 石英 摆锤…" onkeydown="if(event.key==='Enter')goSearch()">
      <button class="btn btn-primary" onclick="goSearch()">搜 索</button>
    </div>
    <div class="hot-tags"><span>热门：</span>
      <a onclick="goSearch('擒纵机构')">擒纵机构</a>
      <a onclick="goSearch('日历')">日历机构</a>
      <a onclick="goSearch('防震器')">防震器</a>
      <a onclick="goSearch('机芯')">机芯</a>
    </div>
    ${user ? '' : `<p class="hint" style="margin-top:22px">游客仅可浏览平台简介 · <a href="#/login" style="color:var(--brown-light)">白名单学员请登录</a>后使用问答检索与提问</p>`}
  </div>
  <div id="homeCats"></div>
  <div class="card" style="margin-top:24px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="color:var(--brown)">📖 最新权威问答</h3>
      ${user ? '<a class="btn btn-outline btn-sm" href="#/ask">我要提问</a>' : ''}
    </div>
    <div class="entry-list" id="latestList" style="margin-top:14px"></div>
  </div>`);
  if (user) {
    loadLatest();
    loadHomeCats();
  } else {
    document.getElementById('homeCats').innerHTML = `
    <div class="card" style="margin-top:20px">
      <h3 style="color:var(--brown);margin-bottom:10px">📚 知识分类导航</h3>
      <p class="hint">登录后可浏览完整问答库：机械闹钟 · 机械摆钟 · 机械手表 · 指针石英钟 · 指针石英手表 · 液晶显示手表（每品类下按原理 / 结构 / 装配 / 维修 / 标准细分）</p>
    </div>`;
  }
}

async function loadLatest() {
  try {
    const d = await api('/entries');
    const list = d.entries.slice(0, 5);
    document.getElementById('latestList').innerHTML = list.map(e => entryItem(e)).join('') || '<div class="empty">暂无问答</div>';
  } catch (e) { document.getElementById('latestList').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

async function loadHomeCats() {
  try {
    const d = await api('/categories');
    categories = d.categories; tagsList = d.tags;
    renderCatGrid(d.categories);
  } catch (e) { /* ignore */ }
}

function renderCatGrid(cats) {
  const descs = {
    '机械闹钟': '机械闹钟的走时原理、机芯结构、装配工艺、维修要点与相关标准。',
    '机械摆钟': '机械摆钟的摆振动原理、报时结构、装配调校、维修保养与标准规范。',
    '机械手表': '机械手表机芯的原理、结构、装配、维修与标准，含机芯结构图与部件示意图。',
    '指针石英钟': '指针式石英钟的走时原理、电路与轮系结构、装配与维修、国家标准。',
    '指针石英手表': '指针式石英手表的原理、结构、装配、维修与相关国家/行业标准。',
    '液晶显示手表': '液晶显示手表的显示原理、电路结构、装配工艺、维修要点与标准。'
  };
  document.getElementById('homeCats').innerHTML = `<div class="cat-grid">` + cats.map(c => `
    <div class="cat-card">
      <h3>${esc(c.name)}</h3>
      <div class="desc">${esc(descs[c.name] || '')}</div>
      <div class="sub-cats">
        <a onclick="location.hash='#/list/${c.id}'">全部 ›</a>
        ${(c.children || []).map(s => `<a onclick="location.hash='#/list/${s.id}'">${esc(s.name)}</a>`).join('')}
      </div>
    </div>`).join('') + `</div>`;
}

function goSearch(q) {
  const kw = q || document.getElementById('homeQ').value.trim();
  if (!kw) return;
  if (!user) { location.hash = '#/login'; return; }
  location.hash = '#/search/' + encodeURIComponent(kw);
}

// ============ 知识分类页 ============
async function viewCategory() {
  show('<div class="page-head"><h2>知识分类导航</h2></div><div id="catGrid"><div class="empty">加载中…</div></div>');
  try {
    const d = await api('/categories');
    categories = d.categories; tagsList = d.tags;
    document.getElementById('catGrid').innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'cat-grid';
    wrap.innerHTML = categories.map(c => `
      <div class="cat-card">
        <h3>${esc(c.name)}</h3>
        <div class="sub-cats">
          <a onclick="location.hash='#/list/${c.id}'">全部 ›</a>
          ${(c.children || []).map(s => `<a onclick="location.hash='#/list/${s.id}'">${esc(s.name)}</a>`).join('')}
        </div>
      </div>`).join('');
    document.getElementById('catGrid').appendChild(wrap);
  } catch (e) {
    document.getElementById('catGrid').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ============ 列表页 ============
async function viewList(args) {
  const catId = args[0];
  let curTag = null;
  show(`<div class="page-head"><h2 id="listTitle">问答列表</h2><span class="crumb" id="listCrumb"></span></div>
    <div class="toolbar">
      <input type="text" id="listQ" placeholder="在当前分类内搜索…" style="width:260px">
      <button class="btn btn-outline btn-sm" onclick="reloadList()">筛选</button>
      <span id="tagBar" style="display:flex;gap:6px;flex-wrap:wrap"></span>
    </div>
    <div class="entry-list" id="entryList"><div class="empty">加载中…</div></div>`);

  async function reloadList() {
    const q = document.getElementById('listQ').value.trim();
    const params = new URLSearchParams();
    if (catId) params.set('categoryId', catId);
    if (curTag) params.set('tag', curTag);
    if (q) params.set('q', q);
    try {
      const d = await api('/entries?' + params.toString());
      const cats = await api('/categories');
      const m = {};
      cats.categories.forEach(c => { m[c.id] = c; (c.children || []).forEach(s => m[s.id] = s); });
      const cat = m[catId];
      document.getElementById('listTitle').textContent = cat ? cat.name : '全部问答';
      document.getElementById('listCrumb').textContent = cat && cat.parentId ? '钟表专业知识 / ' + cat.name : '';
      document.getElementById('tagBar').innerHTML = (cats.tags || []).map(t =>
        `<a class="tag" style="cursor:pointer;${curTag === t ? 'background:var(--brown);color:#fff' : ''}" onclick="pickTag('${t}')">${t}</a>`).join('');
      document.getElementById('entryList').innerHTML = d.entries.map(e => entryItem(e)).join('') || '<div class="empty">该条件下暂无问答，可去<a href="#/ask" style="color:var(--brown-light)">提问入口</a>提交问题</div>';
    } catch (e) {
      document.getElementById('entryList').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }
  window.pickTag = t => { curTag = curTag === t ? null : t; reloadList(); };
  window.reloadList = reloadList;
  reloadList();
}

// ============ 详情页 ============
async function viewEntry(args) {
  show('<div class="empty">加载中…</div>');
  try {
    const d = await api('/entries/' + args[0]);
    const e = d.entry;
    window._curEntry = e;   // 供纠错弹窗取用，避免在 onclick 中内联转义标题
    show(`
    <div class="page-head"><h2>问答详情</h2>
      <span class="crumb"><a href="#/category" style="color:var(--brown-light)">知识分类</a> ›
      ${e.parentCategoryName ? esc(e.parentCategoryName) + ' › ' : ''}${esc(e.categoryName || '未分类')}</span></div>
    <div class="card detail">
      <h2>Q：${esc(e.title)}</h2>
      <div class="meta" style="margin-bottom:14px">${tagHtmls(e)}</div>
      <div class="answer">${esc(e.answer)}</div>
      ${e.images && e.images.length ? `<div class="imgs${e.images.length === 1 ? ' single' : ''}">${e.images.map(src => `<img src="${esc(src)}" loading="lazy" onclick="window.open(this.src)" style="cursor:zoom-in" alt="${esc(e.title)} 配套示意图">`).join('')}</div>
      <div class="img-cap">配套示意图（点击图片可放大查看）</div>` : ''}
      <div class="source-box"><b>权威资料来源：</b>${esc(e.source)}</div>
      <div style="margin-top:16px;font-size:12px;color:var(--muted)">阅读 ${e.viewCount || 1} 次 · 更新于 ${fmtTime(e.updatedAt)}</div>
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-outline" onclick="openFeedback('${e.id}')">⚠ 反馈本条内容的错误</button>
      <a class="btn btn-outline" href="#/ask">还有疑问？继续提问</a>
      <span class="hint" style="font-size:12px">发现答案有误、标准引用过时或表述不准？可点击左侧按钮，或页面右上角「📣 我要纠错」提交，管理员会及时处理。</span>
    </div>`);
  } catch (e) {
    show(`<div class="empty">${esc(e.message)}</div>`);
  }
}

// ============ 搜索结果页 ============
async function viewSearch(args) {
  const q = decodeURIComponent(args[0] || '');
  show(`<div class="page-head"><h2>搜索结果</h2><span class="crumb">关键词：${esc(q)}</span></div>
    <div class="entry-list" id="sList"><div class="empty">检索中…</div></div>`);
  try {
    const d = await api('/search?q=' + encodeURIComponent(q));
    document.getElementById('sList').innerHTML = d.results.length ? d.results.map(e => entryItem(e, ` <span class="score-badge">相关度 ${e.score}</span>`)).join('') : `<div class="empty">未找到相关问答。<a href="#/ask" style="color:var(--brown-light)">提交问题</a>等待管理员审核入库</div>`;
  } catch (e) {
    document.getElementById('sList').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ============ 提问页 ============
function viewAsk() {
  show(`
  <div class="page-head"><h2>我要提问</h2><span class="crumb">系统将优先检索已有权威问答库</span></div>
  <div class="card">
    <div class="field">
      <label class="req">您的问题</label>
      <textarea id="askTitle" placeholder="例如：机械手表上弦后摆轮不动是什么原因？"></textarea>
      <div class="hint" style="margin-top:5px">请尽量描述清楚品类与故障现象，便于检索与专家答复</div>
    </div>
    <button class="btn btn-primary" id="askBtn" onclick="doAsk()">检索并匹配</button>
    <div class="ask-result" id="askResult"></div>
  </div>`);
}

async function doAsk() {
  const q = document.getElementById('askTitle').value.trim();
  const box = document.getElementById('askResult');
  const btn = document.getElementById('askBtn');
  if (q.length < 5) { box.innerHTML = '<div class="notice notice-err">请输入至少 5 个字的问题描述</div>'; return; }
  btn.disabled = true; btn.textContent = '检索中…';
  try {
    const d = await api('/search?q=' + encodeURIComponent(q));
    if (d.results.length) {
      box.innerHTML = `
        <div class="notice notice-info">知识库中找到 ${d.results.length} 条相关问答（已按相关度排序），点击查看权威答案：</div>
        ${d.results.map(e => `
          <div class="match-item" onclick="location.hash='#/entry/${e.id}'">
            <div class="t">${esc(e.title)} <span class="score-badge">相关度 ${e.score}</span></div>
            <div class="a">${esc(e.answer.slice(0, 120))}…</div>
            <div class="meta">${tagHtmls(e)}<span class="tag-src">来源：${esc(e.source)}</span></div>
          </div>`).join('')}
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-outline btn-sm" onclick="openFeedback('',{category:'answer',question:window._pendingQ||''})">⚠ 反馈平台回答有误</button>
          <span class="hint" style="font-size:12px">如对以上某条平台回答有异议或发现错误，可点此直接反馈</span>
        </div>
        <div class="notice notice-warn">若以上答案未能解决您的问题，可将问题提交给管理员人工审核：
          <button class="btn btn-outline btn-sm" style="margin-left:8px" onclick="submitQuestion()">提交此问题到后台</button>
        </div>`;
      window._pendingQ = q;
    } else {
      box.innerHTML = `
        <div class="notice notice-warn">暂无相关问答。您可以将问题提交到后台，等待管理员人工审核，审核通过后将新增入库并通知您在"我的提问"中查看。</div>
        <button class="btn btn-primary" onclick="submitQuestion()">提交问题等待审核</button>`;
      window._pendingQ = q;
    }
  } catch (e) {
    box.innerHTML = `<div class="notice notice-err">${esc(e.message)}</div>`;
  }
  btn.disabled = false; btn.textContent = '检索并匹配';
}

async function submitQuestion() {
  const title = window._pendingQ || document.getElementById('askTitle').value.trim();
  try {
    await api('/questions', { method: 'POST', body: JSON.stringify({ title }) });
    document.getElementById('askResult').innerHTML =
      '<div class="notice notice-info">✅ 问题已提交，等待管理员审核。可到 <a href="#/my" style="color:var(--green)">我的提问</a> 查看审核状态。</div>';
    document.getElementById('askTitle').value = '';
  } catch (e) {
    document.getElementById('askResult').innerHTML = `<div class="notice notice-err">${esc(e.message)}</div>`;
  }
}

// ============ 我的提问 ============
async function viewMy() {
  show('<div class="page-head"><h2>我的提问</h2><span class="crumb">提交历史与审核状态</span></div><div class="card" id="myBox"><div class="empty">加载中…</div></div>');
  try {
    const d = await api('/my/questions');
    document.getElementById('myBox').innerHTML = d.questions.length ? `
      <table class="tbl">
        <tr><th>问题</th><th>状态</th><th>驳回理由</th><th>已发布问答</th><th>提交时间</th></tr>
        ${d.questions.map(q => `
          <tr>
            <td style="max-width:320px">${esc(q.title)}</td>
            <td>${stHtml(q.status)}</td>
            <td style="max-width:200px;font-size:13px">${q.status === 'rejected' ? '<span style="color:var(--red)">' + esc(q.rejectReason) + '</span>' : '-'}</td>
            <td>${q.publishedEntryId ? `<a href="#/entry/${q.publishedEntryId}" style="color:var(--green)">${esc(q.publishedEntryTitle || '查看')}</a>` : '-'}</td>
            <td style="white-space:nowrap">${fmtTime(q.createdAt)}</td>
          </tr>`).join('')}
      </table>` : '<div class="empty">您还没有提交过问题，去<a href="#/ask" style="color:var(--brown-light)">提问</a>试试</div>';
  } catch (e) {
    document.getElementById('myBox').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ============ 知识库纠错反馈 ============
const FB_TYPES = ['内容/数据错误', '标准引用错误', '术语或表述错误', '分类或标签错误',
  '资料来源标注错误', '配图错误', '错别字/格式问题', '其他'];

function fbStHtml(st) {
  const m = { pending: ['待处理', 'st-pending'], resolved: ['已处理', 'st-published'], rejected: ['已驳回', 'st-rejected'] };
  const [t, c] = m[st] || [st, ''];
  return `<span class="st ${c}">${t}</span>`;
}

// 反馈类别（与后端 FEEDBACK_CATEGORIES 保持一致）
const FB_CATS = { kb: '知识库内容错误', answer: '平台回答错误', other: '其他建议' };
function fbCatHtml(c) { return FB_CATS[c] || (c || '其他建议'); }

// 打开纠错反馈窗口
// entryId：关联的知识条目（可选）；preset：{category, question, answer} 预置内容（平台回答有误场景）
function openFeedback(entryId, preset) {
  if (!user) { location.hash = '#/login'; return; }
  preset = preset || {};
  const e = (entryId && window._curEntry && window._curEntry.id === entryId) ? window._curEntry : null;
  const entryTitle = e ? e.title : (entryId ? '' : '');
  const defCat = preset.category || (entryId ? 'kb' : '');
  let root = document.getElementById('fbModalRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'fbModalRoot';
    document.body.appendChild(root);
  }
  root.innerHTML = `
  <div class="modal-mask" onclick="if(event.target===this)closeFeedback()">
    <div class="modal" style="width:640px">
      <h3>📣 纠错反馈</h3>
      <div class="notice notice-info" style="margin-top:0">
        发现知识库内容有误，或对平台给出的回答有异议/有错误？请选择反馈类别并提交，管理员核实后会及时修订并回复处理结果。
      </div>
      <div class="field"><label class="req">反馈类别</label>
        <select id="fbCat" onchange="fbCatChange()">
          <option value="">（请选择）</option>
          <option value="kb"${defCat === 'kb' ? ' selected' : ''}>知识库内容错误</option>
          <option value="answer"${defCat === 'answer' ? ' selected' : ''}>平台回答错误</option>
          <option value="other"${defCat === 'other' ? ' selected' : ''}>其他建议 / 意见</option>
        </select>
      </div>
      <div id="fbKbBox" style="display:${defCat === 'kb' ? 'block' : 'none'}">
        <div class="field"><label>涉及的知识条目（可选）</label>
          <input type="text" id="fbEntryTitle" value="${esc(entryTitle)}" placeholder="如未针对具体条目，可留空或填写关键词">
        </div>
      </div>
      <div id="fbAnswerBox" style="display:${defCat === 'answer' ? 'block' : 'none'}">
        <div class="field"><label>您提问的问题</label>
          <textarea id="fbQuestion" style="min-height:56px" placeholder="请填写您当时提问的问题">${esc(preset.question || '')}</textarea>
        </div>
        <div class="field"><label>平台给出的回答（请粘贴认为有误的内容）</label>
          <textarea id="fbAnswer" style="min-height:90px" placeholder="请粘贴平台给出的、您认为有错误的回答内容">${esc(preset.answer || '')}</textarea>
        </div>
      </div>
      <div class="field"><label class="req">错误类型</label>
        <select id="fbType">
          <option value="">（请选择）</option>
          ${FB_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="req">错误描述（请尽量具体，可指出原文位置）</label>
        <textarea id="fbContent" style="min-height:110px" placeholder="例如：答案中“日差 ±5 秒”与 GB/T 4032—2013 表3 的分类1 限值（−4～+6 s/d）不符，建议核对。"></textarea>
      </div>
      <div class="field"><label>建议的正确内容 / 依据（选填）</label>
        <textarea id="fbSuggestion" style="min-height:80px" placeholder="可填写您认为正确的内容，或注明依据的标准号、页码、文献名称"></textarea>
      </div>
      <div class="field"><label>联系方式（选填，便于管理员回访）</label>
        <input type="text" id="fbContact" value="${user ? esc(user.phone || '') : ''}" placeholder="手机号或其他联系方式">
      </div>
      <div id="fbErr" class="notice notice-err" style="display:none"></div>
      <div class="actions">
        <button class="btn btn-outline" onclick="closeFeedback()">取消</button>
        <button class="btn btn-primary" onclick="submitFeedback('${entryId || ''}')">提交反馈</button>
      </div>
    </div>
  </div>`;
}

function fbCatChange() {
  const v = document.getElementById('fbCat').value;
  const kb = document.getElementById('fbKbBox');
  const ab = document.getElementById('fbAnswerBox');
  if (kb) kb.style.display = (v === 'kb') ? 'block' : 'none';
  if (ab) ab.style.display = (v === 'answer') ? 'block' : 'none';
}

function closeFeedback() {
  const root = document.getElementById('fbModalRoot');
  if (root) root.innerHTML = '';
}

async function submitFeedback(entryId) {
  const err = document.getElementById('fbErr');
  const cat = document.getElementById('fbCat').value;
  const type = document.getElementById('fbType').value;
  const content = document.getElementById('fbContent').value.trim();
  const suggestion = document.getElementById('fbSuggestion').value.trim();
  const contact = document.getElementById('fbContact').value.trim();
  const titleEl = document.getElementById('fbEntryTitle');
  const entryTitle = titleEl ? titleEl.value.trim() : '';
  const qEl = document.getElementById('fbQuestion');
  const aEl = document.getElementById('fbAnswer');
  const question = qEl ? qEl.value.trim() : '';
  const answer = aEl ? aEl.value.trim() : '';
  if (!cat) { err.style.display = 'block'; err.textContent = '请选择反馈类别'; return; }
  if (!type) { err.style.display = 'block'; err.textContent = '请选择错误类型'; return; }
  if (content.length < 5) { err.style.display = 'block'; err.textContent = '请具体描述错误内容（至少5个字）'; return; }
  try {
    await api('/feedbacks', {
      method: 'POST',
      body: JSON.stringify({ entryId: entryId || '', entryTitle, feedbackCategory: cat, type, content, suggestion, contact, question, answer })
    });
    closeFeedback();
    const root = document.getElementById('fbModalRoot');
    if (root) {
      root.innerHTML = `
      <div class="modal-mask" onclick="if(event.target===this)closeFeedback()">
        <div class="modal" style="width:440px;text-align:center">
          <div style="font-size:40px;line-height:1">✅</div>
          <h3 style="margin:12px 0 8px">反馈已提交</h3>
          <p class="hint" style="line-height:1.8">感谢您的纠错！管理员会尽快核实处理。<br>可到 <a href="#/feedback" style="color:var(--brown-light)">我的反馈</a> 查看处理进度。</p>
          <div class="actions" style="justify-content:center">
            <button class="btn btn-primary" onclick="closeFeedback()">知道了</button>
          </div>
        </div>
      </div>`;
    }
  } catch (ex) {
    err.style.display = 'block'; err.textContent = ex.message;
  }
}

// 我的反馈：提交历史与处理状态
async function viewFeedback() {
  show('<div class="page-head"><h2>我的纠错反馈</h2><span class="crumb">知识库错误反馈记录与处理状态</span></div>'
    + '<div class="card" style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
    + '<button class="btn btn-primary btn-sm" onclick="openFeedback(\'\')">＋ 提交新的纠错反馈</button>'
    + '<span class="hint">未针对具体条目的通用反馈，可在弹窗中填写条目关键词或留空</span></div>'
    + '<div class="card" id="fbBox"><div class="empty">加载中…</div></div>');
  try {
    const d = await api('/my/feedbacks');
    document.getElementById('fbBox').innerHTML = d.feedbacks.length ? `
      <table class="tbl">
        <tr><th>反馈类别</th><th>反馈对象</th><th>错误类型</th><th>错误描述</th><th>状态</th><th>管理员回复</th><th>提交时间</th></tr>
        ${d.feedbacks.map(f => `
          <tr>
            <td style="white-space:nowrap">${fbCatHtml(f.feedbackCategory)}</td>
            <td style="max-width:200px">${f.entryId
              ? `<a href="#/entry/${f.entryId}" style="color:var(--brown-light)">${esc(f.entryTitle)}</a>`
              : esc(f.entryTitle)}</td>
            <td style="white-space:nowrap">${esc(f.type)}</td>
            <td style="max-width:300px">
              ${f.feedbackCategory === 'answer' ? `<div class="hint" style="font-size:12px;color:var(--brown)">问题：${esc(f.question || '-')}</div>` : ''}
              <div>${esc(f.content)}</div>
              ${f.feedbackCategory === 'answer' && f.answer ? `<div class="hint" style="margin-top:4px;font-size:12px">平台回答：${esc(f.answer)}</div>` : ''}
              ${f.suggestion ? `<div class="hint" style="margin-top:4px;font-size:12px">建议：${esc(f.suggestion)}</div>` : ''}
            </td>
            <td style="white-space:nowrap">${fbStHtml(f.status)}</td>
            <td style="max-width:200px;font-size:13px">${f.adminNote ? esc(f.adminNote) : '-'}</td>
            <td style="white-space:nowrap">${fmtTime(f.createdAt)}</td>
          </tr>`).join('')}
      </table>` : '<div class="empty">您还没有提交过纠错反馈。点击页面右上角「📣 我要纠错」即可提交，或在问答详情页点击「⚠ 反馈本条内容的错误」。</div>';
  } catch (e) {
    document.getElementById('fbBox').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ============ 关于我们 ============
function viewAbout() {
  show(`
  <div class="page-head"><h2>关于我们</h2></div>
  <div class="card" style="line-height:2">
    <h3 style="color:var(--brown);margin-bottom:10px">平台主办单位</h3>
    <p style="font-size:14px;color:var(--text);margin-bottom:18px">本平台由钟表研究院培训中心主办，面向研究院内部学员开展钟表专业知识培训与在线答疑，仅限白名单学员登录使用。</p>
    <h3 style="color:var(--brown);margin-bottom:10px">知识来源说明</h3>
    <p style="font-size:14px;color:var(--text);margin-bottom:18px">平台问答内容来源于国家标准（GB/QB 系列钟表行业标准）、行业权威出版物《钟表》杂志技术专栏、研究院专家审定讲义与维修案例汇编。每条问答均标注资料来源，并由管理员人工审核后发布。</p>
    <h3 style="color:var(--brown);margin-bottom:10px">免责声明</h3>
    <p style="font-size:14px;color:var(--text)">本平台内容仅供内部培训与学习参考，不构成对任何产品的质量判定或商业建议。涉及维修操作的内容具有一定风险，请在专业人员指导下进行。因不当使用平台内容造成的损失，主办单位不承担责任。如发现知识库内容存在错误，或对平台给出的回答有异议，可点击页面右上角「📣 我要纠错」随时提交反馈（可选择"知识库内容错误"或"平台回答错误"），管理员核实后将及时修订并回复处理结果。</p>
  </div>`);
}

// ============ 登录页 ============
function viewLogin() {
  show(`
  <div class="auth-wrap">
    <div class="auth-tabs">
      <a class="active" id="tabStudent" onclick="switchAuth('student')">学员登录</a>
      <a id="tabAdmin" onclick="switchAuth('admin')">管理员登录</a>
    </div>
    <div class="card" id="authBox"></div>
  </div>`);
  switchAuth('student');
}

function switchAuth(kind) {
  document.getElementById('tabStudent').className = kind === 'student' ? 'active' : '';
  document.getElementById('tabAdmin').className = kind === 'admin' ? 'active' : '';
  const box = document.getElementById('authBox');
  if (kind === 'student') {
    box.innerHTML = `
      <div class="notice notice-info" style="margin-top:0">仅限管理员录入白名单的手机号可登录</div>
      <div class="field"><label class="req">手机号</label>
        <input type="tel" id="loginPhone" maxlength="11" placeholder="请输入白名单内的11位手机号"></div>
      <div class="field"><label class="req">短信验证码</label>
        <div class="code-row">
          <input type="text" id="loginCode" maxlength="6" placeholder="6位验证码">
          <button class="btn btn-outline" id="sendBtn" onclick="sendCode()">获取验证码</button>
        </div>
        <div class="hint devcode" id="devHint" style="margin-top:5px"></div>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="studentLogin()">登 录</button>
      <div id="loginErr" class="notice notice-err" style="display:none"></div>`;
  } else {
    box.innerHTML = `
      <div class="field"><label class="req">管理员账号</label>
        <input type="text" id="adminUser" placeholder="管理员用户名"></div>
      <div class="field"><label class="req">密码</label>
        <input type="password" id="adminPwd" placeholder="密码"></div>
      <button class="btn btn-primary" style="width:100%" onclick="adminLogin()">登 录</button>
      <div class="hint" style="margin-top:10px">管理员账号不使用手机号验证码，不受白名单限制。首次登录将强制修改密码。</div>
      <div id="loginErr" class="notice notice-err" style="display:none"></div>`;
  }
}

function loginErr(msg) {
  const el = document.getElementById('loginErr');
  if (!el) return;
  el.style.display = 'block'; el.textContent = msg;
}

async function sendCode() {
  const phone = document.getElementById('loginPhone').value.trim();
  const btn = document.getElementById('sendBtn');
  if (!/^1\d{10}$/.test(phone)) { loginErr('请输入正确的11位手机号'); return; }
  const devCode = '123456';
  btn.disabled = true;
  loginErrHide();
  document.getElementById('devHint').innerHTML =
    '演示模式验证码：<b style="font-size:18px;color:var(--brown)">' + devCode + '</b>' +
    ' <a class="btn btn-outline btn-sm" style="margin-left:8px" onclick="fillCode(\'' + devCode + '\')">一键填入</a>';
  let t = 60;
  const timer = setInterval(() => {
    t--; btn.textContent = t + 's 后重发';
    if (t <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
  }, 1000);
}
function loginErrHide() { const el = document.getElementById('loginErr'); if (el) el.style.display = 'none'; }

function fillCode(code) {
  const el = document.getElementById('loginCode');
  if (el) { el.value = code; el.focus(); }
}

async function studentLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const code = document.getElementById('loginCode').value.trim();
  if (!/^1\d{10}$/.test(phone)) { loginErr('请输入正确的11位手机号'); return; }
  if (code !== '123456') { loginErr('验证码错误，演示模式请输入 123456'); return; }
  setAuth('demo-' + phone, { phone: phone, name: phone.slice(0, 3) + '****' + phone.slice(7), role: 'student' });
  location.hash = '#/home';
}

async function adminLogin() {
  loginErr('静态演示版不含管理后台，请访问学员端功能。');
}

window.addEventListener('hashchange', route);
renderUserArea();
route();
