// ================== Config y deps ==================
console.log("app.js cargado ✅");

const ADMIN_PIN = "4321";
const VIEWER_PIN = "1234";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtTbQJaiZwNgBiPSO8BYlIvjL5R8IMPhE",
  authDomain: "partidosbayern.firebaseapp.com",
  databaseURL: "https://partidosbayern-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "partidosbayern",
  storageBucket: "partidosbayern.firebasestorage.app",
  messagingSenderId: "364993599171",
  appId: "1:364993599171:web:11d6b61692e8b545c9b476",
  measurementId: "G-8SPZ7FJDYS"
};

const appFB = initializeApp(firebaseConfig);
const db = getDatabase(appFB);
const el = (id) => document.getElementById(id);

// ================== Marcador / Reloj ==================
const matchRef = ref(db, "matches/current");
let state = {
  nameA: "Local",
  nameB: "Visitante",
  scoreA: 0,
  scoreB: 0,
  seconds: 0,
  running: false,
  lastStartAt: null,
  secondsBase: null
};

const nameAEl = el('nameA'), nameBEl = el('nameB'), scoreAEl = el('scoreA'), scoreBEl = el('scoreB'), timerEl = el('timer');

function fmtTime(total){
  total = Math.max(0, Math.floor(total||0));
  const m = String(Math.floor(total/60)).padStart(2,'0');
  const s = String(total%60).padStart(2,'0');
  return `${m}:${s}`;
}

function renderScore(){
  if (!nameAEl) return;
  nameAEl.textContent = state.nameA;
  nameBEl.textContent = state.nameB;
  scoreAEl.textContent = state.scoreA;
  scoreBEl.textContent = state.scoreB;
  timerEl.textContent  = fmtTime(state.seconds);
  if(el('admin')?.style.display!=='none'){
    if (el('inNameA')) el('inNameA').value = state.nameA;
    if (el('inNameB')) el('inNameB').value = state.nameB;
  }
}

onValue(matchRef, snap=>{
  const data = snap.val();
  if(data){ state = { ...state, ...data }; renderScore(); }
});

window.bump = (team, delta)=>{
  if(team==='A') update(matchRef, { scoreA: Math.max(0, (state.scoreA||0)+delta) });
  if(team==='B') update(matchRef, { scoreB: Math.max(0, (state.scoreB||0)+delta) });
};

function setRunning(r){
  if(r){
    const startMinEl = el('startMin');
    let base = state.running ? (state.secondsBase||0) : state.seconds;
    if(!state.running && base===0 && startMinEl){
      const m = parseInt(startMinEl.value || "0", 10);
      if(!Number.isNaN(m) && m>=0) base = m*60;
    }
    update(matchRef,{running:true,lastStartAt:Date.now(),secondsBase:base});
  }else{
    const now=Date.now(); const base=(state.secondsBase||0);
    const inc=state.lastStartAt?Math.floor((now-state.lastStartAt)/1000):0;
    update(matchRef,{running:false,seconds:base+inc,lastStartAt:null,secondsBase:null});
  }
}
window.timerStart = ()=>setRunning(true);
window.timerPause = ()=>setRunning(false);
window.timerReset = ()=>update(matchRef,{seconds:0,running:false,lastStartAt:null,secondsBase:null});

setInterval(()=>{
  if(state.running && state.lastStartAt){
    const now=Date.now();
    const base=(state.secondsBase||0);
    const elapsed=Math.floor((now-state.lastStartAt)/1000);
    timerEl.textContent=fmtTime(base+elapsed);
  }
},250);

function bindNameInputs(){
  const a=el('inNameA'), b=el('inNameB');
  if(a) a.addEventListener('change', ()=>update(matchRef,{nameA:a.value}));
  if(b) b.addEventListener('change', ()=>update(matchRef,{nameB:b.value}));
}

onValue(matchRef, snap=>{
  if(!snap.exists()){ set(matchRef,state); }
},{onlyOnce:true});

// ================== Twitch ==================
function mountTwitch(){
  const channel = "Bayerndeloscaidos2020";
  let parent = window.location.hostname || "localhost";
  const url = `https://player.twitch.tv/?channel=${channel}&parent=${parent}`;
  const iframe = el('player');
  if (iframe) {
    iframe.src = url;
    iframe.style.display = 'block';
  }
}

// ================== SUPLENTES ==================
const subsRef = ref(db, "subs");
const SUB_SLOTS = ["S1","S2","S3","S4","S5","S6"];
let subsState = {};

