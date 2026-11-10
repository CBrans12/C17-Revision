/* C-17 Revision — app shell.
   All UI is rendered here; every interaction goes through one delegated
   listener so a missing element can never break a render pass. */
'use strict';

/* ---------------- storage ---------------- */
const KEY = 'c17rev:v1';
let S = { know: {}, docs: {}, tests: [], lastRoute: '' };
const mem = {};
let saveState = 'memory';

function lsGet(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
function lsSet(v){ try { localStorage.setItem(KEY, v); return true; } catch(e){ return false; } }
function lsWorks(){
  try { const t = KEY+':p'; localStorage.setItem(t,'1'); localStorage.removeItem(t); return true; }
  catch(e){ return false; }
}
function load(){
  const raw = lsGet() ?? mem[KEY] ?? null;
  if (raw) { try { Object.assign(S, JSON.parse(raw)); } catch(e){} }
  saveState = lsWorks() ? 'local' : 'memory';
}
let saveT = null;
function save(){
  clearTimeout(saveT);
  saveT = setTimeout(() => { const v = JSON.stringify(S); mem[KEY] = v; lsSet(v); }, 200);
}

/* ---------------- helpers ---------------- */
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = (a,b) => b ? Math.round(100*a/b) : 0;
const el = s => document.querySelector(s);
function shuffle(a){ a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

const I = {
  home:'<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  sys:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.2 2.2M19.1 4.9l-2.1 2.1M7.1 16.9l-2.2 2.2"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22z"/><path d="M4 17.5A2.5 2.5 0 016.5 15H20"/>',
  quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 015.5 1c0 2-2.7 2.5-2.7 2.5"/><path d="M12 17h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  chart:'<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7"/><rect x="10.2" y="6" width="3.5" height="12"/><rect x="15.5" y="14" width="3.5" height="4"/>',
  gauge:'<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  check:'<path d="M9 11l3 3 7-7"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"/>',
  radio:'<path d="M4 11h16v9H4z"/><circle cx="8.5" cy="15.5" r="2"/><path d="M14 14h4M14 17h4M7 8l10-4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18"/>',
  wave:'<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2 5-1"/><path d="M12 3v3M12 18v3"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
};
const svg = (p, c='') => `<svg viewBox="0 0 24 24" class="${c}">${p}</svg>`;

/* ---------------- content model ---------------- */
const GC = DATA.groundcat, IRE = DATA.iret;
const EXTRA = (typeof EXTRA_DATA !== 'undefined') ? EXTRA_DATA : { topics: [] };
/* Reference manuals. Each file is optional — if it has not been deployed the
   section simply does not appear, which is how CAP 413 is removed for public hosting. */
const REFS = [];
if (typeof CAP413 !== 'undefined') REFS.push(Object.assign({ slug:'cap413', icon:'radio' }, CAP413));
if (typeof NAT007 !== 'undefined') REFS.push(Object.assign({ slug:'nat007', icon:'globe' }, NAT007));
REFS.forEach(r => r.chapters.forEach(c => c.sections.forEach(s => s.items.forEach(it => {
  it.rid = r.slug + ':' + (it.code || it.term || '');
}))));
const refBySlug = s => REFS.find(r => r.slug === s);

/* every revisable item gets a stable id so progress survives rebuilds */
GC.systems.forEach((s,i) => s.items.forEach((it,j) => { it.id = 'g'+i+'.'+j; it.sec = s.name; }));
const LIMS = [];
GC.lims.forEach((g,i) => g[1].forEach(([k,v],j) => LIMS.push({ id:'l'+i+'.'+j, group:g[0], q:k, a:v })));
GC.ekq.forEach(q => q.id = 'q'+q.n);
IRE.parts.forEach(p => p.sections.forEach(s => s.items.forEach(it => it.id = 'o'+it.code)));
IRE.samples.forEach(g => g.qs.forEach(q => q.id = 'x'+g.part+'.'+q.n));
EXTRA.topics.forEach(t => t.items.forEach((it,j) => { it.id = 't'+t.slug+'.'+j; it.sec = t.name; }));

const OBJ_BY_CODE = {};
IRE.parts.forEach(p => p.sections.forEach(s => s.items.forEach(it => OBJ_BY_CODE[it.code] = it)));

/* ---------------- sections ---------------- */
function sysItems(){ return GC.systems.flatMap(s => s.items); }
function ireItems(){ return IRE.parts.flatMap(p => p.sections.flatMap(s => s.items)); }
function extraItems(){ return EXTRA.topics.flatMap(t => t.items); }

const AREAS = [
  { key:'sys',   name:'Aircraft systems', ids:() => sysItems().map(i=>i.id) },
  { key:'lims',  name:'Limitations',      ids:() => LIMS.map(i=>i.id) },
  { key:'ekq',   name:'Ground cat quiz',  ids:() => GC.ekq.map(q=>q.id) },
  { key:'iret',  name:'IR(E)T syllabus',  ids:() => ireItems().map(i=>i.id) },
  { key:'samp',  name:'IR(E)T questions', ids:() => IRE.samples.flatMap(g=>g.qs.map(q=>q.id)) },
  { key:'wider', name:'Wider knowledge',  ids:() => extraItems().map(i=>i.id) },
];
const known = ids => ids.reduce((n,id) => n + (S.know[id] === 1 ? 1 : 0), 0);
function overall(){
  let d=0, t=0;
  AREAS.forEach(a => { const ids=a.ids(); d+=known(ids); t+=ids.length; });
  const dd = Object.values(S.docs).filter(Boolean).length;
  const dt = GC.docs.reduce((n,g)=>n+g[1].length,0);
  return pct(d+dd, t+dt);
}

/* ---------------- routing ---------------- */
const TABS = [
  ['#/',        'Home',    I.home],
  ['#/systems', 'Systems', I.sys],
  ['#/wider',   'Wider',   I.book],
  ['#/quiz',    'Quiz',    I.quiz],
  ['#/search',  'Search',  I.search],
];
function go(route){ location.hash = route; }
function parse(){
  const h = (location.hash || '#/').slice(1);
  return h.split('/').filter(Boolean);
}

/* ---------------- render pieces ---------------- */
function card(o){
  const p = o.total ? pct(o.done, o.total) : null;
  return `<button class="card ${o.cls||''}" data-go="${esc(o.go)}">
    ${o.icon ? `<span class="ic">${svg(o.icon)}</span>` : ''}
    <span class="tx"><b>${esc(o.title)}</b>${o.sub?`<span>${esc(o.sub)}</span>`:''}
      ${p!==null?`<span class="meter"><i style="width:${p}%"></i></span>`:''}</span>
    ${p!==null?`<span class="pc">${p}%<i>${o.done}/${o.total}</i></span>`:''}
    <span class="chev">${svg(I.chev)}</span>
  </button>`;
}
function revealItem(it, opts={}){
  const open = !!opts.open;
  const st = S.know[it.id];
  return `<div class="item ${open?'open':''}" data-item="${esc(it.id)}">
    <button class="head" data-toggle="${esc(it.id)}">
      ${it.code?`<span class="code">${esc(it.code)}</span>`:''}
      <span class="qt">${esc(it.q)}</span>
      <span class="cue">reveal</span>
    </button>
    ${open ? `<div class="body">${opts.html || bodyHtml(it)}</div>
      <div class="mark">
        <button class="y" data-know="${esc(it.id)}" aria-pressed="${st===1}">Knew it</button>
        <button class="n" data-review="${esc(it.id)}" aria-pressed="${st===0}">Review</button>
      </div>` : ''}
  </div>`;
}
function bodyHtml(it){
  let h = '';
  if (it.added) h += `<div class="added"><b>ADDED — verify before the test</b>${esc(it.added)}</div>`;
  if (it.a) h += renderText(it.a);
  if (it.refs && it.refs.length){
    h += `<p style="color:var(--muted);font-size:13.5px;margin:2px 0 6px">Syllabus paragraphs:</p><div class="xref">`;
    it.refs.forEach(c => {
      const o = OBJ_BY_CODE[c];
      h += `<button data-obj="${esc(c)}"><span class="c">${esc(c)}</span>${esc((o?o.q:'').slice(0,70))}</button>`;
    });
    h += `</div>`;
  }
  if (it.ref) h += `<span class="ref">${esc(it.ref)}</span>`;
  return h || '<p style="color:var(--muted)">No detail recorded.</p>';
}
/* plain text -> paragraphs, lettered lists and simple tables */
function renderText(t){
  const lines = String(t).split('\n');
  let out = '', buf = [], list = [];
  const flushP = () => { if (buf.length){ out += `<p>${esc(buf.join('\n'))}</p>`; buf = []; } };
  const flushL = () => {
    if (!list.length) return;
    const lettered = list.every(x => /^(?:[a-z]\.|\(?\d+\))\s/.test(x));
    out += `<ul class="${lettered?'plain':''}">`;
    list.forEach(x => {
      const m = lettered && x.match(/^((?:[a-z]\.|\(?\d+\)))\s+([\s\S]*)$/);
      out += m ? `<li><span class="mk">${esc(m[1])}</span>${esc(m[2])}</li>` : `<li>${esc(x)}</li>`;
    });
    out += `</ul>`; list = [];
  };
  lines.forEach(raw => {
    const s = raw.trim();
    if (!s){ flushL(); flushP(); return; }
    if (/^(?:[a-z]\.|\(?\d+\)|[•\-–])\s+/.test(s)){ flushP(); list.push(s.replace(/^[•\-–]\s+/,'')); return; }
    flushL(); buf.push(s);
  });
  flushL(); flushP();
  return out;
}

function refBlocks(blocks){
  return (blocks||[]).map(b => b.t === 'ex'
    ? `<div class="ex">${b.p?`<div class="ep"><span class="who">PILOT</span>${esc(b.p)}</div>`:''}
        ${b.a?`<div class="ea"><span class="who">ATC</span>${esc(b.a)}</div>`:''}</div>`
    : `<p>${esc(b.v)}</p>`).join('');
}
function vRefIndex(slug){
  const r = refBySlug(slug); if (!r) return vWider();
  return { title:r.title, back:['#/wider','Wider'],
    html:`<p class="note">${esc(r.edition)} · ${esc(r.source)}</p>
    <div class="grid">${r.chapters.map(c=>{
      const n = c.sections.reduce((x,s)=>x+s.items.length,0);
      return card({go:`#/ref/${slug}/${c.num}`,title:`${c.num}. ${c.title}`,
        sub:`${c.sections.length} section${c.sections.length===1?'':'s'} · ${n} paragraph${n===1?'':'s'}`,
        icon:I.list,cls:'ire'});
    }).join('')}</div>` };
}
function vRefChapter(slug, num){
  const r = refBySlug(slug); if (!r) return vWider();
  const c = r.chapters.find(x => x.num === String(num)); if (!c) return vRefIndex(slug);
  let h = '';
  c.sections.forEach(s => {
    if (s.title) h += `<h3 class="grp">${s.code?esc(s.code)+' · ':''}${esc(s.title)}</h3>`;
    if (s.pre && s.pre.length) h += `<div class="ref-body">${refBlocks(s.pre)}</div>`;
    s.items.forEach(it => {
      h += `<div class="para" data-item="${esc(it.rid)}">
        <span class="pn">${esc(it.code || it.term || '')}</span>
        <div class="ref-body">${refBlocks(it.blocks)}</div></div>`;
    });
  });
  return { title:`${c.num}. ${c.title}`, back:[`#/ref/${slug}`, r.title.split('—')[0].trim()], html:h || '<p class="empty">No content in this chapter.</p>' };
}

