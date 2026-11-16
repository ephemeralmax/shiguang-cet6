// tests/study-core.test.js — study-core 断言式自检
'use strict';
const core = require('../study-core.js');

function assert(cond, msg) {
  if (!cond) { console.error('❌ FAIL:', msg); process.exit(1); }
  console.log('  ✓', msg);
}

console.log('study-core 自检');

// dateKey
assert(core.dateKey(new Date(2026, 0, 5)) === '2026-01-05', 'dateKey 格式正确');

// emptyState
const s = core.emptyState();
assert(s.version === 1 && typeof s.words === 'object', 'emptyState 结构正确');

// reviewWord: level 0→1, due = now + 1天
const rec1 = core.reviewWord(null, 1, 1000000);
assert(rec1.level === 1 && rec1.due === 1000000 + core.DAY, 'reviewWord level 1 间隔 = 1天');
assert(rec1.reviews === 1, 'reviewWord reviews 计数');

// reviewWord: level 3 上限
const rec2 = core.reviewWord(null, 5, 0);
assert(rec2.level === 3, 'reviewWord level 上限 3');

// reviewWord: level 0 → 10 分钟后到期，到期后必须回到复习队列
const rec0 = core.reviewWord(null, 0, 1000000);
assert(rec0.level === 0 && rec0.due === 1000000 + 10 * 60 * 1000, 'reviewWord level 0 间隔 = 10 分钟');
assert(core.isDue(rec0, 999999) === false, 'level 0 未到期 → 不进队列');
assert(core.isDue(rec0, 1000000 + 10 * 60 * 1000) === true, 'level 0 恰好到期 → 进队列（回归：旧实现永久驱逐）');

// getReviewQueue: level 0 到期后回到队列
const st0 = core.emptyState();
st0.words = { a: core.reviewWord(null, 0, 1000) };
const q0 = core.getReviewQueue([{ id: 'a' }], st0, 1000 + 10 * 60 * 1000, 10);
assert(q0.length === 1 && q0[0].id === 'a', 'getReviewQueue: level 0 到期后重新入队');

// isDue
const recDue = { level: 1, due: 500 };
assert(core.isDue(recDue, 1000) === true, 'isDue: due < now → true');
assert(core.isDue(recDue, 300) === false, 'isDue: due > now → false');

// getReviewQueue
const words = [
  { id: 'a' }, { id: 'b' }, { id: 'c' }
];
const st = core.emptyState();
st.words = {
  a: { level: 1, due: 100, reviews: 2 },   // due
  b: { level: 2, due: 99999, reviews: 5 }, // not due
  c: {}                                      // fresh
};
const queue = core.getReviewQueue(words, st, 500, 10);
assert(queue.length === 2, 'getReviewQueue: due + fresh, 不含未到期');
assert(queue[0].id === 'a', 'getReviewQueue: due 排在前面');

// recordActivity
const st2 = core.emptyState();
core.recordActivity(st2, 'reviews', 3, new Date(2026, 5, 15));
const key = '2026-06-15';
assert(st2.activity[key].reviews === 3, 'recordActivity 记录正确');

// calculateStreak
const act = {};
const now = Date.now();
const d0 = core.dateKey(new Date(now));
const d1 = core.dateKey(new Date(now - core.DAY));
const d2 = core.dateKey(new Date(now - 2 * core.DAY));
act[d0] = { reviews: 1 };
act[d1] = { reviews: 1 };
act[d2] = { reviews: 1 };
assert(core.calculateStreak(act, now) === 3, 'calculateStreak: 连续 3 天');

// getWeekActivity
const week = core.getWeekActivity(act, now);
assert(week.length === 7, 'getWeekActivity: 返回 7 天');
assert(week[6].value === 1, 'getWeekActivity: 今天有活动');