// ================== LINEUP / CAMPO ==================
const lineupRef = ref(db, "lineup");

// === UI (formación + stats URL) ===
const uiRef = ref(db, "ui");
const DEFAULT_FORMATION = "1-2-3-1";

// 7 ranuras canónicas
const SLOTS = ["GK", "DF1", "DF2", "M1", "M2", "M3", "ST"];

// Definición de formaciones (coordenadas % sobre 16:9)
const FORMATIONS = {
  "1-2-3-1": {
    GK:  { x:  8, y: 50 },
    DF1: { x: 25, y: 32 },
    DF2: { x: 25, y: 68 },
    M1:  { x: 50, y: 22 },
    M2:  { x: 50, y: 50 },
    M3:  { x: 50, y: 78 },
    ST:  { x: 72, y: 50 },
  },
  "1-3-2-1": {
    GK:  { x:  8, y: 50 },
    DF1: { x: 30, y: 22 },
    DF2: { x: 30, y: 50 },
    DF3: { x: 30, y: 78 },
    M1:  { x: 58, y: 38 },
    M2:  { x: 58, y: 62 },
    ST:  { x: 72, y: 50 },
  },
};

// === Helpers imágenes / placeholders ===
function sanitizeImageUrl(url){
  if(!url) return "";
  url = url.trim();
  if(url.startsWith("http://")) url = "https://" + url.slice(7);
  return url;
}

const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'>
    <rect width='100%' height='100%' fill='#111'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='system-ui,Segoe UI,Roboto,Arial' font-size='20' fill='#bbb'>
      Jugador
    </text>
  </svg>
