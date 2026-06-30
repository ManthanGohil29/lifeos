'use strict';

/* ============================ STORE ============================ */
const STORE_KEY = 'lifeos_v3';
function fmtDate(offset){
  offset = offset || 0;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
function genHist(freq){
  const arr = [];
  for (let i=0;i<30;i++) arr.push(Math.random() < freq);
  return arr;
}

function defaults(){
  return {
    user: { name: localStorage.getItem("lifeos_username") || "Guest" },
    goals: [
      { id:'1', title:'Run a 5K', category:'health', target:100, current:34, unit:'%', deadline:'2025-12-31', color:'#10B981' },
      { id:'2', title:'Save ₹50,000', category:'finance', target:50000, current:18400, unit:'₹', deadline:'2025-12-31', color:'#F59E0B' },
      { id:'3', title:'Read 12 books', category:'mindset', target:12, current:4, unit:'books', deadline:'2025-12-31', color:'#6366F1' },
      { id:'4', title:'Learn React', category:'growth', target:100, current:72, unit:'%', deadline:'2025-09-30', color:'#38BDF8' },
    ],
    logs: [
      { id:'l1', date:fmtDate(-6), mood:6, sleep:7, energy:7, win:'Completed project milestone', struggle:'Procrastinated on emails' },
      { id:'l2', date:fmtDate(-5), mood:4, sleep:5, energy:4, win:'Cooked healthy meal', struggle:'Missed gym session' },
      { id:'l3', date:fmtDate(-4), mood:7, sleep:8, energy:8, win:'Had great team call', struggle:'Overspent on lunch' },
      { id:'l4', date:fmtDate(-3), mood:5, sleep:6, energy:5, win:'Read for 30 mins', struggle:'Stayed up late scrolling' },
      { id:'l5', date:fmtDate(-2), mood:8, sleep:8, energy:9, win:'Finished reading chapter', struggle:'Skipped morning routine' },
      { id:'l6', date:fmtDate(-1), mood:6, sleep:6, energy:6, win:'Saved ₹500 extra', struggle:'Felt distracted all day' },
    ],
    habits: [
      { id:'h1', name:'Morning workout', icon:'🏃', color:'#10B981', streak:4, history:genHist(.65), lastToggle:null },
      { id:'h2', name:'Read 20 mins', icon:'📚', color:'#6366F1', streak:7, history:genHist(.8), lastToggle:null },
      { id:'h3', name:'No junk food', icon:'🥗', color:'#F59E0B', streak:2, history:genHist(.55), lastToggle:null },
      { id:'h4', name:'Meditate', icon:'🧘', color:'#38BDF8', streak:0, history:genHist(.4), lastToggle:null },
      { id:'h5', name:'Sleep by 11 PM', icon:'😴', color:'#F43F5E', streak:3, history:genHist(.6), lastToggle:null },
    ],
    finance: {
      monthlyIncome: 45000,
      entries: [
        { id:'f1', date:fmtDate(-5), type:'expense', category:'Food', amount:1200, note:'Groceries' },
        { id:'f2', date:fmtDate(-5), type:'expense', category:'Transport', amount:450, note:'Uber' },
        { id:'f3', date:fmtDate(-4), type:'expense', category:'Entertainment', amount:800, note:'Netflix + Spotify' },
        { id:'f4', date:fmtDate(-3), type:'expense', category:'Food', amount:2100, note:'Restaurant dinner' },
        { id:'f5', date:fmtDate(-3), type:'savings', category:'Savings', amount:3000, note:'Monthly SIP' },
        { id:'f6', date:fmtDate(-2), type:'expense', category:'Shopping', amount:3500, note:'Clothes' },
        { id:'f7', date:fmtDate(-1), type:'expense', category:'Food', amount:650, note:'Lunch delivery' },
        { id:'f8', date:fmtDate(-1), type:'expense', category:'Transport', amount:300, note:'Metro pass' },
      ]
    },
    insights: [],
    insightsLastGenerated: null
  };
}

function loadStore(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return Object.assign({}, defaults(), parsed);
  } catch(e){ return defaults(); }
}
function saveStore(d){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch(e){}
}
function clearStore(){ localStorage.removeItem(STORE_KEY); }

/* ============================ SCORE LOGIC ============================ */
const PILLAR_META = {
  health:  { label:'Health',  color:'#10B981', bg:'#10B98120' },
  mindset: { label:'Mindset', color:'#6366F1', bg:'#6366F120' },
  goals:   { label:'Goals',   color:'#38BDF8', bg:'#38BDF820' },
  finance: { label:'Finance', color:'#F59E0B', bg:'#F59E0B20' },
};

function computeScore(s){
  const logs = s.logs || [];
  const recent = logs.slice(-7);
  const avgSleep = recent.length ? recent.reduce((a,l)=>a+l.sleep,0)/recent.length : 6;
  const avgEnergy = recent.length ? recent.reduce((a,l)=>a+l.energy,0)/recent.length : 5;
  const avgMood = recent.length ? recent.reduce((a,l)=>a+l.mood,0)/recent.length : 5;
  const health = Math.min(Math.round((avgSleep/9)*50 + (avgEnergy/10)*50), 100);
  const mindset = Math.min(Math.round((avgMood/10)*100), 100);
  const gPct = s.goals.length ? s.goals.reduce((a,g)=>a+Math.min((g.current/g.target)*100,100),0)/s.goals.length : 50;
  const goals = Math.round(gPct);
  const entries = (s.finance && s.finance.entries) || [];
  const exp = entries.filter(e=>e.type==='expense').reduce((a,e)=>a+e.amount,0);
  const sav = entries.filter(e=>e.type==='savings').reduce((a,e)=>a+e.amount,0);
  const inc = (s.finance && s.finance.monthlyIncome) || 45000;
  const finance = Math.min(Math.round(((sav/inc)*60 + Math.max(0,1-(exp/inc))*40)*100), 100);
  const habitBonus = Math.min(s.habits.filter(h=>h.streak>=3).length*5, 20);
  const overall = Math.min(Math.round((health*.25+mindset*.25+goals*.25+finance*.25) + habitBonus*.1), 100);
  return { overall: overall, pillars: { health:health, mindset:mindset, goals:goals, finance:finance } };
}

/* ============================ TINY DOM HELPERS ============================ */
function el(tag, attrs, children){
  const e = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(function(k){
    const v = attrs[k];
    if (k === 'style' && typeof v === 'object') {
      Object.assign(e.style, v);
    } else if (k === 'class') {
      e.className = v;
    } else if (k.indexOf('on') === 0 && typeof v === 'function') {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') {
      e.innerHTML = v;
    } else if (v !== null && v !== undefined && v !== false) {
      e.setAttribute(k, v);
    }
  });
  (children||[]).forEach(function(c){
    if (c === null || c === undefined || c === false) return;
    if (typeof c === 'string' || typeof c === 'number') {
      e.appendChild(document.createTextNode(String(c)));
    } else {
      e.appendChild(c);
    }
  });
  return e;
}
function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
function mount(node, children){ clear(node); (children||[]).forEach(function(c){ if(c) node.appendChild(c); }); }

/* ============================ MINI CHART HELPERS (pure SVG) ============================ */
function svgEl(tag, attrs){
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs||{}).forEach(function(k){ e.setAttribute(k, attrs[k]); });
  return e;
}

