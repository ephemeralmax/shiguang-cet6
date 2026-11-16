// scripts/extract-data.js — 从本地数据源提取全量六级学习数据
// 数据源: .sources/english-vocabulary (词汇/短语) + .sources/cet6-db (翻译/作文真题)
// 产出: data/words.js, data/phrases.js, data/translations.js, data/templates.js
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const JSONL_PATH = path.join(ROOT, '.sources/english-vocabulary/full_line_jsonl/full/正序/六级.jsonl');
const DB_PATH = path.join(ROOT, '.sources/cet6-db/CET-Practice/_internal/seed/cet6.db');
const OUT_DIR = path.join(ROOT, 'data');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── 工具 ────────────────────────────────────────────────────────────────────
function sanitizeId(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '-');
}

// 短语稳定 ID：规范化文本哈希（与输出顺序无关，源数据增删不会错位）
function phraseHash(text) {
  let h = 5381;
  const s = String(text).toLowerCase().trim();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function writeJS(name, globalName, payload) {
  const code = `window.${globalName} = ${JSON.stringify(payload)};\n`;
  const fp = path.join(OUT_DIR, name);
  fs.writeFileSync(fp, code, 'utf8');
  const kb = (fs.statSync(fp).size / 1024).toFixed(0);
  console.log(`  ✓ ${name} (${kb} KB, ${Array.isArray(payload) ? payload.length : Object.keys(payload).length} 条)`);
}

function fmtPhonetic(u, us) {
  if (u) return `/${u}/`;
  if (us) return `/${us}/`;
  return '';
}

function fmtMeaning(trans) {
  if (!Array.isArray(trans)) return '';
  return trans.map(t => `${t.pos ? t.pos + '. ' : ''}${t.tranCn}`).join('；');
}

function firstSentence(sentence) {
  if (!sentence || !Array.isArray(sentence.sentences) || !sentence.sentences.length) return { ex: '', tr: '' };
  const s = sentence.sentences[0];
  return { ex: s.sContent || '', tr: s.sCn || '' };
}

// ─── 1. 词汇 ─────────────────────────────────────────────────────────────────
function extractWords() {
  return new Promise((resolve) => {
    const words = [];
    const phrases = [];
    const rl = readline.createInterface({ input: fs.createReadStream(JSONL_PATH, 'utf8') });
    rl.on('line', (line) => {
      const entry = JSON.parse(line);
      const c = entry.content.word.content;
      const rank = entry.wordRank || 9999;
      const { ex, tr } = firstSentence(c.sentence);
      const idx = words.length;
      words.push({
        // 稳定 ID：源 wordId（5651/5651 唯一），缺失时退回顺序号
        id: 'w' + sanitizeId(entry.content.word.wordId || 'seq-' + (idx + 1)),
        word: entry.headWord,
        phonetic: fmtPhonetic(c.ukphone, c.usphone),
        meaning: fmtMeaning(c.trans),
        example: ex,
        translation: tr,
        unit: Math.floor(idx / 50) + 1,
        frequency: rank <= 800 ? 'high' : rank <= 1800 ? 'mid' : 'low',
        rank: rank === 9999 ? null : rank
      });
      // 提取该词的短语搭配
      if (c.phrase && Array.isArray(c.phrase.phrases)) {
        for (const ph of c.phrase.phrases) {
          if (ph.pContent && ph.pCn) {
            phrases.push({
              phrase: ph.pContent,
              meaning: ph.pCn,
              source: entry.headWord
            });
          }
        }
      }
    });
    rl.on('close', () => resolve({ words, rawPhrases: phrases }));
  });
}

// ─── 2. 短语分类 ─────────────────────────────────────────────────────────────
const THEME_KEYWORDS = {
  '校园学习': ['study', 'learn', 'exam', 'course', 'student', 'teach', 'school', 'university', 'knowledge', 'academic', 'homework', 'degree', 'research', 'lecture', 'library', 'textbook', 'education', 'reading', 'writing', 'memoriz', 'practice', 'review', 'scholar', 'thesis', 'campus', 'tutorial', 'literacy', 'comprehension'],
  '科技网络': ['technolog', 'internet', 'digital', 'online', 'computer', 'data', 'software', 'network', 'artificial', 'intelligence', 'robot', 'algorithm', 'cyber', 'electron', 'information', 'virtual', 'automation', 'innovation', 'device', 'screen', 'website', 'platform', 'app', 'coding', 'science', 'scientific', 'engineering'],
  '环境保护': ['environment', 'climate', 'pollut', 'green', 'sustain', 'ecolog', 'carbon', 'emission', 'renewable', 'conservation', 'recycle', 'waste', 'energy', 'nature', 'wildlife', 'biodiversity', 'ocean', 'forest', 'drought', 'flood', 'warming', 'ecosystem', 'planet', 'earth', 'resource'],
  '社会发展': ['society', 'social', 'econom', 'develop', 'policy', 'govern', 'public', 'urban', 'rural', 'population', 'growth', 'inequality', 'poverty', 'wealth', 'employment', 'unemployment', 'infrastructure', 'welfare', 'reform', 'legislation', 'demographic', 'globaliz', 'industry', 'market', 'trade', 'commerce'],
  '文化交流': ['culture', 'cultural', 'tradition', 'heritage', 'exchange', 'global', 'international', 'diversity', 'custom', 'festival', 'art', 'literature', 'music', 'language', 'translation', 'abroad', 'foreign', 'overseas', 'tourism', 'ethnic', 'identity', 'civilization', 'religion', 'philosophy'],
  '职场沟通': ['work', 'career', 'manage', 'team', 'leader', 'business', 'company', 'office', 'colleague', 'employ', 'salary', 'interview', 'resume', 'profession', 'cooperate', 'communicat', 'meeting', 'project', 'deadline', 'strategy', 'negotiat', 'client', 'corporate', 'entrepreneur', 'productivity', 'efficient'],
  '健康生活': ['health', 'exercise', 'diet', 'mental', 'medical', 'hospital', 'disease', 'therapy', 'nutrition', 'sleep', 'fitness', 'wellness', 'stress', 'anxiety', 'depression', 'immunity', 'vaccine', 'hygiene', 'lifestyle', 'balance', 'relax', 'emotional', 'psychological', 'obesity', 'pandemic'],
  '图表写作': ['increase', 'decrease', 'proportion', 'percent', 'trend', 'account', 'rise', 'fall', 'decline', 'grow', 'shrink', 'compare', 'contrast', 'ratio', 'statistic', 'figure', 'chart', 'graph', 'peak', 'fluctuate', 'stable', 'dramatic', 'significant', 'gradual', 'sharp', 'steady', 'respectively', 'overall', 'nearly', 'approximately']
};

function classifyPhrase(phrase, meaning, source) {
  const text = `${phrase} ${meaning} ${source}`.toLowerCase();
  let best = '通用表达';
  let bestScore = 0;
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = theme;
    }
  }
  return best;
}

