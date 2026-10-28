/* Correcteur orthographique libre : nspell (MIT) + dictionnaire français Dicollecte (MPL 2.0) */
importScripts('nspell.js');
let sp = null;
/* Lexique du métier (militaria, ventes aux enchères) et mots étrangers fréquents, acceptés tels quels */
const LEXIQUE = `litzens litzen nuquière nuquières troddel léchure léchures sanglon sanglons brelage brelages tombô monogrammé monogrammée
monogrammés monogrammées bouclerie badois badoise badoises hessois hessoise hessoises tornister ricasso rebronzé rebronzée diam fab regt
feldgrau leutnant tinnie pounder ordnance insolé insolée insolés insolées entoilé entoilée entoilés entoilées repercé repercée
porte-plumet cannetille soutache soutaches garance cachou galuchat maillechort basane basanes quillon fusée shako shakos képi képis
zu für von aus dem der die das des und mit im am vom zum bei nach einer eines deutsche deutscher deutsches battle dress group medal
jubilee squadron sergeant korps the of and for with army`.split(/\s+/);
const cache = new Map();
const WORD = /[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*/gu;
const SKIP = /\b(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.]+/g;
const QUOTED = /"[^"\n]{1,200}"|“[^”\n]{1,200}”|«[^»\n]{1,200}»/g;
const strip = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
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
    const lower = w === w.toLowerCase();
    const list = sp.suggest(w).filter(s => !lower || s === s.toLowerCase());
    const same = list.find(s => strip(s) === strip(w));             // même mot, accent corrigé
    const first = strip(w)[0];
    out = same || list.find(s => strip(s)[0] === first) || null;     // sinon, même première lettre
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
  for (const m of text.matchAll(QUOTED)) blocked.push([m.index, m.index + m[0].length]);
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
    if (/^\p{Lu}/u.test(w)) continue;                     // noms propres, débuts de phrase, intitulés
    if (w.length <= 4 && /[.:]/.test(text[i + w.length] || '')) continue; // abréviations (imp., fab., env., diam:)
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
      LEXIQUE.forEach(w => w && sp.add(w));
      self.postMessage({ type:'ready' });
    } catch (err){ self.postMessage({ type:'error', message:String(err && err.message || err) }); }
    return;
  }
  if (msg.type === 'check'){
    const results = msg.items.map(it => { const r = checkText(it.text); return { id:it.id, text:r.text, fixes:r.fixes }; });
    self.postMessage({ type:'result', seq:msg.seq, results });
  }
};