function areaChart(data, key, color, w, h){
  const svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width:'100%', height:h, preserveAspectRatio:'none' });
  if (!data.length) return svg;
  const vals = data.map(function(d){ return d[key]; });
  const max = Math.max.apply(null, vals) || 1;
  const min = Math.min.apply(null, vals);
  const range = (max - min) || 1;
  const padTop = 8, padBottom = 8;
  const step = w / Math.max(data.length-1, 1);
  let pathD = '';
  let areaD = '';
  data.forEach(function(d, i){
    const x = i * step;
    const y = padTop + (h-padTop-padBottom) * (1 - (d[key]-min)/range);
    pathD += (i===0?'M':'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    areaD += (i===0?'M':'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  });
  areaD += 'L' + ((data.length-1)*step).toFixed(1) + ',' + h + ' L0,' + h + ' Z';

  const gradId = 'grad' + Math.random().toString(36).slice(2);
  const defs = svgEl('defs', {});
  const grad = svgEl('linearGradient', { id:gradId, x1:'0', y1:'0', x2:'0', y2:'1' });
  grad.appendChild(svgEl('stop', { offset:'5%', 'stop-color':color, 'stop-opacity':'0.35' }));
  grad.appendChild(svgEl('stop', { offset:'95%', 'stop-color':color, 'stop-opacity':'0' }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(svgEl('path', { d:areaD, fill:'url(#'+gradId+')' }));
  svg.appendChild(svgEl('path', { d:pathD, fill:'none', stroke:color, 'stroke-width':'2' }));
  return svg;
}

function multiLineChart(data, keys, colors, w, h){
  const svg = svgEl('svg', { viewBox:'0 0 '+w+' '+h, width:'100%', height:h, preserveAspectRatio:'none' });
  if (!data.length) return svg;
  let allVals = [];
  keys.forEach(function(k){ data.forEach(function(d){ allVals.push(d[k]); }); });
  const max = Math.max.apply(null, allVals) || 1;
  const min = Math.min.apply(null, allVals);
  const range = (max-min) || 1;
  const padTop=8, padBottom=8;
  const step = w / Math.max(data.length-1,1);
  keys.forEach(function(key, ki){
    let pathD = '';
    data.forEach(function(d,i){
      const x = i*step;
      const y = padTop + (h-padTop-padBottom)*(1-(d[key]-min)/range);
      pathD += (i===0?'M':'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    });
    svg.appendChild(svgEl('path', { d:pathD, fill:'none', stroke:colors[ki], 'stroke-width':'2' }));
  });
  return svg;
}

function barChart(data, key, color, w, h){
  const svg = svgEl('svg', { viewBox:'0 0 '+w+' '+h, width:'100%', height:h, preserveAspectRatio:'none' });
  if (!data.length) return svg;
  const vals = data.map(function(d){ return d[key]; });
  const max = Math.max.apply(null, vals) || 1;
  const n = data.length;
  const gap = w / n * 0.3;
  const barW = (w/n) - gap;
  data.forEach(function(d, i){
    const barH = max>0 ? (d[key]/max) * (h-4) : 0;
    const x = i * (w/n) + gap/2;
    const y = h - barH;
    svg.appendChild(svgEl('rect', { x:x.toFixed(1), y:y.toFixed(1), width:barW.toFixed(1), height:barH.toFixed(1), rx:'3', fill:color }));
  });
  return svg;
}

function donutChart(data, colorMap, size, inner, outer){
  const svg = svgEl('svg', { viewBox:'0 0 '+size+' '+size, width:size, height:size });
  const total = data.reduce(function(a,d){ return a+d.value; }, 0) || 1;
  const cx = size/2, cy = size/2;
  let angleStart = -90;
  data.forEach(function(d){
    const frac = d.value/total;
    const angleEnd = angleStart + frac*360;
    const largeArc = (angleEnd-angleStart) > 180 ? 1 : 0;
    const x1o = cx + outer*Math.cos(angleStart*Math.PI/180);
    const y1o = cy + outer*Math.sin(angleStart*Math.PI/180);
    const x2o = cx + outer*Math.cos(angleEnd*Math.PI/180);
    const y2o = cy + outer*Math.sin(angleEnd*Math.PI/180);
    const x1i = cx + inner*Math.cos(angleEnd*Math.PI/180);
    const y1i = cy + inner*Math.sin(angleEnd*Math.PI/180);
    const x2i = cx + inner*Math.cos(angleStart*Math.PI/180);
    const y2i = cy + inner*Math.sin(angleStart*Math.PI/180);
    const d_attr = [
      'M', x1o.toFixed(2), y1o.toFixed(2),
      'A', outer, outer, 0, largeArc, 1, x2o.toFixed(2), y2o.toFixed(2),
      'L', x1i.toFixed(2), y1i.toFixed(2),
      'A', inner, inner, 0, largeArc, 0, x2i.toFixed(2), y2i.toFixed(2),
      'Z'
    ].join(' ');
    svg.appendChild(svgEl('path', { d:d_attr, fill: colorMap[d.name] || '#94A3B8' }));
    angleStart = angleEnd;
  });
  return svg;
}

function lifeScoreArc(score, pillars){
  const SIZE = 200, STROKE = 12;
  const keys = Object.keys(pillars);
  const wrap = el('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center' } }, []);
  const svgWrap = el('div', { style:{ position:'relative', width:SIZE+'px', height:SIZE+'px' } }, []);
  const svg = svgEl('svg', { width:SIZE, height:SIZE });

  keys.forEach(function(key, idx){
    const meta = PILLAR_META[key];
    const pct = pillars[key];
    const r = (SIZE-STROKE)/2 - idx*(STROKE+3);
    const circ = 2*Math.PI*r;
    const cx = SIZE/2, cy = SIZE/2;
    const trackDash = circ*.23;
    const trackGap = circ - trackDash;
    const startAngle = (idx/keys.length)*360;
    const startOffset = circ - (startAngle/360)*circ;
    const arcDash = (pct/100) * trackDash;

    svg.appendChild(svgEl('circle', {
      cx:cx, cy:cy, r:r, fill:'none', stroke:'#1E2D45', 'stroke-width':STROKE,
      'stroke-dasharray': trackDash+' '+trackGap, 'stroke-dashoffset': startOffset,
      transform: 'rotate(-90 '+cx+' '+cy+')'
    }));
    const arc = svgEl('circle', {
      cx:cx, cy:cy, r:r, fill:'none', stroke:meta.color, 'stroke-width':STROKE, 'stroke-linecap':'round',
      'stroke-dasharray': arcDash+' '+(circ-arcDash), 'stroke-dashoffset': startOffset,
      transform: 'rotate(-90 '+cx+' '+cy+')'
    });
    arc.style.filter = 'drop-shadow(0 0 5px ' + meta.color + '70)';
    svg.appendChild(arc);
  });

  svgWrap.appendChild(svg);
  const center = el('div', { style:{ position:'absolute', inset:'0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' } }, [
    el('div', { style:{ fontSize:'46px', fontWeight:'900', color:'#F1F5F9', lineHeight:'1' } }, [String(score)]),
    el('div', { style:{ color:'#94A3B8', fontSize:'10px', marginTop:'4px', letterSpacing:'0.1em', textTransform:'uppercase' } }, ['Life Score'])
  ]);
  svgWrap.appendChild(center);
  wrap.appendChild(svgWrap);

  const legend = el('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 24px', marginTop:'12px', width:'100%', padding:'0 8px' } }, []);
  Object.keys(pillars).forEach(function(k){
    legend.appendChild(el('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } }, [
      el('div', { style:{ width:'8px', height:'8px', borderRadius:'50%', background:PILLAR_META[k].color, flexShrink:'0' } }, []),
      el('span', { style:{ color:'#94A3B8', fontSize:'11px', flex:'1' } }, [PILLAR_META[k].label]),
      el('span', { style:{ color:'#F1F5F9', fontSize:'11px', fontWeight:'700' } }, [String(pillars[k])]),
    ]));
  });
  wrap.appendChild(legend);
  return wrap;
}

/* ============================ APP STATE ============================ */
let STATE = {
  page: 'dashboard',
  store: loadStore()
};

function setStore(updater){
  STATE.store = typeof updater === 'function' ? updater(STATE.store) : updater;
  saveStore(STATE.store);
  render();
}
function setPage(p){
  STATE.page = p;
  render();
}

/* ============================ SIDEBAR ============================ */
const NAV = [
  { id:'dashboard', icon:'⊞', label:'Command Centre' },
  { id:'goals',     icon:'◎', label:'Goals' },
  { id:'log',       icon:'📓', label:'Daily Log' },
  { id:'finance',   icon:'💳', label:'Finance Pulse' },
  { id:'habits',    icon:'🔥', label:'Habits' },
  { id:'insights',  icon:'✨', label:'AI Insights' },
];