`);

// ====== Alineación (titulares) ======
let lineupState = {};
let currentFormation = DEFAULT_FORMATION;

function getPositionsForCurrent() {
  const base = FORMATIONS[currentFormation] || FORMATIONS[DEFAULT_FORMATION];
  const pos = { ...base };
  if (pos.DF3 && !lineupState.DF3 && lineupState.M1) pos.__DF3_from_M1 = true;
  return pos;
}

/* ================== INDEX DE JUGADORES (nombre → imagen) ==================
   - playersRef = /players  (clave = nombre normalizado, valor = { name, img })
   - Autoaplica imagen cuando hay nombre y no hay img
   - Cuando el admin guarda una nueva URL, se persiste en /players
========================================================================== */
const playersRef = ref(db, "players");
let playersIndex = {};
const nameKey = (n)=> normName(n||""); // reutiliza normName de abajo

onValue(playersRef, snap=>{
  playersIndex = snap.val() || {};
  fillMissingImagesFromIndex(); // si llega/actualiza el índice, intentamos rellenar huecos
});

function getImgByName(name){
  const k = nameKey(name);
  const rec = playersIndex?.[k];
  return (rec && rec.img) ? sanitizeImageUrl(rec.img) : "";
}

function saveImgForName(name, img){
  const k = nameKey(name);
  const url = sanitizeImageUrl(img||"");
  if(!k || !url) return;
  update(playersRef, { [k]: { name: (name||"").trim(), img: url } });
}

function fillMissingImagesFromIndex(){
  // titulares
  const upLineup = {};
  Object.entries(lineupState || {}).forEach(([slot, data])=>{
    if(!data) return;
    const nm = data.name || "";
    if(nm && (!data.img || data.img.trim()==="")){
      const found = getImgByName(nm);
      if(found) upLineup[slot] = { ...data, img: found };
    }
  });
  if(Object.keys(upLineup).length) update(lineupRef, upLineup);

  // suplentes
  const upSubs = {};
  Object.entries(subsState || {}).forEach(([slot, data])=>{
    if(!data) return;
    const nm = data.name || "";
    if(nm && (!data.img || data.img.trim()==="")){
      const found = getImgByName(nm);
      if(found) upSubs[slot] = { ...data, img: found };
    }
  });
  if(Object.keys(upSubs).length) update(subsRef, upSubs);
}
// ========================================================================

function createPlayerCardAt(id, coords, data, isAdmin){
  const card = document.createElement('div');
  card.className = "player-card" + (isAdmin ? " admin-edit" : "");
  card.style.left = coords.x + "%";
  card.style.top  = coords.y + "%";

  const img = document.createElement('img');
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  const candidate = sanitizeImageUrl(data?.img || getImgByName(data?.name) || "");
  img.src = candidate || "https://via.placeholder.com/300x400?text=Jugador";
  img.alt = data?.name || id;
  img.onerror = ()=>{ img.src = FALLBACK_IMG; };

  const label = document.createElement('div');
  label.className = "label";
  label.textContent = (data?.name || id);

  card.appendChild(img);
  card.appendChild(label);

  if(isAdmin){
    card.addEventListener('click', ()=> editPlayerAt(id, data || {}));
  }
  return card;
}

function editPlayerAt(slotId, current={}){
  const name = prompt(`Nombre para ${slotId}:`, current.name || "");
  if(name === null) return;

  // Sugerimos la imagen guardada para ese nombre (o la actual si hay)
  const suggested = getImgByName(name) || current.img || "";
  const img  = prompt("URL de imagen (jpg/png):", suggested);
  if(img === null) return;

  const cleanImg = (img||"").trim();
  const updates = {};
  updates[slotId] = { name: (name||"").trim() || slotId, img: cleanImg };

  update(lineupRef, updates);

  // Si hay URL, la persistimos en el index global
  if(cleanImg) saveImgForName(name, cleanImg);
}

function renderLineup(){
  const wrap = el("pitch-cards");
  if(!wrap) return;
  wrap.innerHTML = "";

  const isAdmin = el('admin')?.style.display !== 'none';
  const help = el('lineup-help');
  if(help) help.style.display = isAdmin ? 'block' : 'none';

  const pos = getPositionsForCurrent();
  const order = ["GK","DF1","DF2","DF3","M1","M2","M3","ST"].filter(k=>pos[k] || pos[`__${k}_from_M1`]);

  order.forEach(id=>{
    let data = lineupState[id];
    let coords = pos[id];

    if (!coords && pos[`__${id}_from_M1`]) {
      coords = pos["DF3"];
      data = lineupState["M1"];
    }
    if (!coords) return;

    const card = createPlayerCardAt(id, coords, data, isAdmin);
    wrap.appendChild(card);
  });
}

// Load lineup & init defaults
onValue(lineupRef, snap=>{
  lineupState = snap.val() || {};
  renderLineup();
  fillMissingImagesFromIndex(); // intenta rellenar imágenes faltantes
  refreshStatsView();           // rehace la tabla con los nombres/slots actuales
});
onValue(lineupRef, snap=>{
  const exists = snap.exists();
  let needsUpdate = false;
  const init = exists ? { ...snap.val() } : {};

  if (!exists) {
    SLOTS.forEach(id => { init[id] = { name:id, img:"" }; });
    needsUpdate = true;
  } else {
    SLOTS.forEach(id=>{
      if(!init[id]){ init[id] = { name:id, img:"" }; needsUpdate = true; }
    });
  }
  if (needsUpdate) set(lineupRef, init);
}, { onlyOnce:true });

// ====== Formación (UI persisted) ======
function bindFormationSelect(){
  const sel = el('formationSel');
  if(!sel) return;
  sel.value = currentFormation;
  sel.addEventListener('change', ()=>{
    update(uiRef, { formation: sel.value });
  });
}

onValue(uiRef, snap=>{
  const ui = snap.val() || {};
  // formación
  currentFormation = ui.formation || DEFAULT_FORMATION;
  const sel = el('formationSel');
  if (sel) sel.value = currentFormation;
  renderLineup();

  // stats url
  if (ui.statsCsvUrl){
    const input = el('statsCsvUrl');
    if (input) input.value = ui.statsCsvUrl;
    loadStats(ui.statsCsvUrl);
  } else {
    setStatsMeta('');
    renderStatsTable();
  }
});
onValue(uiRef, snap=>{
  if(!snap.exists()){
    set(uiRef, { formation: DEFAULT_FORMATION });
  }
}, { onlyOnce:true });

// ====== Banquillo (suplentes) ======
function createSubCard(slotId, data, isAdmin){
  const card = document.createElement('div');
  card.className = "sub-card" + (isAdmin ? " admin-edit" : "");

  const img = document.createElement('img');
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  const candidate = sanitizeImageUrl(data?.img || getImgByName(data?.name) || "");
  img.src = candidate || "https://via.placeholder.com/300x400?text=Jugador";
  img.alt = data?.name || slotId;
  img.onerror = ()=>{ img.src = FALLBACK_IMG; };

  const label = document.createElement('div');
  label.className = "label";
  label.textContent = (data?.name || slotId);

  card.appendChild(img);
  card.appendChild(label);

  if(isAdmin){
    card.addEventListener('click', ()=> editSubAt(slotId, data || {}));
  }
  return card;
}

function editSubAt(slotId, current={}){
  const name = prompt(`Nombre para ${slotId}:`, current.name || "");
  if(name === null) return;

  const suggested = getImgByName(name) || current.img || "";
  const img  = prompt("URL de imagen (jpg/png):", suggested);
  if(img === null) return;

  const cleanImg = (img||"").trim();
  const updates = {};
  updates[slotId] = { name: (name||"").trim() || slotId, img: cleanImg };
  update(subsRef, updates);

  if(cleanImg) saveImgForName(name, cleanImg);
}

function renderSubs(){
  const wrap = el("subs-row");
  if(!wrap) return;
  wrap.innerHTML = "";

  const isAdmin = el('admin')?.style.display !== 'none';
  const subsHelp = el('subs-help');
  if (subsHelp) subsHelp.style.display = isAdmin ? 'block' : 'none';

  SUB_SLOTS.forEach(id=>{
    const data = subsState[id] || {};
    const card = createSubCard(id, data, isAdmin);
    wrap.appendChild(card);
  });
}

// Load subs & init defaults
onValue(subsRef, snap=>{
  subsState = snap.val() || {};
  renderSubs();
  fillMissingImagesFromIndex(); // intenta rellenar imágenes faltantes
  refreshStatsView();           // rehace la tabla con suplentes actuales
});
onValue(subsRef, snap=>{
  if(!snap.exists()){
    const init = {};
    SUB_SLOTS.forEach(id => { init[id] = { name:id, img:"" }; });
    set(subsRef, init);
  } else {
    const cur = snap.val() || {};
    let needs = false;
    SUB_SLOTS.forEach(id=>{
      if(!cur[id]){ cur[id] = { name:id, img:"" }; needs = true; }
    });
    if(needs) set(subsRef, cur);
  }
}, { onlyOnce:true });

// ================== ESTADÍSTICAS (Google Sheets CSV) ==================
let statsData = { headers: [], rows: [] };

// --- Normalización robusta de encabezados y claves ---
function normName(s){
  return (s||"")
    .toString()
    .replace(/\uFEFF/g, '')        // BOM
    .replace(/\u00A0/g, ' ')       // NBSP → espacio normal
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // sin acentos
    .replace(/[^\p{L}\p{N}]+/gu,' ') // quita puntos, barras, guiones, etc.
    .replace(/\s+/g,' ')            // colapsa espacios
    .toLowerCase();
}

// Mini parser CSV con comillas
function parseCsv(text){
  const rows = [];
  let cur = '', row=[], inQ=false;
  for (let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(inQ){
      if(c==='"' && n=== '"'){ cur+='"'; i++; }
      else if(c=== '"'){ inQ=false; }
      else cur+=c;
    }else{
      if(c=== '"'){ inQ=true; }
      else if(c=== ','){ row.push(cur); cur=''; }
      else if(c=== '\n' || c=== '\r'){
        if(c==='\r' && n==='\n') i++;
        row.push(cur); cur='';
        if(row.length) rows.push(row);
        row=[];
      }else cur+=c;
    }
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows;
}

function headersMap(arr){
  const map = {};
  arr.forEach((h,i)=>{ map[normName(h)] = i; });
  return map;
}

function renderStatsTable(){
  const table = el('stats-table');
  if(!table){ return; }

  const cols = [
    { key:'slot', label:'Slot' },
    { key:'nombre', label:'Nombre' },
    { key:'goles', label:'Goles' },
    { key:'asistencias', label:'Asist.' },
    { key:'partidos jugados', label:'Part. Jugados' },
    { key:'ta', label:'TA' },
    { key:'tr', label:'TR' },
    { key:'valoracion', label:'Valoración' },
  ];

  const players = [];
  ["GK","DF1","DF2","M1","M2","M3","ST","DF3"].forEach(slot=>{
    const data = lineupState[slot];
    if(slot==="DF3" && !FORMATIONS[currentFormation].DF3) return;
    if(data) players.push({ slot, nombre: data.name || slot });
  });
  SUB_SLOTS.forEach(slot=>{
    const data = subsState[slot];
    if(data) players.push({ slot, nombre: data.name || slot });
  });

  const h = statsData.headers;
  const hm = headersMap(h);

  const pickCol = (...cands) => {
    for (const k of cands) {
      const idx = hm[normName(k)];
      if (typeof idx === 'number') return idx;
    }
    return -1;
  };

  const colSlot = pickCol('slot','id','posicion','posición');
  const colName = pickCol('nombre','name','jugador','player');

  const colG   = pickCol('goles','goals','gol');
  const colA   = pickCol('asistencias','assists','asists','asist','assist');

  const colPJ  = pickCol(
    'partidos jugados','part jugados','partidos','pj',
    'matches played','matches','apps','appearances','jugados'
  );

  const colTA  = pickCol('ta','amarillas','yellow','yellow cards');
  const colTR  = pickCol('tr','rojas','red','red cards');
  const colVal = pickCol('valoracion','valoración','rating','puntuacion','puntuación');

  const bySlot = new Map();
  const byName = new Map();
  statsData.rows.forEach(r=>{
    const slot = colSlot>=0 ? (r[colSlot]||'').toString().trim().toUpperCase() : '';
    const name = colName>=0 ? normName(r[colName]) : '';
    if(slot) bySlot.set(slot, r);
    if(name) byName.set(name, r);
  });

  let html = '<thead><tr>';
  cols.forEach(c => { html+= `<th>${c.label}</th>`; });
  html += '</tr></thead><tbody>';

  players.forEach(p=>{
    const slot = (p.slot||'').toString().trim().toUpperCase();
    const name = p.nombre||'';
    let row = bySlot.get(slot);
    if(!row && name) row = byName.get(normName(name));

    const get = (idx)=> idx>=0 && row ? (row[idx]??'') : '';

    html += '<tr>';
    html += `<td><span class="stats-badge">${slot}</span></td>`;
    html += `<td>${name}</td>`;
    html += `<td>${get(colG)}</td>`;
    html += `<td>${get(colA)}</td>`;
    html += `<td>${get(colPJ)}</td>`;
    html += `<td>${get(colTA)}</td>`;
    html += `<td>${get(colTR)}</td>`;
    html += `<td>${get(colVal)}</td>`;
    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
}

function setStatsMeta(url){
  const src = el('stats-source');
  const upd = el('stats-updated');
  if(src) src.textContent = url ? `Fuente: ${url}` : 'Sin URL configurada';
  if(upd) upd.textContent = `Actualizado: ${new Date().toLocaleString()}`;
}

async function loadStats(forceUrl){
  const ui = (await new Promise(res=>{
    onValue(uiRef, s=>res(s.val()||{}), { onlyOnce:true });
  })) || {};
  const url = (forceUrl || ui.statsCsvUrl || '').trim();
  if(!url){
    statsData = { headers:[], rows:[] };
    setStatsMeta('');
    renderStatsTable();
    return;
  }
  try{
    const resp = await fetch(url, { cache:'no-store' });
    const text = await resp.text();
    const rows = parseCsv(text);
    if(!rows.length){ throw new Error('CSV vacío'); }
    const headers = rows[0];
    const dataRows = rows.slice(1);
    statsData = { headers, rows: dataRows };
    setStatsMeta(url);
    renderStatsTable();
  }catch(e){
    console.error('Error cargando CSV:', e);
    statsData = { headers:[], rows:[] };
    setStatsMeta(url + ' (error al cargar)');
    renderStatsTable();
  }
}

// Botones del panel de estadísticas
window.saveStatsCsv = ()=>{
  const input = el('statsCsvUrl');
  const url = (input?.value || '').trim();
  update(uiRef, { statsCsvUrl: url || null });
  if(url) loadStats(url);
};
window.refreshStats = ()=> { loadStats(); };

// Re-pintar tabla cuando cambie alineación o suplentes
function refreshStatsView(){ renderStatsTable(); }

// ================== PIN / acceso ==================
function enter(){
  const pin = el('pin').value.trim();
  if(pin===ADMIN_PIN){
    el('admin').style.display='flex';
    el('gate').style.display='none';
    bindNameInputs();
    mountTwitch();
    renderLineup();
    renderSubs();
    bindFormationSelect();
  } else if(pin===VIEWER_PIN){
    el('gate').style.display='none';
    mountTwitch();
    renderLineup();
    renderSubs();
  } else {
    alert("PIN incorrecto");
  }
}
window.enter = enter;

// Fullscreen del frame
window.toggleFullscreen = function(){
  const f = el('frame');
  if (!document.fullscreenElement) {
    f.requestFullscreen?.() || f.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
};
