// scripts/smoke.js — Electron 集成冒烟测试（离屏运行，不弹窗）
// 覆盖本轮修复的回归路径：双倍计数、prompt-detail、close-modal、
// 键盘泄漏、全局搜索直达、ID 迁移、保存失败反馈
'use strict';
const path = require('path');
const { app, BrowserWindow } = require('electron');

const failures = [];
const notes = [];
function fail(msg) { failures.push(msg); console.error('  ✗ ' + msg); }
function pass(msg) { console.log('  ✓ ' + msg); }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.on('console-message', (e, level, message) => {
    if (level === 3) fail('页面控制台错误: ' + message);
  });
  win.webContents.on('did-fail-load', (e, code, desc) => {
    fail('页面加载失败: ' + code + ' ' + desc);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 800));

  const js = (code) => win.webContents.executeJavaScript(code);

  console.log('── 1. 初始加载与页面渲染 ──');
  assert(await js(`document.querySelectorAll('.nav-item').length === 5`), '主导航 5 项');
  for (const page of ['vocab', 'phrases', 'translation', 'essay', 'dashboard']) {
    const ok = await js(`(function(){
      const el = document.querySelector('.nav-item[data-page="${page}"]');
      if (el) el.click();
      return new Promise(r => setTimeout(() => r(document.querySelector('#content').innerHTML.length > 200), 150));
    })()`);
    assert(ok, '页面渲染正常: ' + page);
  }

  console.log('── 2. 单词弹窗掌握度单次计数（回归：双倍计数） ──');
  // 隔离状态：清空 localStorage 再刷新，避免历史记录污染断言
  await js(`localStorage.removeItem('shiguang-cet6-v1'); location.reload();`);
  await new Promise(r => setTimeout(r, 1200));
  await js(`document.querySelector('.nav-item[data-page="vocab"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const testedWordId = await js(`document.querySelector('.word-row[data-action="word-detail"]').dataset.id`);
  assert(await js(`(function(){
    const row = document.querySelector('.word-row[data-action="word-detail"]');
    row.click();
    const modal = document.querySelector('#modal-root .modal');
    if (!modal) return 'no-modal';
    const dot = modal.querySelector('.mastery-dot[data-level="2"]');
    dot.click();
    return 'ok';
  })()`) === 'ok', '单词弹窗打开并点击掌握度');
  await new Promise(r => setTimeout(r, 200));
  const wordCount = await js(`(function(){
    const raw = localStorage.getItem('shiguang-cet6-v1');
    const st = JSON.parse(raw);
    const rec = st.words[${JSON.stringify(testedWordId)}];
    return { modalCleared: document.querySelector('#modal-root').innerHTML === '', reviews: rec ? rec.reviews : null, recCount: Object.keys(st.words).length };
  })()`);
  assert(wordCount.modalCleared, '评分后弹窗关闭');
  assert(wordCount.reviews === 1 && wordCount.recCount === 1,
    '该词 reviews = 1 且只新增 1 条记录（回归：曾双倍计数）— 实际 reviews=' + wordCount.reviews + ' 记录数=' + wordCount.recCount);

  console.log('── 3. 作文真题详情可达（回归：死代码） ──');
  await js(`document.querySelector('.nav-item[data-page="essay"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  await js(`document.querySelector('[data-action="essay-tab"][data-tab="prompts"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const promptOk = await js(`(function(){
    const item = document.querySelector('[data-action="prompt-detail"]');
    if (!item) return 'no-item';
    item.click();
    return new Promise(r => setTimeout(() => {
      const c = document.querySelector('#content').innerHTML;
      r(c.includes('题目解析与写作指导') || c.includes('结构要点') || c.includes('practice-card') ? 'ok' : 'no-detail');
    }, 150));
  })()`);
  assert(promptOk === 'ok', '真题列表点击打开详情 — ' + promptOk);

  console.log('── 4. 目标弹窗 X 可关闭（回归：全新会话关不掉） ──');
  await js(`localStorage.removeItem('shiguang-cet6-v1')`); // 清状态回到"全新会话"
  await js(`document.querySelector('[data-action="edit-goal"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  assert(await js(`!!document.querySelector('#modal-root .modal')`), '目标弹窗打开');
  await js(`document.querySelector('#modal-root .modal-close').click()`);
  await new Promise(r => setTimeout(r, 150));
  assert(await js(`document.querySelector('#modal-root').innerHTML === ''`), '点击 X 关闭目标弹窗（回归）');

  console.log('── 5. 复习键盘不泄漏到其他页面（回归：Space 丢稿） ──');
  await js(`document.querySelector('.nav-item[data-page="vocab"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  await js(`document.querySelector('[data-action="vocab-review-start"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  // 翻卡并评分，制造"复习进行中"状态
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
  await new Promise(r => setTimeout(r, 150));
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))`);
  await new Promise(r => setTimeout(r, 150));
  assert(await js(`document.querySelector('.flashcard') !== null`), '复习翻卡/评分正常');
  // 切到翻译页，按空格——旧 bug 会触发翻卡并重渲染
  await js(`document.querySelector('.nav-item[data-page="translation"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const beforeHtml = await js(`document.querySelector('#content').innerHTML`);
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
  await new Promise(r => setTimeout(r, 200));
  const afterHtml = await js(`document.querySelector('#content').innerHTML`);
  assert(beforeHtml === afterHtml, '翻译页按空格不再触发复习翻卡（回归）');

  console.log('── 6. 全局搜索：直达目标 + 覆盖作文 ──');
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const searchWordOk = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.value = 'abandon';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('.global-result[data-type="word"]');
      if (!first) return r('no-word-result');
      first.click();
      setTimeout(() => {
        const modal = document.querySelector('#modal-root .modal');
        const word = modal ? modal.textContent : '';
        r(word.toLowerCase().includes('abandon') ? 'ok' : 'wrong-modal: ' + word.slice(0, 40));
      }, 250);
    }, 150));
  })()`);
  assert(searchWordOk === 'ok', '搜索单词直达详情弹窗 — ' + searchWordOk);

  await js(`document.querySelector('#modal-root').innerHTML = ''; document.querySelector('.search-modal')?.remove()`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const searchWritingOk = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.value = 'translation'; // 作文题目里的常见词
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('.global-result[data-type="writing"]');
      if (!first) return r('no-writing-result');
      first.click();
      setTimeout(() => {
        const c = document.querySelector('#content').innerHTML;
        r(c.includes('题目解析与写作指导') || c.includes('practice-card') ? 'ok' : 'no-detail');
      }, 250);
    }, 150));
  })()`);
  assert(searchWritingOk === 'ok', '搜索作文直达真题详情 — ' + searchWritingOk);

  console.log('── 7. 顺序 ID → 稳定 ID 迁移 ──');
  const migrationOk = await js(`(function(){
    // 用 idmap 造一条"旧格式"状态：取一个映射条目，写入旧 key
    const map = window.CET6_IDMAP;
    const oldId = Object.keys(map.words)[0];
    const newId = map.words[oldId];
    const oldPhId = Object.keys(map.phrases)[0];
    const st = {
      version: 1,
      words: { [oldId]: { level: 2, due: 1, reviews: 3, lastReviewed: 1 } },
      phraseFavorites: [map.phrases[oldPhId] ? oldPhId : oldPhId],
      phraseProgress: { [oldPhId]: { grade: 1, lastReviewed: 1, timesSeen: 2 } },
      translations: {},
      templateFavorites: [], templateEdits: {}, customTemplates: [],
      activity: {}, dailyGoal: 20
    };
    localStorage.setItem('shiguang-cet6-v1', JSON.stringify(st));
    location.reload();
    return 'reloading';
  })()`);
  await new Promise(r => setTimeout(r, 1500));
  const migrated = await js(`(function(){
    const raw = localStorage.getItem('shiguang-cet6-v1');
    const st = JSON.parse(raw);
    const map = window.CET6_IDMAP;
    const oldId = Object.keys(map.words)[0];
    const newId = map.words[oldId];
    const oldPhId = Object.keys(map.phrases)[0];
    return {
      schema: st.idSchema,
      hasOldKey: oldId in st.words,
      hasNewKey: newId in st.words,
      reviews: st.words[newId] ? st.words[newId].reviews : null,
      favMigrated: !st.phraseFavorites.includes(oldPhId),
      progressMigrated: !(oldPhId in st.phraseProgress) && Object.keys(st.phraseProgress).length === 1
    };
  })()`);
  assert(migrated.schema === 2, '迁移后 idSchema = 2');
  assert(!migrated.hasOldKey && migrated.hasNewKey, '词汇记录重挂到稳定 ID');
  assert(migrated.reviews === 3, '复习次数保留（reviews=3）');
  assert(migrated.favMigrated && migrated.progressMigrated, '短语收藏/进度同步迁移');

  console.log('── 8. 数据完整性 ──');
  const counts = await js(`({
    words: window.CET6_WORDS.length, phrases: window.CET6_PHRASES.length,
    translations: window.CET6_TRANSLATIONS.length, writing: window.CET6_WRITING.length,
    wordIdUnique: new Set(window.CET6_WORDS.map(w => w.id)).size,
    transIdUnique: new Set(window.CET6_TRANSLATIONS.map(t => t.id)).size
  })`);
  assert(counts.words === 5651 && counts.wordIdUnique === 5651, '词汇 5651 条 ID 唯一');
  assert(counts.translations === 122 && counts.transIdUnique === 122, '翻译 122 条 ID 唯一');

  console.log('── 9. 短语/翻译搜索直达（回归：只跳页面不定位） ──');
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const phraseSearchOk = await js(`(function(){
    const p = window.CET6_PHRASES.find(x => x.example && x.source === 'curated');
    const input = document.querySelector('#global-search-input');
    input.value = p.phrase;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('.global-result[data-type="phrase"]');
      if (!first) return r('no-result');
      first.click();
      setTimeout(() => {
        const el = document.querySelector('.phrase-card[data-id="' + p.id + '"]');
        r(el ? 'ok' : 'target-not-visible');
      }, 300);
    }, 150));
  })()`);
  assert(phraseSearchOk === 'ok', '短语搜索直达目标卡片 — ' + phraseSearchOk);

  await js(`document.querySelector('.search-modal')?.remove()`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const transSearchOk = await js(`(function(){
    const t = window.CET6_TRANSLATIONS[0];
    const q = t.source.slice(0, 6);
    const input = document.querySelector('#global-search-input');
    input.value = q;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const first = document.querySelector('.global-result[data-type="translation"]');
      if (!first) return r('no-result');
      first.click();
      setTimeout(() => {
        const c = document.querySelector('#content').textContent;
        r(c.includes('参考译文') ? 'ok' : 'no-detail');
      }, 300);
    }, 150));
  })()`);
  assert(transSearchOk === 'ok', '翻译搜索直达题目详情 — ' + transSearchOk);

  console.log('── 10. 完整复习循环：全部评分才完成 ──');
  await js(`document.querySelector('.nav-item[data-page="vocab"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  await js(`document.querySelector('[data-action="vocab-review-start"]').click()`);
  await new Promise(r => setTimeout(r, 250));
  const queueLen = await js(`document.querySelectorAll('.review-dot').length`);
  assert(queueLen > 0, '复习队列已生成（' + queueLen + ' 项）');
  for (let i = 0; i < queueLen; i++) {
    await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))`);
    await new Promise(r => setTimeout(r, 90));
    await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))`);
    await new Promise(r => setTimeout(r, 90));
  }
  const completeText = await js(`document.querySelector('#content').textContent`);
  assert(completeText.includes('复习完成'), '全部评分后进入完成页');
  assert(completeText.includes('本轮复习了 ' + queueLen + ' 个单词'),
    '完成页数字 = 实际评分数 ' + queueLen + '（回归：曾虚报队列长度）');

  console.log('── 11. 内联事件属性清零（CSP 合规） ──');
  assert(await js(`document.querySelector('[onclick], [onmouseenter], [onmouseleave]') === null`),
    'DOM 中无内联事件属性');

  console.log('── 12. 搜索回归：模板 / 键盘 / 空状态 / 输入框不重建 ──');
  await js(`document.querySelector('.search-modal')?.remove(); document.querySelector('#modal-root').innerHTML = '';`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const tplSearch = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.value = '双边';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const el = document.querySelector('.global-result[data-type="template"]');
      if (!el) return r('no-template-result');
      el.click();
      setTimeout(() => {
        const ta = document.querySelector('#template-content');
        r(ta && ta.value.indexOf('Some argue') >= 0 ? 'ok' : 'no-detail');
      }, 350);
    }, 150));
  })()`);
  assert(tplSearch === 'ok', '作文模板可搜索并直达详情 — ' + tplSearch);

  await js(`document.querySelector('.search-modal')?.remove()`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const kbSearch = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.value = 'abandon';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const all = [...document.querySelectorAll('.global-result')];
      if (!all.length) return r('no-result');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const activeIsFirst = document.querySelector('.global-result.active') === all[0];
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const movedToSecond = document.querySelector('.global-result.active') === all[1];
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      const backToFirst = document.querySelector('.global-result.active') === all[0];
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      setTimeout(() => {
        const modal = document.querySelector('#modal-root .modal');
        r(activeIsFirst && movedToSecond && backToFirst && modal && modal.textContent.includes('abandon') ? 'ok'
          : 'fail:' + [activeIsFirst, movedToSecond, backToFirst, !!modal].join(','));
      }, 250);
    }, 150));
  })()`);
  assert(kbSearch === 'ok', '搜索面板 ↑↓ 选择 + Enter 打开 — ' + kbSearch);

  await js(`document.querySelector('#modal-root').innerHTML = ''; document.querySelector('.search-modal')?.remove()`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 150));
  const emptySearch = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.value = 'zzzznotfound';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const state = document.querySelector('#global-results .empty-state');
      r({ hasEmpty: !!state, hasResult: !!document.querySelector('.global-result') });
    }, 150));
  })()`);
  assert(emptySearch.hasEmpty && !emptySearch.hasResult, '无结果时显示空状态而非空白一片');
  await js(`document.querySelector('.search-modal')?.remove()`);

  // 短语页搜索框：输入时不能重建 input 节点（否则中文输入法组合被打断）
  await js(`document.querySelector('.nav-item[data-page="phrases"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const phraseInput = await js(`(function(){
    const input = document.querySelector('#phrase-search');
    window.__phraseInput = input;
    input.value = '经济';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      r({
        sameNode: document.contains(window.__phraseInput) && document.querySelector('#phrase-search') === window.__phraseInput,
        cards: document.querySelectorAll('.phrase-card').length,
        count: (document.querySelector('#phrase-count') || {}).textContent
      });
    }, 150));
  })()`);
  assert(phraseInput.sameNode, '短语搜索不重建输入框（中文输入法可用）');
  assert(phraseInput.cards > 0, '短语中文搜索有结果 — ' + phraseInput.cards + ' 条 / ' + phraseInput.count);

  const phraseEmpty = await js(`(function(){
    const input = document.querySelector('#phrase-search');
    input.value = 'zzzznotfound';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const empty = document.querySelector('#phrase-results .empty-state');
      const before = !!empty;
      const btn = document.querySelector('[data-action="phrase-search-clear"]');
      if (btn) btn.click();
      setTimeout(() => r({ before, cleared: document.querySelectorAll('.phrase-card').length > 0 }), 200);
    }, 150));
  })()`);
  assert(phraseEmpty.before && phraseEmpty.cleared, '短语无结果有空状态且可一键清空');

  console.log('── 13. 「未学」应清空记录而不是排进 10 分钟复习 ──');
  const levelReset = await js(`(function(){
    document.querySelector('.nav-item[data-page="vocab"]').click();
    return new Promise(r => setTimeout(() => {
      const row = document.querySelector('.word-row[data-action="word-detail"]');
      const id = row.dataset.id;
      row.querySelector('.mastery-dot[data-level="2"]').click();
      const afterMark = JSON.parse(localStorage.getItem('shiguang-cet6-v1'));
      const marked = afterMark.words[id] ? afterMark.words[id].level : null;
      document.querySelector('.word-row[data-action="word-detail"][data-id="' + id + '"] .mastery-dot[data-level="0"]').click();
      const afterReset = JSON.parse(localStorage.getItem('shiguang-cet6-v1'));
      r({ id, marked, stillThere: id in afterReset.words, markedLevel: marked });
    }, 150));
  })()`);
  assert(levelReset.markedLevel === 2, '标记「模糊」写入 level 2');
  assert(levelReset.stillThere === false, '点「未学」清除该词记录（不再排入复习队列）');

  console.log('── 14. 作文练习：词数统计 + 草稿自动保存 + 标记完成 ──');
  const essayText = 'With the trend of urbanization, it is vitally important for city residents to develop a stronger love for nature. '
    + Array.from({ length: 160 }, (_, i) => 'word' + i).join(' ');
  const essayWords = essayText.trim().split(/[ \t\n\r]+/).filter(Boolean).length;
  await js(`document.querySelector('.nav-item[data-page="essay"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  await js(`document.querySelector('[data-action="essay-tab"][data-tab="prompts"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const essayData = await js(`(function(){
    document.querySelector('[data-action="prompt-detail"]').click();
    const ta = document.querySelector('#my-essay');
    if (!ta) return { ok: false, why: 'no-textarea' };
    const id = document.querySelector('[data-action="essay-done"]').dataset.id;
    ta.value = ${JSON.stringify(essayText)};
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      ok: true, id,
      meterText: document.querySelector('#essay-words').textContent,
      state: document.querySelector('#essay-meter').dataset.state,
      meterHint: document.querySelector('#essay-hint').textContent
    };
  })()`);
  assert(essayData.ok, '作文详情页有练习输入框');
  assert(Number(essayData.meterText) === essayWords && essayData.state === 'ok',
    '实时词数统计 — 页面 ' + essayData.meterText + ' 词 / 实际 ' + essayWords + ' 词 / 提示「' + essayData.meterHint + '」');

  await new Promise(r => setTimeout(r, 700));
  const essaySaved = await js(`(function(){
    const st = JSON.parse(localStorage.getItem('shiguang-cet6-v1'));
    const rec = st.essays && st.essays[${JSON.stringify(essayData.id)}];
    return { saved: !!(rec && rec.text && rec.text.length > 100), saveLabel: document.querySelector('#essay-save-state').textContent };
  })()`);
  assert(essaySaved.saved, '草稿自动保存到本机');
  assert(essaySaved.saveLabel.includes('已自动保存'), '保存状态如实反馈 — ' + essaySaved.saveLabel);

  const essayDone = await js(`(function(){
    const before = JSON.parse(localStorage.getItem('shiguang-cet6-v1'));
    const key = Object.keys(before.activity || {}).pop();
    const beforeCount = before.activity && before.activity[key] ? (before.activity[key].templates || 0) : 0;
    document.querySelector('[data-action="essay-done"]').click();
    const after = JSON.parse(localStorage.getItem('shiguang-cet6-v1'));
    const rec = after.essays[${JSON.stringify(essayData.id)}];
    const key2 = Object.keys(after.activity || {}).pop();
    return { done: !!rec.done, counted: (after.activity[key2] || {}).templates - beforeCount };
  })()`);
  assert(essayDone.done, '标记完成写入状态');
  assert(essayDone.counted === 1, '标记完成计入今日活动一次 — 实际 ' + essayDone.counted);

  const essayList = await js(`(function(){
    document.querySelector('[data-action="essay-tab"][data-tab="prompts"]').click();
    return new Promise(r => setTimeout(() => {
      const item = document.querySelector('.question-item[data-id="${essayData.id}"]');
      r(item ? item.textContent.includes('已写') : false);
    }, 200));
  })()`);
  assert(essayList, '真题列表显示「已写」标记');

  console.log('── 15. 词汇单元下拉直跳 ──');
  await js(`document.querySelector('.nav-item[data-page="vocab"]').click()`);
  await new Promise(r => setTimeout(r, 250));
  const unitJump = await js(`(function(){
    const sel = document.querySelector('#vocab-unit-jump');
    if (!sel) return { ok: false };
    sel.value = '100';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const firstRowId = document.querySelector('.word-row[data-action="word-detail"]').dataset.id;
      const expect = window.CET6_WORDS.find(w => w.unit === 100);
      const selNow = document.querySelector('#vocab-unit-jump');
      r({ ok: true, jumped: firstRowId === expect.id, selected: selNow.value, optionCount: selNow.options.length });
    }, 250));
  })()`);
  assert(unitJump.ok && unitJump.jumped, '下拉选择 Unit 100 直达该单元词表');
  assert(unitJump.selected === '100' && unitJump.optionCount === 114, '下拉保留选中态且选项数 = 114');

  console.log('── 16. 输入法组合态搜索（回归：isComposing 把事件全丢了） ──');
  await js(`document.querySelector('.search-modal')?.remove(); document.querySelector('#modal-root').innerHTML = '';`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  const imeSearch = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    // 真实中文输入法：compositionstart → input(isComposing:true) → compositionend
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = 'abandon';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: 'abandon' }));
    return new Promise(r => setTimeout(() => {
      const during = document.querySelectorAll('.global-result').length;
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'abandon' }));
      setTimeout(() => r({ during, after: document.querySelectorAll('.global-result').length }), 200);
    }, 200));
  })()`);
  assert(imeSearch.during > 0, '组合输入过程中就出结果（回归：曾被 isComposing 丢弃）— 实际 ' + imeSearch.during + ' 条');
  assert(imeSearch.after > 0, '组合结束后结果保留 — 实际 ' + imeSearch.after + ' 条');

  const imeNotice = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = "a's";
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: "a's" }));
    return new Promise(r => setTimeout(() => {
      const notice = document.querySelector('.ime-notice');
      r({ shown: !!notice,
          text: notice ? notice.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60) : '',
          results: document.querySelectorAll('.global-result').length,
          firstTitle: (document.querySelector('.global-result strong') || {}).textContent || '' });
    }, 200));
  })()`);
  assert(imeNotice.shown && imeNotice.text.includes('输入法正在组词'), '组词态给出解释而不是让用户猜 — 「' + imeNotice.text + '」');
  assert(imeNotice.results > 0, '组词态仍给出结果（忽略输入法的撇号分隔符）— 实际 ' + imeNotice.results + ' 条，首条 ' + imeNotice.firstTitle);

  const imeChinese = await js(`(function(){
    const input = document.querySelector('#global-search-input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = 'jingji';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: 'jingji' }));
    return new Promise(r => setTimeout(() => {
      const pinyinPhase = document.querySelector('#global-results').textContent.trim().slice(0, 20);
      input.value = '经济';
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '经济' }));
      setTimeout(() => r({ pinyinPhase, after: document.querySelectorAll('.global-result').length }), 200);
    }, 200));
  })()`);
  assert(imeChinese.after > 0, '中文提交后出结果 — 实际 ' + imeChinese.after + ' 条（拼音阶段显示：' + imeChinese.pinyinPhase + '）');
  await js(`document.querySelector('.search-modal')?.remove()`);

  const imePhrase = await js(`(function(){
    document.querySelector('.nav-item[data-page="phrases"]').click();
    return new Promise(r => setTimeout(() => {
      const input = document.querySelector('#phrase-search');
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = '经济';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: '经济' }));
      setTimeout(() => {
        const during = document.querySelectorAll('.phrase-card').length;
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '经济' }));
        setTimeout(() => r({ during, count: (document.querySelector('#phrase-count') || {}).textContent }), 150);
      }, 200);
    }, 250));
  })()`);
  assert(imePhrase.during > 0, '短语页组合态输入即过滤 — 实际 ' + imePhrase.during + ' 张卡片');

  console.log('── 17. 界面显示的版本号与 package.json 一致 ──');
  const pkgVersion = require('../package.json').version;
  const shownVersion = await js(`(document.querySelector('#save-hint') || {}).textContent || ''`);
  assert(shownVersion.includes('v' + pkgVersion),
    '界面版本号 v' + pkgVersion + ' — 实际「' + shownVersion + '」（两处必须同步改）');

  console.log('── 18. 布局回归：搜索浮层可见 / 模板两栏 / 输入框撑满 ──');
  await js(`document.querySelector('.search-modal')?.remove(); document.querySelector('#modal-root').innerHTML = '';`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 250));
  const panelGeom = await js(`(function(){
    const p = document.querySelector('.search-panel');
    if (!p) return { ok: false };
    const r = p.getBoundingClientRect();
    const inside = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { ok: true, w: Math.round(r.width), h: Math.round(r.height),
             inPanel: !!(inside && inside.closest('.search-panel')) };
  })()`);
  assert(panelGeom.ok && panelGeom.w >= 300 && panelGeom.h >= 100, '搜索面板有实际尺寸 — ' + panelGeom.w + '×' + panelGeom.h);
  assert(panelGeom.inPanel, '面板位于最上层（不会被遮罩盖住）');
  await js(`document.querySelector('.search-modal')?.remove()`);

  await js(`document.querySelector('.nav-item[data-page="essay"]').click();`);
  await new Promise(r => setTimeout(r, 250));
  await js(`document.querySelector('[data-action="essay-tab"][data-tab="templates"]').click();`);
  await new Promise(r => setTimeout(r, 250));
  await js(`document.querySelector('[data-action="template-select"]').click();`);
  await new Promise(r => setTimeout(r, 300));
  const tplLayout = await js(`(function(){
    const list = document.querySelector('.template-list');
    const detail = document.querySelector('.essay-detail-area');
    const ta = document.querySelector('#template-content');
    if (!list || !detail || !ta) return { ok: false };
    const lr = list.getBoundingClientRect(), dr = detail.getBoundingClientRect(), tr = ta.getBoundingClientRect();
    return { ok: true, sideBySide: dr.x > lr.x + lr.width - 5, sameTop: Math.abs(dr.y - lr.y) < 40,
             taWidth: Math.round(tr.width), detailWidth: Math.round(dr.width),
             fillRatio: dr.width ? tr.width / dr.width : 0 };
  })()`);
  assert(tplLayout.ok && tplLayout.sideBySide && tplLayout.sameTop, '模板列表与详情并排（不再堆到最下方）');
  assert(tplLayout.fillRatio > 0.85, '模板正文输入框撑满右栏 — ' + tplLayout.taWidth + '/' + tplLayout.detailWidth + 'px');

  console.log('── 19. 弹窗层级：面板必须压在遮罩之上（回归：点搜索结果只剩变暗） ──');
  // 坑：js .click() 绕过硬命中测试，元素被遮罩盖住也照样"点得到"。
  // 所以这里一律用 elementFromPoint 判断"最上层是谁"，别再信 click 返回值。
  const modalProbe = `(function(){
    const p = document.querySelector('#modal-root .modal');
    if (!p) return { ok: false };
    const r = p.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + 24;
    const hit = document.elementFromPoint(cx, cy);
    const cs = getComputedStyle(p);
    return { ok: true, w: Math.round(r.width), h: Math.round(r.height),
             inViewport: r.y >= 0 && r.y + r.height <= window.innerHeight + 1,
             onTop: !!(hit && hit.closest && hit.closest('.modal')),
             z: cs.zIndex + '/' + cs.position,
             hitCls: hit ? (hit.className || hit.tagName) : 'none' };
  })()`;

  // 19-1 搜索 → 点第一条单词结果 → 单词详情弹窗必须可见
  await js(`document.querySelector('#modal-root').innerHTML = ''`);
  await js(`document.querySelector('[data-action="global-search"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  await js(`(function(){
    const i = document.querySelector('#global-search-input');
    i.focus(); i.value = 'abandon';
    i.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'abandon' }));
  })()`);
  await new Promise(r => setTimeout(r, 250));
  await js(`document.querySelector('.global-result[data-type="word"]').click()`);
  await new Promise(r => setTimeout(r, 350));
  const wordModal = await js(modalProbe);
  assert(wordModal.ok && wordModal.w > 300 && wordModal.h > 100, '点搜索结果后单词弹窗有内容 — ' + wordModal.w + '×' + wordModal.h);
  assert(wordModal.onTop, '单词弹窗在遮罩之上（回归：曾被遮罩整屏盖住）— 最上层是 ' + wordModal.hitCls);
  assert(wordModal.inViewport, '单词弹窗落在视口内（不再跑到文档末尾）— z=' + wordModal.z);

  // 19-2 目标设置弹窗同样要压在遮罩上
  await js(`document.querySelector('#modal-root').innerHTML = ''`);
  await js(`document.querySelector('[data-action="edit-goal"]').click()`);
  await new Promise(r => setTimeout(r, 300));
  const goalModal = await js(modalProbe);
  assert(goalModal.ok && goalModal.onTop, '目标设置弹窗在遮罩之上 — 最上层是 ' + goalModal.hitCls);
  await js(`document.querySelector('#modal-root').innerHTML = ''`);

  if (notes.length) notes.forEach(n => console.log('  ℹ ' + n));
  console.log(failures.length === 0 ? '\n✅ 冒烟测试全部通过' : `\n❌ ${failures.length} 项失败`);
  const verdict = failures.length === 0;
  app.exit(verdict ? 0 : 1);
}).catch(err => { console.error('冒烟测试崩溃:', err); app.exit(1); });