function Sidebar(){
  const navItems = NAV.map(function(n){
    const isActive = STATE.page === n.id;
    return el('button', {
      class: 'nav-item' + (isActive?' active':''),
      onClick: function(){ setPage(n.id); }
    }, [
      el('span', { style:{ fontSize:'14px' } }, [n.icon]),
      el('span', { class:'nav-label' }, [n.label])
    ]);
  });

  return el('aside', { class:'sidebar' }, [
    el('div', { style:{ padding:'20px 16px', borderBottom:'1px solid #1E2D45' } }, [
      el('div', { style:{ display:'flex', alignItems:'center', gap:'12px' } }, [
        el('div', { style:{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#6366F1,#38BDF8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:'0' } }, [
          el('span', { style:{ color:'#fff', fontWeight:'900', fontSize:'15px' } }, ['L'])
        ]),
        el('div', { class:'logo-text' }, [
          el('div', { style:{ fontWeight:'800', color:'#F1F5F9', fontSize:'15px' } }, ['LifeOS']),
          el('div', { style:{ color:'#94A3B8', fontSize:'10px', marginTop:'1px' } }, ['Personal Command Centre'])
        ])
      ])
    ]),
    el('nav', { style:{ flex:'1', padding:'10px 8px', overflowY:'auto' } }, navItems),
    el('div', { style:{ padding:'8px', borderTop:'1px solid #1E2D45' } }, [
      el('button', { class:'nav-item', style:{ fontSize:'11px' }, onClick: handleReset }, [
        el('span', {}, ['↺']), el('span', { class:'nav-label' }, ['Reset Demo Data'])
      ])
    ])
  ]);
}

function handleReset(){
  if (confirm('Reset all data to demo defaults?')) {
    clearStore();
    STATE.store = loadStore();
    render();
  }
}

/* ============================ DASHBOARD ============================ */
function getPillarNote(key, val, store){
  if (key === 'health') {
    const a = store.logs.slice(-3).reduce(function(s,l){return s+l.sleep;},0)/3 || 0;
    return 'Avg sleep: ' + a.toFixed(1) + 'h this week';
  }
  if (key === 'mindset') {
    const a = store.logs.slice(-3).reduce(function(s,l){return s+l.mood;},0)/3 || 0;
    return 'Avg mood: ' + a.toFixed(1) + '/10 this week';
  }
  if (key === 'goals') return store.goals.length + ' active goals tracked';
  const saved = ((store.finance && store.finance.entries) || []).filter(function(e){return e.type==='savings';}).reduce(function(s,e){return s+e.amount;},0);
  return '₹' + saved.toLocaleString('en-IN') + ' saved this period';
}

function greetingWord(){
  const h = new Date().getHours();
  if (h<12) return 'morning';
  if (h<17) return 'afternoon';
  return 'evening';
}

function Dashboard(){
  const store = STATE.store;
  const scoreData = computeScore(store);
  const overall = scoreData.overall, pillars = scoreData.pillars;
  const logs = store.logs || [];
  const recent = logs.slice(-7);
  const today = logs[logs.length-1];
  const prev = logs[logs.length-2];
  const moodDelta = (today && prev) ? today.mood - prev.mood : 0;
  const entries = (store.finance && store.finance.entries) || [];
  const totalExp = entries.filter(function(e){return e.type==='expense';}).reduce(function(a,e){return a+e.amount;},0);
  const budgetPct = Math.round((totalExp/store.finance.monthlyIncome)*100);
  const activeStreaks = store.habits.filter(function(h){return h.streak>0;}).length;
  const topGoals = store.goals.slice(0,3);
  const insight = (store.insights && store.insights[0]) || null;

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);

  container.appendChild(el('div', { style:{ marginBottom:'20px' } }, [
    el('h1', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['Good ' + greetingWord() + ', ' + ((store.user&&store.user.name)||'there') + ' 👋']),
    el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, [new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })])
  ]));

  // Hero row: score + pillars
  const heroRow = el('div', { style:{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'20px', marginBottom:'20px' } }, []);
  const scoreCard = el('div', { class:'card', style:{ padding:'24px', background:'linear-gradient(135deg,#141E2E,#0D1525)', display:'flex', alignItems:'center', justifyContent:'center' } }, [lifeScoreArc(overall, pillars)]);
  heroRow.appendChild(scoreCard);

  const pillarGrid = el('div', { class:'grid-2', style:{ alignContent:'start' } }, []);
  Object.keys(pillars).forEach(function(key){
    const m = PILLAR_META[key];
    const val = pillars[key];
    const navId = key==='mindset' ? 'log' : (key==='goals' ? 'goals' : key);
    const card = el('div', { class:'card card-hover', style:{ padding:'16px' }, onClick: function(){ setPage(navId); } }, [
      el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' } }, [
        el('span', { class:'pill', style:{ background:m.bg, color:m.color } }, [m.label]),
        el('span', { style:{ fontSize:'20px', fontWeight:'900', color:m.color } }, [String(val)])
      ]),
      el('div', { style:{ height:'5px', borderRadius:'3px', background:'#1E2D45', overflow:'hidden' } }, [
        el('div', { style:{ height:'100%', borderRadius:'3px', width:val+'%', background:m.color, transition:'width 1s' } }, [])
      ]),
      el('p', { style:{ color:'#94A3B8', fontSize:'11px', marginTop:'8px' } }, [getPillarNote(key, val, store)])
    ]);
    pillarGrid.appendChild(card);
  });
  heroRow.appendChild(pillarGrid);
  container.appendChild(heroRow);

  // Stats row
  const stats = [
    { label:"Today's Mood", value: today ? today.mood+'/10' : '—', delta: moodDelta, icon:'😊' },
    { label:'Sleep last night', value: today ? today.sleep+'h' : '—', delta: today && today.sleep>=7 ? 1 : -1, icon:'😴' },
    { label:'Active Streaks', value: activeStreaks+'/'+store.habits.length, delta:0, icon:'🔥' },
    { label:'Budget used', value: budgetPct+'%', delta: budgetPct>70?-1:1, icon:'💸' },
  ];
  const statsGrid = el('div', { class:'grid-4', style:{ marginBottom:'20px' } }, []);
  stats.forEach(function(s){
    const deltaColor = s.delta>0 ? '#10B981' : (s.delta<0 ? '#F43F5E' : '#94A3B8');
    const deltaSym = s.delta>0 ? '↑' : (s.delta<0 ? '↓' : '—');
    statsGrid.appendChild(el('div', { class:'card', style:{ padding:'16px' } }, [
      el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' } }, [
        el('span', { style:{ fontSize:'18px' } }, [s.icon]),
        el('span', { style:{ fontSize:'12px', color:deltaColor } }, [deltaSym])
      ]),
      el('div', { style:{ fontSize:'20px', fontWeight:'800', color:'#F1F5F9' } }, [s.value]),
      el('div', { style:{ color:'#94A3B8', fontSize:'11px', marginTop:'2px' } }, [s.label])
    ]));
  });
  container.appendChild(statsGrid);

  // Bottom row
  const bottomGrid = el('div', { class:'grid-3' }, []);

  // Mood chart
  const moodData = recent.map(function(l){ return { date:l.date.slice(5), mood:l.mood }; });
  const moodCard = el('div', { class:'card', style:{ padding:'16px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'12px' } }, ['7-Day Mood'])
  ]);
  moodCard.appendChild(areaChart(moodData, 'mood', '#6366F1', 280, 90));
  bottomGrid.appendChild(moodCard);

  // Goals snap
  const goalsCard = el('div', { class:'card', style:{ padding:'16px' } }, [
    el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' } }, [
      el('span', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9' } }, ['Goals']),
      el('button', { style:{ background:'none', border:'none', color:'#6366F1', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }, onClick: function(){ setPage('goals'); } }, ['View all →'])
    ])
  ]);
  const goalsListWrap = el('div', { style:{ display:'flex', flexDirection:'column', gap:'10px' } }, []);
  topGoals.forEach(function(g){
    const pct = Math.min(Math.round((g.current/g.target)*100), 100);
    goalsListWrap.appendChild(el('div', {}, [
      el('div', { style:{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'5px' } }, [
        el('span', { style:{ color:'#F1F5F9', fontWeight:'500' } }, [g.title]),
        el('span', { style:{ color:'#94A3B8' } }, [pct+'%'])
      ]),
      el('div', { style:{ height:'4px', borderRadius:'2px', background:'#1E2D45', overflow:'hidden' } }, [
        el('div', { style:{ height:'100%', borderRadius:'2px', width:pct+'%', background:g.color } }, [])
      ])
    ]));
  });
  goalsCard.appendChild(goalsListWrap);
  bottomGrid.appendChild(goalsCard);

  // AI insight teaser
  const insightCard = el('div', { class:'insight-card', style:{ padding:'16px', cursor:'pointer' }, onClick: function(){ setPage('insights'); } }, [
    el('div', { style:{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' } }, [
      el('span', {}, ['✨']), el('span', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9' } }, ['Latest AI Insight'])
    ])
  ]);
  if (insight) {
    insightCard.appendChild(el('p', { style:{ color:'#94A3B8', fontSize:'13px', lineHeight:'1.6' } }, [insight.text]));
  } else {
    insightCard.appendChild(el('p', { style:{ color:'#94A3B8', fontSize:'13px', lineHeight:'1.6', marginBottom:'10px' } }, ['Log a few days to unlock cross-pattern insights from your data.']));
    insightCard.appendChild(el('button', { style:{ background:'none', border:'none', color:'#6366F1', cursor:'pointer', fontSize:'12px', fontFamily:'inherit', fontWeight:'600' }, onClick: function(e){ e.stopPropagation(); setPage('log'); } }, ['Log today →']));
  }
  bottomGrid.appendChild(insightCard);

  container.appendChild(bottomGrid);
  return container;
}

/* ============================ GOALS ============================ */
const CAT_COLORS = { health:'#10B981', finance:'#F59E0B', mindset:'#6366F1', growth:'#38BDF8', career:'#F43F5E', social:'#A78BFA' };
let goalForm = { title:'', category:'health', target:100, current:0, unit:'%', deadline:'' };
let goalEditing = null;
let goalShowForm = false;

function resetGoalForm(){
  goalForm = { title:'', category:'health', target:100, current:0, unit:'%', deadline:'' };
  goalEditing = null;
}

function GoalCard(g, done){
  const pct = Math.min(Math.round((g.current/g.target)*100), 100);
  const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date())/86400000) : null;

  const card = el('div', { class:'card', style:{ padding:'16px', opacity: done?'0.7':'1' } }, []);
  const headerRow = el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' } }, [
    el('div', {}, [
      el('span', { class:'pill', style:{ background:CAT_COLORS[g.category]+'20', color:CAT_COLORS[g.category], marginBottom:'6px', display:'inline-flex' } }, [g.category]),
      el('div', { style:{ fontWeight:'600', color:'#F1F5F9', fontSize:'13px', marginTop:'4px' } }, [g.title])
    ]),
    el('div', { style:{ display:'flex', gap:'4px', marginLeft:'8px' } }, [
      done ? el('span', { style:{ color:'#10B981', fontSize:'14px' } }, ['✓']) : null,
      el('button', { class:'icon-btn', onClick: function(){ goalForm = { title:g.title, category:g.category, target:g.target, current:g.current, unit:g.unit, deadline:g.deadline||'' }; goalEditing = g.id; goalShowForm = true; render(); } }, ['✏️']),
      el('button', { class:'icon-btn', onClick: function(){ setStore(function(s){ return Object.assign({}, s, { goals: s.goals.filter(function(x){return x.id!==g.id;}) }); }); } }, ['🗑'])
    ])
  ]);
  card.appendChild(headerRow);

  const progWrap = el('div', { style:{ marginBottom:'10px' } }, [
    el('div', { style:{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'5px' } }, [
      el('span', { style:{ color:'#94A3B8' } }, [g.current+' / '+g.target+' '+g.unit]),
      el('span', { style:{ fontWeight:'700', color:g.color } }, [pct+'%'])
    ]),
    el('div', { style:{ height:'6px', borderRadius:'3px', background:'#1E2D45', overflow:'hidden' } }, [
      el('div', { style:{ height:'100%', borderRadius:'3px', width:pct+'%', background:g.color, boxShadow:'0 0 6px '+g.color+'60', transition:'width .7s' } }, [])
    ])
  ]);
  card.appendChild(progWrap);

  if (!done) {
    const updateRow = el('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } }, [
      el('input', { type:'number', value:g.current, style:{ padding:'5px 8px', width:'72px', fontSize:'12px' }, onInput: function(e){ setStore(function(s){ return Object.assign({}, s, { goals: s.goals.map(function(x){ return x.id===g.id ? Object.assign({}, x, { current: Math.min(+e.target.value, x.target) }) : x; }) }); }); } }),
      el('span', { style:{ color:'#94A3B8', fontSize:'11px' } }, [g.unit]),
      daysLeft !== null ? el('span', { style:{ marginLeft:'auto', fontSize:'11px', color: daysLeft<30?'#F43F5E':'#94A3B8' } }, ['⏱ '+daysLeft+'d']) : null
    ]);
    card.appendChild(updateRow);
  }
  return card;
}