// 高价值考试短语（写作/翻译高频）—— 补充 jsonl 搭配的场景覆盖
const CURATED_PHRASES = [
  // 校园学习
  ['be beneficial to', '有益于', '校园学习', 'Reading extensively is beneficial to intellectual growth.'],
  ['broaden one\'s horizons', '开阔眼界', '校园学习', 'Studying abroad can greatly broaden one\'s horizons.'],
  ['acquire knowledge', '获取知识', '校园学习', 'Students acquire knowledge through both textbooks and practice.'],
  ['lay a solid foundation for', '为…打下坚实基础', '校园学习', 'Early education lays a solid foundation for future learning.'],
  ['be equipped with', '具备；装备有', '校园学习', 'Graduates should be equipped with practical skills.'],
  ['think independently', '独立思考', '校园学习', 'Education should encourage students to think independently.'],
  ['live up to one\'s expectations', '不辜负期望', '校园学习', 'He studied hard to live up to his parents\' expectations.'],
  ['pursue further education', '继续深造', '校园学习', 'Many graduates choose to pursue further education.'],
  // 科技网络
  ['keep pace with', '跟上；与…并驾齐驱', '科技网络', 'We must keep pace with technological advances.'],
  ['have access to', '有机会使用或接触', '科技网络', 'More people now have access to the internet.'],
  ['be addicted to', '沉迷于；对…上瘾', '科技网络', 'Teenagers addicted to social media may neglect real-life communication.'],
  ['artificial intelligence', '人工智能', '科技网络', 'Artificial intelligence is transforming every industry.'],
  ['digital divide', '数字鸿沟', '科技网络', 'The digital divide remains a serious challenge worldwide.'],
  ['keep track of', '记录；掌握…的动态', '科技网络', 'Apps help users keep track of their daily habits.'],
  ['cutting-edge technology', '前沿科技', '科技网络', 'Cutting-edge technology drives economic growth.'],
  ['double-edged sword', '双刃剑', '科技网络', 'Technology is a double-edged sword.'],
  // 环境保护
  ['raise public awareness of', '提高公众对…的意识', '环境保护', 'The campaign aims to raise public awareness of plastic pollution.'],
  ['take effective measures to', '采取有效措施…', '环境保护', 'Governments should take effective measures to reduce emissions.'],
  ['at the expense of', '以牺牲…为代价', '环境保护', 'Growth should not come at the expense of the environment.'],
  ['sustainable development', '可持续发展', '环境保护', 'Sustainable development balances economy and ecology.'],
  ['carbon footprint', '碳足迹', '环境保护', 'We should try to reduce our carbon footprint.'],
  ['be harmful to', '对…有害', '环境保护', 'Air pollution is harmful to human health.'],
  ['conserve natural resources', '保护自然资源', '环境保护', 'We must conserve natural resources for future generations.'],
  ['go green', '推行环保', '环境保护', 'More companies are choosing to go green.'],
  // 社会发展
  ['play a vital role in', '在…中发挥重要作用', '社会发展', 'Small businesses play a vital role in creating jobs.'],
  ['in the long run', '从长远来看', '社会发展', 'Investing in education benefits society in the long run.'],
  ['bridge the gap between', '弥合…之间的差距', '社会发展', 'Policies should bridge the gap between rich and poor.'],
  ['keep up with the times', '与时俱进', '社会发展', 'Traditional industries must keep up with the times.'],
  ['a double win', '双赢', '社会发展', 'This cooperation is a double win for both sides.'],
  ['meet the demands of', '满足…的需求', '社会发展', 'Education must meet the demands of a changing job market.'],
  ['far-reaching impact', '深远影响', '社会发展', 'The reform will have a far-reaching impact on society.'],
  ['transform the landscape of', '改变…的面貌', '社会发展', 'Technology has transformed the landscape of modern education.'],
  // 文化交流
  ['attach great importance to', '高度重视', '文化交流', 'We should attach great importance to cultural heritage.'],
  ['be exposed to', '接触；暴露于', '文化交流', 'Students should be exposed to diverse cultures.'],
  ['preserve cultural heritage', '保护文化遗产', '文化交流', 'Governments must preserve cultural heritage.'],
  ['promote cultural exchange', '促进文化交流', '文化交流', 'Exchange programs promote cultural understanding.'],
  ['a symbol of', '…的象征', '文化交流', 'The Great Wall is a symbol of Chinese civilization.'],
  ['take pride in', '以…为傲', '文化交流', 'People take pride in their cultural traditions.'],
  ['blend ... with ...', '把…与…融合', '文化交流', 'Modern architecture blends tradition with innovation.'],
  ['gain insight into', '深入了解；洞察', '文化交流', 'Travel allows us to gain insight into different cultures.'],
  // 职场沟通
  ['strike a balance between', '在…之间取得平衡', '职场沟通', 'It is essential to strike a balance between work and rest.'],
  ['take responsibility for', '对…负责', '职场沟通', 'A good leader takes responsibility for decisions.'],
  ['come up with', '提出；想出', '职场沟通', 'The team came up with a practical solution.'],
  ['be committed to', '致力于；承诺', '职场沟通', 'She is committed to improving team efficiency.'],
  ['meet deadlines', '按时完成', '职场沟通', 'Good professionals always meet their deadlines.'],
  ['work ethic', '职业道德', '职场沟通', 'A strong work ethic is valued by employers.'],
  ['climb the career ladder', '攀登职业阶梯', '职场沟通', 'Continuous learning helps you climb the career ladder.'],
  ['reach a consensus', '达成共识', '职场沟通', 'After long discussions, they reached a consensus.'],
  // 健康生活
  ['mental well-being', '心理健康', '健康生活', 'Mental well-being deserves as much attention as physical health.'],
  ['cope with stress', '应对压力', '健康生活', 'Exercise helps people cope with stress.'],
  ['lead a healthy lifestyle', '过健康的生活方式', '健康生活', 'A balanced diet helps lead a healthy lifestyle.'],
  ['physical and mental health', '身心健康', '健康生活', 'We should pay attention to both physical and mental health.'],
  ['relieve pressure', '缓解压力', '健康生活', 'Hobbies can relieve pressure from work.'],
  ['build up one\'s body', '增强体质', '健康生活', 'Regular exercise builds up the body.'],
  // 图表写作
  ['account for', '解释；占（比例）', '图表写作', 'Online sales account for nearly half of revenue.'],
  ['a wide range of', '广泛的；各种各样的', '图表写作', 'The survey covers a wide range of preferences.'],
  ['there is a growing tendency that', '有一种日益增长的趋势', '图表写作', 'There is a growing tendency that people work remotely.'],
  ['compared with', '与…相比', '图表写作', 'Compared with last year, sales increased by 20%.'],
  ['rank first among', '在…中排名第一', '图表写作', 'This brand ranks first among young consumers.'],
  ['constitute the majority of', '占…的大多数', '图表写作', 'Women constitute the majority of nursing staff.'],
  ['show a sharp increase', '急剧上升', '图表写作', 'The chart shows a sharp increase in online shopping.'],
  ['remain stable at', '稳定在…', '图表写作', 'The unemployment rate remained stable at 5%.'],
  // 通用表达
  ['from my perspective', '在我看来', '通用表达', 'From my perspective, education is the best investment.'],
  ['it is widely acknowledged that', '人们普遍认为', '通用表达', 'It is widely acknowledged that knowledge is power.'],
  ['play an indispensable role in', '在…中扮演不可或缺的角色', '通用表达', 'Teachers play an indispensable role in education.'],
  ['contribute to', '有助于；促成', '通用表达', 'Regular reading contributes to personal growth.'],
  ['give priority to', '优先考虑', '通用表达', 'We should give priority to environmental protection.'],
  ['make a difference', '产生影响；起作用', '通用表达', 'Small actions can make a big difference.'],
  ['a variety of', '各种各样的', '通用表达', 'The university offers a variety of courses.'],
  ['be worthy of', '值得', '通用表达', 'This issue is worthy of public attention.'],
  ['take ... into account', '把…考虑在内', '通用表达', 'We must take all factors into account.'],
  ['as far as I am concerned', '就我而言', '通用表达', 'As far as I am concerned, teamwork is essential.'],
  ['draw a conclusion', '得出结论', '通用表达', 'We can draw a conclusion from the data.'],
  ['in terms of', '在…方面；就…而言', '通用表达', 'In terms of cost, this plan is more feasible.'],
  ['on behalf of', '代表', '通用表达', 'I am speaking on behalf of the whole team.'],
  ['be supposed to', '应该；被期望', '通用表达', 'Students are supposed to hand in homework on time.'],
  ['in accordance with', '按照；与…一致', '通用表达', 'The project was carried out in accordance with the plan.'],
  ['have a profound influence on', '对…有深远影响', '通用表达', 'Teachers have a profound influence on students.'],
  ['be closely related to', '与…密切相关', '通用表达', 'Health is closely related to lifestyle.'],
  ['nothing is more important than', '没有什么比…更重要', '通用表达', 'Nothing is more important than perseverance.'],
  ['the key to success', '成功的关键', '通用表达', 'Hard work is the key to success.'],
  ['only in this way can we', '只有这样我们才能', '通用表达', 'Only in this way can we solve the problem.'],
  ['undertake the responsibility to', '承担起…的责任', '通用表达', 'Everyone should undertake the responsibility to protect the environment.'],
  ['enhance one\'s ability', '提高能力', '通用表达', 'Practice enhances one\'s ability to communicate.'],
  ['be beneficial to', '对…有益', '公共表达', 'Reading is beneficial to both mind and soul.'],
  ['reflect on', '反思', '通用表达', 'We should reflect on our past mistakes.'],
  ['take the initiative to', '主动去…', '通用表达', 'She took the initiative to organize the event.'],
  ['give rise to', '引起；导致', '通用表达', 'Rapid urbanization has given rise to many challenges.'],
  ['cope with', '应对；处理', '通用表达', 'We must learn to cope with pressure.'],
  ['be confronted with', '面临；面对', '通用表达', 'Young people are confronted with fierce competition.'],
  ['hold the belief that', '相信；认为', '通用表达', 'I hold the belief that honesty is the best policy.'],
  ['set an example for', '为…树立榜样', '通用表达', 'Lei Feng set an example for all of us.'],
  ['make every effort to', '竭尽全力', '通用表达', 'We should make every effort to achieve our goals.'],
  ['in the face of', '面对', '通用表达', 'In the face of difficulties, we must stay calm.'],
  ['bear in mind that', '牢记', '通用表达', 'Bear in mind that practice makes perfect.'],
  ['have a positive attitude towards', '对…持积极态度', '通用表达', 'We should have a positive attitude towards life.'],
  ['keep in touch with', '保持联系', '通用表达', 'Keep in touch with old friends.'],
  ['make up one\'s mind to', '下定决心', '通用表达', 'He made up his mind to study abroad.'],
  ['be based on', '基于', '通用表达', 'The theory is based on years of research.'],
  ['result in', '导致', '通用表达', 'Lack of sleep can result in poor performance.'],
  ['be attributed to', '归因于', '通用表达', 'The success can be attributed to teamwork.'],
  ['for the sake of', '为了…的缘故', '通用表达', 'For the sake of health, quit smoking.'],
  ['take advantage of', '利用', '通用表达', 'Take advantage of every learning opportunity.']
];

