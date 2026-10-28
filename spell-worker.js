/* Correcteur orthographique libre : nspell (MIT) + dictionnaire français Dicollecte (MPL 2.0) */
importScripts('nspell.js');
let sp = null;
const cache = new Map();
const WORD = /[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*/gu;
const SKIP = /\b(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.]+/g;
const ELISION = /^(c|d|j|l|m|n|s|t|qu|jusqu|lorsqu|puisqu|quoiqu|presqu)(['’])(.+)$/i;

function ok(w){
  if (sp.correct(w)) return true;
  const alt = w.includes('’') ? w.replace(/’/g, "'") : w.replace(/'/g, '’');
  if (alt !== w && sp.correct(alt)) return true;
  const el = w.match(ELISION);
  if (el && ok(el[3])) return true;
  if (w.includes('-')) return w.split('-').every(p => p.length < 2 || ok(p));
  return false;
}
function suggest(w){
  if (cache.has(w)) return cache.get(w);
  let out = null;
  const el = w.match(ELISION);
  if (el){ const s = suggest(el[3]); out = s ? el[1] + el[2] + s : null; }
  else if (w.length <= 24){
    const s = sp.suggest(w);
    if (s.length) out = s[0];
  }
  cache.set(w, out);
  return out;
}
function atSentenceStart(text, i){
  for (let k = i - 1; k >= 0; k--){
    const c = text[k];
    if (/[\s«»"“”(\[—–•-]/u.test(c)) { if (c === '\n' || c === '\t') return true; continue; }
    return /[.!?…:]/.test(c);
  }
  return true;
}
function checkText(text){
  const blocked = [];
  for (const m of text.matchAll(SKIP)) blocked.push([m.index, m.index + m[0].length]);
  let out = '', last = 0;
  const fixes = [];
  for (const m of text.matchAll(WORD)){
    const w = m[0], i = m.index;
    if (w.length < 2) continue;
    if (blocked.some(([a, b]) => i >= a && i < b)) continue;
    if (/[\p{N}_]/u.test(text.slice(Math.max(0, i - 1), i + w.length + 1))) continue;
    const bare = w.replace(/[-'’]/g, '');
    if (/^\p{Lu}{2,}$/u.test(bare)) continue;            // sigles
    if (/\p{Lu}/u.test(bare.slice(1))) continue;          // casse mixte (noms de marques, codes)
    if (/^\p{Lu}/u.test(w) && !atSentenceStart(text, i)) continue; // noms propres
    if (ok(w)) continue;
    const s = suggest(w);
    if (!s || s === w) continue;
    out += text.slice(last, i) + s; last = i + w.length;
    fixes.push({ avant:w, apres:s });
  }
  return { text: out + text.slice(last), fixes };
}

self.onmessage = async e => {
  const msg = e.data;
  if (msg.type === 'init'){
    try {
      const [aff, dic] = await Promise.all([fetch(msg.aff).then(r => r.text()), fetch(msg.dic).then(r => r.text())]);
      sp = self.NSpell({ aff, dic });
      self.postMessage({ type:'ready' });
    } catch (err){ self.postMessage({ type:'error', message:String(err && err.message || err) }); }
    return;
  }
  if (msg.type === 'check'){
    const results = msg.items.map(it => { const r = checkText(it.text); return { id:it.id, text:r.text, fixes:r.fixes }; });
    self.postMessage({ type:'result', seq:msg.seq, results });
  }
};