/* ---------------- views ---------------- */
function vHome(){
  const o = overall();
  const C = 2*Math.PI*24;
  const sys = sysItems().map(i=>i.id), ir = ireItems().map(i=>i.id), wi = extraItems().map(i=>i.id);
  return {
    title:'C-17 Revision', back:null,
    html:`
    <div class="hero"><h2>C-17 Revision</h2><p>Aircraft systems and wider flying knowledge.</p></div>
    <div class="ring">
      <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--panel2)" stroke-width="6"/>
        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C*(1-o/100)}"/></svg>
      <span class="t"><b>${o}% ready</b><span>${known(sys)+known(ir)+known(wi)} of ${sys.length+ir.length+wi.length} items marked known</span></span>
    </div>
    <h3 class="grp">Aircraft</h3>
    <div class="grid">
      ${card({go:'#/systems',title:'Aircraft systems',sub:`${GC.systems.length} systems · ${sysItems().length} questions`,icon:I.sys,cls:'gc',done:known(sys),total:sys.length})}
      ${card({go:'#/lims',title:'Limitations',sub:`${LIMS.length} numbers to know cold`,icon:I.gauge,cls:'gc',done:known(LIMS.map(i=>i.id)),total:LIMS.length})}
      ${card({go:'#/docs',title:'Docs check',sub:'Folder, F5000 and logbook',icon:I.check,cls:'gc',done:Object.values(S.docs).filter(Boolean).length,total:GC.docs.reduce((n,g)=>n+g[1].length,0)})}
    </div>
    <h3 class="grp">Wider knowledge</h3>
    <div class="grid">
      ${card({go:'#/wider',title:'Wider knowledge',sub:'IR(E)T, PBN, comms, oceanic, ATPL theory',icon:I.book,cls:'ire',done:known(ir)+known(wi),total:ir.length+wi.length})}
    </div>
    <h3 class="grp">Test yourself</h3>
    <div class="grid">
      ${card({go:'#/quiz',title:'Quiz',sub:`${GC.ekq.length} multiple-choice questions`,icon:I.quiz})}
      ${card({go:'#/progress',title:'Progress',sub:'Readiness, review list, backup',icon:I.chart})}
    </div>
    <p class="foot">${esc(DATA.meta.sources.join(' · '))}<br>
    Both source documents are marked uncontrolled — check anything numerical against current
    publications before you rely on it. Amber items are written by Claude, not by the squadron.</p>`
  };
}