// ─── 3. 翻译 & 作文 (SQLite) ────────────────────────────────────────────────
function extractFromDB() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  // 翻译题 — 含六级(主)和四级(辅助练习)
  const trRows = db.prepare(`
    SELECT q.id, q.uid, q.paper_key, q.stem, q.analysis_text, p.year, p.month, p.set_no, p.exam_type
    FROM questions q JOIN papers p ON q.paper_id = p.id
    WHERE q.section = 'translation' AND q.analysis_text IS NOT NULL AND q.analysis_text != ''
      AND p.exam_type IN ('cet6', 'cet4')
    ORDER BY p.exam_type DESC, p.year DESC, p.month DESC, p.set_no
  `).all();

  const translations = [];
  for (const row of trRows) {
    const stem = row.stem || '';
    // 提取中文原文（去掉 Directions 引导语）
    const source = stem
      .replace(/^Directions:\s*For this part,[^\n]*?(?=[\u4e00-\u9fff])/s, '')
      .replace(/^Directions:[^\n]*\n?/m, '')
      .replace(/^For this part[^\n]*\n?/m, '')
      .trim();
    if (!source) continue;

    const analysis = row.analysis_text || '';
    // 提取参考译文: "参考译文" 之后的英译正文（跳过中文说明文字）
    let reference = '';
    const refMatch = analysis.match(/参考译文[\s\S]*?\n([\s\S]*?)(?:\n【衔接】|\n逐句解析|\n【主旨】|\n英语六级|\n英语四级)/);
    if (refMatch) {
      // 去掉 "整篇参考英译是复盘资产…" 等中文说明前缀，取英译正文
      let raw = refMatch[1].trim();
      raw = raw.replace(/^整篇参考英译[^\n]*\n?/m, '');
      // 英译正文从第一个以大写英文字母开头的段落开始
      const enStart = raw.search(/\n[A-Z][a-z]/);
      if (enStart > 0 && enStart < 300) raw = raw.slice(enStart + 1).trim();
      else if (/^[A-Z]/.test(raw) === false) {
        const inline = raw.match(/([A-Z][a-z][\s\S]{50,})/);
        if (inline) raw = inline[1].trim();
      }
      reference = raw;
    }

    // 提取逐句译文和语法要点
    const points = [];
    for (const m of analysis.matchAll(/【译文】([^\n]+)/g)) {
      if (points.length < 8) points.push(m[1].trim());
    }
    for (const m of analysis.matchAll(/【(?:语法|译法|搭配|主干)】([^\n]+)/g)) {
      const text = m[1].trim();
      if (text.length > 5 && points.length < 10) points.push(text);
    }

    if (reference && reference.length > 30) {
      translations.push({
        // 稳定 ID：源 q.uid（122/122 唯一），重新生成/新增真题不再错位
        id: 't' + sanitizeId(row.uid),
        year: row.year,
        month: row.month,
        setNo: row.set_no,
        paperKey: row.paper_key,
        examType: row.exam_type,
        direction: 'zh-en',
        source: source,
        reference: reference,
        points: points.slice(0, 8),
        analysis: analysis.length > 3000 ? analysis.slice(0, 3000) + '…' : analysis
      });
    }
  }

  // 作文题 — 含六级(主)和四级(辅助练习)
  const wrRows = db.prepare(`
    SELECT q.id, q.uid, q.paper_key, q.stem, q.analysis_text, p.year, p.month, p.set_no, p.exam_type
    FROM questions q JOIN papers p ON q.paper_id = p.id
    WHERE q.section = 'writing' AND q.stem IS NOT NULL AND q.stem != ''
      AND p.exam_type IN ('cet6', 'cet4')
    ORDER BY p.exam_type DESC, p.year DESC, p.month DESC, p.set_no
  `).all();

  const writingPrompts = [];
  const CAT_KEYWORDS = [
    ['观点论证', ['opinion', 'agree', 'disagree', 'argue', 'believe', 'view', 'comment', 'perspective', 'whether', 'should', 'important', 'essential', 'necessary']],
    ['现象分析', ['phenomenon', 'trend', 'increasing', 'growing', 'recent', 'nowadays', 'more and more', 'rising', 'popular', 'common', 'awareness', 'attention']],
    ['问题解决', ['problem', 'issue', 'challenge', 'solve', 'address', 'measure', 'solution', 'how to', 'prevent', 'overcome', 'deal with', 'cope']],
    ['引言评论', ['saying', 'proverb', 'quote', 'remark', 'saying goes', 'as the', 'knowledge', 'treasure', 'practice', 'key']],
    ['图表/书信', ['chart', 'graph', 'picture', 'letter', 'write to', 'recommend', 'suggest', 'invitation', 'complaint']]
  ];

  for (const row of wrRows) {
    // 剥离 Directions 引导语，保留完整题目要求
    let prompt = (row.stem || '').trim();
    // 常见开头: "Directions: For this part, you are allowed 30 minutes to write ..."
    prompt = prompt.replace(/^Directions:\s*For this part,\s*you are allowed \d+ minutes to\s*/i, '');
    prompt = prompt.replace(/^Directions:\s*/i, '').trim();
    if (!prompt) continue;

    const lower = prompt.toLowerCase();
    let category = '观点论证';
    let maxScore = 0;
    for (const [cat, kws] of CAT_KEYWORDS) {
      const score = kws.filter(k => lower.includes(k)).length;
      if (score > maxScore) { maxScore = score; category = cat; }
    }
    const analysis = row.analysis_text || '';
    const structurePoints = [];
    for (const m of analysis.matchAll(/(?:本段落实了|完成了)[^\n]{10,80}/g)) {
      if (structurePoints.length < 5) structurePoints.push(m[0].trim());
    }
    writingPrompts.push({
      // 稳定 ID：源 q.uid（122/122 唯一）
      id: 'p' + sanitizeId(row.uid),
      year: row.year,
      month: row.month,
      setNo: row.set_no,
      paperKey: row.paper_key,
      examType: row.exam_type,
      category,
      prompt: prompt,
      analysis: analysis.length > 2500 ? analysis.slice(0, 2500) + '…' : analysis,
      structurePoints
    });
  }

  db.close();
  return { translations, writingPrompts };
}

