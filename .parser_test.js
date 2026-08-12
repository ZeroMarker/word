// Temporary parser coverage test — not part of the app.
const fs = require('fs');
const text = fs.readFileSync('word-list.txt', 'utf8');
const lines = text.replace(/\r/g, '').split('\n');
const lists = [];
let cur = null;
let parsed = 0, unparsed = 0;
const unparsedLines = [];

const pp = String.raw`(?:\/[^/]+\/|\[[^\]]+\]|\{[^}]+\})`;
const posp = String.raw`(?:n|v|vt|vi|a|ad|adv|prep|conj|pron|num|excl|int)`;
const rePhonetic = new RegExp('^(.+?)\\s+(' + pp + '(?:\\s*;\\s*' + pp + ')*)\\s+(.+)$');
const reBracket = new RegExp('^(.+?)\\s+([/\\[{].*?)\\s+(' + posp + '\\..*)$', 'i');
const rePhrase = new RegExp(
  '^([A-Za-z][A-Za-z0-9\\s\'’\\-/&.*]*?)\\s+((?:' + posp + '\\.\\s*)?)([\\u4e00-\\u9fff].+)$'
);

for (let line of lines) {
  line = line.trim();
  const um = line.match(/^Word List\s*0?(\d+)/i);
  if (um) { if (cur) lists.push(cur); cur = { words: [] }; continue; }
  if (!cur || !line) continue;
  const m = line.match(rePhonetic) || line.match(reBracket) || line.match(rePhrase);
  if (m) { cur.words.push(m[1].replace(/\*$/, '')); parsed++; }
  else { unparsed++; if (unparsedLines.length < 25) unparsedLines.push(line); }
}
if (cur) lists.push(cur);
console.log('units:', lists.length, 'parsed:', parsed, 'unparsed:', unparsed);
unparsedLines.forEach(l => console.log('  MISS:', JSON.stringify(l)));
const multiword = lists.flatMap(l => l.words).filter(w => w.includes(' '));
console.log('multi-word entries now parsed:', multiword.length);
console.log(multiword.join(' | '));