function vSystems(){
  return { title:'Aircraft systems', back:['#/','Home'],
    html:`<p class="note">Every C-17 system from the ground cat syllabus. Answer out loud, then reveal.</p>
    <div class="grid">${GC.systems.map((s,i)=>{
      const ids = s.items.map(x=>x.id);
      return card({go:'#/sys/'+i,title:s.name,sub:`${s.items.length} questions`,icon:I.sys,cls:'gc',done:known(ids),total:ids.length});
    }).join('')}</div>` };
}
function vSys(i){
  const s = GC.systems[+i]; if (!s) return vSystems();
  const ids = s.items.map(x=>x.id);
  return { title:s.name, back:['#/systems','Systems'],
    html:`<p class="note">${known(ids)} of ${ids.length} marked known.</p>
      ${s.items.map(it => revealItem(it,{open:openSet.has(it.id)})).join('')}` };
}

function vLims(){
  return { title:'Limitations', back:['#/','Home'],
    html:`<p class="note">${LIMS.length} numbers. Say the figure, then reveal.</p>
    <div class="grid">${GC.lims.map((g,i)=>{
      const ids = LIMS.filter(l=>l.group===g[0]).map(l=>l.id);
      return card({go:'#/lim/'+i,title:g[0],sub:`${g[1].length} limits`,icon:I.gauge,cls:'gc',done:known(ids),total:ids.length});
    }).join('')}</div>` };
}
function vLim(i){
  const g = GC.lims[+i]; if (!g) return vLims();
  const items = LIMS.filter(l => l.group === g[0]);
  return { title:g[0], back:['#/lims','Limitations'],
    html:items.map(it => revealItem(it,{open:openSet.has(it.id), html:`<p><b style="color:var(--ok);font-family:var(--mono)">${esc(it.a)}</b></p>`})).join('') };
}