function Goals(){
  const store = STATE.store;
  const goals = store.goals || [];
  const active = goals.filter(function(g){ return g.current < g.target; });
  const done = goals.filter(function(g){ return g.current >= g.target; });

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);
  container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
    el('div', {}, [
      el('h2', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['Goals']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, [active.length+' active · '+done.length+' completed'])
    ]),
    el('button', { class:'btn-primary', onClick: function(){ resetGoalForm(); goalShowForm = true; render(); } }, ['＋ Add Goal'])
  ]));

  if (goalShowForm) {
    container.appendChild(GoalForm());
  }

  if (active.length) {
    container.appendChild(el('div', { style:{ fontSize:'11px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' } }, ['In Progress']));
    const grid = el('div', { class:'grid-2', style:{ marginBottom:'20px' } }, []);
    active.forEach(function(g){ grid.appendChild(GoalCard(g, false)); });
    container.appendChild(grid);
  }
  if (done.length) {
    container.appendChild(el('div', { style:{ fontSize:'11px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' } }, ['Completed 🎉']));
    const grid = el('div', { class:'grid-2' }, []);
    done.forEach(function(g){ grid.appendChild(GoalCard(g, true)); });
    container.appendChild(grid);
  }
  if (!goals.length) {
    container.appendChild(el('div', { class:'card', style:{ padding:'60px', textAlign:'center' } }, [
      el('div', { style:{ fontSize:'40px', marginBottom:'12px' } }, ['🎯']),
      el('div', { style:{ color:'#F1F5F9', fontWeight:'600', marginBottom:'6px' } }, ['No goals yet']),
      el('div', { style:{ color:'#94A3B8', fontSize:'13px' } }, ['Add your first goal to start tracking.'])
    ]));
  }
  return container;
}