// ─── 4. 作文模板（精选结构框架）─────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'e001', category: '观点论证', title: '双边观点选择型', description: '适合"有人认为…另一些人认为…"题型，结构清晰、立场明确。', tags: ['四段式', '高频'],
    content: `When it comes to [讨论主题], people's opinions vary considerably. Some argue that [观点一], while others believe that [观点二].\n\nThose who support the former view maintain that [理由一]. Moreover, they claim that [补充理由]. By contrast, advocates of the latter view emphasize that [理由二], which may enable people to [积极结果].\n\nFrom my perspective, [个人立场] is a more sensible choice. The primary reason is that [核心论据]. In addition, [进一步论证].\n\nIn conclusion, although both views have their merits, I firmly believe that [重申立场]. Only in this way can we [展望或建议].`
  },
  {
    id: 'e002', category: '观点论证', title: '单边观点论证型', description: '适合"某事物很重要/应该做某事"类题目，层层递进展开论证。', tags: ['四段式', '万能'],
    content: `Nowadays, [话题] has attracted widespread attention. Some people tend to [错误做法/观点], but I firmly believe that [正确立场].\n\nFirst and foremost, [理由一]. A good example is [举例说明]. Furthermore, [理由二]. As a survey conducted by [权威机构] reveals, [数据或事实支撑].\n\nAdmittedly, [让步承认对方合理之处]. Nevertheless, this does not mean that [反驳]. On the contrary, [进一步论证].\n\nTo sum up, [重申论点]. It is high time that we [号召行动].`
  },
  {
    id: 'e003', category: '现象分析', title: '现象描述+原因分析型', description: '适合"近年来…现象日益普遍"类题目，分析原因并给出评价。', tags: ['四段式', '高频'],
    content: `In recent years, [描述现象] has become increasingly common. This trend has sparked a heated debate among the public.\n\nA number of factors can account for this phenomenon. To begin with, [原因一]. In addition, [原因二]. Last but not least, [原因三].\n\nThis development is a double-edged sword. On the one hand, [积极影响]. On the other hand, [消极影响/隐患].\n\nIn my view, we should take a rational attitude towards this trend. [建议一] and [建议二] are both essential to ensure that [期望结果].`
  },
  {
    id: 'e004', category: '问题解决', title: '问题+对策型', description: '适合"如何解决某问题"类题目，问题描述→危害→对策→总结。', tags: ['四段式', '对策'],
    content: `Nowadays, [问题描述] has become a serious concern. If left unaddressed, it may lead to [严重后果].\n\nSeveral factors contribute to this problem. Firstly, [原因一]. Secondly, [原因二]. Moreover, [原因三] makes the situation even worse.\n\nTo tackle this issue, effective measures must be taken. On the one hand, the government should [政府对策]. On the other hand, individuals ought to [个人对策]. Only through joint efforts can we [目标].\n\nIn conclusion, [总结]. As the saying goes, "[谚语或名言]." Let us take action now.`
  },
  {
    id: 'e005', category: '引言评论', title: '名言警句评论型', description: '适合"引用名言让你评论"类题目，解释→论证→联系现实。', tags: ['四段式', '经典'],
    content: `The famous saying "[名言]" conveys a profound truth: [核心含义]. Simple as it may sound, this saying offers valuable guidance for our daily life.\n\nA case in point is [举例一]. Moreover, [举例二或深化论证]. These examples fully illustrate that [呼应名言].\n\nHowever, some people may argue that [反方观点]. In fact, [反驳]. Without [名言中的要素], we can hardly [积极结果].\n\nIn conclusion, I believe that [重申]. Let us bear this in mind and [行动号召].`
  },
  {
    id: 'e006', category: '现象分析', title: '图表描述型', description: '适合图表作文：描述趋势→分析原因→预测/建议。', tags: ['三段式', '图表'],
    content: `As is clearly shown in the chart, [描述图表主要内容]. Specifically, [数据细节一]. Meanwhile, [数据细节二].\n\nSeveral reasons may account for this change. For one thing, [原因一]. For another, [原因二]. In addition, [原因三] also plays a role.\n\nBased on the analysis above, I believe that this trend will [预测未来走势]. Therefore, it is advisable to [建议].`
  },
  {
    id: 'e007', category: '书信应用', title: '建议信/推荐信', description: '适合书信类作文：写信目的→具体建议/推荐→期望回复。', tags: ['书信', '应用'],
    content: `Dear [称呼],\n\nI am writing to [写信目的：make some suggestions / recommend...]. I hope you will find the following advice helpful.\n\nTo begin with, [建议/推荐一]. In addition, [建议/推荐二]. Last but not least, [建议/推荐三]. These will surely [预期效果].\n\nI would appreciate it if you could take my suggestions into consideration. Looking forward to your reply.\n\nYours sincerely,\n[署名]`
  },
  {
    id: 'e008', category: '观点论证', title: '利弊分析型', description: '适合"某事物的利与弊"类题目，客观分析后给出立场。', tags: ['四段式', '高频'],
    content: `With the development of [背景], [话题] has become an integral part of our life. Like everything else, it has both favorable and unfavorable aspects.\n\nThe advantages are obvious. To begin with, [优点一]. Furthermore, [优点二]. For example, [举例].\n\nHowever, the disadvantages cannot be ignored. [缺点一]. In addition, [缺点二]. If we are not careful, [潜在风险].\n\nOn the whole, the benefits outweigh the drawbacks. We should [正确做法] while [规避缺点]. Only in this way can we make the most of [话题].`
  },
  {
    id: 'e009', category: '问题解决', title: '选择型（A or B）', description: '适合"你更倾向A还是B"类题目，比较两者后明确选择。', tags: ['四段式', '选择'],
    content: `When faced with the choice between [选项A] and [选项B], different people may make different decisions. Some prefer [选项A], while others tend to [选项B].\n\n[选项A] has its own merits. For instance, [理由一]. However, [局限性]. By contrast, [选项B] offers [优势]. It allows people to [积极结果].\n\nPersonally, I would choose [你的选择]. The reason is simple: [核心理由]. Moreover, [补充理由].\n\nIn conclusion, whether to choose [选项A] or [选项B] depends on individual circumstances. But for me, [你的选择] is clearly the better option.`
  },
  {
    id: 'e010', category: '现象分析', title: '重要性/必要性论证', description: '适合"为什么X很重要"类题目，正面论证+反面假设。', tags: ['三段式', '高频'],
    content: `In contemporary society, [主题] plays an indispensable role in [领域]. Without it, [反面假设/后果].\n\nThe importance of [主题] can be illustrated from several perspectives. First, [角度一]. Second, [角度二]. A convincing example is [实例].\n\nIn conclusion, [主题] is not a luxury but a necessity. We should [行动建议] so that [积极愿景].`
  }
];