function vWider(){
  const ir = ireItems().map(i=>i.id);
  const cards = [
    card({go:'#/iret',title:'IR(E)T syllabus',sub:`${IRE.parts.length} parts · ${ir.length} objectives`,icon:I.book,cls:'ire',done:known(ir),total:ir.length}),
    card({go:'#/samples',title:'IR(E)T sample questions',sub:`${IRE.samples.reduce((n,g)=>n+g.qs.length,0)} questions, cross-referenced`,icon:I.quiz,cls:'ire',
      done:known(IRE.samples.flatMap(g=>g.qs.map(q=>q.id))),total:IRE.samples.reduce((n,g)=>n+g.qs.length,0)}),
  ];
  EXTRA.topics.forEach(t => {
    const ids = t.items.map(i=>i.id);
    cards.push(card({go:'#/topic/'+t.slug,title:t.name,sub:t.sub||`${ids.length} items`,icon:I[t.icon]||I.book,cls:'ire',done:known(ids),total:ids.length}));
  });
  REFS.forEach(r => {
    const n = r.chapters.reduce((x,c)=>x+c.sections.reduce((y,s)=>y+s.items.length,0),0);
    cards.push(card({go:'#/ref/'+r.slug,title:r.title,sub:`${r.edition} · ${n} paragraphs`,icon:I[r.icon]||I.book,cls:'ire'}));
  });
  const pend = (EXTRA.pending || []).filter(p => !REFS.some(r => r.slug === p.slug));
  return { title:'Wider knowledge', back:['#/','Home'],
    html:`<p class="note">Everything beyond the airframe — instrument rating, navigation, communications and general theory.</p>
      <div class="grid">${cards.join('')}</div>
      ${pend.length?`<h3 class="grp">Waiting on source documents</h3>
        <div class="grid">${pend.map(p=>`<div class="card" style="opacity:.55">
          <span class="ic">${svg(I[p.icon]||I.book)}</span>
          <span class="tx"><b>${esc(p.name)}</b><span>${esc(p.note)}</span></span>
          <span class="pill">pending</span></div>`).join('')}</div>`:''}` };
}

function vIret(){
  return { title:'IR(E)T syllabus', back:['#/wider','Wider'],
    html:`<div class="grid">${IRE.parts.map(p=>{
      const ids = p.sections.flatMap(s=>s.items.map(i=>i.id));
      return card({go:'#/ire/'+p.num,title:`Part ${p.num} — ${p.name}`,sub:`${ids.length} objectives`,icon:I.book,cls:'ire',done:known(ids),total:ids.length});
    }).join('')}</div>` };
}
function vIrePart(num){
  const p = IRE.parts.find(x => x.num === String(num)); if (!p) return vIret();
  let h = '';
  p.sections.forEach(s => {
    h += `<h3 class="grp">${esc(s.code)} · ${esc(s.title)}</h3>`;
    h += s.items.map(it => revealItem(it,{open:openSet.has(it.id)})).join('');
  });
  return { title:`Part ${p.num} — ${p.name}`, back:['#/iret','IR(E)T'], html:h };
}
function vSamples(){
  return { title:'Sample questions', back:['#/wider','Wider'],
    html:`<p class="note">The study guide gives no answers, so each is cross-referenced to the paragraph that covers it. Tap a reference to jump there.</p>
    <div class="grid">${IRE.samples.map(g=>{
      const ids = g.qs.map(q=>q.id);
      return card({go:'#/samp/'+g.part,title:`Part ${g.part} — ${g.name}`,sub:`${g.qs.length} questions`,icon:I.quiz,cls:'ire',done:known(ids),total:ids.length});
    }).join('')}</div>` };
}
function vSamp(part){
  const g = IRE.samples.find(x => x.part === String(part)); if (!g) return vSamples();
  return { title:`Part ${g.part} questions`, back:['#/samples','Questions'],
    html:g.qs.map(q => revealItem({id:q.id,code:q.n+'.',q:q.q,refs:q.refs,added:q.added},{open:openSet.has(q.id)})).join('') };
}
function vTopic(slug){
  const t = EXTRA.topics.find(x => x.slug === slug); if (!t) return vWider();
  let h = t.intro ? `<p class="note">${esc(t.intro)}</p>` : '';
  const groups = {};
  t.items.forEach(it => { (groups[it.group||''] = groups[it.group||''] || []).push(it); });
  Object.keys(groups).forEach(g => {
    if (g) h += `<h3 class="grp">${esc(g)}</h3>`;
    h += groups[g].map(it => revealItem(it,{open:openSet.has(it.id)})).join('');
  });
  return { title:t.name, back:['#/wider','Wider'], html:h };
}