function GoalForm(){
  function field(label, inputEl){
    return el('div', {}, [ el('label', { class:'field-label' }, [label]), inputEl ]);
  }
  const titleInput = el('input', { class:'field-input', placeholder:'Goal title…', value:goalForm.title, onInput: function(e){ goalForm.title = e.target.value; } });
  const catSelect = el('select', { class:'field-input' }, Object.keys(CAT_COLORS).map(function(c){
    const opt = el('option', { value:c }, [c.charAt(0).toUpperCase()+c.slice(1)]);
    if (c === goalForm.category) opt.setAttribute('selected', 'selected');
    return opt;
  }));
  catSelect.addEventListener('change', function(e){ goalForm.category = e.target.value; });
  const unitInput = el('input', { class:'field-input', placeholder:'%, books, km…', value:goalForm.unit, onInput:function(e){ goalForm.unit = e.target.value; } });
  const targetInput = el('input', { type:'number', class:'field-input', value:goalForm.target, onInput:function(e){ goalForm.target = e.target.value; } });
  const currentInput = el('input', { type:'number', class:'field-input', value:goalForm.current, onInput:function(e){ goalForm.current = e.target.value; } });
  const deadlineInput = el('input', { type:'date', class:'field-input', value:goalForm.deadline, onInput:function(e){ goalForm.deadline = e.target.value; } });

  const grid = el('div', { class:'grid-2', style:{ gap:'10px', marginBottom:'10px' } }, [
    el('div', { style:{ gridColumn:'1/-1' } }, [titleInput]),
    field('Category', catSelect),
    field('Unit', unitInput),
    field('Target', targetInput),
    field('Current', currentInput),
    field('Deadline', deadlineInput),
  ]);

  return el('div', { class:'card slide-up', style:{ padding:'20px', marginBottom:'20px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'14px' } }, [(goalEditing?'Edit':'New')+' Goal']),
    grid,
    el('div', { style:{ display:'flex', gap:'8px' } }, [
      el('button', { class:'btn-primary', onClick: function(){
        if (!goalForm.title.trim()) return;
        const g = Object.assign({}, goalForm, { id: goalEditing || Date.now().toString(), target:+goalForm.target, current:+goalForm.current, color: CAT_COLORS[goalForm.category] });
        setStore(function(s){
          const newGoals = goalEditing ? s.goals.map(function(x){ return x.id===goalEditing ? g : x; }) : s.goals.concat([g]);
          return Object.assign({}, s, { goals:newGoals });
        });
        resetGoalForm(); goalShowForm = false; render();
      } }, [goalEditing?'Update Goal':'Add Goal']),
      el('button', { class:'btn-ghost', onClick: function(){ goalShowForm = false; resetGoalForm(); render(); } }, ['Cancel'])
    ])
  ]);
}

/* ============================ DAILY LOG ============================ */
const MOOD_E = ['','😞','😢','😕','😐','🙂','😊','😀','😄','🤩','🥳'];
let logTab = 'log';
let logForm = null;

function DailyLog(){
  const store = STATE.store;
  const today = fmtDate(0);
  const logs = store.logs || [];
  const todayLog = logs.find(function(l){ return l.date===today; });
  if (!logForm) logForm = todayLog ? Object.assign({}, todayLog) : { mood:6, sleep:7, energy:6, win:'', struggle:'' };
  const saved = !!(todayLog && JSON.stringify(todayLog) === JSON.stringify(logForm));

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);
  container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
    el('div', {}, [
      el('h2', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['Daily Log']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, ['30-second check-in — the data that powers your insights'])
    ]),
    el('div', { style:{ display:'flex', gap:'2px', padding:'4px', borderRadius:'8px', background:'#141E2E' } }, ['log','history'].map(function(t){
      return el('button', { style:{ padding:'5px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer', border:'none', background: logTab===t?'#1E2D45':'transparent', color: logTab===t?'#F1F5F9':'#94A3B8', fontFamily:'inherit' }, onClick: function(){ logTab = t; render(); } }, [t.charAt(0).toUpperCase()+t.slice(1)]);
    }))
  ]));

  if (logTab === 'log') {
    const grid = el('div', { class:'grid-2', style:{ gap:'20px' } }, []);

    const formCard = el('div', { class:'card', style:{ padding:'20px' } }, []);
    formCard.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' } }, [
      el('span', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9' } }, [new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })]),
      saved ? el('span', { class:'pill', style:{ background:'#10B98120', color:'#10B981' } }, ['✓ Saved']) : null
    ]));

    const sliders = [
      { label:'Mood', key:'mood', min:1, max:10, color:'#6366F1', display: MOOD_E[logForm.mood]+' '+logForm.mood+'/10' },
      { label:'Sleep (hours)', key:'sleep', min:1, max:12, color:'#38BDF8', display: logForm.sleep+'h' },
      { label:'Energy level', key:'energy', min:1, max:10, color:'#F59E0B', display: logForm.energy+'/10' },
    ];
    sliders.forEach(function(s){
      const row = el('div', { style:{ marginBottom:'18px' } }, [
        el('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:'8px' } }, [
          el('label', { style:{ fontSize:'12px', color:'#94A3B8', fontWeight:'500' } }, [s.label]),
          el('span', { style:{ fontSize:'13px', fontWeight:'700', color:s.color } }, [s.display])
        ]),
        el('input', { type:'range', min:s.min, max:s.max, value:logForm[s.key], style:{ accentColor:s.color }, onInput: function(e){ logForm[s.key] = +e.target.value; render(); } })
      ]);
      formCard.appendChild(row);
    });

    formCard.appendChild(el('div', { style:{ marginBottom:'12px' } }, [
      el('label', { class:'field-label' }, ['One win today 🏆']),
      el('input', { class:'field-input', placeholder:'Something that went well…', value:logForm.win, onInput: function(e){ logForm.win = e.target.value; } })
    ]));
    formCard.appendChild(el('div', { style:{ marginBottom:'16px' } }, [
      el('label', { class:'field-label' }, ['One struggle 😤']),
      el('input', { class:'field-input', placeholder:'Something that was hard…', value:logForm.struggle, onInput: function(e){ logForm.struggle = e.target.value; } })
    ]));
    formCard.appendChild(el('button', { class:'btn-primary', style:{ width:'100%', justifyContent:'center' }, onClick: function(){
      const entry = Object.assign({ id:'l'+Date.now(), date:today }, logForm);
      setStore(function(s){
        const next = s.logs.filter(function(l){ return l.date!==today; }).concat([entry]).sort(function(a,b){ return a.date.localeCompare(b.date); });
        return Object.assign({}, s, { logs: next });
      });
    } }, [saved ? "✓ Logged for today" : "Save Today's Log"]));
    grid.appendChild(formCard);

    // Right column
    const rightCol = el('div', { style:{ display:'flex', flexDirection:'column', gap:'16px' } }, []);
    const glanceCard = el('div', { class:'card', style:{ padding:'16px' } }, [
      el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'14px' } }, ['Today at a glance'])
    ]);
    const glanceGrid = el('div', { class:'grid-3', style:{ gap:'12px' } }, []);
    [
      { l:'Mood', v:logForm.mood, m:10, c:'#6366F1', e:MOOD_E[logForm.mood] },
      { l:'Sleep', v:logForm.sleep, m:12, c:'#38BDF8', e:'😴' },
      { l:'Energy', v:logForm.energy, m:10, c:'#F59E0B', e:'⚡' }
    ].forEach(function(x){
      glanceGrid.appendChild(el('div', { style:{ textAlign:'center', padding:'12px 8px', borderRadius:'12px', background:x.c+'15' } }, [
        el('div', { style:{ fontSize:'20px', marginBottom:'4px' } }, [x.e]),
        el('div', { style:{ fontWeight:'800', color:'#F1F5F9', fontSize:'18px' } }, [String(x.v)]),
        el('div', { style:{ color:'#94A3B8', fontSize:'11px', marginBottom:'6px' } }, [x.l]),
        el('div', { style:{ height:'3px', borderRadius:'2px', background:'#1E2D45', overflow:'hidden' } }, [
          el('div', { style:{ height:'100%', borderRadius:'2px', width:(x.v/x.m*100)+'%', background:x.c } }, [])
        ])
      ]));
    });
    glanceCard.appendChild(glanceGrid);
    rightCol.appendChild(glanceCard);

    const chartData = logs.slice(-14).map(function(l){ return { date:l.date.slice(5), mood:l.mood, sleep:l.sleep, energy:l.energy }; });
    if (chartData.length > 2) {
      const trendCard = el('div', { class:'card', style:{ padding:'16px' } }, [
        el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'12px' } }, ['14-Day Trend'])
      ]);
      trendCard.appendChild(multiLineChart(chartData, ['mood','sleep','energy'], ['#6366F1','#38BDF8','#F59E0B'], 280, 110));
      const legendRow = el('div', { style:{ display:'flex', gap:'16px', marginTop:'8px', justifyContent:'center' } }, []);
      [['Mood','#6366F1'],['Sleep','#38BDF8'],['Energy','#F59E0B']].forEach(function(p){
        legendRow.appendChild(el('div', { style:{ display:'flex', alignItems:'center', gap:'5px' } }, [
          el('div', { style:{ width:'14px', height:'2px', borderRadius:'1px', background:p[1] } }, []),
          el('span', { style:{ color:'#94A3B8', fontSize:'10px' } }, [p[0]])
        ]));
      });
      trendCard.appendChild(legendRow);
      rightCol.appendChild(trendCard);
    }
    grid.appendChild(rightCol);
    container.appendChild(grid);
  } else {
    const list = el('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } }, []);
    logs.slice().reverse().forEach(function(l){
      list.appendChild(el('div', { class:'card', style:{ padding:'12px 16px', display:'flex', alignItems:'center', gap:'24px' } }, [
        el('div', { style:{ textAlign:'center', minWidth:'50px' } }, [
          el('div', { style:{ fontWeight:'700', fontSize:'12px', color:'#F1F5F9' } }, [l.date.slice(5)]),
          el('div', { style:{ color:'#94A3B8', fontSize:'10px' } }, [new Date(l.date).toLocaleDateString('en',{weekday:'short'})])
        ]),
        el('div', { style:{ display:'flex', gap:'20px', flex:'1' } }, [
          { e:MOOD_E[l.mood], v:l.mood, label:'Mood' }, { e:'😴', v:l.sleep+'h', label:'Sleep' }, { e:'⚡', v:l.energy+'/10', label:'Energy' }
        ].map(function(m){
          return el('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } }, [
            el('span', { style:{ fontSize:'14px' } }, [m.e]),
            el('div', {}, [
              el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9' } }, [String(m.v)]),
              el('div', { style:{ color:'#94A3B8', fontSize:'10px' } }, [m.label])
            ])
          ]);
        })),
        el('div', { style:{ flex:'1', textAlign:'right' } }, [
          l.win ? el('div', { style:{ fontSize:'11px', color:'#10B981', marginBottom:'2px' } }, ['✓ '+l.win]) : null,
          l.struggle ? el('div', { style:{ fontSize:'11px', color:'#94A3B8' } }, ['↳ '+l.struggle]) : null
        ])
      ]));
    });
    container.appendChild(list);
  }

  return container;
}

/* ============================ FINANCE ============================ */
const CATS_F = ['Food','Transport','Shopping','Entertainment','Health','Utilities','Other'];
const CAT_C = { Food:'#F59E0B', Transport:'#38BDF8', Shopping:'#A78BFA', Entertainment:'#F43F5E', Health:'#10B981', Utilities:'#6366F1', Other:'#94A3B8', Savings:'#34D399' };
const CAT_E = { Food:'🍔', Transport:'🚗', Shopping:'🛍', Entertainment:'🎬', Health:'💊', Utilities:'⚡', Savings:'💰', Other:'📦' };
let financeForm = { type:'expense', category:'Food', amount:'', note:'', date: fmtDate(0) };
let financeShowForm = false;

