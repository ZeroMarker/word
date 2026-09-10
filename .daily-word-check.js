// 校验 daily-word/index.html：提取内联 JS，做语法检查 + 数据结构检查
const fs = require('fs');
const html = fs.readFileSync('daily-word/index.html', 'utf8');

const scripts = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scripts) {
  console.error('NO SCRIPT FOUND');
  process.exit(1);
}
const src = scripts[1];

// 1) 纯语法检查（不执行）
try {
  new Function(src);
  console.log('OK: 语法检查通过');
} catch (e) {
  console.error('FAIL: 语法错误 ->', e.message);
  process.exit(1);
}

// 2) 提取 SEEDS 数据并检查完整性
const dataStart = src.search(/const SEEDS\s*=\s*\{/);
if (dataStart < 0) {
  console.error('FAIL: 找不到 SEEDS 数据块');
  process.exit(1);
}
// 数据块结束：日期与选词逻辑注释之前
const dataEnd = src.indexOf('// ================================================\n        // 日期与选词逻辑', dataStart);

let SEEDS;
try {
  SEEDS = eval('(' + src.slice(dataStart + 'const SEEDS = '.length, dataEnd) + ')');
} catch (e) {
  console.error('FAIL: SEEDS 解析失败 ->', e.message);
  process.exit(1);
}

let errors = [];
let counts = { n: 0, v: 0, a: 0 };

for (const pos of ['n', 'v', 'a']) {
  const arr = SEEDS[pos] || [];
  counts[pos] = arr.length;
  arr.forEach((seed, i) => {
    const tag = `[${pos} #${i} ${seed.w}]`;
    for (const k of ['w', 'p', 'z', 'rel', 's', 'a', 'e']) {
      if (seed[k] === undefined) errors.push(tag + ` 缺字段 ${k}`);
    }
    if (seed.e && (!Array.isArray(seed.e) || seed.e.length !== 2)) errors.push(tag + ' e 应为 [en,zh]');
    if (seed.rel) {
      if (!Array.isArray(seed.rel) || seed.rel.length < 4) errors.push(tag + ' rel 少于 4 个');
      seed.rel.forEach((f, j) => {
        if (!Array.isArray(f) || f.length !== 2 || !f[0] || !f[1]) errors.push(tag + ` rel[${j}] 格式错误`);
      });
      const ws = seed.rel.map(f => f[0].toLowerCase());
      if (new Set(ws).size !== ws.length) errors.push(tag + ' rel 内有重复单词');
      // 不允许出现"变性"词（核心词的 -tion/-ive/-ly 等派生形式）直接作为发散词
      const stem = seed.w.toLowerCase();
      seed.rel.forEach(f => {
        const r = f[0].toLowerCase();
        const derived = r.length > stem.length && stem.length >= 4 && r.startsWith(stem);
        if (derived) errors.push(tag + ` rel 含词缀派生词 "${f[0]}"（应改为同词性独立单词）`);
      });
    }
  });
}

console.log('词库统计: 名词 ' + counts.n + ' / 动词 ' + counts.v + ' / 形容词 ' + counts.a);

// 3) 日期轮换逻辑抽测（复制核心算法）
function pad2(x) { return String(x).padStart(2, '0'); }
function dayNumber(d) { return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000); }
const POS_ORDER = ['n', 'v', 'a'];
function wordFor(d) {
  const dn = dayNumber(d);
  const pos = POS_ORDER[((dn % 3) + 3) % 3];
  const idx = Math.floor(Math.max(dn, 0) / 3) % SEEDS[pos].length;
  return { pos, idx, word: SEEDS[pos][idx].w };
}
const today = new Date();
console.log('今天:', wordFor(today), '→ 发散词:', SEEDS[wordFor(today).pos][wordFor(today).idx].rel.map(x => x[0]).join(', '));
for (let i = 1; i <= 6; i++) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
  const w = wordFor(d);
  console.log('+' + i + '天:', w.pos, w.word);
}

if (errors.length) {
  console.error('FAIL: ' + errors.length + ' 个数据问题');
  errors.slice(0, 30).forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('OK: 数据完整性检查通过');