function vDocs(){
  let h = `<p class="note">Run this against the folder in front of you.</p>`;
  GC.docs.forEach((g,gi) => {
    h += `<h3 class="grp">${esc(g[0])}</h3>`;
    g[1].forEach((x,i) => {
      const k = 'd'+gi+'.'+i;
      h += `<button class="chk ${S.docs[k]?'on':''}" data-doc="${k}"><span class="box">✓</span><span class="tx">${esc(x)}</span></button>`;
    });
  });
  return { title:'Docs check', back:['#/','Home'], html:h };
}

/* ---------------- quiz ---------------- */
let quiz = null;
function vQuiz(){
  if (quiz) return vQuizRun();
  const topics = [...new Set(GC.ekq.map(q=>q.topic))].sort();
  return { title:'Quiz', back:['#/','Home'],
    html:`<p class="note">Multiple choice from the ${GC.ekq.length}-question ground cat bank. Questions you have not got right come up first.</p>
    <div class="grid">
      ${card({go:'#/quiz/start/20',title:'Quick test',sub:'20 questions, mixed',icon:I.quiz})}
      ${card({go:'#/quiz/start/40',title:'Long test',sub:'40 questions, mixed',icon:I.quiz})}
      ${card({go:'#/quiz/start/wrong',title:'Retest what I got wrong',sub:`${GC.ekq.filter(q=>S.know[q.id]===0).length} on the review list`,icon:I.list})}
    </div>
    <h3 class="grp">By topic</h3>
    <div class="grid">${topics.map(t=>{
      const qs = GC.ekq.filter(q=>q.topic===t);
      return card({go:'#/quiz/topic/'+encodeURIComponent(t),title:t,sub:`${qs.length} questions`,icon:I.quiz,
        done:known(qs.map(q=>q.id)),total:qs.length});
    }).join('')}</div>` };
}
function startQuiz(kind, arg){
  let pool;
  if (kind === 'wrong') pool = GC.ekq.filter(q => S.know[q.id] === 0);
  else if (kind === 'topic') pool = GC.ekq.filter(q => q.topic === arg);
  else pool = GC.ekq.slice();
  if (!pool.length) { quiz = null; return false; }
  const n = kind === 'topic' ? Math.min(pool.length, 20) : (kind === 'wrong' ? Math.min(pool.length,40) : +arg || 20);
  const weak = shuffle(pool.filter(q => S.know[q.id] !== 1));
  const rest = shuffle(pool.filter(q => S.know[q.id] === 1));
  quiz = { qs: shuffle(weak.concat(rest).slice(0, n)), i:0, ans:{}, logged:false,
           title: kind==='topic' ? arg : (kind==='wrong' ? 'Review retest' : 'Mixed test') };
  return true;
}
function vQuizRun(){
  const { qs, i } = quiz;
  if (i >= qs.length){
    const right = qs.filter(q => quiz.ans[q.id] === q.answer).length;
    const wrong = qs.filter(q => quiz.ans[q.id] !== q.answer);
    if (!quiz.logged){ quiz.logged = true; S.tests.push({t:Date.now(), n:qs.length, right});
      if (S.tests.length > 30) S.tests.shift(); save(); }
    return { title:'Result', back:['#/quiz','Quiz'],
      html:`<div class="qcard"><div class="big">${pct(right,qs.length)}%<small>${right} of ${qs.length} correct</small></div></div>
      ${wrong.length?`<h3 class="grp">Review these ${wrong.length}</h3>`+wrong.map(q=>`
        <div class="qcard"><div style="margin-bottom:9px">${esc(q.q)}</div>
        <div class="verdict no">You said ${esc(quiz.ans[q.id]||'—')}: ${esc(q.options[quiz.ans[q.id]]||'no answer')}</div>
        <div class="verdict ok">Correct ${esc(q.answer)}: ${esc(q.options[q.answer])}</div>
        <span class="ref">${esc(q.ref)}</span></div>`).join('')
        :`<div class="qcard">Clean sweep.</div>`}
      <div class="row" style="margin-top:12px">
        ${wrong.length?`<button class="btn" data-requiz="1">Retest these</button>`:''}
        <button class="btn sec" data-go="#/quiz">New test</button></div>` };
  }
  const q = qs[i], given = quiz.ans[q.id], done = given !== undefined;
  return { title:quiz.title, back:['#/quiz','Quiz'],
    html:`<div class="prog"><i style="width:${pct(i,qs.length)}%"></i></div>
    <div class="qcard">
      <div class="qmeta"><span>Question ${q.n}</span><span>${i+1} / ${qs.length}</span></div>
      <div class="qtext">${esc(q.q)}</div>
      <div class="opts">${Object.keys(q.options).sort().map(k=>{
        let c=''; if (done){ if (k===q.answer) c='right'; else if (k===given) c='wrong'; }
        return `<button class="opt ${c}" data-ans="${esc(k)}"${done?' disabled':''}>
          <span class="k">${esc(k)}</span><span>${esc(q.options[k])}</span></button>`;
      }).join('')}</div>
      ${done?`<div class="verdict ${given===q.answer?'ok':'no'}">${given===q.answer?'Correct.':'Not right — the answer is '+esc(q.answer)+'.'}</div>
        <span class="ref">${esc(q.ref)}</span>`:''}
    </div>
    ${done?`<button class="btn" data-next="1">${i+1===qs.length?'See result':'Next question'}</button>`:''}` };
}