// ─── 旧数据迁移映射（顺序 ID → 稳定 ID） ─────────────────────────────────────
function loadOldData() {
  const vm = require('vm');
  const out = {};
  for (const [file, name] of [
    ['words.js', 'CET6_WORDS'], ['phrases.js', 'CET6_PHRASES'],
    ['translations.js', 'CET6_TRANSLATIONS'], ['writing.js', 'CET6_WRITING']
  ]) {
    const fp = path.join(OUT_DIR, file);
    out[name] = null;
    if (!fs.existsSync(fp)) continue;
    try {
      const ctx = { window: {} };
      vm.createContext(ctx);
      vm.runInContext(fs.readFileSync(fp, 'utf8'), ctx);
      if (Array.isArray(ctx.window[name])) out[name] = ctx.window[name];
    } catch (e) { /* 旧文件不可读 → 跳过映射 */ }
  }
  return out;
}

function buildIdMap(oldData, newWords, newPhrases, newTranslations, newWriting) {
  const map = { words: {}, phrases: {}, translations: {}, writing: {} };

  // 词：按位置 + 内容校验（word/unit 一致才映射，源已变化时宁可不映射也不错挂）
  const oldWords = oldData.CET6_WORDS;
  if (Array.isArray(oldWords)) {
    const n = Math.min(oldWords.length, newWords.length);
    for (let i = 0; i < n; i++) {
      if (oldWords[i].id === newWords[i].id) continue; // 已是稳定 ID
      if (oldWords[i].word === newWords[i].word && oldWords[i].unit === newWords[i].unit) {
        map.words[oldWords[i].id] = newWords[i].id;
      }
    }
  }

  // 短语：按规范化文本映射（与顺序无关）
  const oldPhrases = oldData.CET6_PHRASES;
  if (Array.isArray(oldPhrases)) {
    const newByPhrase = new Map(newPhrases.map(p => [String(p.phrase).toLowerCase().trim(), p.id]));
    for (const p of oldPhrases) {
      const nid = newByPhrase.get(String(p.phrase).toLowerCase().trim());
      if (nid && nid !== p.id) map.phrases[p.id] = nid;
    }
  }

  // 翻译/作文：按 (examType, paperKey) 映射（各 122/122 唯一）
  const byKey = (rows) => new Map(rows.map(r => [r.examType + '|' + r.paperKey, r.id]));
  const oldTrans = oldData.CET6_TRANSLATIONS;
  if (Array.isArray(oldTrans)) {
    const newKeys = byKey(newTranslations);
    for (const t of oldTrans) {
      const nid = newKeys.get(t.examType + '|' + t.paperKey);
      if (nid && nid !== t.id) map.translations[t.id] = nid;
    }
  }
  const oldWriting = oldData.CET6_WRITING;
  if (Array.isArray(oldWriting)) {
    const newKeys = byKey(newWriting);
    for (const w of oldWriting) {
      const nid = newKeys.get(w.examType + '|' + w.paperKey);
      if (nid && nid !== w.id) map.writing[w.id] = nid;
    }
  }
  return map;
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('📦 开始提取六级学习数据…\n');

  // 1. 词汇 & 原始短语
  console.log('▸ 词汇 & 短语 (六级.jsonl)');
  const { words, rawPhrases } = await extractWords();
  console.log(`  词条: ${words.length}`);

  // 2. 构建短语库：精选短语 + 原始搭配按频率过滤
  console.log('▸ 构建短语库');
  const phraseMap = new Map();
  const usedPhraseIds = new Set();
  const nextPhraseId = (phrase) => {
    let id = 'ph' + phraseHash(phrase);
    let n = 2;
    while (usedPhraseIds.has(id)) id = 'ph' + phraseHash(phrase) + '-' + n++;
    usedPhraseIds.add(id);
    return id;
  };
  // 精选短语优先
  for (const [phrase, meaning, category, example] of CURATED_PHRASES) {
    const key = phrase.toLowerCase().trim();
    if (!phraseMap.has(key)) {
      phraseMap.set(key, {
        id: nextPhraseId(phrase),
        phrase, meaning, category, example: example || '', source: 'curated'
      });
    }
  }
  // 原始搭配去重后加入（同名短语取精选版）
  let added = 0;
  for (const rp of rawPhrases) {
    const key = rp.phrase.toLowerCase().trim();
    if (!phraseMap.has(key) && rp.phrase.length > 1) {
      phraseMap.set(key, {
        id: nextPhraseId(rp.phrase),
        phrase: rp.phrase,
        meaning: rp.meaning,
        category: classifyPhrase(rp.phrase, rp.meaning, rp.source),
        example: '',
        source: rp.source
      });
      added++;
    }
  }
  const phrases = Array.from(phraseMap.values());
  console.log(`  短语: ${phrases.length} (精选 ${CURATED_PHRASES.length} + 搭配 ${added})`);

  // 3. 真题
  console.log('▸ 真题 (cet6.db)');
  const { translations, writingPrompts } = extractFromDB();
  console.log(`  翻译: ${translations.length}, 作文: ${writingPrompts.length}`);

  // 4. 生成旧 ID → 稳定 ID 迁移映射（必须在覆盖 data/*.js 之前读取旧文件）
  console.log('▸ 生成 ID 迁移映射');
  const oldData = loadOldData();
  const idMap = buildIdMap(oldData, words, phrases, translations, writingPrompts);
  const mapCount = Object.keys(idMap.words).length + Object.keys(idMap.phrases).length
    + Object.keys(idMap.translations).length + Object.keys(idMap.writing).length;
  console.log(`  映射条目: ${mapCount}`);

  // 5. 写出
  console.log('\n▸ 生成数据文件');
  writeJS('words.js', 'CET6_WORDS', words);
  writeJS('phrases.js', 'CET6_PHRASES', phrases);
  writeJS('translations.js', 'CET6_TRANSLATIONS', translations);
  writeJS('templates.js', 'CET6_TEMPLATES', TEMPLATES);
  writeJS('writing.js', 'CET6_WRITING', writingPrompts);
  writeJS('idmap.js', 'CET6_IDMAP', idMap);

  console.log('\n✅ 数据提取完成');
}

main().catch(err => { console.error('❌ 提取失败:', err); process.exit(1); });