function Finance(){
  const store = STATE.store;
  const entries = (store.finance && store.finance.entries) || [];
  const income = (store.finance && store.finance.monthlyIncome) || 45000;
  const expenses = entries.filter(function(e){return e.type==='expense';});
  const savings = entries.filter(function(e){return e.type==='savings';});
  const totalExp = expenses.reduce(function(a,e){return a+e.amount;},0);
  const totalSav = savings.reduce(function(a,e){return a+e.amount;},0);
  const balance = income - totalExp - totalSav;
  const budgetPct = Math.round((totalExp/income)*100);

  const byCatMap = {};
  expenses.forEach(function(e){ byCatMap[e.category] = (byCatMap[e.category]||0) + e.amount; });
  const byCat = Object.keys(byCatMap).map(function(name){ return { name:name, value:byCatMap[name] }; });

  const weekData = [];
  for (let i=6;i>=0;i--) {
    const d = fmtDate(-i);
    weekData.push({ date:d.slice(5), spent: expenses.filter(function(e){return e.date===d;}).reduce(function(a,e){return a+e.amount;},0) });
  }

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);
  container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
    el('div', {}, [
      el('h2', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['Finance Pulse']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, ['Track spending, savings & patterns'])
    ]),
    el('button', { class:'btn-primary', onClick: function(){ financeShowForm = !financeShowForm; render(); } }, ['＋ Add Entry'])
  ]));

  const summaryGrid = el('div', { class:'grid-4', style:{ marginBottom:'20px' } }, []);
  [
    { label:'Monthly Income', value:income, color:'#10B981' },
    { label:'Total Spent', value:totalExp, color:'#F43F5E' },
    { label:'Saved', value:totalSav, color:'#6366F1' },
    { label:'Remaining', value:balance, color: balance>=0?'#38BDF8':'#F43F5E' },
  ].forEach(function(s){
    summaryGrid.appendChild(el('div', { class:'card', style:{ padding:'16px' } }, [
      el('div', { style:{ color:'#94A3B8', fontSize:'11px', marginBottom:'4px' } }, [s.label]),
      el('div', { style:{ fontWeight:'900', fontSize:'20px', color:s.color } }, ['₹'+Math.abs(s.value).toLocaleString('en-IN')])
    ]));
  });
  container.appendChild(summaryGrid);

  const budgetCard = el('div', { class:'card', style:{ padding:'12px 16px', marginBottom:'20px' } }, [
    el('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:'6px', fontSize:'13px' } }, [
      el('span', { style:{ color:'#F1F5F9', fontWeight:'500' } }, ['Budget used']),
      el('span', { style:{ fontWeight:'700', color: budgetPct>80?'#F43F5E':'#10B981' } }, [budgetPct+'%'])
    ]),
    el('div', { style:{ height:'8px', borderRadius:'4px', background:'#1E2D45', overflow:'hidden' } }, [
      el('div', { style:{ height:'100%', borderRadius:'4px', width:Math.min(budgetPct,100)+'%', background: budgetPct>80?'#F43F5E':'#10B981', transition:'width .7s' } }, [])
    ]),
    budgetPct>80 ? el('p', { style:{ color:'#F43F5E', fontSize:'11px', marginTop:'5px' } }, ["⚠️ You've used "+budgetPct+"% of income on expenses"]) : null
  ]);
  container.appendChild(budgetCard);

  const chartsGrid = el('div', { class:'grid-2', style:{ marginBottom:'20px' } }, []);
  const pieCard = el('div', { class:'card', style:{ padding:'16px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'12px' } }, ['Spending by Category'])
  ]);
  if (byCat.length) {
    const row = el('div', { style:{ display:'flex', alignItems:'center', gap:'16px' } }, []);
    row.appendChild(donutChart(byCat, CAT_C, 120, 32, 55));
    const legend = el('div', { style:{ display:'flex', flexDirection:'column', gap:'6px', flex:'1' } }, []);
    byCat.slice(0,5).forEach(function(c){
      legend.appendChild(el('div', { style:{ display:'flex', alignItems:'center', gap:'8px' } }, [
        el('div', { style:{ width:'8px', height:'8px', borderRadius:'50%', background:CAT_C[c.name]||'#94A3B8', flexShrink:'0' } }, []),
        el('span', { style:{ color:'#94A3B8', fontSize:'11px', flex:'1' } }, [c.name]),
        el('span', { style:{ color:'#F1F5F9', fontSize:'11px', fontWeight:'700' } }, ['₹'+c.value.toLocaleString('en-IN')])
      ]));
    });
    row.appendChild(legend);
    pieCard.appendChild(row);
  } else {
    pieCard.appendChild(el('div', { style:{ color:'#94A3B8', textAlign:'center', padding:'30px 0', fontSize:'13px' } }, ['No expenses yet']));
  }
  chartsGrid.appendChild(pieCard);

  const barCard = el('div', { class:'card', style:{ padding:'16px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'12px' } }, ['Daily Spend (7 days)'])
  ]);
  barCard.appendChild(barChart(weekData, 'spent', '#6366F1', 280, 130));
  chartsGrid.appendChild(barCard);
  container.appendChild(chartsGrid);

  if (financeShowForm) {
    container.appendChild(FinanceForm());
  }

  container.appendChild(el('div', { style:{ fontSize:'11px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' } }, ['Recent Transactions']));
  const list = el('div', { style:{ display:'flex', flexDirection:'column', gap:'6px' } }, []);
  entries.slice().reverse().slice(0,12).forEach(function(e){
    list.appendChild(el('div', { class:'card', style:{ padding:'10px 14px', display:'flex', alignItems:'center', gap:'12px' } }, [
      el('div', { style:{ width:'34px', height:'34px', borderRadius:'8px', background:(CAT_C[e.category]||'#94A3B8')+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:'0' } }, [CAT_E[e.category]||'💸']),
      el('div', { style:{ flex:'1' } }, [
        el('div', { style:{ color:'#F1F5F9', fontSize:'12px', fontWeight:'500' } }, [e.note||e.category]),
        el('div', { style:{ color:'#94A3B8', fontSize:'10px', marginTop:'1px' } }, [e.date+' · '+e.category])
      ]),
      el('div', { style:{ fontWeight:'700', fontSize:'13px', color: e.type==='savings'?'#10B981':'#F43F5E' } }, [(e.type==='savings'?'+':'-')+'₹'+e.amount.toLocaleString('en-IN')]),
      el('button', { class:'icon-btn', onClick: function(){ setStore(function(s){ return Object.assign({}, s, { finance: Object.assign({}, s.finance, { entries: s.finance.entries.filter(function(x){return x.id!==e.id;}) }) }); }); } }, ['✕'])
    ]));
  });
  container.appendChild(list);

  return container;
}

function FinanceForm(){
  function field(label, inputEl){ return el('div', {}, [el('label', { class:'field-label' }, [label]), inputEl]); }
  const typeSelect = el('select', { class:'field-input' }, ['expense','savings'].map(function(t){
    const opt = el('option', { value:t }, [t.charAt(0).toUpperCase()+t.slice(1)]);
    if (t === financeForm.type) opt.setAttribute('selected','selected');
    return opt;
  }));
  typeSelect.addEventListener('change', function(e){ financeForm.type = e.target.value; financeForm.category = e.target.value==='savings'?'Savings':'Food'; render(); });

  const catOptions = (financeForm.type==='savings' ? ['Savings'] : CATS_F);
  const catSelect = el('select', { class:'field-input' }, catOptions.map(function(c){
    const opt = el('option', { value:c }, [c]);
    if (c === financeForm.category) opt.setAttribute('selected','selected');
    return opt;
  }));
  catSelect.addEventListener('change', function(e){ financeForm.category = e.target.value; });

  const amountInput = el('input', { type:'number', class:'field-input', value:financeForm.amount, onInput:function(e){ financeForm.amount = e.target.value; } });
  const dateInput = el('input', { type:'date', class:'field-input', value:financeForm.date, onInput:function(e){ financeForm.date = e.target.value; } });
  const noteInput = el('input', { class:'field-input', value:financeForm.note, onInput:function(e){ financeForm.note = e.target.value; } });

  const grid = el('div', { class:'grid-2', style:{ gap:'10px', marginBottom:'12px' } }, [
    field('Type', typeSelect),
    field('Category', catSelect),
    field('Amount (₹)', amountInput),
    field('Date', dateInput),
  ]);
  grid.appendChild(el('div', { style:{ gridColumn:'1/-1' } }, [field('Note', noteInput)]));

  return el('div', { class:'card slide-up', style:{ padding:'20px', marginBottom:'20px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'14px' } }, ['New Entry']),
    grid,
    el('div', { style:{ display:'flex', gap:'8px' } }, [
      el('button', { class:'btn-primary', onClick: function(){
        if (!financeForm.amount) return;
        const e = Object.assign({ id: Date.now().toString() }, financeForm, { amount:+financeForm.amount });
        setStore(function(s){ return Object.assign({}, s, { finance: Object.assign({}, s.finance, { entries: (s.finance.entries||[]).concat([e]) }) }); });
        financeForm = { type:'expense', category:'Food', amount:'', note:'', date: fmtDate(0) };
        financeShowForm = false; render();
      } }, ['Add']),
      el('button', { class:'btn-ghost', onClick: function(){ financeShowForm = false; render(); } }, ['Cancel'])
    ])
  ]);
}

/* ============================ HABITS ============================ */
const HICONS = ['🏃','📚','🥗','🧘','😴','💪','🚰','📝','🎯','🎸','🌅','🚴'];
const HCOLORS = ['#10B981','#6366F1','#F59E0B','#38BDF8','#F43F5E','#A78BFA'];
let habitForm = { name:'', icon:'🏃', color:'#10B981' };
let habitShowForm = false;

function Habits(){
  const store = STATE.store;
  const habits = store.habits || [];
  const today = fmtDate(0);
  const todayDone = habits.filter(function(h){ return h.lastToggle===today && (h.history||[]).slice(-1)[0]===true; }).length;
  const activeStreaks = habits.filter(function(h){ return h.streak>=3; }).length;

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);
  container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
    el('div', {}, [
      el('h2', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['Habit Engine']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, [todayDone+'/'+habits.length+' done today · '+activeStreaks+' active streaks'])
    ]),
    el('button', { class:'btn-primary', onClick: function(){ habitForm = { name:'', icon:'🏃', color:'#10B981' }; habitShowForm = !habitShowForm; render(); } }, ['＋ New Habit'])
  ]));

  if (habitShowForm) {
    container.appendChild(HabitForm());
  }

  const list = el('div', { style:{ display:'flex', flexDirection:'column', gap:'10px' } }, []);
  habits.forEach(function(h){
    const hist = (h.history||[]).slice(-30);
    const isTodayDone = h.lastToggle===today && hist.slice(-1)[0]===true;
    const weekRate = hist.slice(-7).filter(Boolean).length;

    const dotsRow = el('div', { style:{ display:'flex', gap:'3px' } }, hist.map(function(done){
      return el('div', { style:{ width:'9px', height:'9px', borderRadius:'50%', background: done?h.color:'#1E2D45', opacity: done?'1':'0.5' } }, []);
    }));

    const card = el('div', { class:'card', style:{ padding:'16px' } }, [
      el('div', { style:{ display:'flex', alignItems:'center', gap:'14px' } }, [
        el('button', { style:{ width:'50px', height:'50px', borderRadius:'12px', background: isTodayDone?h.color+'30':'#1E2D45', border:'2px solid '+(isTodayDone?h.color:'#1E2D45'), cursor:'pointer', fontSize:'22px', flexShrink:'0', transition:'all .2s', transform: isTodayDone?'scale(1.05)':'scale(1)' }, onClick: function(){
          setStore(function(s){
            return Object.assign({}, s, { habits: s.habits.map(function(x){
              if (x.id !== h.id) return x;
              const wasToday = x.lastToggle===today && (x.history||[]).slice(-1)[0]===true;
              const hh = x.history || [];
              if (wasToday) return Object.assign({}, x, { history: hh.slice(0,-1).concat([false]), streak: Math.max(0, x.streak-1), lastToggle: today });
              return Object.assign({}, x, { history: hh.concat([true]), streak: (x.streak||0)+1, lastToggle: today });
            }) });
          });
        } }, [h.icon]),
        el('div', { style:{ flex:'1', minWidth:'0' } }, [
          el('div', { style:{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' } }, [
            el('span', { style:{ color:'#F1F5F9', fontWeight:'600', fontSize:'13px' } }, [h.name]),
            h.streak>=3 ? el('span', { style:{ fontSize:'11px', fontWeight:'700', color:h.color } }, ['🔥 '+h.streak]) : null,
            isTodayDone ? el('span', { class:'pill', style:{ background:h.color+'20', color:h.color } }, ['✓ Done']) : null
          ]),
          dotsRow
        ]),
        el('div', { style:{ textAlign:'right', flexShrink:'0' } }, [
          el('div', { style:{ fontSize:'10px', color:'#94A3B8' } }, ['This week']),
          el('div', { style:{ fontWeight:'700', color:'#F1F5F9', fontSize:'15px' } }, [weekRate+'/7']),
          el('div', { style:{ fontSize:'10px', color:'#94A3B8', marginTop:'2px' } }, ['Streak: ', el('span', { style:{ fontWeight:'700', color:h.color } }, [String(h.streak)])])
        ]),
        el('button', { class:'icon-btn', style:{ marginLeft:'8px' }, onClick: function(){ setStore(function(s){ return Object.assign({}, s, { habits: s.habits.filter(function(x){return x.id!==h.id;}) }); }); } }, ['🗑'])
      ])
    ]);
    list.appendChild(card);
  });
  container.appendChild(list);

  if (!habits.length) {
    container.appendChild(el('div', { class:'card', style:{ padding:'60px', textAlign:'center' } }, [
      el('div', { style:{ fontSize:'40px', marginBottom:'12px' } }, ['🔥']),
      el('div', { style:{ color:'#F1F5F9', fontWeight:'600', marginBottom:'6px' } }, ['No habits yet']),
      el('div', { style:{ color:'#94A3B8', fontSize:'13px' } }, ['Add a habit and start building streaks.'])
    ]));
  }

  if (habits.length) {
    const highMood = store.logs.filter(function(l){return l.mood>=7;});
    const lowMood = store.logs.filter(function(l){return l.mood<7;});
    const highAvg = highMood.length ? (highMood.reduce(function(a,l){return a+l.mood;},0)/highMood.length).toFixed(1) : '—';
    const lowAvg = lowMood.length ? (lowMood.reduce(function(a,l){return a+l.mood;},0)/lowMood.length).toFixed(1) : '—';
    container.appendChild(el('div', { class:'insight-card', style:{ padding:'16px', marginTop:'16px' } }, [
      el('div', { style:{ fontSize:'11px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' } }, ['✨ Habit–Mood Correlation']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', lineHeight:'1.6' } }, [
        'On days you rate your mood ', el('span', { style:{ color:'#F1F5F9', fontWeight:'600' } }, ['7+']), ', your average is ',
        el('span', { style:{ color:'#6366F1', fontWeight:'700' } }, [highAvg+'/10']), ' — vs ',
        el('span', { style:{ color:'#F1F5F9', fontWeight:'600' } }, [lowAvg+'/10']), ' on lower days. Complete more habits to shift this ratio.'
      ])
    ]));
  }

  return container;
}