/* ---------------- search ---------------- */
function corpus(){
  const out = [];
  sysItems().forEach(i => out.push({id:i.id,w:'System · '+i.sec,q:i.q,a:i.a,go:'#/systems'}));
  LIMS.forEach(i => out.push({id:i.id,w:'Limitation · '+i.group,q:i.q,a:i.a,go:'#/lims'}));
  GC.ekq.forEach(q => out.push({id:q.id,w:'Quiz · '+q.topic,q:q.q,a:q.options[q.answer],go:'#/quiz'}));
  IRE.parts.forEach(p => p.sections.forEach(s => s.items.forEach(i =>
    out.push({id:i.id,w:'IR(E)T '+i.code,q:i.q,a:i.a,go:'#/ire/'+p.num}))));
  IRE.samples.forEach(g => g.qs.forEach(q =>
    out.push({id:q.id,w:'IR(E)T question '+g.part+'.'+q.n,q:q.q,a:q.added||'',go:'#/samp/'+g.part})));
  EXTRA.topics.forEach(t => t.items.forEach(i =>
    out.push({id:i.id,w:t.name+(i.group?' · '+i.group:''),q:i.q,a:i.a,go:'#/topic/'+t.slug})));
  REFS.forEach(r => r.chapters.forEach(c => c.sections.forEach(s => s.items.forEach(it => {
    const txt = (it.blocks||[]).map(b => b.t==='ex' ? (b.p+' '+b.a) : b.v).join(' ');
    out.push({ id:it.rid, w:r.title.split('—')[0].trim()+' '+(it.code||it.term||''),
               q:(it.term ? it.term+' — ' : '') + txt.slice(0,160),
               a:txt, go:`#/ref/${r.slug}/${c.num}` });
  }))));
  return out;
}
let CORPUS = null;
function hl(text, terms){
  let s = esc(text);
  terms.forEach(t => {
    if (t.length < 2) return;
    s = s.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>');
  });
  return s;
}
function vSearch(){
  const qv = searchTerm;
  let body = '';
  if (qv.trim().length < 2){
    body = `<p class="empty">Type at least two characters. Searches every system, limit, objective and question — ${corpusSize()} items.</p>`;
  } else {
    CORPUS = CORPUS || corpus();
    const terms = qv.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = CORPUS.map(c => {
      const hay = (c.q+' '+c.a+' '+c.w).toLowerCase();
      let sc = 0;
      terms.forEach(t => { if (c.q.toLowerCase().includes(t)) sc += 3; else if (hay.includes(t)) sc += 1; });
      const all = terms.every(t => hay.includes(t));
      return all ? {c, sc} : null;
    }).filter(Boolean).sort((a,b) => b.sc - a.sc).slice(0, 80);
    body = hits.length
      ? hits.map(({c}) => `<button class="hit" data-hit="${esc(c.id)}" data-hitgo="${esc(c.go)}">
          <span class="w">${esc(c.w)}</span><span class="t">${hl(c.q, terms)}</span></button>`).join('')
      : `<p class="empty">Nothing matches “${esc(qv)}”.</p>`;
  }
  return { title:'Search', back:null, raw:true,
    html:`<div class="search">${svg(I.search)}
      <input id="sq" type="search" inputmode="search" autocomplete="off" placeholder="Search everything…" value="${esc(qv)}">
    </div>${body}` };
}
function corpusSize(){ CORPUS = CORPUS || corpus(); return CORPUS.length; }