// searchContent
const data = {
  words: [
    { id: 'w1', word: 'abandon', meaning: 'v. 放弃', example: 'abandon ship', translation: '弃船' },
    { id: 'w2', word: 'economy', meaning: 'n. 经济' }
  ],
  phrases: [{ id: 'p1', phrase: 'give up', meaning: '放弃', example: 'give up smoking' }],
  translations: [{ id: 't1', year: 2026, month: 6, examType: 'cet6', source: '经济快速发展', reference: 'rapid economic growth' }],
  writing: [{ id: 'wr1', year: 2026, month: 6, category: '观点论证', prompt: 'write about economy', analysis: '经济话题解析' }],
  templates: [{ id: 'e1', title: '双边观点选择型', category: '观点论证', description: '模板', content: 'some economy template' }]
};
const results = core.searchContent('abandon', data);
assert(results.total === 1 && results.groups[0].type === 'word', 'searchContent: 能搜索单词');
assert(results.groups[0].items[0].title === 'abandon', 'searchContent: 返回单词标题');

// 模板可被搜索（旧实现漏了模板，且 UI 用的是另一套重复逻辑）
const tplHit = core.searchContent('双边', data);
assert(tplHit.total === 1 && tplHit.groups[0].type === 'template', 'searchContent: 作文模板可搜索');

// 分组：同一关键词命中多个类型，各自独立返回
const grouped = core.searchContent('economy', data);
assert(grouped.groups.length === 3, 'searchContent: 按类型分组（单词/作文/模板）');
assert(grouped.groups.every(g => g.total >= 1 && g.items.length >= 1), 'searchContent: 每组带 total 与 items');

// 例句/正文也可命中
assert(core.searchContent('smoking', data).total === 1, 'searchContent: 短语例句可命中');
assert(core.searchContent('rapid economic', data).total === 1, 'searchContent: 参考译文可命中');

// 空查询与无结果
assert(core.searchContent('   ', data).total === 0, 'searchContent: 空查询返回空');
assert(core.searchContent('zzzznotfound', data).total === 0, 'searchContent: 无结果时 total = 0');

// 每类独立上限，不会互相挤占
const many = { words: Array.from({ length: 50 }, (_, i) => ({ id: 'w' + i, word: 'test' + i, meaning: '测试' })), phrases: [{ id: 'p', phrase: 'test phrase', meaning: '测试短语' }] };
const capped = core.searchContent('test', many, { limits: { word: 5 } });
assert(capped.groups[0].items.length === 5 && capped.groups[0].total === 50, 'searchContent: 截断保留命中总数');
assert(capped.groups[1].type === 'phrase' && capped.groups[1].items.length === 1, 'searchContent: 单词截断不影响短语');

// 排序：完全匹配 > 前缀 > 词中命中；同级内短词优先
const rankData = {
  words: [
    { id: 'a', word: 'assassinate', meaning: 'v. 刺杀', rank: 100 },
    { id: 'b', word: 'as', meaning: 'conj. 作为', rank: 900 },
    { id: 'c', word: 'bias', meaning: 'n. 偏见', rank: 10 },
    { id: 'd', word: 'aside', meaning: 'adv. 在旁边', rank: 800 }
  ]
};
const ranked = core.searchContent('as', rankData).groups[0].items.map(i => i.title);
assert(ranked[0] === 'as', '排序: 完全匹配排第一 — 实际 ' + ranked.join(','));
assert(ranked[1] === 'aside', '排序: 前缀命中的短词优先于长词 — 实际 ' + ranked.join(','));
assert(ranked[3] === 'bias', '排序: 词中命中排在最后 — 实际 ' + ranked.join(','));

// 去重：同词形多条数据只保留一条（数据源里 destination/cancel 等确实重复收录）
const dupData = {
  words: [
    { id: 'x1', word: 'destination', meaning: 'n. 目的地', rank: 210 },
    { id: 'x2', word: 'destination', meaning: 'n. 目的地，终点；目标', rank: 2158 }
  ]
};
const dupRes = core.searchContent('destination', dupData);
assert(dupRes.groups[0].total === 1 && dupRes.groups[0].items[0].id === 'x1',
  '去重: 同词只留 rank 最高的一条 — 实际 ' + dupRes.groups[0].total + ' 条');

console.log('\n✅ study-core 全部通过');
