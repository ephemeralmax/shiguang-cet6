/* renderer.js — 拾光六级 渲染层 */
(function () {
  'use strict';

  // ─── 常量 ─────────────────────────────────────────────────────────────────
  // 版本号与 package.json 保持一致（冒烟测试会校验，忘改会直接失败）
  const APP_VERSION = '1.0.2';
  const STORE_KEY = 'shiguang-cet6-v1';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DAY = 24 * 60 * 60 * 1000;

  // ─── 图标 ─────────────────────────────────────────────────────────────────
  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    translate: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M6 8h4M8 6v4"/><path d="M13 11h5M15.5 9v4"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    rotate: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    filter: '<svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    chevL: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    chevR: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a7 7 0 014 12.7V17H8v-2.3A7 7 0 0112 2z"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 1.64-5.64 4-7.32C7.29 9.33 8 11 10 11c1.5 0 2-.5 2.5-2C14 5.5 14 2 14 2c3 2 6 5.5 6 10 0 4.42-3.58 8-8 8z"/></svg>'
  };

  function icon(name, cls) {
    return `<span class="icon${cls ? ' ' + cls : ''}">${ICONS[name] || ''}</span>`;
  }

  // ─── 状态 ─────────────────────────────────────────────────────────────────
  let state = {
    version: 1,
    words: {},             // { wordId: { level, due, reviews, lastReviewed } }
    phraseFavorites: [],
    templateFavorites: [],
    templateEdits: {},     // { templateId: editedContent }
    customTemplates: [],
    translations: {},      // { tId: { done, myAnswer } }
    essays: {},            // { writingId: { text, done, updatedAt } } 作文草稿
    phraseProgress: {},    // { phraseId: { grade, lastReviewed, timesSeen } }
    activity: {},          // { 'YYYY-MM-DD': { reviews, translations, phrases, templates } }
    dailyGoal: 20
  };

  function remapKeys(obj, map) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const k of Object.keys(obj)) out[map[k] || k] = obj[k];
    return out;
  }

  function remapList(arr, map) {
    if (!Array.isArray(arr)) return [];
    return arr.map(id => map[id] || id);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign({}, state, parsed);
        state.words = parsed.words || {};
        state.activity = parsed.activity || {};
        state.phraseProgress = parsed.phraseProgress || {};

        // 一次性迁移：顺序 ID → 稳定 ID（数据文件改用源稳定键后，
        // 旧学习记录按 idmap 重挂，重新生成数据不再张冠李戴）
        if (!parsed.idSchema || parsed.idSchema < 2) {
          const map = window.CET6_IDMAP;
          if (map) {
            state.words = remapKeys(state.words, map.words || {});
            state.phraseProgress = remapKeys(state.phraseProgress, map.phrases || {});
            state.phraseFavorites = remapList(state.phraseFavorites, map.phrases || {});
            state.translations = remapKeys(state.translations, map.translations || {});
          }
          state.idSchema = 2;
          saveState();
        }
      }
    } catch (e) { /* corrupted state → keep defaults */ }
    // 类型加固：损坏/旧版存储不能让后续渲染抛错
    if (!state.words || typeof state.words !== 'object') state.words = {};
    if (!Array.isArray(state.phraseFavorites)) state.phraseFavorites = [];
    if (!Array.isArray(state.templateFavorites)) state.templateFavorites = [];
    if (!Array.isArray(state.customTemplates)) state.customTemplates = [];
    if (!state.templateEdits || typeof state.templateEdits !== 'object') state.templateEdits = {};
    if (!state.translations || typeof state.translations !== 'object') state.translations = {};
    if (!state.essays || typeof state.essays !== 'object') state.essays = {};
    if (!state.activity || typeof state.activity !== 'object') state.activity = {};
    if (!state.phraseProgress || typeof state.phraseProgress !== 'object') state.phraseProgress = {};
    if (!Number.isFinite(state.dailyGoal) || state.dailyGoal < 1 || state.dailyGoal > 500) state.dailyGoal = 20;
  }

  let saveFailedNotified = false;
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      saveFailedNotified = false;
      return true;
    } catch (e) {
      // 配额满/存储被拒：必须让用户知道，否则界面是在谎报"已保存"
      if (!saveFailedNotified) {
        saveFailedNotified = true;
        toast('⚠ 保存失败：本机存储空间不足或不可用，最近的学习记录可能丢失');
      }
      return false;
    }
  }

  function recordActivity(type, amount) {
    const key = StudyCore.dateKey(new Date());
    if (!state.activity[key]) state.activity[key] = { reviews: 0, translations: 0, phrases: 0, templates: 0 };
    state.activity[key][type] = (state.activity[key][type] || 0) + (amount || 1);
    saveState();
  }

  // ─── 数据访问 ─────────────────────────────────────────────────────────────
  const DATA = {
    words: window.CET6_WORDS || [],
    phrases: window.CET6_PHRASES || [],
    translations: window.CET6_TRANSLATIONS || [],
    templates: window.CET6_TEMPLATES || [],
    writing: window.CET6_WRITING || []
  };

  // ─── 顶栏 / 侧栏 ─────────────────────────────────────────────────────────
  const PAGE_NAMES = {
    dashboard: '今日概览', vocab: '六级词汇', phrases: '常用短语',
    translation: '翻译练习', essay: '作文模板'
  };

  let currentPage = 'dashboard';

  function setActiveNav(page) {
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    $('#page-name').textContent = PAGE_NAMES[page] || page;
  }

  function navigate(page) {
    currentPage = page;
    setActiveNav(page);
    renderPage();
    resetScroll();
  }

  // ─── 页面渲染入口 ─────────────────────────────────────────────────────────
  function renderPage() {
    const c = $('#content');
    switch (currentPage) {
      case 'dashboard': c.innerHTML = renderDashboard(); afterDashboard(); break;
      case 'vocab': c.innerHTML = renderVocab(); afterVocab(); break;
      case 'phrases': c.innerHTML = renderPhrases(); afterPhrases(); break;
      case 'translation': c.innerHTML = renderTranslation(); afterTranslation(); break;
      case 'essay': c.innerHTML = renderEssay(); afterEssay(); break;
    }
  }

  // 只有"换页"才回到顶部：内容区容器会保留上一页的滚动位置，
  // 从长列表切到另一页会直接落在页面中段（页内操作如收藏/翻卡不得重置）
  function resetScroll() {
    const c = $('#content');
    if (c) c.scrollTop = 0;
  }

  // ─── 仪表盘 ───────────────────────────────────────────────────────────────
  function renderDashboard() {
    const totalWords = DATA.words.length;
    const learnedWords = Object.values(state.words).filter(w => w.reviews > 0).length;
    const masteredWords = Object.values(state.words).filter(w => w.level >= 3).length;
    const dueCount = StudyCore.getReviewQueue(DATA.words, state, Date.now(), 9999).length;
    const streak = StudyCore.calculateStreak(state.activity, Date.now());
    const week = StudyCore.getWeekActivity(state.activity, Date.now());
    const maxWeek = Math.max(1, ...week.map(d => d.value));

    const todayKey = StudyCore.dateKey(new Date());
    const todayAct = state.activity[todayKey] || {};
    const todayTotal = (todayAct.reviews || 0) + (todayAct.translations || 0) + (todayAct.phrases || 0) + (todayAct.templates || 0);
    const goalPct = Math.min(100, Math.round(todayTotal / state.dailyGoal * 100));

    // 短语统计
    const phraseProgress = state.phraseProgress || {};
    const phraseReviewed = Object.keys(phraseProgress).length;
    const phraseMastered = Object.values(phraseProgress).filter(r => r.grade >= 2).length;
    const phraseWeak = Object.values(phraseProgress).filter(r => r.grade <= 1).length;

    return `
      <div class="content-inner">
        <section class="dashboard-hero">
          <div class="hero-copy">
            <p class="heading-eyebrow">GOOD ${new Date().getHours() < 12 ? 'MORNING' : new Date().getHours() < 18 ? 'AFTERNOON' : 'EVENING'}</p>
            <h1>今天，从 <strong>${Math.max(dueCount, 1)}</strong> 个词开始</h1>
            <p class="muted">六级备考 · 共 ${totalWords} 词条 · ${DATA.phrases.length} 条短语 · ${DATA.translations.length} 道翻译真题</p>
          </div>
          <div class="hero-word-card">
            <p class="hero-tag">${icon('fire')} 待复习</p>
            <p class="hero-word-big">${dueCount}</p>
            <p class="muted">个词等你征服</p>
            <button class="btn btn-primary" data-action="nav" data-page="vocab" data-mode="review">开始复习</button>
          </div>
        </section>

        <section class="stats-grid">
          <div class="stat-card"><div class="stat-icon" style="background:var(--green-soft);color:var(--green)">${icon('book')}</div><div class="stat-copy"><strong>${learnedWords}</strong><span>词汇已学</span></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:var(--yellow-soft);color:var(--yellow)">${icon('star')}</div><div class="stat-copy"><strong>${masteredWords}</strong><span>词汇掌握</span></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('layers')}</div><div class="stat-copy"><strong>${phraseReviewed}</strong><span>短语已练</span></div></div>
          <div class="stat-card"><div class="stat-icon" style="background:var(--purple-soft);color:var(--purple)">${icon('fire')}</div><div class="stat-copy"><strong>${streak}</strong><span>连续天数</span></div></div>
        </section>

        <div class="dashboard-bottom">
          <section class="card week-card">
            <h2 class="card-title">本周学习</h2>
            <div class="bar-chart">
              ${week.map(d => `
                <div class="bar-column">
                  <div class="bar-track"><div class="bar-fill" style="height:${Math.round(d.value / maxWeek * 100)}%"></div></div>
                  <span>${d.label}</span>
                </div>
              `).join('')}
            </div>
            <p class="week-note muted">本周共学习 ${week.reduce((s, d) => s + d.value, 0)} 次</p>
          </section>

          <section class="card today-overview-card">
            <h2 class="card-title">今日概况</h2>
            <div class="today-overview-grid">
              <div class="overview-item">
                <div class="overview-icon" style="background:var(--green-soft);color:var(--green)">${icon('book')}</div>
                <div><strong>${todayAct.reviews || 0}</strong><span>词汇复习</span></div>
              </div>
              <div class="overview-item">
                <div class="overview-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('layers')}</div>
                <div><strong>${todayAct.phrases || 0}</strong><span>短语复习</span></div>
              </div>
              <div class="overview-item">
                <div class="overview-icon" style="background:var(--orange-soft);color:var(--orange)">${icon('translate')}</div>
                <div><strong>${todayAct.translations || 0}</strong><span>翻译练习</span></div>
              </div>
              <div class="overview-item">
                <div class="overview-icon" style="background:var(--purple-soft);color:var(--purple)">${icon('edit')}</div>
                <div><strong>${todayAct.templates || 0}</strong><span>作文练习</span></div>
              </div>
            </div>
            <div class="overview-summary">
              <div class="overview-summary-row">
                <span class="muted">短语掌握</span>
                <span>${phraseMastered} / ${phraseReviewed} 已掌握${phraseWeak ? ` · ${phraseWeak} 待加强` : ''}</span>
              </div>
              <div class="overview-summary-row">
                <span class="muted">今日目标</span>
                <span>${todayTotal} / ${state.dailyGoal}（${goalPct}%）</span>
              </div>
            </div>
          </section>
        </div>
      </div>`;
  }

  function afterDashboard() {
    // update sidebar goal
    const todayKey = StudyCore.dateKey(new Date());
    const a = state.activity[todayKey] || {};
    const total = (a.reviews || 0) + (a.translations || 0) + (a.phrases || 0) + (a.templates || 0);
    const pct = Math.min(100, Math.round(total / state.dailyGoal * 100));
    const ring = $('#goal-ring');
    if (ring) ring.style.background = `conic-gradient(var(--orange) ${pct * 3.6}deg, #e0e5dc ${pct * 3.6}deg)`;
    const gc = $('#goal-count'); if (gc) gc.textContent = total;
    const gp = $('#goal-percent'); if (gp) gp.textContent = pct + '%';
    const gf = $('#goal-track-fill'); if (gf) gf.style.width = pct + '%';
    const gt = $('#goal-target'); if (gt) gt.textContent = '/ ' + state.dailyGoal;
    const badge = $('#nav-word-badge');
    if (badge) {
      const due = StudyCore.getReviewQueue(DATA.words, state, Date.now(), 9999).length;
      badge.textContent = due > 99 ? '99+' : due;
    }
  }

  // ─── 词汇模块 ─────────────────────────────────────────────────────────────
  let vocabMode = 'browse'; // browse | review
  let vocabFilter = { type: 'unit', value: 1, page: 0 };
  const PAGE_SIZE = 50;

  function renderVocab() {
    if (vocabMode === 'review') return renderReview();

    const totalWords = DATA.words.length;
    const maxUnit = Math.max(...DATA.words.map(w => w.unit));

    return `
      <div class="content-inner">
        <header class="page-heading">
          <div class="heading-eyebrow">VOCABULARY</div>
          <h1>六级词汇</h1>
          <p class="muted">共 ${totalWords} 词 · 按单元或词频浏览 · 间隔复习</p>
        </header>

        <div class="toolbar">
          <div class="segmented" role="tablist">
            <button class="seg-btn${vocabFilter.type === 'unit' ? ' active' : ''}" data-action="vocab-filter" data-type="unit">按单元</button>
            <button class="seg-btn${vocabFilter.type === 'frequency' ? ' active' : ''}" data-action="vocab-filter" data-type="frequency">按词频</button>
          </div>
          <div style="flex:1"></div>
          ${vocabFilter.type === 'unit' ? `
            <button class="btn btn-sm btn-ghost" data-action="vocab-unit" data-dir="-1" title="上一单元">${icon('chevL')}</button>
            <select class="select unit-jump" id="vocab-unit-jump" aria-label="跳转到指定单元">
              ${Array.from({ length: maxUnit }, (_, i) => `<option value="${i + 1}"${vocabFilter.value === i + 1 ? ' selected' : ''}>Unit ${i + 1}</option>`).join('')}
            </select>
            <span class="muted" style="font-size:11px">/ ${maxUnit}</span>
            <button class="btn btn-sm btn-ghost" data-action="vocab-unit" data-dir="1" title="下一单元">${icon('chevR')}</button>
          ` : `
            <div class="chip-row">
              ${['high', 'mid', 'low'].map(f => `<button class="chip${vocabFilter.value === f ? ' active' : ''}" data-action="vocab-freq" data-freq="${f}">${f === 'high' ? '高频' : f === 'mid' ? '中频' : '低频'}</button>`).join('')}
            </div>
          `}
          <button class="btn btn-primary btn-sm" data-action="vocab-review-start">${icon('play')} 开始复习</button>
        </div>

        <div class="word-list-card">
          <div class="word-list-head">
            <span>词汇</span><span>释义</span><span>掌握度</span>
          </div>
          ${renderWordRows()}
        </div>

        ${vocabFilter.type === 'unit' ? `
          <div class="list-footer">
            <button class="btn btn-sm btn-ghost" data-action="vocab-unit" data-dir="-1">← 上一单元</button>
            <span class="muted">Unit ${vocabFilter.value}</span>
            <button class="btn btn-sm btn-ghost" data-action="vocab-unit" data-dir="1">下一单元 →</button>
          </div>
        ` : ''}
      </div>`;
  }

  function getFilteredWords() {
    if (vocabFilter.type === 'unit') {
      return DATA.words.filter(w => w.unit === vocabFilter.value);
    }
    return DATA.words.filter(w => w.frequency === vocabFilter.value);
  }

  function renderWordRows() {
    const words = getFilteredWords();
    const pageWords = vocabFilter.type === 'frequency'
      ? words.slice(vocabFilter.page * PAGE_SIZE, (vocabFilter.page + 1) * PAGE_SIZE)
      : words;

    return pageWords.map(w => {
      const rec = state.words[w.id];
      const level = rec ? rec.level : 0;
      return `
        <div class="word-row" data-action="word-detail" data-id="${w.id}" role="button" tabindex="0">
          <div class="word-main">
            <strong class="word-title">${esc(w.word)}</strong>
            <span class="phonetic">${esc(w.phonetic)}</span>
          </div>
          <div class="word-meaning-cell">${esc(w.meaning)}</div>
          <div class="mastery-control" data-action="word-level" data-id="${w.id}">
            ${[0, 1, 2, 3].map(l => `<button class="mastery-dot${level >= l && l > 0 ? ' filled' : ''}${level === l ? ' current' : ''}" data-level="${l}" title="${['未学', '陌生', '模糊', '掌握'][l]}"></button>`).join('')}
          </div>
        </div>`;
    }).join('') + (vocabFilter.type === 'frequency' && words.length > PAGE_SIZE ? `
      <div class="list-footer">
        <button class="btn btn-sm btn-ghost" data-action="vocab-page" data-dir="-1" ${vocabFilter.page === 0 ? 'disabled' : ''}>← 上一页</button>
        <span class="muted">${vocabFilter.page + 1} / ${Math.ceil(words.length / PAGE_SIZE)}</span>
        <button class="btn btn-sm btn-ghost" data-action="vocab-page" data-dir="1" ${(vocabFilter.page + 1) * PAGE_SIZE >= words.length ? 'disabled' : ''}>下一页 →</button>
      </div>` : '');
  }

  // 闪卡复习
  let reviewQueue = [];
  let reviewIndex = 0;
  let reviewFlipped = false;
  let reviewGrades = {};  // { wordId: grade } 已评分记录
  let reviewHistory = [];  // 回看历史 [index, ...]
  let reviewedThisSession = new Set(); // 本次会话已计数的词条 ID

  function renderReview() {
    if (reviewIndex >= reviewQueue.length) {
      return `
        <div class="content-inner review-complete">
          <div class="empty-state">
            <div class="empty-icon">${icon('check')}</div>
            <h2>复习完成！</h2>
            <p class="muted">本轮复习了 ${reviewedThisSession.size} 个单词，继续保持！</p>
            <div class="practice-actions" style="margin-top:20px">
              <button class="btn btn-primary" data-action="vocab-review-restart">再来一轮</button>
              <button class="btn btn-secondary" data-action="vocab-exit-review">返回词库</button>
            </div>
          </div>
        </div>`;
    }

    const w = reviewQueue[reviewIndex];
    const progress = Math.round((reviewIndex / reviewQueue.length) * 100);
    const canGoBack = reviewHistory.length > 0;

    return `
      <div class="content-inner review-layout">
        <div class="review-hero">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <button class="btn btn-ghost btn-sm" data-action="vocab-exit-review">← 返回词库</button>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" data-action="review-back" ${canGoBack ? '' : 'disabled style="opacity:.4"'}>${icon('chevL')} 回看</button>
              <button class="btn btn-ghost btn-sm" data-action="review-forward" ${reviewIndex < reviewQueue.length - 1 ? '' : 'disabled style="opacity:.4"'}>前进 ${icon('chevR')}</button>
            </div>
            <span class="muted" style="font-size:12px">${icon('book')} 复习模式</span>
          </div>

          <!-- 可点击进度条 -->
          <div class="review-progress" style="padding:6px 0">
            <div class="review-dots" style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:8px">
              ${reviewQueue.map((_, i) => {
                const wId = reviewQueue[i].id;
                const grade = reviewGrades[wId];
                let dotColor = 'var(--line)';
                let dotSize = '8px';
                if (grade !== undefined) {
                  dotColor = grade === 0 ? '#e85d5d' : grade === 1 ? 'var(--yellow)' : grade === 2 ? 'var(--blue)' : 'var(--green)';
                  dotSize = '10px';
                }
                if (i === reviewIndex) dotSize = '14px';
                return `<button class="review-dot" data-action="review-jump" data-idx="${i}" title="第${i+1}个" style="width:${dotSize};height:${dotSize};min-width:${dotSize};border-radius:50%;border:0;background:${i === reviewIndex ? 'var(--green)' : dotColor};cursor:pointer;transition:.15s;padding:0;${i === reviewIndex ? 'outline:2px solid var(--green-soft)' : ''}"></button>`;
              }).join('')}
            </div>
            <div class="review-progress-track"><span style="width:${progress}%"></span></div>
            <div class="review-progress-label">${reviewIndex + 1} / ${reviewQueue.length}${reviewHistory.length ? ` · 已回看 ${reviewHistory.length} 次` : ''}</div>
          </div>

          <div class="flashcard${reviewFlipped ? ' flipped' : ''}" data-action="flip-card">
            <div class="flashcard-tag">${icon('book')} ${w.frequency === 'high' ? '高频' : w.frequency === 'mid' ? '中频' : '低频'} · Unit ${w.unit}</div>
            <p class="flash-word">${esc(w.word)}</p>
            <p class="flash-phonetic">${esc(w.phonetic)}</p>
            ${reviewFlipped ? `
              <div class="flash-answer">
                <p class="flash-meaning">${esc(w.meaning)}</p>
                <div class="flash-divider"></div>
                ${w.example ? `<p class="flash-example">${esc(w.example)}</p>` : ''}
                ${w.translation ? `<p class="flash-translation">${esc(w.translation)}</p>` : ''}
              </div>
            ` : `<p class="muted flash-hidden">点击卡片查看释义</p>`}
          </div>

          ${reviewFlipped ? `
            <div class="review-actions">
              <p class="muted" style="text-align:center;margin-bottom:12px">这个单词你掌握得怎么样？</p>
              <div class="review-grade">
                <button class="btn btn-secondary" data-action="review-grade" data-grade="0"><strong>不认识</strong><small>10分钟后再见</small></button>
                <button class="btn btn-warm" data-action="review-grade" data-grade="1"><strong>模糊</strong><small>1天后复习</small></button>
                <button class="btn btn-primary" data-action="review-grade" data-grade="2"><strong>认识</strong><small>3天后复习</small></button>
                <button class="btn btn-secondary" data-action="review-grade" data-grade="3" style="background:var(--green-soft);color:var(--green)"><strong>掌握</strong><small>7天后复习</small></button>
              </div>
            </div>
          ` : `
            <div class="practice-actions">
              <button class="btn btn-primary" data-action="flip-card">查看释义</button>
            </div>
          `}
        </div>
      </div>`;
  }

  function afterVocab() {
    // 复习快捷键统一在底部全局 keydown 处理（此前 document.onkeydown
    // 只在这里解绑，切到翻译/作文后仍残留，空格会触发翻卡并清空草稿）
    const jump = $('#vocab-unit-jump');
    if (jump) {
      jump.onchange = () => {
        const v = parseInt(jump.value, 10);
        if (!v || v < 1) return;
        vocabFilter.value = v;
        vocabFilter.page = 0;
        renderPage();
      };
    }
    afterDashboard(); // update badges
  }

  function flipCard() {
    reviewFlipped = !reviewFlipped;
    renderPage();
  }

  function reviewGoBack() {
    if (reviewHistory.length === 0) return;
    const prevIndex = reviewHistory.pop();
    reviewIndex = prevIndex;
    reviewFlipped = false;
    renderPage();
  }

  function reviewGoForward() {
    if (reviewIndex >= reviewQueue.length - 1) return;
    reviewHistory.push(reviewIndex);
    reviewIndex++;
    reviewFlipped = false;
    renderPage();
  }

  function reviewJumpTo(idx) {
    if (idx < 0 || idx >= reviewQueue.length) return;
    if (idx !== reviewIndex) {
      reviewHistory.push(reviewIndex);
      reviewIndex = idx;
    }
    reviewFlipped = false;
    renderPage();
  }

  // 下一个未评分项：全部评分完才允许进入完成页（此前跳到最后一个圆点、
  // 只评一项就会"完成"，且摘要虚报复习了整个队列）
  function nextUngradedIndex(from) {
    const n = reviewQueue.length;
    for (let step = 1; step <= n; step++) {
      const idx = (from + step) % n;
      if (reviewGrades[reviewQueue[idx].id] === undefined) return idx;
    }
    return -1;
  }

  function gradeReview(grade) {
    const w = reviewQueue[reviewIndex];
    if (!w) return;
    state.words[w.id] = StudyCore.reviewWord(state.words[w.id], grade, Date.now());
    reviewGrades[w.id] = grade;
    // 只在首次评分时计数，回看后重复评分不重复累计
    if (!reviewedThisSession.has(w.id)) {
      reviewedThisSession.add(w.id);
      recordActivity('reviews');
    }
    const next = nextUngradedIndex(reviewIndex);
    if (next === -1) {
      reviewIndex = reviewQueue.length; // 全部评分完毕，标记完成
    } else {
      reviewHistory.push(reviewIndex);
      reviewIndex = next;
    }
    reviewFlipped = false;
    saveState();
    renderPage();
  }

  function startReview() {
    reviewQueue = StudyCore.getReviewQueue(DATA.words, state, Date.now(), 20);
    reviewIndex = 0;
    reviewFlipped = false;
    reviewGrades = {};
    reviewHistory = [];
    reviewedThisSession = new Set();
    vocabMode = 'review';
    renderPage();
  }

  // ─── 短语模块 ─────────────────────────────────────────────────────────────
  let phraseCategory = '全部';
  let phraseSearch = '';
  let phraseMode = 'browse'; // browse | review
  let phraseReviewQueue = [];
  let phraseReviewIndex = 0;
  let phraseReviewFlipped = false;
  let phraseReviewHistory = [];
  let phraseReviewGrades = {};
  let phraseReviewedThisSession = new Set(); // 本次会话已计数的短语 ID

  function renderPhrases() {
    if (phraseMode === 'review') return renderPhraseReview();
    return renderPhraseBrowse();
  }

  function renderPhraseBrowse() {
    const categories = ['全部', '校园学习', '科技网络', '环境保护', '社会发展', '文化交流', '职场沟通', '健康生活', '图表写作', '通用表达'];

    return `
      <div class="content-inner">
        <header class="page-heading">
          <div class="heading-eyebrow">PHRASES</div>
          <h1>常用短语</h1>
          <p class="muted">共 ${DATA.phrases.length} 条短语 · 按场景分类 · 支持搜索</p>
        </header>

        <div class="toolbar">
          <div class="chip-row">
            ${categories.map(c => `<button class="chip${phraseCategory === c ? ' active' : ''}" data-action="phrase-cat" data-cat="${c}">${c}</button>`).join('')}
          </div>
          <div style="flex:1"></div>
          <div class="search-field" style="width:240px">
            ${icon('search')}
            <input type="text" class="input" id="phrase-search" placeholder="搜索短语或释义…" value="${esc(phraseSearch)}" autocomplete="off" spellcheck="false">
          </div>
          <button class="btn btn-primary btn-sm" data-action="phrase-review-start">${icon('play')} 复习短语</button>
        </div>

        <p class="muted" id="phrase-count" style="margin-bottom:12px">${phraseCountText()}</p>
        <div id="phrase-results">${renderPhraseResults()}</div>
      </div>`;
  }

  function phraseCountText() {
    const total = filterPhrases().length;
    if (!total) return '没有匹配的短语';
    return `找到 ${total} 条${total > 60 ? '（显示前 60 条，可用搜索缩小范围）' : ''}`;
  }

  function renderPhraseResults() {
    const filtered = filterPhrases();
    const display = filtered.slice(0, 60);

    if (!display.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${icon('search')}</div>
          <h3>没有匹配的短语</h3>
          <p>换个关键词，或清空搜索查看全部 ${DATA.phrases.length} 条</p>
          <div style="margin-top:16px"><button class="btn btn-secondary btn-sm" data-action="phrase-search-clear">清空搜索</button></div>
        </div>`;
    }

    return `
      <div class="phrase-grid">
        ${display.map(p => `
          <div class="phrase-card" data-id="${p.id}">
            <div class="phrase-card-top">
              <strong class="phrase-meaning">${esc(p.phrase)}</strong>
              <button class="favorite-btn${state.phraseFavorites.includes(p.id) ? ' active' : ''}" data-action="phrase-fav" data-id="${p.id}" title="收藏">
                ${icon('heart')}
              </button>
            </div>
            <p class="phrase-translation">${esc(p.meaning)}</p>
            ${p.example ? `<p class="phrase-example">${esc(p.example)}</p>` : ''}
            <div class="phrase-card-actions">
              <span class="category-label">${esc(p.category)}</span>
              ${p.source && p.source !== 'curated' ? `<span class="muted" style="font-size:11px">来自 ${esc(p.source)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${filtered.length > 60 ? `
        <div class="list-footer">
          <span class="muted">共 ${filtered.length} 条，输入关键词精准搜索</span>
        </div>
      ` : ''}`;
  }

  function renderPhraseReview() {
    if (phraseReviewIndex >= phraseReviewQueue.length) {
      return `
        <div class="content-inner review-complete">
          <div class="empty-state">
            <div class="empty-icon">${icon('check')}</div>
            <h2>短语复习完成！</h2>
            <p class="muted">本轮复习了 ${phraseReviewedThisSession.size} 条短语，继续加油！</p>
            <div class="practice-actions" style="margin-top:20px">
              <button class="btn btn-primary" data-action="phrase-review-restart">再来一轮</button>
              <button class="btn btn-secondary" data-action="phrase-exit-review">返回短语库</button>
            </div>
          </div>
        </div>`;
    }

    const p = phraseReviewQueue[phraseReviewIndex];
    const progress = Math.round((phraseReviewIndex / phraseReviewQueue.length) * 100);
    const canGoBack = phraseReviewHistory.length > 0;

    return `
      <div class="content-inner review-layout">
        <div class="review-hero">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <button class="btn btn-ghost btn-sm" data-action="phrase-exit-review">← 返回短语库</button>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" data-action="phrase-review-back" ${canGoBack ? '' : 'disabled style="opacity:.4"'}>${icon('chevL')} 回看</button>
              <button class="btn btn-ghost btn-sm" data-action="phrase-review-forward" ${phraseReviewIndex < phraseReviewQueue.length - 1 ? '' : 'disabled style="opacity:.4"'}>前进 ${icon('chevR')}</button>
            </div>
            <span class="muted" style="font-size:12px">${icon('chat')} 短语复习</span>
          </div>

          <!-- 可点击进度条 -->
          <div class="review-progress" style="padding:6px 0">
            <div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:8px">
              ${phraseReviewQueue.map((_, i) => {
                const grade = phraseReviewGrades[i];
                let dotColor = 'var(--line)';
                let dotSize = '8px';
                if (grade !== undefined) {
                  dotColor = grade === 0 ? '#e85d5d' : grade === 1 ? 'var(--yellow)' : 'var(--green)';
                  dotSize = '10px';
                }
                if (i === phraseReviewIndex) dotSize = '14px';
                return `<button data-action="phrase-review-jump" data-idx="${i}" title="第${i+1}个" style="width:${dotSize};height:${dotSize};min-width:${dotSize};border-radius:50%;border:0;background:${i === phraseReviewIndex ? 'var(--orange)' : dotColor};cursor:pointer;transition:.15s;padding:0"></button>`;
              }).join('')}
            </div>
            <div class="review-progress-track"><span style="width:${progress}%"></span></div>
            <div class="review-progress-label">${phraseReviewIndex + 1} / ${phraseReviewQueue.length}${phraseReviewHistory.length ? ` · 已回看 ${phraseReviewHistory.length} 次` : ''}</div>
          </div>

          <div class="flashcard${phraseReviewFlipped ? ' flipped' : ''}" data-action="phrase-flip-card" style="cursor:pointer">
            <div class="flashcard-tag">${icon('chat')} ${esc(p.category)}</div>
            <p class="flash-word" style="font-size:26px">${esc(p.phrase)}</p>
            ${phraseReviewFlipped ? `
              <div class="flash-answer">
                <p class="flash-meaning">${esc(p.meaning)}</p>
                <div class="flash-divider"></div>
                ${p.example ? `<p class="flash-example">${esc(p.example)}</p>` : ''}
                ${p.source && p.source !== 'curated' ? `<p class="muted" style="font-size:11px;margin-top:8px">来自 ${esc(p.source)}</p>` : ''}
              </div>
            ` : `<p class="muted flash-hidden">点击卡片查看释义</p>`}
          </div>

          ${phraseReviewFlipped ? `
            <div class="review-actions">
              <p class="muted" style="text-align:center;margin-bottom:12px">这条短语你掌握得怎么样？</p>
              <div class="review-grade">
                <button class="btn btn-secondary" data-action="phrase-review-grade" data-grade="0"><strong>不认识</strong><small>稍后再见</small></button>
                <button class="btn btn-warm" data-action="phrase-review-grade" data-grade="1"><strong>模糊</strong><small>需要巩固</small></button>
                <button class="btn btn-primary" data-action="phrase-review-grade" data-grade="2"><strong>掌握</strong><small>记得牢</small></button>
              </div>
            </div>
          ` : `
            <div class="practice-actions">
              <button class="btn btn-primary" data-action="phrase-flip-card">查看释义</button>
            </div>
          `}
        </div>
      </div>`;
  }

  function filterPhrases() {
    let list = DATA.phrases;
    if (phraseCategory !== '全部') list = list.filter(p => p.category === phraseCategory);
    if (phraseSearch) {
      const q = phraseSearch.toLowerCase();
      list = list.filter(p => (p.phrase + ' ' + p.meaning + ' ' + (p.example || '')).toLowerCase().includes(q));
    }
    return list;
  }

  function startPhraseReview() {
    // ── 智能复习队列：弱项优先 → 收藏 → 新短语 → 到期复习 ──
    const now = Date.now();
    const MASTERED_COOLDOWN = 7 * 24 * 60 * 60 * 1000;  // 掌握后 7 天冷却
    const WEAK_COOLDOWN = 12 * 60 * 60 * 1000;          // 弱项 12 小时后可重练
    const progress = state.phraseProgress || {};

    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const seen = new Set();
    const queue = [];
    const add = (arr) => {
      for (const p of arr) {
        if (seen.has(p.id) || queue.length >= 30) continue;
        seen.add(p.id);
        queue.push(p);
      }
    };

    // 1) 弱项短语（评过「不认识」或「模糊」）→ 优先补短板
    //    冷却 12 小时：刚评完不会立刻重现，但当天晚些/次日会回来
    add(shuffle(DATA.phrases.filter(p => {
      const rec = progress[p.id];
      return rec && rec.grade <= 1 && (now - (rec.lastReviewed || 0)) > WEAK_COOLDOWN;
    })));

    // 2) 收藏短语（未入队的）
    add(shuffle(DATA.phrases.filter(p => state.phraseFavorites.includes(p.id))));

    // 3) 从未见过的新短语 —— 精选短语优先（质量高），再随机补充
    add(shuffle(DATA.phrases.filter(p => p.source === 'curated' && !progress[p.id])));
    add(shuffle(DATA.phrases.filter(p => p.source !== 'curated' && !progress[p.id])));

    // 4) 冷却期已过的「掌握」短语（超过 7 天才会回来，防遗忘）
    add(shuffle(DATA.phrases.filter(p => {
      const rec = progress[p.id];
      return rec && rec.grade >= 2 && (now - (rec.lastReviewed || 0)) > MASTERED_COOLDOWN;
    })));

    phraseReviewQueue = queue.slice(0, 30);
    if (phraseReviewQueue.length === 0) phraseReviewQueue = shuffle(DATA.phrases).slice(0, 20);
    phraseReviewIndex = 0;
    phraseReviewFlipped = false;
    phraseReviewHistory = [];
    phraseReviewGrades = {};
    phraseReviewedThisSession = new Set();
    phraseMode = 'review';
    renderPage();
  }

  function phraseFlipCard() {
    phraseReviewFlipped = !phraseReviewFlipped;
    renderPage();
  }

  function phraseReviewGoBack() {
    if (phraseReviewHistory.length === 0) return;
    phraseReviewIndex = phraseReviewHistory.pop();
    phraseReviewFlipped = false;
    renderPage();
  }

  function phraseReviewGoForward() {
    if (phraseReviewIndex >= phraseReviewQueue.length - 1) return;
    phraseReviewHistory.push(phraseReviewIndex);
    phraseReviewIndex++;
    phraseReviewFlipped = false;
    renderPage();
  }

  function phraseReviewJumpTo(idx) {
    if (idx < 0 || idx >= phraseReviewQueue.length) return;
    if (idx !== phraseReviewIndex) {
      phraseReviewHistory.push(phraseReviewIndex);
      phraseReviewIndex = idx;
    }
    phraseReviewFlipped = false;
    renderPage();
  }

  function phraseReviewGrade(grade) {
    const p = phraseReviewQueue[phraseReviewIndex];
    if (!p) return; // 完成页/越界防御：此前完成后按数字键会抛 TypeError
    phraseReviewGrades[phraseReviewIndex] = grade;
    // 写入持久化记忆，下次复习时据此排序
    if (!state.phraseProgress) state.phraseProgress = {};
    const prev = state.phraseProgress[p.id] || {};
    state.phraseProgress[p.id] = {
      grade: grade,
      lastReviewed: Date.now(),
      timesSeen: (prev.timesSeen || 0) + 1
    };
    // 只在首次评分时计数，回看后重复评分不重复累计
    if (!phraseReviewedThisSession.has(p.id)) {
      phraseReviewedThisSession.add(p.id);
      recordActivity('phrases');
    }
    // 跳到下一个未评分项；全部评分完才完成
    let next = -1;
    const n = phraseReviewQueue.length;
    for (let step = 1; step <= n; step++) {
      const idx = (phraseReviewIndex + step) % n;
      if (phraseReviewGrades[idx] === undefined) { next = idx; break; }
    }
    if (next === -1) {
      phraseReviewIndex = phraseReviewQueue.length;
    } else {
      phraseReviewHistory.push(phraseReviewIndex);
      phraseReviewIndex = next;
    }
    phraseReviewFlipped = false;
    saveState();
    renderPage();
  }

  function afterPhrases() {
    if (phraseMode !== 'review') {
      const input = $('#phrase-search');
      if (input) {
        // 只替换结果区，不重渲染输入框本身：
        // 旧实现每次 input 都 renderPage()，输入框节点被销毁重建，
        // 中文输入法的组合会话随之中断（拼音打不出来/打完什么都没留下）
        input.value = phraseSearch;
        // 同样不能因输入法组合而跳过：这里只更新结果区，输入框节点不受影响
        input.oninput = () => {
          phraseSearch = input.value;
          const box = $('#phrase-results');
          const count = $('#phrase-count');
          if (box) box.innerHTML = renderPhraseResults();
          if (count) count.textContent = phraseCountText();
        };
      }
    }
    afterDashboard();
  }

  // ─── 翻译模块 ─────────────────────────────────────────────────────────────
  let transFilter = { exam: 'all', year: 'all', revealed: {} };

  function renderTranslation() {
    const years = [...new Set(DATA.translations.map(t => t.year))].sort((a, b) => b - a);
    let list = DATA.translations;
    if (transFilter.exam !== 'all') list = list.filter(t => t.examType === transFilter.exam);
    if (transFilter.year !== 'all') list = list.filter(t => String(t.year) === transFilter.year);

    return `
      <div class="content-inner">
        <header class="page-heading">
          <div class="heading-eyebrow">TRANSLATION</div>
          <h1>翻译练习</h1>
          <p class="muted">共 ${DATA.translations.length} 道中英互译真题 · 含参考译文与逐句解析</p>
        </header>

        <div class="toolbar">
          <div class="segmented">
            <button class="seg-btn${transFilter.exam === 'all' ? ' active' : ''}" data-action="trans-exam" data-exam="all">全部</button>
            <button class="seg-btn${transFilter.exam === 'cet6' ? ' active' : ''}" data-action="trans-exam" data-exam="cet6">六级真题</button>
            <button class="seg-btn${transFilter.exam === 'cet4' ? ' active' : ''}" data-action="trans-exam" data-exam="cet4">四级辅助</button>
          </div>
          <div style="flex:1"></div>
          <select class="select" id="trans-year">
            <option value="all">全部年份</option>
            ${years.map(y => `<option value="${y}"${transFilter.year === String(y) ? ' selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>

        <div class="question-list">
          <div class="question-list-heading">
            <span>年份</span><span>题目</span><span>状态</span>
          </div>
          ${list.map((t, i) => {
            const done = state.translations[t.id] && state.translations[t.id].done;
            return `
              <div class="question-item" data-action="trans-open" data-id="${t.id}" role="button" tabindex="0">
                <div class="question-number">${t.year}-${String(t.month).padStart(2, '0')}<small>${t.examType === 'cet6' ? 'CET6' : 'CET4'}</small></div>
                <div class="question-preview">
                  <p>${esc(t.source.slice(0, 80))}${t.source.length > 80 ? '…' : ''}</p>
                </div>
                <div class="question-status">
                  ${done ? '<span class="chip" style="background:var(--green-soft);color:var(--green)">已练习</span>' : '<span class="chip">未开始</span>'}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderTranslationDetail(t) {
    const saved = state.translations[t.id] || {};
    const revealed = transFilter.revealed[t.id];

    return `
      <div class="content-inner translation-layout">
        <header class="page-heading">
          <div class="heading-eyebrow">${t.year} 年 ${t.month} 月 · ${t.examType === 'cet6' ? '六级真题' : '四级辅助'}</div>
          <h1>翻译练习</h1>
          <button class="btn btn-ghost btn-sm" data-action="trans-back">← 返回列表</button>
        </header>

        <div class="practice-card">
          <div class="practice-header">
            <span class="practice-label">中译英 · 请将下面的段落翻译成英文</span>
            <div class="translation-progress"><div class="translation-progress-label">参考译文对照</div></div>
          </div>
          <div class="source-text">${esc(t.source)}</div>

          ${!revealed ? `
            <div class="practice-field-label">你的译文（可选，用于自我检测）：</div>
            <textarea class="textarea translation-input" id="my-translation" rows="6" placeholder="在这里写下你的翻译，再点击下方按钮查看参考答案…">${esc(saved.myAnswer || '')}</textarea>
            <div class="practice-actions">
              <button class="btn btn-primary" data-action="trans-reveal" data-id="${t.id}">查看参考答案</button>
              <button class="btn btn-secondary" data-action="trans-done" data-id="${t.id}">标记已练习</button>
            </div>
          ` : `
            <div class="practice-field-label">你的译文（可继续修改）：</div>
            <textarea class="textarea translation-input" id="my-translation" rows="6" placeholder="在这里写下你的翻译…">${esc(saved.myAnswer || '')}</textarea>

            <div class="reference-panel">
              <h3 class="reference-heading">${icon('lightbulb')} 参考译文</h3>
              <div class="reference-text">${esc(t.reference)}</div>
            </div>

            ${t.points && t.points.length ? `
              <div class="key-points">
                <h3 class="reference-heading">${icon('book')} 翻译要点</h3>
                <ul>${t.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
              </div>
            ` : ''}

            <div class="practice-actions">
              <button class="btn btn-secondary" data-action="trans-save" data-id="${t.id}">保存我的译文</button>
              <button class="btn btn-primary" data-action="trans-done" data-id="${t.id}">标记已练习</button>
              <button class="btn btn-ghost" data-action="trans-back">返回列表</button>
            </div>
          `}
        </div>

        ${t.analysis ? `
          <details class="card" style="margin-top:16px">
            <summary style="cursor:pointer;padding:16px;font-weight:600">查看完整解析</summary>
            <div style="padding:0 16px 16px;white-space:pre-wrap;font-size:13px;line-height:1.8;max-height:400px;overflow-y:auto">${esc(t.analysis)}</div>
          </details>
        ` : ''}
      </div>`;
  }

  let transDraftTimer = null;
  function showTranslationDetail(t) {
    currentPage = 'translation';
    setActiveNav('translation');
    $('#content').innerHTML = renderTranslationDetail(t);
    resetScroll();
    const ta = $('#my-translation');
    if (ta) {
      // 草稿自动保存：导航离开/刷新不再丢稿（400ms 防抖）
      ta.oninput = () => {
        clearTimeout(transDraftTimer);
        transDraftTimer = setTimeout(() => {
          if (!state.translations[t.id]) state.translations[t.id] = {};
          state.translations[t.id].myAnswer = ta.value;
          saveState();
        }, 400);
      };
    }
    afterDashboard();
  }

  function afterTranslation() {
    const sel = $('#trans-year');
    if (sel) sel.onchange = () => { transFilter.year = sel.value; renderPage(); };
    afterDashboard();
  }

  // ─── 作文模块 ─────────────────────────────────────────────────────────────
  let essayTab = 'templates'; // templates | prompts | editor
  let essayCategory = '全部';
  let editingTemplate = null;       // 模板库中选中的模板 id（仅用于详情面板）
  let editingCustomId = null;       // 正在编辑的自定义模板 id（与上面分离，防止串台）

  function renderEssay() {
    return `
      <div class="content-inner">
        <header class="page-heading">
          <div class="heading-eyebrow">WRITING</div>
          <h1>作文模板</h1>
          <p class="muted">分类浏览 · 收藏 · 自定义编辑 · ${DATA.writing.length} 道真题练习</p>
        </header>

        <div class="toolbar">
          <div class="segmented">
            <button class="seg-btn${essayTab === 'templates' ? ' active' : ''}" data-action="essay-tab" data-tab="templates">模板库</button>
            <button class="seg-btn${essayTab === 'prompts' ? ' active' : ''}" data-action="essay-tab" data-tab="prompts">真题练习</button>
            <button class="seg-btn${essayTab === 'editor' ? ' active' : ''}" data-action="essay-tab" data-tab="editor">自定义</button>
          </div>
          <div style="flex:1"></div>
          ${essayTab === 'templates' ? `
            <div class="chip-row">
              ${['全部', '观点论证', '现象分析', '问题解决', '引言评论', '书信应用', '图表/书信'].map(c => `<button class="chip${essayCategory === c ? ' active' : ''}" data-action="essay-cat" data-cat="${c}">${c}</button>`).join('')}
            </div>
          ` : ''}
        </div>

        ${essayTab === 'templates' ? renderTemplateList() : essayTab === 'prompts' ? renderPromptList() : renderTemplateEditor()}
      </div>`;
  }

  function renderTemplateList() {
    let list = DATA.templates;
    if (essayCategory !== '全部') list = list.filter(t => t.category === essayCategory);
    // 自定义模板按自身类别参与过滤（此前只有"全部"才会显示，选真实类别反而看不到）
    const custom = (state.customTemplates || [])
      .filter(t => essayCategory === '全部' || t.category === essayCategory)
      .map(t => ({ ...t, isCustom: true }));
    list = [...list, ...custom];

    return `
      <div class="template-browser">
        <div class="template-list">
          ${list.map(t => {
            const isFav = state.templateFavorites.includes(t.id);
            const content = state.templateEdits[t.id] || t.content;
            return `
              <div class="template-item${editingTemplate === t.id ? ' active' : ''}" data-action="template-select" data-id="${t.id}" role="button" tabindex="0">
                <div class="template-item-top">
                  <strong>${esc(t.title)}</strong>
                  <button class="favorite-btn${isFav ? ' active' : ''}" data-action="template-fav" data-id="${t.id}" title="收藏">
                    ${icon('heart')}
                  </button>
                </div>
                <p class="muted" style="margin:4px 0;font-size:12px">${esc(t.category)}${t.tags ? ' · ' + t.tags.map(esc).join(' · ') : ''}</p>
                <p class="template-text-preview" style="font-size:12px;color:#889">${esc(content.slice(0, 80))}…</p>
              </div>`;
          }).join('')}
          ${list.length === 0 ? '<div class="empty-state"><p class="muted">暂无模板</p></div>' : ''}
        </div>
        <div class="essay-detail-area">
          ${editingTemplate ? renderTemplateDetail(editingTemplate) : '<div class="empty-state"><div class="empty-icon">' + icon('edit') + '</div><p class="muted">选择左侧模板查看和编辑</p></div>'}
        </div>
      </div>`;
  }

  function renderTemplateDetail(id) {
    const all = [...DATA.templates, ...(state.customTemplates || [])];
    const t = all.find(x => x.id === id);
    if (!t) return '';
    const content = state.templateEdits[id] || t.content;

    return `
      <div class="editor-card">
        <div class="editor-heading">
          <div class="editor-heading-left">
            <input class="input editor-title-input" value="${esc(t.title)}" readonly>
            <span class="category-label">${esc(t.category)}</span>
          </div>
          <div class="heading-actions">
            ${state.templateEdits[id] ? `<button class="btn btn-sm btn-ghost" data-action="template-reset" data-id="${id}">恢复默认</button>` : ''}
            ${t.isCustom ? `<button class="btn btn-sm btn-ghost" data-action="template-delete" data-id="${id}" style="color:#c44">${icon('trash')} 删除</button>` : ''}
          </div>
        </div>
        <textarea class="textarea template-textarea editor-body" id="template-content" rows="16">${esc(content)}</textarea>
        <div class="editor-footer">
          <p class="template-tip muted">${t.description || ''}</p>
          <button class="btn btn-primary btn-sm" data-action="template-save" data-id="${id}">保存修改</button>
        </div>
      </div>`;
  }

  function renderPromptList() {
    // 真题列表没有过滤 UI，不与模板类别共享过滤状态
    // （此前切到真题 tab 会残留模板类别过滤，产生"看不见原因的空列表"）
    const list = DATA.writing;

    return `
      <div class="question-list">
        <div class="question-list-heading">
          <span>年份</span><span>题目</span><span>状态</span>
        </div>
        ${list.map(w => {
          const draft = (state.essays || {})[w.id];
          const words = draft && draft.text ? countWords(draft.text) : 0;
          return `
          <div class="question-item" data-action="prompt-detail" data-id="${w.id}" role="button" tabindex="0">
            <div class="question-number">${w.year}-${String(w.month).padStart(2, '0')}<small>${w.examType === 'cet6' ? 'CET6' : 'CET4'}</small></div>
            <div class="question-preview"><p>${esc(w.prompt.slice(0, 100))}${w.prompt.length > 100 ? '…' : ''}</p></div>
            <div class="question-status">
              <span class="category-label">${esc(w.category)}</span>
              ${draft && draft.done ? `<span class="chip" style="background:var(--green-soft);color:var(--green)">已写 ${words} 词</span>` : words ? `<span class="chip">草稿 ${words} 词</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // 英文词数：按空白切分（中文标点/换行不额外计数）
  function countWords(text) {
    const s = String(text || '').trim();
    if (!s) return 0;
    return s.split(/\s+/).filter(Boolean).length;
  }

  function renderPromptDetail(w) {
    const draft = (state.essays || {})[w.id] || {};
    const text = typeof draft.text === 'string' ? draft.text : '';
    const words = countWords(text);

    return `
      <div class="content-inner">
        <button class="btn btn-ghost btn-sm" data-action="essay-tab" data-tab="prompts">← 返回题目列表</button>
        <div class="practice-card" style="margin-top:16px">
          <div class="practice-header">
            <span class="practice-label">${w.year} 年 ${w.month} 月 · ${w.examType === 'cet6' ? '六级' : '四级'} · ${esc(w.category)}</span>
          </div>
          <div class="source-text" style="font-size:14px;line-height:1.9">${esc(w.prompt)}</div>

          <div class="essay-editor">
            <div class="essay-editor-head">
              <span class="practice-field-label">我的作文</span>
              <span class="essay-meter" id="essay-meter" data-state="${words === 0 ? 'empty' : words < 150 ? 'short' : words > 200 ? 'long' : 'ok'}">
                <strong id="essay-words">${words}</strong> 词
                <small id="essay-hint">${words === 0 ? '目标 150–200 词' : words < 150 ? '还差 ' + (150 - words) + ' 词' : words > 200 ? '超出 ' + (words - 200) + ' 词' : '词数达标'}</small>
              </span>
            </div>
            <textarea class="textarea essay-input" id="my-essay" rows="14"
              placeholder="在这里写作文，内容会自动保存在本机…">${esc(text)}</textarea>
            <div class="essay-editor-foot">
              <span class="muted" id="essay-save-state">${draft.done ? '已标记完成' : text ? '草稿已自动保存' : '未开始'}</span>
              <div class="heading-actions">
                <button class="btn btn-ghost btn-sm" data-action="essay-clear" data-id="${w.id}">清空</button>
                <button class="btn btn-primary btn-sm" data-action="essay-done" data-id="${w.id}">${draft.done ? '已标记完成' : '标记完成'}</button>
              </div>
            </div>
          </div>

          ${w.analysis ? `
            <details class="card" style="margin-top:16px">
              <summary style="cursor:pointer;padding:14px;font-weight:600">${icon('lightbulb')} 题目解析与写作指导</summary>
              <div style="padding:0 16px 16px;white-space:pre-wrap;font-size:13px;line-height:1.8;max-height:500px;overflow-y:auto">${esc(w.analysis)}</div>
            </details>
          ` : ''}
          ${w.structurePoints && w.structurePoints.length ? `
            <div class="key-points" style="margin-top:12px">
              <h3 class="reference-heading">结构要点</h3>
              <ul>${w.structurePoints.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  // ─── 作文练习：草稿自动保存 + 词数统计 ────────────────────────────────────
  let essayDraftTimer = null;

  function updateEssayMeter(text) {
    const words = countWords(text);
    const wordsEl = $('#essay-words');
    const hintEl = $('#essay-hint');
    const meter = $('#essay-meter');
    if (wordsEl) wordsEl.textContent = words;
    if (hintEl) {
      hintEl.textContent = words === 0 ? '目标 150–200 词'
        : words < 150 ? `还差 ${150 - words} 词`
        : words > 200 ? `超出 ${words - 200} 词`
        : '词数达标';
    }
    if (meter) {
      meter.dataset.state = words === 0 ? 'empty' : words < 150 ? 'short' : words > 200 ? 'long' : 'ok';
    }
  }

  function showPromptDetail(w) {
    currentPage = 'essay';
    setActiveNav('essay');
    $('#content').innerHTML = renderPromptDetail(w);
    resetScroll();
    const ta = $('#my-essay');
    if (ta) {
      ta.oninput = () => {
        updateEssayMeter(ta.value);
        const saveEl = $('#essay-save-state');
        if (saveEl) saveEl.textContent = '正在保存…';
        clearTimeout(essayDraftTimer);
        essayDraftTimer = setTimeout(() => {
          if (!state.essays) state.essays = {};
          const prev = state.essays[w.id] || {};
          state.essays[w.id] = { ...prev, text: ta.value, updatedAt: Date.now() };
          const ok = saveState();
          const el = $('#essay-save-state');
          if (el) el.textContent = ok ? '草稿已自动保存' : '保存失败，请复制内容备份';
        }, 400);
      };
    }
    afterDashboard();
  }

  function flushEssayDraft(id) {
    const ta = $('#my-essay');
    if (!ta) return null;
    if (!state.essays) state.essays = {};
    const prev = state.essays[id] || {};
    state.essays[id] = { ...prev, text: ta.value, updatedAt: Date.now() };
    return ta.value;
  }

  function renderTemplateEditor() {
    const editing = editingCustomId
      ? (state.customTemplates || []).find(t => t.id === editingCustomId)
      : null;
    return `
      <div class="editor-card">
        <div class="editor-heading">
          <div class="editor-heading-left">
            <input class="input editor-title-input" id="new-template-title" placeholder="模板标题…" value="${editing ? esc(editing.title) : ''}">
            <select class="select" id="new-template-cat">
              ${['观点论证', '现象分析', '问题解决', '引言评论', '书信应用', '自定义'].map(c => `<option${editing && editing.category === c ? ' selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <textarea class="textarea template-textarea editor-body" id="new-template-content" rows="18" placeholder="在此编写你的作文模板…">${editing ? esc(editing.content) : ''}</textarea>
        <div class="editor-footer">
          <p class="muted">自定义模板仅保存在本机，可随时编辑和删除。</p>
          <div class="heading-actions">
            ${editing ? `<button class="btn btn-sm btn-ghost" data-action="custom-cancel">取消编辑</button>` : ''}
            <button class="btn btn-primary btn-sm" data-action="custom-save">${editing ? '保存修改' : '新建模板'}</button>
          </div>
        </div>
      </div>
      ${(state.customTemplates || []).length ? `
        <div style="margin-top:20px">
          <h3 class="card-title">我的自定义模板</h3>
          <div class="template-list" style="max-height:300px;overflow-y:auto">
            ${state.customTemplates.map(t => `
              <div class="template-item${editingCustomId === t.id ? ' active' : ''}" data-action="custom-edit" data-id="${t.id}" role="button" tabindex="0">
                <div class="template-item-top">
                  <strong>${esc(t.title)}</strong>
                  <button class="favorite-btn" data-action="custom-delete" data-id="${t.id}">${icon('trash')}</button>
                </div>
                <p class="muted" style="font-size:12px">${esc(t.category)} · ${esc(t.content.slice(0, 60))}…</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}`;
  }

  function afterEssay() {
    afterDashboard();
  }

  // ─── 今日目标设置 ─────────────────────────────────────────────────────────
  function openGoalSettings() {
    const modal = $('#modal-root');
    const presets = [10, 15, 20, 30, 50];
    modal.innerHTML = `
      <div class="search-modal" style="align-items:center">
        <div class="modal-backdrop" data-action="close-modal"></div>
        <div class="modal" style="max-width:380px" role="dialog" aria-modal="true" aria-label="设置今日目标">
          <div class="modal-header">
            <h2>设置今日目标</h2>
            <button class="modal-close" data-action="close-modal">${icon('x')}</button>
          </div>
          <div class="modal-body">
            <p class="muted" style="margin-bottom:14px">选择每日学习目标数量（词汇 + 短语 + 翻译 + 作文总计）</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
              ${presets.map(v => `
                <button class="btn ${state.dailyGoal === v ? 'btn-primary' : 'btn-secondary'}" data-action="set-goal" data-value="${v}" style="min-width:56px">${v}</button>
              `).join('')}
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" class="input" id="custom-goal" placeholder="自定义" min="1" max="500" style="width:100px" value="${presets.includes(state.dailyGoal) ? '' : state.dailyGoal}">
              <button class="btn btn-primary" data-action="set-goal" data-value="custom">确定</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ─── 全局搜索 ─────────────────────────────────────────────────────────────
  // 高亮命中片段（先按区间切分再转义，避免把 <mark> 也转义掉）
  function highlight(text, query) {
    const s = String(text == null ? '' : text);
    const q = String(query || '').toLowerCase();
    if (!q) return esc(s);
    const lower = s.toLowerCase();
    let out = '';
    let cursor = 0;
    let at = lower.indexOf(q);
    while (at !== -1) {
      out += esc(s.slice(cursor, at)) + '<mark class="search-hit">' + esc(s.slice(at, at + q.length)) + '</mark>';
      cursor = at + q.length;
      at = lower.indexOf(q, cursor);
    }
    return out + esc(s.slice(cursor));
  }

  function openSearch() {
    const existing = $('.search-modal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'search-modal';
    // 遮罩由 .search-modal 自己画、面板是它唯一的子元素：
    // 不再用"遮罩 + 面板两个兄弟节点比 z-index"的写法，
    // 那种写法在个别渲染环境下会出现"整屏变灰但面板不显示"
    div.innerHTML = `
      <div class="search-panel" role="dialog" aria-modal="true" aria-label="全局搜索">
        <div class="global-search-box">
          <div class="search-field" style="width:100%">
            ${icon('search')}
            <input type="text" class="input" id="global-search-input" placeholder="搜索单词、短语、翻译、作文、模板…" autocomplete="off" spellcheck="false">
            <kbd>Esc</kbd>
          </div>
        </div>
        <div class="global-results" id="global-results">
          <p class="muted" style="padding:16px;text-align:center">输入关键词开始搜索</p>
        </div>
        <div class="global-search-hint"><span>↑ ↓ 选择</span><span>Enter 打开</span><span>Esc 关闭</span></div>
      </div>`;
    document.body.appendChild(div);

    // 点遮罩空白处关闭（Esc 由全局键盘处理）
    div.addEventListener('mousedown', (e) => { if (e.target === div) div.remove(); });

    const panel = $('.search-panel', div);
    // 自检兜底：尺寸为零 或 中心点最上层不是面板本身（被别的东西盖住），
    // 都说明正常样式在这个渲染环境里没生效，退回内联定位保证面板一定可见
    const verifyPanel = () => {
      const r = panel.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const broken = !r.width || !r.height || r.width < 120 || r.height < 60
        || !hit || !hit.closest || !hit.closest('.search-panel');
      if (!broken) return;
      panel.setAttribute('style', 'position:fixed!important;left:50%;top:10vh;transform:translateX(-50%);'
        + 'width:min(630px,92vw);max-height:70vh;background:#fff;border-radius:18px;'
        + 'box-shadow:0 24px 80px rgba(16,36,29,.25);display:flex;flex-direction:column;overflow:hidden;z-index:9999');
      div.setAttribute('style', 'position:fixed;inset:0;z-index:9998;background:rgba(16,32,26,.52);overflow-y:auto;padding:10vh 20px 48px');
      toast('搜索面板渲染异常，已启用兼容显示 — 请把这条提示告诉我');
    };
    verifyPanel();

    const input = $('#global-search-input');
    const box = $('#global-results');
    let activeIndex = -1;
    // 中文输入法组合中：只在结果为空时提示"输入中…"，绝不因此跳过整次搜索
    let composing = false;

    const nodes = () => $$('.global-result', box);

    function setActive(index, scroll) {
      const els = nodes();
      if (!els.length) { activeIndex = -1; return; }
      activeIndex = (index + els.length) % els.length;
      els.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
      if (scroll !== false) els[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function render() {
      const raw = input.value.trim();
      // 组词态下输入法会把 "as" 变成 "a's"（撇号是音节分隔符），
      // 直接拿去搜只会命中 America's / China's 这类例句。去掉分隔符再搜才符合本意
      const query = composing ? raw.replace(/['’`]/g, '') : raw;
      activeIndex = -1;
      if (!query) {
        box.innerHTML = '<p class="muted" style="padding:16px;text-align:center">输入关键词开始搜索</p>';
        return;
      }
      const result = StudyCore.searchContent(query, {
        words: DATA.words,
        phrases: DATA.phrases,
        translations: DATA.translations,
        writing: DATA.writing,
        // 自定义模板一并纳入搜索（旧实现只搜内置 10 条模板，且根本没接到 UI）
        templates: [...DATA.templates, ...(state.customTemplates || [])]
      });
      // 输入法还在组词时，搜的是拼音而不是用户想要的字词，
      // 必须解释清楚，否则用户只会觉得"搜出来全是无关的东西"
      const imeNotice = composing ? `
        <div class="ime-notice">
          ${icon('chat')}
          <div>
            <strong>输入法正在组词：${esc(raw)}</strong>
            <small>按空格/回车确认候选词后再搜；想直接搜英文请按 Shift 切到英文输入${raw !== query && query ? `（当前按「${esc(query)}」临时搜索）` : ''}</small>
          </div>
        </div>` : '';
      if (!result.total) {
        box.innerHTML = imeNotice + `
          <div class="empty-state" style="padding:${composing ? '20px' : '38px'} 20px">
            <div class="empty-icon">${icon('search')}</div>
            <h3>没有找到「${esc(query)}」</h3>
            <p>试试更短的关键词，或换英文/中文表述</p>
          </div>`;
        return;
      }
      box.innerHTML = imeNotice + result.groups.map(group => `
        <section class="search-group" aria-label="${esc(group.label)}">
          <p class="search-group-head">
            <span>${esc(group.label)}</span>
            <span>${group.total > group.items.length ? `显示 ${group.items.length} / 共 ${group.total}` : `${group.total} 条`}</span>
          </p>
          ${group.items.map(item => `
            <div class="global-result" data-action="search-go" data-type="${item.type}" data-id="${esc(item.id)}" role="button" tabindex="-1">
              <div class="result-copy">
                <strong>${highlight(item.title, query)}</strong>
                <small>${highlight(item.subtitle, query)}</small>
              </div>
              ${icon('arrowRight')}
            </div>`).join('')}
        </section>`).join('');
    }

    input.focus();
    // 无论是否处于输入法组合态都要搜索：
    // 旧实现 `if (e.isComposing) return` 会让中文输入法下的每一次按键都被丢弃，
    // 表现为"输入框有字，结果区永远停在初始提示"
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; render(); });
    input.oninput = () => render();
    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const els = nodes();
        const target = els[activeIndex] || els[0];
        if (target) target.click();
      }
    };
    box.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('.global-result');
      if (!el) return;
      const els = nodes();
      const idx = els.indexOf(el);
      if (idx !== activeIndex) setActive(idx, false);
    });
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function toast(msg, duration) {
    const root = $('#toast-root');
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    root.appendChild(div);
    setTimeout(() => div.remove(), duration || 2200);
  }

  // ─── 事件委托 ─────────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {
      case 'nav': {
        const page = el.dataset.page;
        if (el.dataset.mode === 'review') { navigate('vocab'); startReview(); return; }
        if (el.dataset.mode === 'learn') { vocabMode = 'browse'; vocabFilter = { type: 'unit', value: 1, page: 0 }; }
        vocabMode = 'browse';
        navigate(page);
        break;
      }

      // ── 词汇 ──
      case 'vocab-filter':
        vocabFilter = { type: el.dataset.type, value: el.dataset.type === 'unit' ? 1 : 'high', page: 0 };
        renderPage();
        break;
      case 'vocab-unit': {
        const dir = parseInt(el.dataset.dir);
        const maxUnit = Math.max(...DATA.words.map(w => w.unit));
        vocabFilter.value = Math.max(1, Math.min(maxUnit, vocabFilter.value + dir));
        renderPage();
        break;
      }
      case 'vocab-freq':
        vocabFilter.value = el.dataset.freq;
        vocabFilter.page = 0;
        renderPage();
        break;
      case 'vocab-page':
        vocabFilter.page = Math.max(0, vocabFilter.page + parseInt(el.dataset.dir));
        renderPage();
        break;
      case 'vocab-review-start':
      case 'vocab-review-restart':
        startReview();
        break;
      case 'vocab-exit-review':
        vocabMode = 'browse';
        renderPage();
        break;
      case 'flip-card':
        flipCard();
        break;
      case 'review-grade':
        gradeReview(parseInt(el.dataset.grade));
        break;
      case 'review-back':
        reviewGoBack();
        break;
      case 'review-forward':
        reviewGoForward();
        break;
      case 'review-jump':
        reviewJumpTo(parseInt(el.dataset.idx));
        break;
      case 'word-level': {
        const id = el.dataset.id;
        const level = parseInt(e.target.dataset.level);
        if (isNaN(level)) return;
        if (level === 0) {
          // 「未学」= 清除该词的学习记录：不计入今日活动，也不排进 10 分钟后的复习队列
          // （旧实现把它当成一次 grade 0 复习，等于"标记未学反而立刻催你复习"）
          delete state.words[id];
        } else {
          state.words[id] = StudyCore.reviewWord(state.words[id], level, Date.now());
          recordActivity('reviews');
        }
        saveState();
        // 从单词弹窗内点击：更新后关闭弹窗（单一处理路径，避免与局部处理器双倍计数）
        if (el.closest('#modal-root')) { const mr = $('#modal-root'); if (mr) mr.innerHTML = ''; }
        renderPage();
        break;
      }
      case 'word-detail': {
        const w = DATA.words.find(x => x.id === el.dataset.id);
        if (w) showWordModal(w);
        break;
      }

      // ── 短语 ──
      case 'phrase-cat':
        phraseCategory = el.dataset.cat;
        renderPage();
        break;
      case 'phrase-search-clear':
        phraseSearch = '';
        renderPage();
        if ($('#phrase-search')) $('#phrase-search').focus();
        break;
      case 'phrase-fav': {
        const id = el.dataset.id;
        const idx = state.phraseFavorites.indexOf(id);
        if (idx >= 0) state.phraseFavorites.splice(idx, 1);
        else state.phraseFavorites.push(id);
        saveState();
        renderPage();
        break;
      }
      case 'phrase-review-start':
      case 'phrase-review-restart':
        startPhraseReview();
        break;
      case 'phrase-exit-review':
        phraseMode = 'browse';
        renderPage();
        break;
      case 'phrase-flip-card':
        phraseFlipCard();
        break;
      case 'phrase-review-grade':
        phraseReviewGrade(parseInt(el.dataset.grade));
        break;
      case 'phrase-review-back':
        phraseReviewGoBack();
        break;
      case 'phrase-review-forward':
        phraseReviewGoForward();
        break;
      case 'phrase-review-jump':
        phraseReviewJumpTo(parseInt(el.dataset.idx));
        break;

      // ── 翻译 ──
      case 'trans-exam':
        transFilter.exam = el.dataset.exam;
        renderPage();
        break;
      case 'trans-open': {
        const t = DATA.translations.find(x => x.id === el.dataset.id);
        if (t) showTranslationDetail(t);
        break;
      }
      case 'trans-back':
        renderPage();
        break;
      case 'trans-reveal': {
        const id = el.dataset.id;
        transFilter.revealed[id] = true;
        if (!state.translations[id]) state.translations[id] = {};
        const ta = $('#my-translation');
        if (ta) state.translations[id].myAnswer = ta.value;
        saveState();
        const t = DATA.translations.find(x => x.id === id);
        if (t) showTranslationDetail(t);
        break;
      }
      case 'trans-save': {
        const id = el.dataset.id;
        if (!state.translations[id]) state.translations[id] = {};
        const ta = $('#my-translation');
        if (!ta) { toast('未找到译文输入框'); return; }
        state.translations[id].myAnswer = ta.value;
        if (saveState()) toast('译文已保存');
        break;
      }
      case 'trans-done': {
        const id = el.dataset.id;
        if (!state.translations[id]) state.translations[id] = {};
        state.translations[id].done = true;
        const ta = $('#my-translation');
        if (ta) state.translations[id].myAnswer = ta.value;
        recordActivity('translations');
        saveState();
        toast('已标记完成！');
        renderPage();
        break;
      }

      // ── 作文 ──
      case 'essay-tab':
        essayTab = el.dataset.tab;
        if (el.dataset.tab === 'prompts') editingTemplate = null;
        renderPage();
        break;
      case 'essay-cat':
        essayCategory = el.dataset.cat;
        renderPage();
        break;
      case 'prompt-detail': {
        // 作文真题详情（此前渲染了入口但没有事件分支，122 道题不可达）
        const w = DATA.writing.find(x => x.id === el.dataset.id);
        if (w) {
          essayTab = 'prompts';
          editingTemplate = null;
          showPromptDetail(w);
        }
        break;
      }
      case 'essay-done': {
        const id = el.dataset.id;
        const text = flushEssayDraft(id);
        if (text === null) return;
        if (!text.trim()) { toast('还没有写内容'); return; }
        state.essays[id].done = true;
        if (!state.essays[id]._counted) {
          state.essays[id]._counted = true;
          recordActivity('templates');
        }
        saveState();
        toast(`已标记完成（${countWords(text)} 词）`);
        const w = DATA.writing.find(x => x.id === id);
        if (w) showPromptDetail(w); else renderPage();
        break;
      }
      case 'essay-clear': {
        const id = el.dataset.id;
        const draft = (state.essays || {})[id];
        if (!draft || !draft.text) { toast('草稿已经是空的'); return; }
        if (!window.confirm('清空这篇作文草稿？此操作不可撤销。')) return;
        delete state.essays[id];
        saveState();
        const w = DATA.writing.find(x => x.id === id);
        if (w) showPromptDetail(w);
        toast('草稿已清空');
        break;
      }
      case 'template-select':
        editingTemplate = el.dataset.id;
        renderPage();
        break;
      case 'template-fav': {
        const id = el.dataset.id;
        const idx = state.templateFavorites.indexOf(id);
        if (idx >= 0) state.templateFavorites.splice(idx, 1);
        else state.templateFavorites.push(id);
        saveState();
        renderPage();
        break;
      }
      case 'template-save': {
        const id = el.dataset.id;
        const ta = $('#template-content');
        if (ta) {
          state.templateEdits[id] = ta.value;
          saveState();
          toast('模板已保存');
        }
        break;
      }
      case 'template-reset': {
        delete state.templateEdits[el.dataset.id];
        saveState();
        renderPage();
        toast('已恢复默认');
        break;
      }
      case 'template-delete': {
        const id = el.dataset.id;
        state.customTemplates = (state.customTemplates || []).filter(t => t.id !== id);
        editingTemplate = null;
        if (editingCustomId === id) editingCustomId = null;
        saveState();
        renderPage();
        toast('已删除');
        break;
      }
      case 'custom-save': {
        const title = $('#new-template-title')?.value.trim();
        const category = $('#new-template-cat')?.value;
        const content = $('#new-template-content')?.value.trim();
        if (!title || !content) { toast('标题和内容不能为空'); return; }
        if (editingCustomId) {
          const t = (state.customTemplates || []).find(x => x.id === editingCustomId);
          // 目标不存在（已被删除等）：必须报错并保留输入，不能假装保存成功
          if (!t) { toast('未找到要修改的模板，可能已被删除；内容仍在输入框中，请改用"新建模板"'); return; }
          t.title = title; t.category = category; t.content = content;
          toast('修改已保存');
        } else {
          state.customTemplates = state.customTemplates || [];
          state.customTemplates.push({
            id: 'custom-' + Date.now(), title, category, content,
            description: '自定义模板', tags: ['自定义'], isCustom: true
          });
          toast('模板已创建');
        }
        recordActivity('templates');
        saveState();
        editingCustomId = null;
        renderPage();
        break;
      }
      case 'custom-edit':
        editingCustomId = el.dataset.id;
        essayTab = 'editor';
        renderPage();
        break;
      case 'custom-cancel':
        editingCustomId = null;
        renderPage();
        break;
      case 'custom-delete': {
        const id = el.dataset.id;
        state.customTemplates = (state.customTemplates || []).filter(t => t.id !== id);
        if (editingCustomId === id) editingCustomId = null;
        if (editingTemplate === id) editingTemplate = null;
        saveState();
        renderPage();
        toast('已删除');
        break;
      }

      // ── 今日目标设置 ──
      case 'close-modal': {
        // 统一的弹窗关闭（此前单词弹窗外的 close-modal 无处理分支）
        const mr = $('#modal-root');
        if (mr && mr.innerHTML) { mr.innerHTML = ''; renderPage(); }
        break;
      }
      case 'edit-goal': {
        openGoalSettings();
        break;
      }
      case 'set-goal': {
        let v;
        if (el.dataset.value === 'custom') {
          v = parseInt(($('#custom-goal') || {}).value);
        } else {
          v = parseInt(el.dataset.value);
        }
        if (v > 0 && v <= 500) {
          state.dailyGoal = v;
          saveState();
          // 更新侧栏
          const gt = $('#goal-target'); if (gt) gt.textContent = '/ ' + v;
          // 关闭弹窗
          const modal = $('#modal-root'); if (modal) modal.innerHTML = '';
          renderPage();
          toast(`今日目标已设为 ${v} 个`);
        }
        break;
      }

      // ── 搜索 ──
      case 'global-search':
        openSearch();
        break;
      case 'close-search': {
        const m = $('.search-modal');
        if (m) m.remove();
        break;
      }
      case 'search-go': {
        const m = $('.search-modal');
        if (m) m.remove();
        // 类型化路由：确保目标真实可见/打开，而不是只跳页面碰运气
        // （旧实现：Unit 1 搜到 Unit 16 的词后点击只会导航，DOM 里根本没有目标元素）
        const type = el.dataset.type;
        const id = el.dataset.id;
        if (type === 'word') {
          const w = DATA.words.find(x => x.id === id);
          if (w) {
            vocabMode = 'browse';
            if (currentPage !== 'vocab') navigate('vocab');
            showWordModal(w);
          }
        } else if (type === 'phrase') {
          const p = DATA.phrases.find(x => x.id === id);
          if (p) {
            phraseMode = 'browse';
            phraseCategory = '全部';
            phraseSearch = p.phrase; // 用短语本身过滤，保证目标一定出现在前 60 条内
            navigate('phrases');
            setTimeout(() => {
              const target = $(`[data-id="${id}"]`);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.outline = '2px solid var(--green)';
                setTimeout(() => target.style.outline = '', 1500);
              }
            }, 100);
          }
        } else if (type === 'translation') {
          const t = DATA.translations.find(x => x.id === id);
          if (t) {
            transFilter.exam = 'all';
            transFilter.year = 'all'; // 重置过滤，保证返回列表时目标可见
            showTranslationDetail(t);
          }
        } else if (type === 'writing') {
          const w = DATA.writing.find(x => x.id === id);
          if (w) {
            essayTab = 'prompts';
            editingTemplate = null;
            showPromptDetail(w);
          }
        } else if (type === 'template') {
          // 作文模板此前不可搜索；直达时重置类别过滤并选中，保证右侧详情可见
          essayTab = 'templates';
          essayCategory = '全部';
          editingTemplate = id;
          currentPage = 'essay';
          setActiveNav('essay');
          renderPage();
          setTimeout(() => {
            const target = $('[data-action="template-select"][data-id="' + id + '"]');
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.style.outline = '2px solid var(--green)';
              setTimeout(() => target.style.outline = '', 1500);
            }
          }, 100);
        }
        break;
      }
    }
  });

  // 单词详情弹窗
  function showWordModal(w) {
    const rec = state.words[w.id];
    const level = rec ? rec.level : 0;
    const root = $('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="单词详情">
        <div class="modal-header">
          <h2 class="word-modal-title">${esc(w.word)} <span class="phonetic">${esc(w.phonetic)}</span></h2>
          <button class="modal-close" data-action="close-modal">${icon('x')}</button>
        </div>
        <div class="modal-body">
          <p class="word-modal-meaning">${esc(w.meaning)}</p>
          ${w.example ? `<div class="word-example-box"><p>${esc(w.example)}</p><p class="muted">${esc(w.translation)}</p></div>` : ''}
          <div class="word-meta">
            <span class="chip">${w.frequency === 'high' ? '高频' : w.frequency === 'mid' ? '中频' : '低频'}</span>
            <span class="chip">Unit ${w.unit}</span>
            ${rec && rec.reviews ? `<span class="chip">已复习 ${rec.reviews} 次</span>` : ''}
          </div>
          <div class="mastery-control" style="margin-top:16px" data-action="word-level" data-id="${w.id}">
            <p class="muted" style="margin-bottom:8px">掌握程度：</p>
            ${[0, 1, 2, 3].map(l => `<button class="mastery-dot${level >= l && l > 0 ? ' filled' : ''}${level === l ? ' current' : ''}" data-level="${l}" title="${['未学', '陌生', '模糊', '掌握'][l]}">${['未学', '陌生', '模糊', '掌握'][l]}</button>`).join('')}
          </div>
        </div>
      </div>`;
    // 修正 mastery-dot 显示文字
    $$('.mastery-dot', root).forEach(dot => {      const l = parseInt(dot.dataset.level);
      if (l > 0) dot.textContent = ['未学', '陌生', '模糊', '掌握'][l];
      dot.style.width = 'auto';
      dot.style.padding = '4px 12px';
      dot.style.borderRadius = '8px';
      dot.style.fontSize = '12px';
    });
    // 点击处理统一走 document 委托（word-level / close-modal），
    // 不再挂 root.onclick —— 旧实现与委托各执行一次，reviews/activity 双倍计数
    // 自检兜底：面板量不出尺寸时退回内联定位，避免"有遮罩没内容"
    const panel = $('.modal', root);
    if (panel) {
      const r = panel.getBoundingClientRect();
      if (!r.width || r.height < 60) {
        panel.setAttribute('style', 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);'
          + 'width:min(580px,92vw);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;'
          + 'box-shadow:0 24px 80px rgba(16,36,29,.25);z-index:101');
        toast('弹窗渲染异常，已启用兼容显示（请把这个提示告诉我）');
      }
    }
  }

  // ─── 键盘快捷键（唯一入口） ────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const inEditable = !!(e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
    const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

    // Ctrl+K → 全局搜索
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }
    // Ctrl+1~5 → 导航
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const pages = ['dashboard', 'vocab', 'phrases', 'translation', 'essay'];
      const page = pages[parseInt(e.key) - 1];
      if (page) { vocabMode = 'browse'; navigate(page); }
      return;
    }
    // Ctrl+R → 快速开始复习（输入控件中不劫持，避免打断输入且防止丢失草稿）
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !inEditable) {
      e.preventDefault();
      vocabMode = 'browse';
      navigate('vocab');
      startReview();
      return;
    }
    // Escape → 关闭搜索/弹窗/退出复习（优先级从外到内）
    if (e.key === 'Escape') {
      const m = $('.search-modal');
      if (m) { m.remove(); return; }
      const modal = $('#modal-root');
      if (modal && modal.innerHTML) { modal.innerHTML = ''; renderPage(); return; }
      if (vocabMode === 'review') { vocabMode = 'browse'; renderPage(); return; }
      if (phraseMode === 'review') { phraseMode = 'browse'; renderPage(); return; }
      return;
    }

    // 伪按钮（role=button 的 div）的 Enter/Space 激活
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
      return;
    }

    // ── 复习快捷键：仅在对应页面的复习模式、非输入控件、无修饰键时生效 ──
    if (inEditable || hasModifier) return;

    if (currentPage === 'vocab' && vocabMode === 'review' && reviewIndex < reviewQueue.length) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); return; }
      if (reviewFlipped && e.key >= '1' && e.key <= '4') { e.preventDefault(); gradeReview(parseInt(e.key) - 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); reviewGoBack(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); reviewGoForward(); return; }
    }

    if (currentPage === 'phrases' && phraseMode === 'review' && phraseReviewIndex < phraseReviewQueue.length) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); phraseFlipCard(); return; }
      if (phraseReviewFlipped && e.key >= '1' && e.key <= '3') { e.preventDefault(); phraseReviewGrade(parseInt(e.key) - 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); phraseReviewGoBack(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); phraseReviewGoForward(); return; }
    }
  });

  // ─── 初始化 ───────────────────────────────────────────────────────────────
  function init() {
    loadState();

    // 图标注入
    $$('[data-icon]').forEach(el => {
      el.innerHTML = ICONS[el.dataset.icon] || '';
    });

    // 日期
    const dateEl = $('#today-date');
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    }

    // 版本号：装错/装旧版本时能一眼看出来
    const hint = $('#save-hint');
    if (hint) hint.textContent = `所有数据已保存在本机 · v${APP_VERSION}`;

    renderPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