/* ---------------- progress ---------------- */
function encodeProgress(){
  const p = { v:1, k:Object.keys(S.know).filter(k=>S.know[k]===1),
    r:Object.keys(S.know).filter(k=>S.know[k]===0),
    d:Object.keys(S.docs).filter(k=>S.docs[k]), t:S.tests.slice(-8) };
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/=+$/,''); }
  catch(e){ return JSON.stringify(p); }
}
function decodeProgress(code){
  const txt = String(code||'').replace(/\s+/g,'');
  if (!txt) throw new Error('empty');
  let p; try { p = JSON.parse(txt); } catch(e){ p = JSON.parse(decodeURIComponent(escape(atob(txt)))); }
  if (!p || !Array.isArray(p.k)) throw new Error('bad');
  const n = { know:{}, docs:{}, tests:Array.isArray(p.t)?p.t:[], lastRoute:'' };
  (p.k||[]).forEach(k => n.know[k] = 1);
  (p.r||[]).forEach(k => n.know[k] = 0);
  (p.d||[]).forEach(k => n.docs[k] = true);
  return n;
}
function vProgress(){
  const rows = AREAS.map(a => { const ids = a.ids(); return {n:a.name, d:known(ids), t:ids.length}; });
  const dd = Object.values(S.docs).filter(Boolean).length;
  rows.push({n:'Docs check', d:dd, t:GC.docs.reduce((x,g)=>x+g[1].length,0)});
  const review = Object.keys(S.know).filter(k => S.know[k] === 0).length;
  return { title:'Progress', back:['#/','Home'],
    html:`<div class="qcard"><div class="big">${overall()}%<small>overall readiness</small></div></div>
    ${rows.map(r=>`<div style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;font-size:14.5px;margin-bottom:4px">
        <b>${esc(r.n)}</b><span style="color:var(--muted);font-family:var(--mono);font-size:12px">${r.d}/${r.t}</span></div>
      <div class="meter"><i style="width:${pct(r.d,r.t)}%;background:${pct(r.d,r.t)>=85?'var(--ok)':pct(r.d,r.t)>=40?'var(--amber)':'var(--warn)'}"></i></div>
    </div>`).join('')}
    <h3 class="grp">Review list</h3>
    <p class="note">${review} item${review===1?'':'s'} marked for review.</p>
    ${S.tests.length?`<h3 class="grp">Recent tests</h3>
      ${S.tests.slice(-6).reverse().map(t=>`<div class="card"><span class="tx"><b>${pct(t.right,t.n)}%</b>
        <span>${t.right} of ${t.n} · ${new Date(t.t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></span></div>`).join('')}`:''}
    <h3 class="grp">Back up progress</h3>
    <p class="note">${saveState==='memory'
      ? 'This browser will not keep your progress — copy the code below.'
      : 'Saved automatically on this device. Use this code to move it to another device.'}</p>
    <textarea id="code" readonly rows="3" style="width:100%;background:var(--panel2);border:1px solid var(--line2);
      border-radius:9px;padding:11px;font-family:var(--mono);font-size:12px;color:var(--ink2)">${esc(encodeProgress())}</textarea>
    <div class="row" style="margin-top:9px"><button class="btn sec sm" data-selcode="1">Select code</button></div>
    <h3 class="grp">Restore</h3>
    <textarea id="inp" rows="3" placeholder="Paste a progress code" style="width:100%;background:var(--panel2);
      border:1px solid var(--line2);border-radius:9px;padding:11px;font-family:var(--mono);font-size:12px;color:var(--ink)"></textarea>
    <div class="row" style="margin-top:9px"><button class="btn sec sm" data-restore="1">Restore</button>
      <span id="rmsg" style="font-size:14px;align-self:center"></span></div>
    <h3 class="grp">Reset</h3>
    <div class="row"><button class="btn sec sm" data-reset="1">Clear all progress</button></div>` };
}

/* ---------------- shell ---------------- */
const openSet = new Set();
let searchTerm = '';