function HabitForm(){
  const nameInput = el('input', { class:'field-input', style:{ marginBottom:'12px' }, placeholder:'Habit name…', value:habitForm.name, onInput:function(e){ habitForm.name = e.target.value; } });
  const iconRow = el('div', { style:{ display:'flex', flexWrap:'wrap', gap:'6px' } }, HICONS.map(function(ic){
    return el('button', { style:{ width:'38px', height:'38px', borderRadius:'8px', border:'2px solid '+(habitForm.icon===ic?'#6366F1':'transparent'), background: habitForm.icon===ic?'#6366F130':'#1E2D45', cursor:'pointer', fontSize:'17px' }, onClick: function(){ habitForm.icon = ic; render(); } }, [ic]);
  }));
  const colorRow = el('div', { style:{ display:'flex', gap:'8px' } }, HCOLORS.map(function(c){
    return el('button', { style:{ width:'28px', height:'28px', borderRadius:'50%', background:c, border:'3px solid '+(habitForm.color===c?'white':'transparent'), cursor:'pointer' }, onClick: function(){ habitForm.color = c; render(); } }, []);
  }));

  return el('div', { class:'card slide-up', style:{ padding:'20px', marginBottom:'20px' } }, [
    el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'14px' } }, ['New Habit']),
    nameInput,
    el('div', { style:{ marginBottom:'12px' } }, [el('label', { class:'field-label' }, ['Icon']), iconRow]),
    el('div', { style:{ marginBottom:'16px' } }, [el('label', { class:'field-label' }, ['Color']), colorRow]),
    el('div', { style:{ display:'flex', gap:'8px' } }, [
      el('button', { class:'btn-primary', onClick: function(){
        if (!habitForm.name.trim()) return;
        const h = { id: Date.now().toString(), name:habitForm.name, icon:habitForm.icon, color:habitForm.color, streak:0, history:Array(30).fill(false), lastToggle:null };
        setStore(function(s){ return Object.assign({}, s, { habits: (s.habits||[]).concat([h]) }); });
        habitForm = { name:'', icon:'🏃', color:'#10B981' }; habitShowForm = false; render();
      } }, ['Add']),
      el('button', { class:'btn-ghost', onClick: function(){ habitShowForm = false; render(); } }, ['Cancel'])
    ])
  ]);
}

/* ============================ INSIGHTS ============================ */
const INS_TYPES = {
  positive: { icon:'📈', color:'#10B981', bg:'#10B98115', label:'Pattern Found' },
  warning:  { icon:'⚠️', color:'#F59E0B', bg:'#F59E0B15', label:'Watch Out' },
  negative: { icon:'📉', color:'#F43F5E', bg:'#F43F5E15', label:'Risk Spotted' },
  tip:      { icon:'💡', color:'#38BDF8', bg:'#38BDF815', label:'Suggestion' },
};
let insightsLoading = false;
let insightsError = null;

function buildSummary(s){
  const logs = s.logs || [];
  const recent = logs.slice(-7);
  const avgMood = recent.length ? (recent.reduce(function(a,l){return a+l.mood;},0)/recent.length).toFixed(1) : 'N/A';
  const avgSleep = recent.length ? (recent.reduce(function(a,l){return a+l.sleep;},0)/recent.length).toFixed(1) : 'N/A';
  const avgEnergy = recent.length ? (recent.reduce(function(a,l){return a+l.energy;},0)/recent.length).toFixed(1) : 'N/A';
  const lowSleep = recent.filter(function(l){return l.sleep<6;}).length;
  const entries = (s.finance && s.finance.entries) || [];
  const exp = entries.filter(function(e){return e.type==='expense';}).reduce(function(a,e){return a+e.amount;},0);
  const sav = entries.filter(function(e){return e.type==='savings';}).reduce(function(a,e){return a+e.amount;},0);
  const inc = (s.finance && s.finance.monthlyIncome) || 0;
  const byCat = {};
  entries.filter(function(e){return e.type==='expense';}).forEach(function(e){ byCat[e.category] = (byCat[e.category]||0)+e.amount; });
  const topCatArr = Object.keys(byCat).map(function(k){return [k, byCat[k]];}).sort(function(a,b){return b[1]-a[1];});
  const topCat = topCatArr[0];
  const habits = s.habits || [];
  const activeStr = habits.filter(function(h){return h.streak>=3;}).map(function(h){return h.name+'('+h.streak+'d)';}).join(', ');
  const goals = s.goals || [];
  const gProgress = goals.map(function(g){return g.title+':'+Math.round((g.current/g.target)*100)+'%';}).join(', ');
  const highSleepHighMood = recent.filter(function(l){return l.sleep>=7 && l.mood>=7;}).length;
  const lowSleepLowMood = recent.filter(function(l){return l.sleep<6 && l.mood<=5;}).length;
  return 'MOOD(7d):avg '+avgMood+'/10\nSLEEP(7d):avg '+avgSleep+'h,'+lowSleep+' nights<6h\nENERGY(7d):avg '+avgEnergy+'/10\n' +
    'SLEEP-MOOD:'+highSleepHighMood+'/7 days good sleep+good mood;'+lowSleepLowMood+'/7 poor+poor\n' +
    'FINANCE:Income₹'+inc+',Expenses₹'+exp+'('+Math.round((exp/inc)*100)+'%),Saved₹'+sav+'\n' +
    'TOP_SPEND:'+(topCat?topCat[0]+'₹'+topCat[1]:'none')+'\n' +
    'HABITS:'+habits.length+' tracked.Active streaks:'+(activeStr||'none')+'\n' +
    'GOALS:'+(gProgress||'none')+'\n' +
    'WINS:'+recent.map(function(l){return l.win;}).filter(Boolean).join(';')+'\n' +
    'STRUGGLES:'+recent.map(function(l){return l.struggle;}).filter(Boolean).join(';');
}

