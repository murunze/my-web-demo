/* ============================================================
 * 纯静态数据层 —— 复刻 clock-qa 后端读接口 + localStorage 写操作
 * 无后端依赖，供 app.js 的 api() 调用
 * ============================================================ */
(function () {
  const DB = window.STATIC_DB || { entries: [], categories: [], tags: [] };
  const LS = {
    questions: 'cqa_questions',
    feedbacks: 'cqa_feedbacks',
    user: 'user',
    sid: 'cqa_sid'
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function mySid() {
    let sid = localStorage.getItem(LS.sid);
    if (!sid) { sid = uid('s'); localStorage.setItem(LS.sid, sid); }
    return sid;
  }

  const catMap = {};
  DB.categories.forEach(c => { catMap[c.id] = c; });
  function entryView(e) {
    const cat = catMap[e.categoryId];
    const parent = cat && cat.parentId ? catMap[cat.parentId] : null;
    return {
      id: e.id, title: e.title, answer: e.answer, source: e.source, tags: e.tags || [],
      images: e.images || [], status: e.status, viewCount: e.viewCount,
      createdAt: e.createdAt, updatedAt: e.updatedAt,
      categoryId: e.categoryId, categoryName: cat ? cat.name : '',
      parentCategoryId: parent ? parent.id : null, parentCategoryName: parent ? parent.name : ''
    };
  }

  // 中文 2-gram 检索，权重与后端一致：标题命中3，答案命中1，整串命中标题+10，取前8
  function tokens(text) {
    const t = String(text || '').replace(/\s+/g, '').toLowerCase();
    const set = new Set();
    if (!t) return set;
    set.add(t);
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    (String(text || '').toLowerCase().match(/[a-z0-9]+/g) || []).forEach(w => set.add(w));
    return [...set];
  }
  function searchEntries(entries, query) {
    const qs = String(query || '').trim();
    if (!qs) return [];
    const toks = tokens(qs);
    const results = [];
    for (const e of entries) {
      const title = (e.title || '').toLowerCase();
      const answer = (e.answer || '').toLowerCase();
      let score = 0, hitTok = 0;
      for (const tk of toks) {
        if (tk.length < 2 && !/^[a-z0-9]+$/.test(tk)) continue;
        let w = 0;
        if (title.includes(tk)) w = 3;
        else if (answer.includes(tk)) w = 1;
        if (w) { score += w; hitTok++; }
      }
      if (title.includes(qs.toLowerCase())) score += 10;
      if (hitTok >= 1 && score > 0) results.push({ entry: e, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 8);
  }

  const online = () => DB.entries.filter(e => e.status === 'online');

  // 统一响应体：与后端 api() 返回的数据结构保持一致
  function route(method, p, bodyObj) {
    const [pathname, queryStr] = String(p).split('?');
    const params = new URLSearchParams(queryStr || '');
    const body = bodyObj || {};

    // GET /categories
    if (method === 'GET' && pathname === '/categories') {
      const tree = DB.categories.filter(c => c.level === 1).map(c => ({
        ...c, children: DB.categories.filter(x => x.parentId === c.id)
      }));
      return { categories: tree, tags: DB.tags };
    }

    // GET /entries  (列表/分类/标签/关键词过滤)
    if (method === 'GET' && pathname === '/entries') {
      let list = online();
      const categoryId = params.get('categoryId');
      const tag = params.get('tag');
      const q = params.get('q');
      if (categoryId) {
        const cat = DB.categories.find(c => c.id === categoryId);
        if (cat && cat.level === 1) {
          const subIds = DB.categories.filter(c => c.parentId === cat.id).map(c => c.id);
          list = list.filter(e => subIds.includes(e.categoryId) || e.categoryId === categoryId);
        } else {
          list = list.filter(e => e.categoryId === categoryId);
        }
      }
      if (tag) list = list.filter(e => (e.tags || []).includes(tag));
      if (q) list = searchEntries(list, q).map(r => r.entry);
      const view = list.map(entryView);
      return { entries: view, total: view.length };
    }

    // GET /entries/:id
    let m = pathname.match(/^\/entries\/(.+)$/);
    if (method === 'GET' && m) {
      const e = online().find(x => x.id === decodeURIComponent(m[1]));
      if (!e) return { __error: 404, error: '问答不存在或已下线' };
      return { entry: entryView(e) };
    }

    // GET /search
    if (method === 'GET' && pathname === '/search') {
      const q = params.get('q') || '';
      const results = searchEntries(online(), q).map(h => ({ ...entryView(h.entry), score: h.score }));
      return { query: q, results };
    }

    // POST /questions
    if (method === 'POST' && pathname === '/questions') {
      const title = String(body.title || '').trim();
      if (title.length < 5) return { __error: 400, error: '问题描述太简短，请至少输入5个字' };
      const q = {
        id: uid('q'), studentId: mySid(), phone: (JSON.parse(localStorage.getItem(LS.user) || 'null') || {}).phone || '',
        title, content: title, status: 'pending', rejectReason: '', publishedEntryId: null,
        createdAt: Date.now(), reviewedAt: null
      };
      const list = read(LS.questions); list.unshift(q); write(LS.questions, list);
      return { ok: true, question: q };
    }

    // GET /my/questions
    if (method === 'GET' && pathname === '/my/questions') {
      const sid = mySid();
      return { questions: read(LS.questions).filter(q => q.studentId === sid) };
    }

    // POST /feedbacks
    if (method === 'POST' && pathname === '/feedbacks') {
      const type = String(body.type || '').trim();
      const content = String(body.content || '').trim();
      if (!type) return { __error: 400, error: '请选择错误类型' };
      if (content.length < 5) return { __error: 400, error: '请具体描述错误内容（至少5个字）' };
      const fb = {
        id: uid('fb'), entryId: body.entryId || null,
        entryTitle: body.entryTitle || (body.feedbackCategory === 'answer' ? '（平台回答反馈）' : '（通用反馈，未指定条目）'),
        feedbackCategory: body.feedbackCategory || 'other',
        question: body.question || '', answer: body.answer || '',
        categoryId: body.categoryId || null, type,
        content, suggestion: body.suggestion || '', contact: body.contact || '',
        studentId: mySid(), phone: (JSON.parse(localStorage.getItem(LS.user) || 'null') || {}).phone || '',
        status: 'pending', adminNote: '', createdAt: Date.now(), handledAt: null
      };
      const list = read(LS.feedbacks); list.unshift(fb); write(LS.feedbacks, list);
      return { ok: true, feedback: fb };
    }

    // GET /my/feedbacks
    if (method === 'GET' && pathname === '/my/feedbacks') {
      const sid = mySid();
      return { feedbacks: read(LS.feedbacks).filter(f => f.studentId === sid) };
    }

    return { __error: 404, error: '静态版不支持该接口: ' + p };
  }

  // 模拟异步，保持 app.js 的 await 语义
  window.__staticRoute = function (method, path, body) {
    return new Promise(resolve => setTimeout(() => resolve(route(method, path, body)), 5));
  };
})();