function render(){
  const p = parse();
  let v;
  if (!p.length) v = vHome();
  else switch (p[0]){
    case 'systems': v = vSystems(); break;
    case 'sys':     v = vSys(p[1]); break;
    case 'lims':    v = vLims(); break;
    case 'lim':     v = vLim(p[1]); break;
    case 'wider':   v = vWider(); break;
    case 'iret':    v = vIret(); break;
    case 'ire':     v = vIrePart(p[1]); break;
    case 'samples': v = vSamples(); break;
    case 'samp':    v = vSamp(p[1]); break;
    case 'topic':   v = vTopic(p[1]); break;
    case 'ref':     v = p[2] ? vRefChapter(p[1], p[2]) : vRefIndex(p[1]); break;
    case 'docs':    v = vDocs(); break;
    case 'quiz':
      if (p[1] === 'start'){ const ok = startQuiz(p[2]==='wrong'?'wrong':'n', p[2]); if(!ok){ go('#/quiz'); return; } location.replace('#/quiz/run'); return; }
      if (p[1] === 'topic'){ const ok = startQuiz('topic', decodeURIComponent(p[2]||'')); if(!ok){ go('#/quiz'); return; } location.replace('#/quiz/run'); return; }
      v = vQuiz(); break;
    case 'search':  v = vSearch(); break;
    case 'progress':v = vProgress(); break;
    default:        v = vHome();
  }
  el('#title').textContent = v.title;
  const back = el('#back');
  if (v.back){ back.hidden = false; back.dataset.go = v.back[0]; el('#backLabel').textContent = v.back[1]; }
  else back.hidden = true;
  el('#view').innerHTML = v.html;

  const cur = '#/' + (p[0] || '');
  el('#tabs').innerHTML = TABS.map(([r,n,ic]) =>
    `<button data-go="${r}" aria-current="${r===cur || (r==='#/' && !p.length)}">${svg(ic)}<span>${n}</span></button>`).join('');

  if (p[0] === 'search'){
    const inp = el('#sq');
    if (inp){ inp.focus({preventScroll:true}); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
  if (p[0] !== 'quiz') quiz = quiz && p[0]==='quiz' ? quiz : quiz;
  window.scrollTo(0, 0);
}

/* one delegated listener for the whole app */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-go],[data-toggle],[data-know],[data-review],[data-doc],[data-ans],[data-next],[data-requiz],[data-obj],[data-hit],[data-selcode],[data-restore],[data-reset]');
  if (!t) return;
  const d = t.dataset;

  if (d.go){ if (d.go === '#/quiz') quiz = null; go(d.go); return; }
  if (d.toggle){ openSet.has(d.toggle) ? openSet.delete(d.toggle) : openSet.add(d.toggle);
    const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (d.know){ S.know[d.know] = S.know[d.know]===1 ? undefined : 1; save();
    const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (d.review){ S.know[d.review] = S.know[d.review]===0 ? undefined : 0; save();
    const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (d.doc){ S.docs[d.doc] = !S.docs[d.doc]; save();
    const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (d.ans && quiz){ const q = quiz.qs[quiz.i]; quiz.ans[q.id] = d.ans;
    S.know[q.id] = d.ans === q.answer ? 1 : 0; save(); render(); return; }
  if (d.next && quiz){ quiz.i++; render(); return; }
  if (d.requiz && quiz){ const wrong = quiz.qs.filter(q => quiz.ans[q.id] !== q.answer);
    quiz = { qs: shuffle(wrong), i:0, ans:{}, logged:false, title:'Retest' }; render(); return; }
  if (d.obj){ const o = OBJ_BY_CODE[d.obj];
    if (o){ openSet.add(o.id);
      const part = IRE.parts.find(p => p.sections.some(s => s.items.includes(o)));
      go('#/ire/' + (part ? part.num : '1'));
      setTimeout(() => { const n = document.querySelector(`[data-item="${CSS.escape(o.id)}"]`);
        if (n) n.scrollIntoView({block:'center'}); }, 60); }
    return; }
  if (d.hit){ openSet.add(d.hit); go(d.hitgo);
    setTimeout(() => { const n = document.querySelector(`[data-item="${CSS.escape(d.hit)}"]`);
      if (n) n.scrollIntoView({block:'center'}); }, 60); return; }
  if (d.selcode){ const c = el('#code'); if (c){ c.focus(); c.select(); try{ c.setSelectionRange(0,999999); }catch(e){} } return; }
  if (d.restore){ const inp = el('#inp'), m = el('#rmsg'); if (!inp) return;
    try { Object.assign(S, decodeProgress(inp.value)); save();
      if (m){ m.style.color='var(--ok)'; m.textContent='Restored.'; }
      setTimeout(render, 350); }
    catch(e){ if (m){ m.style.color='var(--warn)'; m.textContent='Could not read that code.'; } }
    return; }
  if (d.reset){ if (confirm('Clear every mark and tick?')){ S = {know:{},docs:{},tests:[],lastRoute:''}; save(); render(); } return; }
});

document.addEventListener('input', ev => {
  if (ev.target && ev.target.id === 'sq'){ searchTerm = ev.target.value;
    const v = vSearch(); const host = el('#view');
    // re-render only the results, so the keyboard and caret stay put
    const tmp = document.createElement('div'); tmp.innerHTML = v.html;
    const old = host.querySelector('.search');
    while (old && old.nextSibling) host.removeChild(old.nextSibling);
    const frag = document.createDocumentFragment();
    const parts = tmp.querySelectorAll(':scope > *');
    parts.forEach((n,i) => { if (i > 0) frag.appendChild(n); });
    host.appendChild(frag);
  }
});

window.addEventListener('hashchange', render);
load();
render();

/* service worker: makes the app work with no signal once it has been opened once */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
