(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.StudyCore = core;
})(typeof self !== 'undefined' ? self : this, function () {
  const DAY = 24 * 60 * 60 * 1000;
  const INTERVALS = [10 * 60 * 1000, DAY, 3 * DAY, 7 * DAY];

  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function emptyState() {
    return {
      version: 1,
      words: {},
      phraseFavorites: [],
      templateFavorites: [],
      templateEdits: {},
      customTemplates: [],
      translations: {},
      activity: {},
      dailyGoal: 20
    };
  }

  function normalizeState(value) {
    const base = emptyState();
    if (!value || typeof value !== 'object') return base;
    return {
      ...base,
      ...value,
      words: value.words && typeof value.words === 'object' ? value.words : {},
      phraseFavorites: Array.isArray(value.phraseFavorites) ? value.phraseFavorites : [],
      templateFavorites: Array.isArray(value.templateFavorites) ? value.templateFavorites : [],
      templateEdits: value.templateEdits && typeof value.templateEdits === 'object' ? value.templateEdits : {},
      customTemplates: Array.isArray(value.customTemplates) ? value.customTemplates : [],
      translations: value.translations && typeof value.translations === 'object' ? value.translations : {},
      activity: value.activity && typeof value.activity === 'object' ? value.activity : {}
    };
  }

  function reviewWord(record, grade, now) {
    const time = typeof now === 'number' ? now : Date.now();
    const nextLevel = Math.max(0, Math.min(3, Number(grade) || 0));
    return {
      level: nextLevel,
      due: time + INTERVALS[nextLevel],
      reviews: ((record && record.reviews) || 0) + 1,
      lastReviewed: time
    };
  }

  function isDue(record, now) {
    // 只要存在有效的 due 就参与调度（level 0 = 10 分钟后再见，到期必须回来）
    if (!record || typeof record.due !== 'number' || !isFinite(record.due)) return false;
    return record.due <= (typeof now === 'number' ? now : Date.now());
  }

  function getReviewQueue(words, state, now, limit) {
    const time = typeof now === 'number' ? now : Date.now();
    const max = limit || 8;
    const due = [];
    const fresh = [];
    words.forEach((word) => {
      const record = state.words[word.id];
      if (isDue(record, time)) due.push(word);
      else if (!record || !record.reviews) fresh.push(word);
    });
    due.sort((a, b) => state.words[a.id].due - state.words[b.id].due);
    return due.concat(fresh).slice(0, max);
  }

  function recordActivity(state, type, amount, now) {
    const key = dateKey(now || Date.now());
    const current = state.activity[key] || { reviews: 0, translations: 0, phrases: 0, templates: 0 };
    current[type] = (current[type] || 0) + (amount || 1);
    state.activity[key] = current;
    return state;
  }

  function calculateStreak(activity, now) {
    const time = typeof now === 'number' ? now : Date.now();
    let cursor = new Date(time);
    if (!activity[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (activity[dateKey(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function getWeekActivity(activity, now) {
    const time = typeof now === 'number' ? now : Date.now();
    const result = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(time);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const item = activity[key] || {};
      result.push({
        key,
        label: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        value: (item.reviews || 0) + (item.translations || 0) + (item.phrases || 0) + (item.templates || 0)
      });
    }
    return result;
  }

  // 搜索结果按类型分组：每类都有命中总数 + 截断后的条目，
  // 避免"搜到了但被总上限挤掉"（旧实现全局 12 条上限，单词一多就看不到别的内容）
  // 命中字段分三级：标题(0) > 摘要/释义(1) > 例句/正文(2)。
  // 只在例句里命中的条目必须展示命中上下文，否则用户会看到一堆"看不出为什么"的结果
  const SEARCH_TYPES = [
    {
      type: 'word', collection: 'words', label: '单词', limit: 20, dedupeByTitle: true,
      title: (i) => i.word,
      subtitle: (i) => i.meaning,
      extra: (i) => [i.example, i.translation]
    },
    {
      type: 'phrase', collection: 'phrases', label: '短语', limit: 20, dedupeByTitle: true,
      title: (i) => i.phrase,
      subtitle: (i) => i.meaning,
      extra: (i) => [i.example]
    },
    {
      type: 'translation', collection: 'translations', label: '翻译真题', limit: 12,
      title: (i) => i.source,
      subtitle: (i) => `${i.year} 年 ${i.month} 月 · ${i.examType === 'cet4' ? '四级' : '六级'}`,
      extra: (i) => [i.reference]
    },
    {
      type: 'writing', collection: 'writing', label: '作文真题', limit: 8,
      title: (i) => i.prompt,
      subtitle: (i) => `${i.year} 年 ${i.month} 月 · ${i.category}`,
      extra: (i) => [i.category, i.analysis]
    },
    {
      type: 'template', collection: 'templates', label: '作文模板', limit: 8,
      title: (i) => i.title,
      subtitle: (i) => `${i.category}${i.isCustom ? ' · 自定义' : ''}`,
      extra: (i) => [i.description, i.content]
    }
  ];

  function clampText(value, max) {
    const s = String(value == null ? '' : value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }

  // 截取命中点周围的一段文本，让"为什么这条会出现"一目了然
  function contextAround(text, at, length, span) {
    const pad = span || 24;
    const start = Math.max(0, at - pad);
    const end = Math.min(text.length, at + length + pad);
    return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  // 命中层级：完全等于 > 以关键词开头 > 词中包含 > 释义命中 > 例句/正文命中。
  // 旧实现只分"标题 vs 其他"，搜 as 时 assassinate 和 bias 挤在一起，
  // 真正想要的 as 开头短词反而被淹没
  function buildHit(spec, item, q) {
    const fullTitle = String(spec.title(item) || '');
    const subtitle = String(spec.subtitle(item) || '');
    const extras = (spec.extra ? spec.extra(item) : []).filter(Boolean).map(String);
    const lowerTitle = fullTitle.toLowerCase();

    const titleAt = lowerTitle.indexOf(q);
    let tier;
    let shownSubtitle = subtitle;
    let shownTitle = fullTitle;

    if (titleAt !== -1) {
      if (lowerTitle === q) tier = 0;                                  // 完全匹配
      else if (titleAt === 0) tier = 1;                                // 前缀匹配
      else if (spec.type === 'word' || spec.type === 'phrase') tier = 2; // 词中命中
      else tier = 1;                                                    // 长文本：命中即视为前缀级
      // 长文本（翻译原文/作文题干）命中点在截断线之后时，改为以命中点为中心的窗口，
      // 否则用户看到的是一条"没有任何高亮"的结果
      if (fullTitle.length > 60) shownTitle = contextAround(fullTitle, titleAt, q.length, 28);
    } else if (subtitle.toLowerCase().includes(q)) {
      tier = 3;
    } else {
      tier = -1;
      for (let i = 0; i < extras.length; i += 1) {
        const at = extras[i].toLowerCase().indexOf(q);
        if (at !== -1) {
          tier = 4;
          shownSubtitle = contextAround(extras[i], at, q.length);
          break;
        }
      }
      if (tier < 0) return null;
    }

    if (shownTitle === fullTitle) {
      shownTitle = spec.type === 'translation' || spec.type === 'writing' ? clampText(fullTitle, 60) : fullTitle;
    }

    return {
      type: spec.type,
      id: item.id,
      title: shownTitle,
      subtitle: shownSubtitle,
      tier,
      // 同级内排序：标题命中时"词越短越可能是目标词"，再按数据源 rank（越小越常考）；
      // 仅释义/例句命中时词长没有参考价值（硬按长度会把 hard hit 排到 economic aid 前面）
      shortBias: tier <= 2 && (spec.type === 'word' || spec.type === 'phrase') ? fullTitle.length : 0,
      rankNum: Number.isFinite(item.rank) ? item.rank : Number.MAX_SAFE_INTEGER,
      dedupeKey: spec.dedupeByTitle ? fullTitle.toLowerCase() : `${fullTitle}|${subtitle}`
    };
  }

  function searchContent(query, data, options) {
    const q = String(query == null ? '' : query).trim().toLowerCase();
    const source = data || {};
    const limits = (options && options.limits) || {};
    if (!q) return { query: '', total: 0, groups: [] };

    const groups = [];
    let total = 0;

    SEARCH_TYPES.forEach((spec) => {
      const list = Array.isArray(source[spec.collection]) ? source[spec.collection] : [];
      const hits = [];
      list.forEach((item, index) => {
        if (!item) return;
        const hit = buildHit(spec, item, q);
        if (hit) {
          hit.index = index;
          hits.push(hit);
        }
      });
      if (!hits.length) return;
      hits.sort((a, b) => a.tier - b.tier || a.shortBias - b.shortBias || a.rankNum - b.rankNum || a.index - b.index);
      // 词表里存在同一词形的多条数据（如 destination ×2、cancel ×2，释义略有差异），
      // 搜索结果不该出现两行一样的词；保留排序最靠前（rank 最高）的那条
      const seen = new Set();
      const unique = hits.filter((hit) => {
        if (seen.has(hit.dedupeKey)) return false;
        seen.add(hit.dedupeKey);
        return true;
      });
      const limit = limits[spec.type] || spec.limit;
      groups.push({ type: spec.type, label: spec.label, total: unique.length, items: unique.slice(0, limit) });
      total += unique.length;
    });

    return { query: q, total, groups };
  }

  return {
    DAY,
    INTERVALS,
    dateKey,
    emptyState,
    normalizeState,
    reviewWord,
    isDue,
    getReviewQueue,
    recordActivity,
    calculateStreak,
    getWeekActivity,
    searchContent
  };
});