function generateInsights(){
  insightsLoading = true; insightsError = null; render();
  const summary = buildSummary(STATE.store);
  const prompt = 'You are a personal life coach AI. Analyse this person\'s life data and generate 6 powerful, specific, cross-domain insights. Each insight must connect data from DIFFERENT life areas (sleep→spending, habits→mood, etc.).\n\nDATA:\n' + summary +
    '\n\nReturn ONLY a JSON array of exactly 6 objects, no markdown:\n[{"text":"specific data-driven insight connecting two life areas, max 2 sentences","type":"positive|negative|warning|tip","category":"Health & Habits|Finance & Behaviour|Goals & Progress|Mindset & Patterns"}]';

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1000, messages:[{ role:'user', content:prompt }] })
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    const raw = (data.content && data.content[0] && data.content[0].text) || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const withIds = parsed.map(function(ins, i){ return Object.assign({}, ins, { id: Date.now()+i }); });
    setStore(function(s){ return Object.assign({}, s, { insights: withIds, insightsLastGenerated: new Date().toISOString() }); });
    insightsLoading = false; render();
  })
  .catch(function(e){
    insightsError = 'Could not generate insights. Make sure you have data across modules.';
    insightsLoading = false; render();
  });
}

function Insights(){
  const store = STATE.store;
  const insights = store.insights || [];
  const lastGen = store.insightsLastGenerated ? new Date(store.insightsLastGenerated).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : null;

  const container = el('div', { style:{ padding:'24px' }, class:'fade-in' }, []);
  container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' } }, [
    el('div', {}, [
      el('h2', { style:{ fontSize:'22px', fontWeight:'800', color:'#F1F5F9' } }, ['AI Insights']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', marginTop:'3px' } }, ['Cross-pattern intelligence from your life data'])
    ]),
    el('button', { class:'btn-primary', disabled: insightsLoading, onClick: generateInsights }, insightsLoading ? [el('span', { class:'spin' }, ['↻']), ' Analysing…'] : ['✨ Generate Insights'])
  ]));

  container.appendChild(el('div', { class:'card', style:{ padding:'16px', marginBottom:'20px', borderColor:'#6366F130', background:'linear-gradient(135deg,#0F1623,#141E2E)' } }, [
    el('div', { style:{ display:'flex', gap:'12px', alignItems:'flex-start' } }, [
      el('div', { style:{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#6366F1,#38BDF8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:'0', fontSize:'14px' } }, ['✨']),
      el('div', {}, [
        el('div', { style:{ fontWeight:'600', fontSize:'13px', color:'#F1F5F9', marginBottom:'4px' } }, ['How AI Insights work']),
        el('p', { style:{ color:'#94A3B8', fontSize:'12px', lineHeight:'1.7' } }, ['LifeOS analyses patterns across all modules — connecting sleep to spending, mood to goal progress, streaks to energy. These cross-domain correlations no single app can surface. Click Generate to run analysis on your latest data.'])
      ])
    ])
  ]));

  const healthGrid = el('div', { class:'grid-4', style:{ marginBottom:'20px' } }, []);
  [
    { label:'Log entries', value: (store.logs||[]).length, min:5, icon:'📓' },
    { label:'Goals', value: (store.goals||[]).length, min:1, icon:'🎯' },
    { label:'Finance entries', value: ((store.finance&&store.finance.entries)||[]).length, min:3, icon:'💸' },
    { label:'Habits', value: (store.habits||[]).length, min:2, icon:'🔥' },
  ].forEach(function(d){
    const ok = d.value >= d.min;
    healthGrid.appendChild(el('div', { class:'card', style:{ padding:'14px', textAlign:'center' } }, [
      el('div', { style:{ fontSize:'22px', marginBottom:'6px' } }, [d.icon]),
      el('div', { style:{ fontWeight:'800', color:'#F1F5F9', fontSize:'18px' } }, [String(d.value)]),
      el('div', { style:{ color:'#94A3B8', fontSize:'11px', margin:'2px 0 4px' } }, [d.label]),
      el('div', { style:{ fontSize:'10px', fontWeight:'600', color: ok?'#10B981':'#F59E0B' } }, [ok ? '✓ Good' : ('Need '+(d.min-d.value)+' more')])
    ]));
  });
  container.appendChild(healthGrid);

  if (insightsError) {
    container.appendChild(el('div', { class:'card', style:{ padding:'14px', color:'#F43F5E', fontSize:'13px', marginBottom:'16px', borderColor:'#F43F5E40', background:'#F43F5E10' } }, ['⚠️ ' + insightsError]));
  }

  if (insightsLoading) {
    const grid = el('div', { class:'grid-2' }, []);
    for (let i=0;i<6;i++){
      grid.appendChild(el('div', { class:'card pulse', style:{ padding:'20px' } }, [
        el('div', { style:{ height:'10px', borderRadius:'5px', background:'#1E2D45', width:'40%', marginBottom:'10px' } }, []),
        el('div', { style:{ height:'10px', borderRadius:'5px', background:'#1E2D45', width:'100%', marginBottom:'6px' } }, []),
        el('div', { style:{ height:'10px', borderRadius:'5px', background:'#1E2D45', width:'70%' } }, [])
      ]));
    }
    container.appendChild(grid);
  } else if (insights.length) {
    container.appendChild(el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' } }, [
      el('div', { style:{ fontSize:'11px', color:'#94A3B8', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em' } }, [insights.length+' insights'+(lastGen?(' · Generated '+lastGen):'')]),
      el('button', { style:{ background:'none', border:'none', color:'#6366F1', cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }, onClick: generateInsights }, ['Refresh ↺'])
    ]));
    const grid = el('div', { class:'grid-2' }, []);
    insights.forEach(function(ins){
      const m = INS_TYPES[ins.type] || INS_TYPES.tip;
      grid.appendChild(el('div', { class:'insight-card', style:{ padding:'20px' } }, [
        el('div', { style:{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' } }, [
          el('div', { style:{ width:'28px', height:'28px', borderRadius:'8px', background:m.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' } }, [m.icon]),
          el('span', { class:'pill', style:{ background:m.bg, color:m.color } }, [m.label]),
          el('span', { style:{ color:'#94A3B8', fontSize:'10px', marginLeft:'auto' } }, [ins.category||''])
        ]),
        el('p', { style:{ color:'#F1F5F9', fontSize:'13px', lineHeight:'1.7' } }, [ins.text])
      ]));
    });
    container.appendChild(grid);
  } else {
    container.appendChild(el('div', { class:'card', style:{ padding:'60px', textAlign:'center' } }, [
      el('div', { style:{ fontSize:'50px', marginBottom:'16px' } }, ['✨']),
      el('div', { style:{ color:'#F1F5F9', fontWeight:'700', fontSize:'18px', marginBottom:'8px' } }, ['No insights yet']),
      el('p', { style:{ color:'#94A3B8', fontSize:'13px', maxWidth:'400px', margin:'0 auto 20px', lineHeight:'1.7' } }, ['Make sure you have logs, goals, habits, and finance entries — then click Generate to let AI find patterns across your life.']),
      el('button', { class:'btn-primary', onClick: generateInsights }, ['Generate My First Insights'])
    ]));
  }

  return container;
}

/* ============================ RENDER ============================ */
function render(){

    const root = document.getElementById('root');

    const app = el('div', {
        class:'app'
    }, []);

    app.appendChild(
        Sidebar()
    );

    let pageContent;

    switch(STATE.page){

        case 'dashboard':
            pageContent = Dashboard();
            break;

        case 'goals':
            pageContent = Goals();
            break;

        case 'log':
            pageContent = DailyLog();
            break;

        case 'finance':
            pageContent = Finance();
            break;

        case 'habits':
            pageContent = Habits();
            break;

        case 'insights':
            pageContent = Insights();
            break;

        default:
            pageContent = Dashboard();

    }

    const main = el('main',{
        class:'main'
    },[
        pageContent
    ]);

    app.appendChild(main);

    mount(root,[app]);

}

/* =====================================================
   LIFEOS V2.1
===================================================== */

function launchLifeOS(){

    const input = document.getElementById("username");

    let name = input.value.trim();

    if(name==="")
        name="Guest";

    localStorage.setItem(
        "lifeos_username",
        name
    );

    STATE.store.user.name = name;

    saveStore(
        STATE.store
    );

    const landing =
        document.getElementById(
            "landing-page"
        );

    landing.classList.add(
        "hide"
    );

    setTimeout(() => {

    landing.style.display = "none";

    const root = document.getElementById("root");
    root.style.display = "block";

    render();

}, 600);

}

window.addEventListener("DOMContentLoaded",()=>{

    const root =
        document.getElementById("root");

    root.style.display="none";

    const saved =
        localStorage.getItem(
            "lifeos_username"
        );

    if(saved){

        document.getElementById(
            "username"
        ).value = saved;

    }

    document
        .getElementById(
            "launchBtn"
        )
        .addEventListener(
            "click",
            launchLifeOS
        );

});