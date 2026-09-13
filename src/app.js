import { approach, createFrameLoop, setAttributeIfChanged as setAttr } from "./motion.js";
import { PHOTOS, MAIL, BOOKING, DISTRICTS, LANG, setLanguage, u, dx, px2, SCENERY, LINKS, SHEETS } from "./content.js";
import { projBim, U, SP, FT, ftin, P, pts, n1, rng, box, PB, QS, QF, planMatrix, isoMatrix, projCut, projNotes, NB, nbVoidLv, buildIsland } from "./geometry.js";

/* ============================================================
   3. ESCENA
   ============================================================ */
const svg = document.getElementById("stage");
const gWorld = document.getElementById("world");

/* ---------- materiales ----------
   Un degradado por cara y por tono, construido sobre las variables del
   aspecto: al cambiar de aspecto cambian solos. Cubierta: se aclara hacia el
   foco (arriba a la izquierda). Cara iluminada: leve caída hacia el suelo.
   Cara en penumbra: caída más franca, que es donde vive la oclusión. */
(function materials(){
  const defs = svg.querySelector("defs");
  const NS2 = "http://www.w3.org/2000/svg";
  const grad = (id,x1,y1,x2,y2,stops) => {
    const g = document.createElementNS(NS2,"linearGradient");
    g.setAttribute("id",id); g.setAttribute("x1",x1); g.setAttribute("y1",y1); g.setAttribute("x2",x2); g.setAttribute("y2",y2);
    stops.forEach(st => { const e = document.createElementNS(NS2,"stop"); e.setAttribute("offset",st[0]); e.setAttribute("style","stop-color:"+st[1]); g.appendChild(e); });
    defs.appendChild(g);
  };
  const ball = (id,stops) => {
    const g = document.createElementNS(NS2,"radialGradient");
    g.setAttribute("id",id); g.setAttribute("cx",".36"); g.setAttribute("cy",".30"); g.setAttribute("r",".78");
    stops.forEach(st => { const e = document.createElementNS(NS2,"stop"); e.setAttribute("offset",st[0]); e.setAttribute("style","stop-color:"+st[1]); g.appendChild(e); });
    defs.appendChild(g);
  };
  ["stone","slate","magenta","purple","blue","orange","coral"].forEach(h => {
    const v = k => "var(--"+h+"-"+k+")";
    grad("gt-"+h,0,0,1,1,[[0,"color-mix(in srgb,"+v(1)+" 80%,#fff)"],[1,v(1)]]);
    grad("gl-"+h,0,0,0,1,[[0,"color-mix(in srgb,"+v(2)+" 92%,#fff)"],[.6,v(2)],[1,"color-mix(in srgb,"+v(2)+" 74%,var(--ink))"]]);
    grad("gr-"+h,0,0,0,1,[[0,v(3)],[1,"color-mix(in srgb,"+v(3)+" 66%,var(--ink))"]]);
    /* copa de árbol: esfera con la luz arriba a la izquierda */
    ball("tb-"+h,[[0,"color-mix(in srgb,"+v(1)+" 55%,#fff)"],[.55,v(2)],[1,"color-mix(in srgb,"+v(3)+" 62%,var(--ink))"]]);
  });
})();
const gIsl = document.getElementById("islands");
const gLink = document.getElementById("links");
const gTags = document.getElementById("tags");
const gShips = document.getElementById("ships");
const panel = document.getElementById("panel");
const readout = document.getElementById("ro");
const NS = "http://www.w3.org/2000/svg";
const el = (t,at) => { const e = document.createElementNS(NS,t); for(const k in at) e.setAttribute(k,at[k]); return e; };
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let reduce = motionPreference.matches;
motionPreference.addEventListener("change", event => {
  reduce = event.matches;
  if(reduce && from) dur = 1;
  motionDirty = true;
  frameLoop.request();
});

/* ---------- sonido ----------
   todo sintetizado con osciladores: ni un archivo de audio. Los distritos
   suenan en una escala pentatónica, así que recorrer la ciudad arma melodía.
   No hay colchón de fondo: sólo suena lo que tocás o adonde llegás. */
const NOTE = [293.66,329.63,369.99,440,493.88,587.33,659.25];   /* re pentatónica */
const SND = { ctx:null, on:true, master:null };

function sndCtx(){
  if(SND.ctx) return SND.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  SND.ctx = new AC();
  SND.master = SND.ctx.createGain();
  SND.master.gain.value = SND.on ? .55 : 0;
  SND.master.connect(SND.ctx.destination);
  return SND.ctx;
}
function ping(freq,dur,vol,type,delay){
  const c = sndCtx();
  if(!c || !SND.on) return;
  if(c.state === "suspended") c.resume();
  const t0 = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq,t0);
  g.gain.setValueAtTime(.0001,t0);
  g.gain.exponentialRampToValueAtTime(vol,t0+.015);
  g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  o.connect(g); g.connect(SND.master);
  o.start(t0); o.stop(t0+dur+.05);
}
const sndHover = i => ping(NOTE[i % 5]*2, .22, .028, "sine");
const sndLand  = i => { const n = NOTE[i % 5];
  ping(n,1.1,.075,"sine"); ping(n*1.5,1,.05,"sine",.06); ping(n*2,.9,.038,"triangle",.13); };
const sndBack  = () => { ping(NOTE[3],.5,.045,"sine"); ping(NOTE[1],.7,.035,"sine",.08); };
const sndPick  = i => { ping(NOTE[(i+2) % 5]*2,.7,.055,"triangle"); ping(NOTE[(i+2) % 5]*4,.4,.02,"sine",.03); };
const sndTick  = () => ping(NOTE[5]*2,.14,.03,"square");
const sndProto = () => { [0,1,2,3].forEach(i => ping(NOTE[i]*2,.5,.03,"sine",i*.09)); };
/* sonido de logro: arpegio mayor ascendente y dos chispas arriba */
const sndLink  = () => {
  const n = NOTE[0];
  [[1,0],[1.25,.075],[1.5,.15],[2,.235]].forEach((v,i) =>
    ping(n*v[0], 1.05-i*.09, .08-i*.009, "triangle", v[1]));
  ping(n*3, .8, .034, "sine", .31);
  ping(n*4, .62, .022, "sine", .375);
  ping(n*6, .5, .014, "sine", .43);
};

function sndToggle(){
  SND.on = !SND.on;
  const c = sndCtx();
  if(c){
    if(c.state === "suspended") c.resume();
    SND.master.gain.setTargetAtTime(SND.on ? .55 : 0, c.currentTime, .05);
  }
  const b = document.getElementById("sndBtn");
  if(b){ b.setAttribute("aria-pressed",SND.on); b.querySelector("i").textContent = SND.on ? "●" : "○"; }
}
/* el navegador no deja sonar hasta el primer gesto: sólo se abre el contexto */
addEventListener("pointerdown", () => { if(SND.on) sndCtx(); }, { once:true });
document.getElementById("sndBtn").addEventListener("click", sndToggle);

/* ---------- cambio de idioma ----------
   se vuelve a dibujar todo lo que lleva texto: HUD, rótulos, panel y visor */
function applyLang(){
  document.documentElement.lang = LANG;
  document.getElementById("roCity").innerHTML = u("city");
  document.getElementById("hintTxt").innerHTML = u("hint");
  document.getElementById("sndTxt").textContent = u("sound");
  const lb = document.getElementById("langBtn");
  lb.classList.toggle("en", LANG === "en");
  lb.setAttribute("aria-label", LANG === "es" ? "Switch to English" : "Cambiar a español");
  [].forEach.call(document.querySelectorAll("#looks button"),
    (b,i) => { b.textContent = u("looks")[i]; });
  renderTags();
  /* el índice lateral también lleva los nombres de distrito */
  ISLES.forEach(o => { if(o.navBtn) o.navBtn.innerHTML = '<i></i>'+dx(o,"label"); });
  if(!current) readout.textContent = "— — —";
  else if(PERSON !== null) openPerson(PERSON,true);
  else openPanel(current);
  if(LAB.mode) drawLab();
  document.getElementById("labClose").textContent = u("labBack");
  protoLabel();
  if(PROTO.phase === "form") openForm();
}
document.getElementById("langBtn").addEventListener("click", () => {
  setLanguage(LANG === "es" ? "en" : "es");
  sndTick();
  applyLang();
});

/* ---------- aspecto ---------- */
function setLook(v){
  document.documentElement.setAttribute("data-look",v);
  [].forEach.call(document.querySelectorAll("#looks button"),
    b => b.setAttribute("aria-current", String(b.dataset.look === v)));
}
[].forEach.call(document.querySelectorAll("#looks button"), b =>
  b.addEventListener("click", () => { setLook(b.dataset.look); sndTick(); }));
/* El aspecto inicial coincide con el HTML para evitar un destello al cargar. */
setLook("light");


const ISLES = DISTRICTS.map(d => Object.assign({}, d, { district:true }))
  .concat(SCENERY.map((s,i) => ({ id:"sc"+i, a:s[0], b:s[1], size:s[2], seed:s[3], hue:s[4], district:false })));

ISLES.forEach((o,i) => {
  const p = P(o.a*SP, o.b*SP, 0);
  o.wx = p[0]; o.wy = p[1]; o.i = i;
  /* foco corto de maqueta: lo que queda arriba y abajo del plano de la ciudad
     se desenfoca un punto, como en una foto con el objetivo inclinado */
  o.dof = Math.abs(p[1]) > 118;
  o.phase = i * 1.37; o.amp = o.district ? 4.5 : 6.5;
});

/* estrellas: sólo se ven en tema oscuro (opacidad por token) */
const stars = document.getElementById("stars"), sr = rng(4);
for(let i=0;i<90;i++)
  stars.appendChild(el("circle",{ cx:(sr()*1600).toFixed(0), cy:(sr()*1000).toFixed(0),
    r:(sr()*1.1+.3).toFixed(2), fill:"var(--ink)", opacity:"var(--star-op)" }));

/* bruma de fondo */
const cr = rng(9), gc = document.getElementById("clouds");
for(let i=0;i<16;i++)
  gc.appendChild(el("ellipse",{ cx:((cr()-.5)*2900).toFixed(0), cy:((cr()-.5)*1700).toFixed(0),
    rx:(140+cr()*260).toFixed(0), ry:(40+cr()*70).toFixed(0),
    fill:"var(--haze)", opacity:(cr()*.26+.12).toFixed(2), filter:"url(#blur)" }));

/* anillo orbital punteado con satélites */
const gOrb = document.getElementById("orbit"), ORX = 1500, ORY = 760;
gOrb.appendChild(el("ellipse",{ cx:0, cy:40, rx:ORX, ry:ORY, fill:"none",
  stroke:"var(--line)", "stroke-opacity":".8", "stroke-width":"1.8",
  "stroke-dasharray":"1 13", "stroke-linecap":"round", "vector-effect":"non-scaling-stroke" }));
const sats = ["orange","blue","magenta","coral","purple"].map((c,i) => {
  const d = el("circle",{ r:"9", fill:"var(--"+c+"-3)" });
  gOrb.appendChild(d);
  return { el:d, t:i * Math.PI * 2 / 5 };
});

/* aeronaves: el isotipo de la marca derivando por el cielo.
   Los trazos se leen del propio logotipo del HUD, así hay una sola fuente. */
const LOGO_D = [].slice.call(document.querySelectorAll(".brand .mark path"))
                 .map(p => p.getAttribute("d"));
const LOGO_W = 2342.2;                       /* ancho del isotipo ya volteado */

function flyer(w,op){
  const S = w/LOGO_W;
  const g = el("g",{ opacity:op });
  g.innerHTML =
    '<g transform="scale('+S.toFixed(5)+')"><g transform="translate(-1500,-1350)">'
   +'<g transform="matrix(1 0 0 -1 0 3000)" fill="url(#skyGrad)">'
   + LOGO_D.map(d => '<path d="'+d+'"/>').join("")
   +'</g></g></g>';
  gShips.appendChild(g);
  return g;
}
const SHIPS = [
  { g:flyer(124,.88), x:-1500, y:-680, v:.34 },
  { g:flyer(94,.62),  x:900,   y:560,  v:-.22 },
  { g:flyer(74,.45),  x:-400,  y:820,  v:.28 }
];

/* islas */
ISLES.forEach(o => {
  const built = buildIsland(o);
  o.topY = built.topY;
  o.topZ = built.topZ;
  o.alt = 4000 + Math.round(built.topZ*FT);   /* cota de coronamiento, en pies */
  const g = el("g",{ class:"isl", transform:"translate("+n1(o.wx)+","+n1(o.wy)+")" });
  const bob = el("g",{});
  bob.innerHTML = built.svg;
  g.appendChild(bob);
  o.g = g; o.bob = bob;
  if(o.dof) g.classList.add("dof");
  if(o.district){
    g.setAttribute("tabindex","0");
    g.setAttribute("role","button");
    g.setAttribute("aria-label","Distrito "+o.label);
    /* con una isla abierta, las de al lado no se pueden saltar: primero se
       vuelve a la ciudad. Si no, un clic torpe te cambia de distrito. */
    const land = () => { if(current && current !== o) return; focusIsle(o); };
    g.addEventListener("click", e => { e.stopPropagation(); land(); });
    g.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); land(); } });
    g.addEventListener("pointerenter", () => hover(o,true));
    g.addEventListener("pointerleave", () => hover(o,false));
    g.addEventListener("focus", () => hover(o,true));
    g.addEventListener("blur", () => hover(o,false));
  }else{
    /* el paisaje no se pulsa y además se retira: así el ojo va solo a los
       cuatro distritos, que son los que llevan a alguna parte */
    g.style.pointerEvents = "none";
    g.classList.add("scenery");
  }
  gIsl.appendChild(g);
});

/* conexiones entre islas */
const linkEls = LINKS.map(function(pair){
  const A = ISLES[pair[0]], B = ISLES[pair[1]];
  if(!A || !B) return null;
  const l = el("line",{ class:"link", x1:n1(A.wx), y1:n1(A.wy), x2:n1(B.wx), y2:n1(B.wy) });
  gLink.appendChild(l);
  gLink.appendChild(el("circle",{ cx:n1((A.wx+B.wx)/2), cy:n1((A.wy+B.wy)/2), r:"4.5", fill:"var(--line)", opacity:".55" }));
  return { el:l, a:A, b:B };
}).filter(Boolean);

/* rótulos, en espacio de pantalla para que no escalen con el zoom */
DISTRICTS.forEach(d => {
  const o = ISLES.find(x => x.id === d.id);
  const g = el("g",{});
  gTags.appendChild(g);
  o.tag = g;
});
function renderTags(){
  DISTRICTS.forEach(d => {
    const o = ISLES.find(x => x.id === d.id);
    o.tag.innerHTML =
      '<line class="tag-line" x1="0" y1="0" x2="0" y2="-28" stroke="var(--'+d.hue+'-3)"/>'
     +'<text class="tag-sub" y="-38">'+dx(d,"sub")+'</text>'
     +'<text class="tag-name" y="-58" fill="var(--'+d.hue+'-4)">'+dx(d,"label")+'</text>';
  });
}
/* índice de distritos */
const nav = document.getElementById("nav");
DISTRICTS.forEach(d => {
  const o = ISLES.find(x => x.id === d.id);
  const b = document.createElement("button");
  b.type = "button";
  b.className = "c-"+d.hue;
  b.innerHTML = '<i></i>'+dx(d,"label");
  b.addEventListener("click", () => focusIsle(o));
  b.addEventListener("pointerenter", () => hover(o,true));
  b.addEventListener("pointerleave", () => hover(o,false));
  o.navBtn = b;
  nav.appendChild(b);
});

/* ============================================================
   4. CÁMARA
   ============================================================ */
/* ---------- barra de escala ----------
   la escena y el viewBox se escalan juntos, así que la barra puede
   calcularse exacta: metros → unidades → píxeles de pantalla */
const scaleBar = document.getElementById("scaleBar"), scaleTxt = document.getElementById("scaleTxt");
let vbF = 1;
function vbFactor(){
  const r = svg.getBoundingClientRect();
  vbF = Math.max(r.width/1600, r.height/1000);
}
function updateScale(){
  const pxPerFt = (U/FT)*cam.k*vbF;
  const f = [10,25,50,100,250,500,1000].find(v => v*pxPerFt > 46) || 1000;
  scaleBar.style.width = (f*pxPerFt).toFixed(1)+"px";
  scaleTxt.textContent = "0 — "+f+" FT";
}

const HOME = { k:.57, x:0, y:0 }, ZOOM = 1.8;
/* en pantallas chicas todo se mira un poco más de lejos: el edificio no puede
   comerse el viewport antes de que aparezca la información */
const mob = () => innerWidth < 820;
const kz = v => mob() ? v*.55 : v;
/* el encuadre de casa: en vertical la ventana visible es un tercio de
   la de escritorio, así que la ciudad entera pide alejarse de verdad */
const homeK = () => mob() ? .31 : HOME.k;

/* ---------- encuadre vertical en el móvil ----------
   la hoja de texto se lleva media pantalla, y su alto cambia en cada paso
   del relato. Así que la banda libre de arriba se mide, no se estima, y el
   zoom sale de ahí: lo que se mira entra entero por encima del texto. */
let MOBFIT = null;                 /* punto del viewBox donde centrar, o null */
function topBand(){
  const r = svg.getBoundingClientRect();
  const nb = document.getElementById("nav").getBoundingClientRect().bottom;
  const ph = panel.classList.contains("open") ? panel.offsetHeight : 0;
  return { top:(nb + 14)/vbF, bot:(r.height - ph - 16)/vbF, w:r.width/vbF };
}
function fitTop(bb){
  const b = topBand(), h = b.bot - b.top;
  if(!bb.width || !bb.height || h < 90){ MOBFIT = null; return null; }
  MOBFIT = (b.top + b.bot)/2;
  return { k:+Math.min(b.w*.86/bb.width, h*.86/bb.height).toFixed(4),
           x:bb.x + bb.width/2, y:bb.y + bb.height/2 };
}
/* el bbox de un grupo arrastra los tirantes que suben hasta la ciudad;
   para encuadrar sólo interesa la mancha de piezas, no sus amarras */
function unionBB(nodes){
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  const inv = gWorld.getScreenCTM();
  if(!inv) return null;
  const wi = inv.inverse();
  [].forEach.call(nodes, n => {
    const x = n.getBBox();
    if(!x.width && !x.height) return;
    /* getBBox no aplica la traslación del propio grupo, y el territorio
       cuelga 2600 unidades por debajo: hay que pasar al espacio del mundo */
    const m = wi.multiply(n.getScreenCTM());
    [[x.x,x.y],[x.x+x.width,x.y],[x.x,x.y+x.height],[x.x+x.width,x.y+x.height]].forEach(p => {
      const px = m.a*p[0] + m.c*p[1] + m.e, py = m.b*p[0] + m.d*p[1] + m.f;
      a = Math.min(a,px); b = Math.min(b,py);
      c = Math.max(c,px); d = Math.max(d,py);
    });
  });
  return c > a ? { x:a, y:b, width:c-a, height:d-b } : null;
}
function fitTo(sel,ms){
  if(!mob()) return;
  const bb = unionBB(document.querySelectorAll(sel));
  if(!bb) return;
  const s = fitTop(bb);
  if(s) tween(s, ms === undefined ? 650 : ms);
}
let cam = { k:.40, x:0, y:0 }, target = { k:.57, x:0, y:0 }, from = null, t0 = 0, dur = 1;
let aCur = null;
let current = null, hovered = null;

/* la ciudad se centra; al aterrizar se corre para dejar lugar al panel */
let SHOT = null;
const anchor = () => SHOT ? [800,500]
  : innerWidth < 820
  ? (MOBFIT !== null ? [800,MOBFIT]
     : MAP.on ? [800,420] : LAB.mode ? [800,235] : current ? [800,245] : [800,515])
  /* el territorio se aparta a la izquierda al llegar, no al salir de la ciudad */
  /* con el relato abierto la hoja se lleva el tercio derecho: la ciudad
     se corre para caber entera en lo que queda */
  : (ORI.on ? [500,520]
     : MAP.on ? (MAP.arrived ? [600,480] : [810,535]) : LAB.mode ? [700,415] : PERSON !== null ? [500,540]
     : (PROTO.phase === "form" || PROTO.phase === "sent") ? [600,520]
     : current ? [620,540] : [810,535]);
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
/* la profundidad de campo sólo se aplica con la cámara quieta: desenfocar
   catorce islas en cada fotograma de un viaje no lo aguanta ningún móvil */
function tween(to,ms){ from = { k:cam.k, x:cam.x, y:cam.y }; target = to; t0 = performance.now(); dur = reduce ? 1 : ms;
  document.documentElement.classList.remove("still"); frameLoop.request(); }
/* el desplazamiento vertical deja entrar la raíz de la isla en el encuadre */
const shot = o => ({ k:kz(ZOOM), x:o.wx, y:o.wy + o.topY*.26 });
/* al entrar en obra la cámara baja sobre el edificio, sin perder la plataforma;
   el corte se mira más de cerca porque sólo quedan tres niveles */
const shotBuild = (o,mode) => mode === "autocad"
  ? { k:kz(2.9), x:o.wx, y:o.wy - 16 }
  : { k:kz(2.7), x:o.wx, y:o.wy - 55 };

function focusIsle(o){
  /* el relato del origen desmonta la ciudad: hay que cerrarlo antes de ir a
     ningún otro sitio, o los distritos quedan sin construir al volver */
  if(ORI.on && o.id !== "about") closeOrigin();
  /* desde el territorio, o mientras se vuelve de él, primero se regresa a la
     ciudad: aterrizar antes dejaba a los temporizadores del regreso pisando
     el encuadre y el rótulo del distrito recién abierto */
  if((MAP.on || MAP.closing) && o.id !== "work"){
    if(MAP.on) closeMap();
    const left = Math.max(0, 2900 - (performance.now() - MAP.closeAt));
    later(() => { MAP.closing = false; focusIsle(o); }, left);
    return;
  }
  if(o.id === "work"){ openMap(); return; }   /* WORK no es un distrito: es la salida */
  if(o.id === "about"){ openOrigin(); return; } /* ABOUT US va al origen de la ciudad */
  if(current === o) return;
  current = o;
  hovered = null;
  ISLES.forEach(i => {
    i.g.classList.toggle("focus", i === o);
    i.g.classList.toggle("dimmed", i !== o);
    i.g.classList.remove("hot");
  });
  linkEls.forEach(l => { l.el.classList.add("dimmed"); l.el.classList.remove("hot"); });
  ISLES.forEach(i => { if(i.navBtn) i.navBtn.setAttribute("aria-current", i === o ? "true" : "false"); });
  readout.textContent = dx(o,"label") + " · SECTOR " + String(o.i+1).padStart(2,"0");
  sndLand(o.i);
  tween(shot(o),1250);
  openPanel(o);
  /* la red se abre por su primer nodo: se aterriza en la isla y, acto
     seguido, se entra en el vano de Agustín. Nadie tiene que buscarlo. */
  if(o.id === "team"){
    setTimeout(() => {
      if(current === o && PERSON === null && !MAP.on && !ORI.on) openPerson(0);
    }, 1300);
  }
}
function unfocus(){
  if(!current) return;
  closePerson();
  current = null;
  MOBFIT = null;
  ISLES.forEach(i => { i.g.classList.remove("focus","dimmed"); if(i.navBtn) i.navBtn.setAttribute("aria-current","false"); });
  linkEls.forEach(l => l.el.classList.remove("dimmed"));
  readout.textContent = "— — —";
  sndBack();
  panel.classList.remove("open");
  tween({ k:homeK(), x:HOME.x, y:HOME.y },1100);
}
function hover(o,on){
  frameLoop.request();
  if(current) return;
  hovered = on ? o : null;
  o.g.classList.toggle("hot",on);
  if(on) sndHover(o.i);
  linkEls.forEach(l => l.el.classList.toggle("hot", on && (l.a === o || l.b === o)));
  readout.textContent = on
    ? dx(o,"label")+" · SECTOR "+String(o.i+1).padStart(2,"0")+" · "+o.a.toFixed(1)+" / "+o.b.toFixed(1)+" · ALT "+o.alt.toLocaleString("en-US")+" FT"
    : "— — —";
}

/* la red no es un organigrama: un núcleo y nodos que se enchufan por proyecto */
function netDiagram(d){
  const nodes = d.people.map((p,i) => ({ p:p, i:i }));
  const cx = 130, cy = 62, R = 78;
  let s = '<svg class="net-map" viewBox="0 0 260 124" aria-hidden="true">';
  const pos = [[cx,cy],[cx-R,cy-30],[cx-R+22,cy+34],[cx+R,cy-30],[cx+R-22,cy+34]];
  nodes.forEach((_,i) => {
    const q = i === 0 ? pos[0] : pos[i];
    s += '<line class="net-link" x1="'+cx+'" y1="'+cy+'" x2="'+q[0]+'" y2="'+q[1]+'"/>';
  });
  s += '<line class="net-link net-open" x1="'+cx+'" y1="'+cy+'" x2="'+pos[3][0]+'" y2="'+pos[3][1]+'"/>';
  nodes.forEach((n,i) => {
    const q = pos[i];
    s += '<circle class="net-node" cx="'+q[0]+'" cy="'+q[1]+'" r="'+(n.p.core ? 9 : 6)+'" style="--c:var(--'+n.p.hue+'-3)"/>';
  });
  s += '<circle class="net-node net-ghost" cx="'+pos[3][0]+'" cy="'+pos[3][1]+'" r="6"/>'
     + '<text class="net-cap" x="'+pos[3][0]+'" y="'+(pos[3][1]-13)+'">FUTUROS PARTNERS</text>'
     + '</svg>';
  return s;
}
function netList(d){
  return '<ul class="net">'+d.people.map((p,i) =>
    '<li data-p="'+i+'" style="--c:var(--'+p.hue+'-3)">'
    + '<span class="ava"><img decoding="async" src="'+PHOTOS[p.ph]+'" alt="'+p.name+'"></span>'
    + '<span class="who">'
      + '<span class="area mono">'+px2(d,i,"area")+'</span>'
      + '<span class="t">'+p.name+'</span>'
      + (px2(d,i,"role").toUpperCase() === px2(d,i,"area").toUpperCase() ? "" : '<span class="role">'+px2(d,i,"role")+'</span>')      + '<span class="d">'+px2(d,i,"bio")+'</span>'
    + '</span></li>').join("")+'</ul>';
}

/* ficha de una persona: retrato grande y su definición */
let PERSON = null;
function openPerson(i,quiet){
  const o = ISLES.find(x => x.id === "team");
  if(!o) return;
  const d = DISTRICTS.find(x => x.id === "team"), p = d.people[i];
  if(current !== o) focusIsle(o);
  PERSON = i;
  if(!quiet) sndPick(i);
  o.g.classList.add("mode-seat");
  [].forEach.call(o.g.querySelectorAll(".seat, .seat-tag"), g => g.classList.toggle("on", +g.dataset.i === i));
  panel.style.setProperty("--accent","var(--"+p.hue+"-3)");
  /* la ficha se abre a dos columnas: el retrato manda y el texto respira */
  panel.classList.add("person");
  panel.innerHTML =
      '<div class="pgrid">'
       +'<img class="portrait" decoding="async" src="'+PHOTOS[p.ph]+'" alt="'+p.name+'">'
       +'<div class="pcol">'
         +'<div class="eyebrow">'
          +'<div class="mono">'+u("node")+' 0'+(i+1)+' · '+px2(d,i,"area")+'</div>'
          +'<h2>'+p.name+'</h2>'
          + (px2(d,i,"role").toUpperCase() === px2(d,i,"area").toUpperCase() ? "" : '<p class="sub">'+px2(d,i,"role")+'</p>')
         +'</div>'
         +'<dl class="block wide rec">'
           +'<div><dt>'+u("location")+'</dt><dd>'+(p.city || "—")+'</dd></div>'
           +'<div><dt>'+u("status")+'</dt><dd class="live">'+u("active")+'</dd></div>'
          +'</dl>'
         +'<p class="lead">'+px2(d,i,"bio")+'</p>'
         +'<hr class="rule">'
         +'<div class="mono">'+u("others")+'</div>'
         +'<ul class="net mini">'+d.people.map((q,j) => j === i ? "" :
            '<li data-p="'+j+'" style="--c:var(--'+q.hue+'-3)"><span class="ava">'
            + '<img decoding="async" src="'+PHOTOS[q.ph]+'" alt="'+q.name+'"></span><span class="who">'
            + '<span class="t">'+q.name+'</span><span class="role">'+px2(d,j,"role")+'</span></span></li>').join("")
         +'</ul>'
       +'</div>'
      +'</div>'
     +'<button class="back" type="button">'+u("backNet")+'</button>';
  panel.querySelector(".back").addEventListener("click", () => { closePerson(); openPanel(o); });
  [].forEach.call(panel.querySelectorAll("[data-p]"), li =>
    li.addEventListener("click", () => openPerson(+li.dataset.p)));
  panel.classList.add("open");
  /* la cámara se acerca al vano de esa persona, no al edificio entero */
  const vv = NB.vols.find(x => x.pi === i);
  if(vv && !quiet){
    const rot = vv.side === "x";
    const cx = rot ? NB.x+vv.x+vv.w-NB.vd*.5 : NB.x+vv.x+vv.vx+NB.vw*.5;
    const cy = rot ? NB.y+vv.y+vv.vx+NB.vw*.5 : NB.y+vv.y+vv.d-NB.vd*.5;
    /* apenas más cerca que la vista de isla, y el desplazamiento hacia el vano
       va a medias: si se centra del todo en el puesto, la isla se sale */
    const c = P(cx, cy, nbVoidLv(vv)*NB.lh+.5);
    tween({ k:kz(1.9), x:o.wx+(c[0]+18)*.5, y:o.wy+c[1]*.5 },1000);
  }
}
function closePerson(){
  frameLoop.request();
  const o = ISLES.find(x => x.id === "team");
  PERSON = null;
  if(o){
    o.g.classList.remove("mode-seat");
    [].forEach.call(o.g.querySelectorAll(".seat, .seat-tag"), g => g.classList.remove("on"));
  }
}

function openPanel(o){
  panel.classList.remove("person","form");
  if(PROTO.phase === "form" || PROTO.phase === "sent"){ PROTO.phase = "linked"; protoLabel(); }
  const d = DISTRICTS.find(x => x.id === o.id);
  panel.style.setProperty("--accent","var(--"+d.hue+"-3)");   /* el panel toma el color del distrito */
  panel.innerHTML =
    '<div class="eyebrow">'
     +'<div class="mono">'+u("sector")+' '+String(o.i+1).padStart(2,"0")+' · '+o.a.toFixed(1)+' / '+o.b.toFixed(1)+' · '+u("alt")+' '+o.alt.toLocaleString("en-US")+' FT</div>'
     +'<h2>'+dx(d,"label")+'</h2>'
     +'<p class="sub">'+(x=>x.charAt(0)+x.slice(1).toLowerCase())(dx(d,"sub"))+'</p>'
    +'</div>'
   +'<p class="lead">'+dx(d,"lead")+'</p>'
   + (dx(d,"cta") ? '<a class="cta" target="_blank" rel="noopener" href="'
       + (BOOKING || "mailto:"+MAIL+"?subject="+encodeURIComponent(LANG === "en" ? "30 min call" : "Llamada de 30 min"))
       + '">'+dx(d,"cta")+'</a>' : "")
   +'<hr class="rule">'
   +'<div class="mono">'+dx(d,"listTitle")+'</div>'
   + (d.network ? netDiagram(d) + netList(d) : "")
   +'<ul class="items">'+(dx(d,"items") || []).map(it =>
       '<li><span class="k">'+it[0]+'</span><span><span class="t">'+it[1]+'</span><span class="d">'+it[2]+'</span>'
       + (it[3] ? '<button class="lab-btn go" type="button" data-lab="'+it[3]+'">'
                + (it[3] === "autocad" ? u("openSheet") : it[3] === "auto" ? u("openNote") : u("openModel"))+' ›</button>' : '')
       + '</span></li>').join("")
   +'</ul>'
   +'<hr class="rule">'
   +'<div class="specs">'+dx(d,"specs").map(s => '<div><span class="n">'+s[0]+'</span><span class="l">'+s[1]+'</span></div>').join("")+'</div>'
   +'<button class="back" type="button">'+u("back")+'</button>';
  panel.querySelector(".back").addEventListener("click", unfocus);
  [].forEach.call(panel.querySelectorAll("[data-lab]"), b =>
    b.addEventListener("click", () =>
      b.dataset.lab === "auto" ? openDetail("auto") : openLab(b.dataset.lab)));
  [].forEach.call(panel.querySelectorAll("[data-p]"), li =>
    li.addEventListener("click", () => openPerson(+li.dataset.p)));
  panel.classList.add("open");
}

svg.addEventListener("click", unfocus);
addEventListener("keydown", e => {
  /* con el origen abierto, las flechas recorren el relato */
  if(ORI.on && (e.key === "ArrowRight" || e.key === "ArrowLeft")){
    e.preventDefault();
    originStep(ORI.step + (e.key === "ArrowRight" ? 1 : -1));
    return;
  }
  /* en el visor de láminas, las flechas pasan de dibujo */
  if(LAB.mode === "autocad" && !DET.on && (e.key === "ArrowRight" || e.key === "ArrowLeft")){
    e.preventDefault();
    LAB.sheet = (LAB.sheet + (e.key === "ArrowRight" ? 1 : SHEETS.length-1)) % SHEETS.length;
    sndTick(); drawLab();
    return;
  }
  /* con una ficha abierta, las flechas recorren los nodos de la red */
  if(PERSON !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")){
    e.preventDefault();
    const n = DISTRICTS.filter(x => x.id === "team")[0].people.length;
    openPerson((PERSON + (e.key === "ArrowRight" ? 1 : n-1)) % n);
    return;
  }
  if(e.key !== "Escape") return;
  if(DET.on) closeDetail();                      /* primero la lámina de detalle */
  else if(LAB.mode) closeLab();                  /* después el visor */
  else if(MAP.on) closeMap();                    /* después el territorio */
  else if(ORI.on) closeOrigin();                 /* y el origen */
  else if(PROTO.phase !== "idle") protoReset();  /* después la conexión */
  else unfocus();
});
addEventListener("resize", () => {
  frameLoop.request();
  vbFactor(); updateScale();
  /* el encuadre depende del ancho: al girar el teléfono hay que rehacerlo.
     Sólo se respeta un relato en curso, que no conviene cortar por la mitad. */
  if(MAP.on || ORI.on || PROTO.phase === "running") return;
  if(LAB.mode && current) tween(shotBuild(current,LAB.mode), 300);
  else tween(current ? shot(current) : { k:homeK(), x:HOME.x, y:HOME.y }, 300);
});

/* ============================================================
/* ============================================================
   5. OBRA — el mismo edificio de la isla, cortado o desarmado
   ============================================================ */
const lab = document.getElementById("lab");
const labEyebrow = document.getElementById("labEyebrow"), labTitle = document.getElementById("labTitle");
const labCtrl = document.getElementById("labCtrl"), labBlock = document.getElementById("labBlock");

/* ---------- estado ---------- */

const LAB = { mode:null, sheet:0, flat:false, disc:{ str:true, mep:true, arc:true }, isle:null };
let gCut = null, gBim = null;
const cutViews = new Map();

function labBlockHTML(rows){
  return rows.map(r => '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>').join("");
}

function drawLab(){
  const o = LAB.isle;
  if(!o) return;
  if(LAB.mode === "autocad"){
    const sh = SHEETS[LAB.sheet];
    const acc = sh.hue === "ink" ? "var(--ink)" : "var(--"+sh.hue+"-3)";
    lab.style.setProperty("--accent",acc);
    o.g.style.setProperty("--accent",acc);
    labTitle.textContent = u("sheets")[LAB.sheet][1];
    labEyebrow.textContent = "SERVICES · AUTOCAD · "+u("level")+" 0"+PB.cut;
    /* las acotaciones se dibujan dos veces, una por cada mirada, y se cruzan */
    const key = LANG + ":" + sh.id;
    if(!cutViews.has(key)){
      const view = el("g", {});
      view.innerHTML = projCut(sh.id)
        + '<g class="notes-iso">' + projNotes(LAB.sheet) + '</g>'
        + '<g class="notes-flat">' + projNotes(LAB.sheet,(x,y) => [x*QS, y*QS+QF]) + '</g>';
      cutViews.set(key, view);
    }
    if(gCut.firstElementChild !== cutViews.get(key)) gCut.replaceChildren(cutViews.get(key));
    applyFlat();
    /* el marcador de corte abre la lámina de detalle: la llamada existe
       en el plano y lleva a un documento que existe de verdad */
    labBlock.innerHTML = labBlockHTML([[u("sheet"),sh.code],[u("scale"),String.fromCharCode(49,47,52,34)+' = '+String.fromCharCode(49,39,45,48,34)],
      [u("cut"),"+"+ftin(PB.cut*PB.lh)]]);
    labCtrl.innerHTML =
      '<div class="sheets"><ol>'
      + SHEETS.map((_,i) => '<li data-i="'+i+'" aria-current="'+(i === LAB.sheet)+'"><b></b>'+u("sheets")[i][0]+'</li>').join("")
      + '</ol><button class="lab-btn" type="button" id="labFlip">'+(LAB.flat ? u("toIso") : u("toFlat"))+'</button>'
      + '<button class="lab-btn" type="button" id="labDet">'+u("openDet")+'</button>'
      + '<button class="lab-btn go" type="button" id="labNext">'+u("next")+'</button></div>';
    labCtrl.querySelector("#labFlip").addEventListener("click", () => setFlat(!LAB.flat));
    labCtrl.querySelector("#labDet").addEventListener("click", openDetail);
    labCtrl.querySelector("#labNext").addEventListener("click", () => {
      LAB.sheet = (LAB.sheet+1) % SHEETS.length; sndTick(); drawLab();
    });
    [].forEach.call(labCtrl.querySelectorAll("li"), li =>
      li.addEventListener("click", () => { LAB.sheet = +li.dataset.i; drawLab(); }));
  }else{
    lab.style.setProperty("--accent","var(--purple-3)");
    labTitle.textContent = u("federated");
    const on = ["arc","str","mep"].filter(k => LAB.disc[k]).length;
    labEyebrow.textContent = "SERVICES · REVIT · "+on+" "+u("discActive");
    syncBim();
    labBlock.innerHTML = labBlockHTML([[u("model"),"RVT-01"],[u("levels"),PB.lv+" "+u("roof")],[u("lod"),"LOD 350"]]);
    labCtrl.innerHTML =
      '<div class="discs">'
      + [["arc",u("disc")[0],"--purple-3"],["str",u("disc")[1],"--blue-3"],["mep",u("disc")[2],"--magenta-3"]]
          .map(d => '<button type="button" data-k="'+d[0]+'" aria-pressed="'+LAB.disc[d[0]]+'" style="--c:var('+d[2]+')"><u></u>'+d[1]+'</button>').join("")
      + '</div>'
      /* el puente entre los dos servicios: del modelo federado sale la
         documentación, y se ve cómo una cosa se convierte en la otra */
      + '<button class="lab-btn go" type="button" id="labDoc">'+u("viewDoc")+'</button>';
    [].forEach.call(labCtrl.querySelectorAll("[data-k]"), b =>
      b.addEventListener("click", () => { LAB.disc[b.dataset.k] = !LAB.disc[b.dataset.k]; drawLab(); }));
    labCtrl.querySelector("#labDoc").addEventListener("click", () => {
      openLab("autocad");
      setTimeout(() => setFlat(true), 750);   /* el modelo se abre y, seguido, se acuesta */
    });
  }
}

/* la planta se acuesta: el volumen se apaga y el dibujo gira a vista cenital */
function applyFlat(){
  if(!gCut) return;
  const g = gCut.querySelector(".plan-g");
  if(g) g.style.transform = LAB.flat ? planMatrix() : isoMatrix();
}
function setFlat(on){
  const o = LAB.isle;
  if(!o || LAB.mode !== "autocad") return;
  LAB.flat = on;
  o.g.classList.toggle("flat", on);
  /* acostada, la lámina tiene que tapar el paisaje de la isla: en SVG
     eso es orden de dibujo, así que el corte pasa al frente */
  if(on && gCut && gCut.parentNode) gCut.parentNode.appendChild(gCut);
  applyFlat();
  tween(on ? { k:kz(3.3), x:o.wx, y:o.wy - 55 } : shotBuild(o,"autocad"), 1000);
  const b = labCtrl.querySelector("#labFlip");
  if(b) b.textContent = on ? u("toIso") : u("toFlat");
}

/* las disciplinas apagadas no desaparecen: se apagan de color y quedan de fondo */
function syncBim(){
  if(!gBim) return;
  ["str","mep","arc"].forEach(k =>
    [].forEach.call(gBim.querySelectorAll(".lay-"+k), g => g.classList.toggle("lay-off", !LAB.disc[k])));
  gBim.classList.toggle("xray", LAB.disc.arc && (LAB.disc.str || LAB.disc.mep));
}

function openLab(mode){
  const o = ISLES.find(i => i.id === "services");
  if(!o) return;
  if(current !== o) focusIsle(o);
  LAB.mode = mode; LAB.isle = o;
  sndPick(mode === "autocad" ? 1 : 3);
  gCut = o.g.querySelector(".proj-cut");
  gBim = o.g.querySelector(".proj-bim");
  if(mode === "revit" && !gBim.hasChildNodes()) gBim.innerHTML = projBim();
  if(mode === "autocad"){ LAB.sheet = 0; LAB.flat = false; }
  else LAB.disc = { str:true, mep:true, arc:true };
  o.g.classList.remove("flat");
  o.g.classList.toggle("mode-cut", mode === "autocad");
  o.g.classList.toggle("mode-bim", mode === "revit");
  drawLab();
  lab.classList.add("on");
  lab.setAttribute("aria-hidden","false");
  panel.classList.remove("open");
  tween(shotBuild(o,mode),1200);
  /* primero se ve el corte en isométrica y recién después la planta se acuesta */
  if(mode === "autocad") setTimeout(() => { if(LAB.mode === "autocad") setFlat(true); }, 1500);
}
function closeLab(){
  closeDetail();
  if(!LAB.mode) return;
  const o = LAB.isle;
  LAB.mode = null;
  if(o) o.g.classList.remove("mode-cut","mode-bim");
  lab.classList.remove("on");
  lab.setAttribute("aria-hidden","true");
  if(current){ panel.classList.add("open"); tween(shot(current),1000); }
}
document.getElementById("labClose").addEventListener("click", closeLab);

/* Interacciones de las islas, incluidas las láminas creadas al abrir el visor.
   Captura antes del clic de la isla: una llamada no debe cambiar de distrito. */
function islandAction(event){
  if(event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest(".seat, .seat-tag, .call, .det-open");
  if(!target || !gIsl.contains(target)) return;
  event.preventDefault();
  event.stopPropagation();
  if(target.matches(".seat, .seat-tag")) openPerson(+target.dataset.i);
  else if(target.matches(".det-open")) openDetail(target.dataset.det || "wall");
  else if(target.dataset.lab === "auto") openDetail("auto");
  else openLab(target.dataset.lab);
}
gIsl.addEventListener("click", islandAction, true);
gIsl.addEventListener("keydown", islandAction, true);

/* ============================================================
   7. PROTOCOLO DE CONEXIÓN
   El contacto no es un formulario que aparece: es un nodo nuevo
   que se enchufa a la red usando las conexiones que ya existen.
   ============================================================ */
const PROTO = { phase:"idle", pulses:null, node:null, want:[] };
const conn = document.getElementById("connect");
const connLabel = document.getElementById("connLabel"), connSub = document.getElementById("connSub");
const connShort = document.getElementById("connShort");
const gPulse = document.getElementById("pulses"), gNode = document.getElementById("usernode");

/* el nodo del visitante: una plataforma chica con su baliza */
/* el nodo aterriza en el lote que dejó libre WORK */
const UNODE = { a:3.6, b:.6, n:2.7 };
(function buildUserNode(){
  const p = P(UNODE.a*SP, UNODE.b*SP, 0), h = UNODE.n/2;
  const g = el("g",{ transform:"translate("+n1(p[0])+","+n1(p[1])+")" });
  let s = box(-h,-h,UNODE.n,UNODE.n,-.4,.4,"stone");
  s += '<polygon points="'+pts([P(-h,h,-.4),P(h,h,-.4),P(0,0,-UNODE.n*1.1)])+'" fill="var(--stone-2)" class="f"/>'
     + '<polygon points="'+pts([P(h,-h,-.4),P(h,h,-.4),P(0,0,-UNODE.n*1.1)])+'" fill="var(--stone-3)" class="f"/>';
  const b0 = P(0,0,0), b1 = P(0,0,2.6);
  s += '<line class="un-beam" x1="'+n1(b0[0])+'" y1="'+n1(b0[1])+'" x2="'+n1(b1[0])+'" y2="'+n1(b1[1])+'"/>'
     + '<polygon class="un-tip" points="'+n1(b1[0])+','+n1(b1[1]-7)+' '+n1(b1[0]+5)+','+n1(b1[1])+' '
       + n1(b1[0])+','+n1(b1[1]+7)+' '+n1(b1[0]-5)+','+n1(b1[1])+'"/>';
  /* un anillo pequeño que titila sobre el nodo recién conectado: no se
     desplaza ni se expande, sólo respira, para no competir con el halo
     que sale del centro al cerrar la conexión */
  s += '<circle class="un-halo" cx="'+n1(b0[0])+'" cy="'+n1(b0[1])+'" r="14"/>'
     + '<circle class="un-halo b" cx="'+n1(b0[0])+'" cy="'+n1(b0[1])+'" r="14"/>';
  g.innerHTML = s;
  gNode.appendChild(g);
  PROTO.node = g;
})();
/* la conexión del nodo nuevo con el centro, dibujada como las demás */
(function buildUserLink(){
  const a = P(UNODE.a*SP, UNODE.b*SP, 0), b = [0,0];
  gNode.insertBefore(el("line",{ class:"un-link", x1:n1(a[0]), y1:n1(a[1]), x2:n1(b[0]), y2:n1(b[1]) }), gNode.firstChild);
})();

function protoLabel(){
  const t = PROTO.phase;
  connLabel.textContent = t === "running" ? u("establishing")
    : t === "linked" || t === "form" || t === "sent" ? u("startProject")
    : u("connect");
  connSub.textContent = t === "linked" || t === "form" || t === "sent" ? u("nodeReady") : u("channel");
  /* en el móvil la etiqueta larga no entra: mismo estado, versión corta */
  connShort.textContent = t === "running" ? u("cShortRun")
    : t === "linked" || t === "form" || t === "sent" ? u("cShortGo")
    : u("cShort");
  conn.classList.toggle("live", t !== "idle");
  conn.classList.toggle("busy", t === "running");
}

/* pulsos viajando por las conexiones existentes hacia el centro */
function startPulses(){
  frameLoop.request();
  gPulse.innerHTML = "";
  const dots = linkEls.map(l => {
    const fa = Math.abs(l.a.wx)+Math.abs(l.a.wy), fb = Math.abs(l.b.wx)+Math.abs(l.b.wy);
    const from = fa > fb ? l.a : l.b, to = fa > fb ? l.b : l.a;
    const d = Math.hypot(from.wx-to.wx, from.wy-to.wy);
    const e = el("circle",{ class:"pulse", r:"3.4", cx:n1(from.wx), cy:n1(from.wy) });
    gPulse.appendChild(e);
    return { e:e, fx:from.wx, fy:from.wy, tx:to.wx, ty:to.wy,
             delay:Math.max(0, 520 - d*.45), dur:420 + d*.5 };
  });
  PROTO.pulses = { t0:performance.now(), dots:dots };
  /* red de seguridad: si el navegador frena la animación, se cierra igual */
  clearTimeout(PROTO.fallback);
  PROTO.fallback = setTimeout(() => { if(PROTO.phase === "running") protoLinked(); }, 2600);
}
function updatePulses(now){
  const p = PROTO.pulses;
  if(!p) return;
  let live = false;
  p.dots.forEach(d => {
    const t = (now - p.t0 - d.delay)/d.dur;
    if(t < 0){ d.e.setAttribute("opacity","0"); live = true; return; }
    if(t >= 1){ d.e.setAttribute("opacity","0"); return; }
    live = true;
    const e = t < .5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    d.e.setAttribute("cx", n1(d.fx + (d.tx-d.fx)*e));
    d.e.setAttribute("cy", n1(d.fy + (d.ty-d.fy)*e));
    d.e.setAttribute("opacity", String(Math.min(1, t*6) * Math.min(1,(1-t)*4)));
  });
  if(!live){ PROTO.pulses = null; gPulse.innerHTML = ""; clearTimeout(PROTO.fallback); protoLinked(); }
}

/* cada clic vuelve a correr el protocolo entero, aunque ya haya un nodo */
function protoStart(){
  if(PROTO.phase === "running") return;
  /* la conexión se lanza desde la ciudad: si estamos fuera de ella, primero se vuelve */
  if(MAP.on || MAP.closing){
    if(MAP.on) closeMap();
    later(() => { MAP.closing = false; protoStart(); },
          Math.max(0, 2900 - (performance.now() - MAP.closeAt)));
    return;
  }
  if(ORI.on) closeOrigin();
  closePerson();
  panel.classList.remove("open","form","person");
  gNode.classList.remove("on");
  if(current) unfocus();
  PROTO.phase = "running";
  protoLabel();
  document.getElementById("islands").classList.add("recede");
  linkEls.forEach(l => l.el.classList.add("carrying"));
  tween({ k:homeK()*.92, x:0, y:0 }, 900);
  sndProto();
  startPulses();
}
function protoLinked(){
  frameLoop.request();
  PROTO.pulses = null; gPulse.innerHTML = "";
  PROTO.phase = "linked";
  protoLabel();
  document.getElementById("islands").classList.remove("recede");
  linkEls.forEach(l => l.el.classList.remove("carrying"));
  gNode.classList.add("on");
  /* el halo se relanza cada vez: hay que reiniciar la animación */
  const sh = document.getElementById("shock");
  sh.classList.remove("go"); void sh.offsetWidth; sh.classList.add("go");
  sndLink();
  /* el formulario entra apenas el nodo queda enchufado */
  setTimeout(() => { if(PROTO.phase === "linked") openForm(); }, 420);
}
function protoReset(){
  PROTO.phase = "idle";
  PROTO.pulses = null; gPulse.innerHTML = "";
  gNode.classList.remove("on");
  document.getElementById("islands").classList.remove("recede");
  linkEls.forEach(l => l.el.classList.remove("carrying"));
  protoLabel();
  panel.classList.remove("open","form");
  tween({ k:homeK(), x:HOME.x, y:HOME.y }, 900);
}

/* ---------- el panel de la conexión nueva ---------- */
const WANTS = ["REVIT","AUTOCAD","BIM","DOCUMENTATION","OTHER"];
function mailHref(){
  const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
  const body = [u("fName")+": "+g("fName"), u("fCompany")+": "+g("fCompany"),
                u("fEmail")+": "+g("fEmail"), u("fNeed")+": "+(PROTO.want.join(", ") || "—"),
                "", u("fProject")+":", g("fProject")].join("\n");
  return "mailto:"+MAIL+"?subject="+encodeURIComponent("NEW CONNECTION · EXTERNAL NODE")
       + "&body="+encodeURIComponent(body);
}
function openForm(){
  frameLoop.request();
  PROTO.phase = "form";
  protoLabel();
  closePerson();
  panel.classList.remove("person");

  panel.classList.add("form");
  panel.style.setProperty("--accent","var(--coral-3)");
  panel.innerHTML =
      '<div class="eyebrow">'
       +'<div class="mono">'+u("sector")+' 06 · '+u("extNode")+'</div>'
       +'<h2>'+u("newConn")+'</h2>'
       +'<p class="sub">'+u("tellUs")+'</p>'
      +'</div>'
     +'<div class="fields">'
       +'<label><span class="mono">'+u("fName")+'</span><input id="fName" type="text" autocomplete="name"></label>'
       +'<label><span class="mono">'+u("fCompany")+'</span><input id="fCompany" type="text" autocomplete="organization"></label>'
       +'<label><span class="mono">'+u("fEmail")+'</span><input id="fEmail" type="email" autocomplete="email"></label>'
     +'</div>'
     +'<div class="mono">'+u("fNeed")+'</div>'
     +'<div class="chips">'+WANTS.map(w =>
        '<button type="button" class="chip" data-w="'+w+'" aria-pressed="'+(PROTO.want.indexOf(w) >= 0)+'">'+w+'</button>').join("")+'</div>'
     +'<label class="area"><span class="mono">'+u("fProject")+'</span><textarea id="fProject" rows="4"></textarea></label>'
     +'<a class="cta" id="fSend" href="'+mailHref()+'" target="_blank" rel="noopener">'+u("establish")+'</a>'
     +'<a class="callmini mono" target="_blank" rel="noopener" href="mailto:'+MAIL+'?subject='+encodeURIComponent(LANG === "en" ? "30 min call" : "Llamada de 30 min")+'">'+u("call30")+'</a>'
     +'<button class="back" type="button">'+u("backCity")+'</button>';
  [].forEach.call(panel.querySelectorAll(".chip"), b =>
    b.addEventListener("click", () => {
      const w = b.dataset.w, i = PROTO.want.indexOf(w);
      if(i >= 0) PROTO.want.splice(i,1); else PROTO.want.push(w);
      b.setAttribute("aria-pressed", String(i < 0));
      sndTick();
    }));
  [].forEach.call(panel.querySelectorAll("input, textarea"), f =>
    f.addEventListener("input", () => { document.getElementById("fSend").href = mailHref(); }));
  panel.querySelector("#fSend").addEventListener("click", () => setTimeout(showSent, 120));
  panel.querySelector(".back").addEventListener("click", protoReset);
  panel.classList.add("open");
}
function showSent(){
  PROTO.phase = "sent";
  const id = "EXT-" + String(40 + Math.floor(Math.random()*60)).padStart(4,"0");
  panel.innerHTML =
      '<div class="eyebrow">'
       +'<div class="mono">'+u("sector")+' 06 · '+u("extNode")+'</div>'
       +'<h2>'+u("established")+'</h2>'
      +'</div>'
     +'<dl class="block wide">'
       +'<div><dt>NODE ID</dt><dd>'+id+'</dd></div>'
       +'<div><dt>STATUS</dt><dd>'+u("received")+'</dd></div>'
     +'</dl>'
     +'<p class="lead">'+u("inTouch")+'</p>'
     +'<button class="back" type="button">'+u("backCity")+'</button>';
  panel.querySelector(".back").addEventListener("click", protoReset);
  sndLink();
}

conn.addEventListener("click", protoStart);
conn.addEventListener("pointerenter", () => {
  if(PROTO.phase !== "idle") return;
  linkEls.forEach(l => { if(l.a === ISLES[1] || l.b === ISLES[1]) l.el.classList.add("hot"); });
});
conn.addEventListener("pointerleave", () => {
  if(PROTO.phase !== "idle") return;
  linkEls.forEach(l => l.el.classList.remove("hot"));
});
protoLabel();

/* ============================================================
   8. TERRITORIO EXTERNO — WORK no es otra isla: es salir de la ciudad
   La Ciudad Remote queda suspendida en un espacio mucho mayor y el
   mapa vive lejos, unido al centro por líneas finísimas.
   ============================================================ */

/* Territorio real, no de referencia: Texas e Idaho, vivienda unifamiliar
   con entramado de madera. Las cifras son proyectos documentados. */
/* el estado marca territorio y tipología; la cantidad se dice una sola vez,
   como total, que es más honesto y más fuerte que repartirla por región */
const WSTATES = {
  TX:{ sfr:1 }, ID:{ sfr:1 },
  MI:{ twh:1 }, MA:{ twh:1 }, NY:{ twh:1 }, MD:{ twh:1 }, VA:{ twh:1 }, DC:{ twh:1 }
};
const WTOTAL = 2500;
/* territorio activo aunque todavía no tengamos la cifra cerrada */
const WON = s => Object.prototype.hasOwnProperty.call(WSTATES,s);
/* retícula de estados: mapa de operaciones, no de fronteras */
const GRID = [
  ["AK",0,0],["ME",11,0],["VT",10,1],["NH",11,1],
  ["WA",1,2],["ID",2,2],["MT",3,2],["ND",4,2],["MN",5,2],["IL",6,2],["WI",7,2],["MI",8,2],["NY",9,2],["RI",10,2],["MA",11,2],
  ["OR",1,3],["NV",2,3],["WY",3,3],["SD",4,3],["IA",5,3],["IN",6,3],["OH",7,3],["PA",8,3],["NJ",9,3],["CT",10,3],
  ["CA",1,4],["UT",2,4],["CO",3,4],["NE",4,4],["MO",5,4],["KY",6,4],["WV",7,4],["VA",8,4],["MD",9,4],["DE",10,4],
  ["AZ",2,5],["NM",3,5],["KS",4,5],["AR",5,5],["TN",6,5],["NC",7,5],["SC",8,5],["DC",9,5],
  ["OK",3,6],["LA",4,6],["MS",5,6],["AL",6,6],["GA",7,6],
  ["HI",0,7],["TX",3,7],["FL",8,7]
];
/* dos tipologías reales, no cuatro inventadas */
const TYPES = [["sfr","SINGLE FAMILY"],["twh","TOWNHOUSE"]];
const REGION = {};
Object.keys(WSTATES).sort().forEach((s,i) => { REGION[s] = String(i+1).padStart(2,"0"); });

const gMap = document.getElementById("usmap"), gTypo = document.getElementById("typo");
const MAPY = 2600;   /* el territorio queda por debajo: la ciudad flota sobre él */
gMap.setAttribute("transform","translate(0,"+MAPY+")");
gTypo.setAttribute("transform","translate(0,"+MAPY+")");

/* ---------- las tipologías en miniatura ----------
   Lo que se planta en cada región no es una casita genérica: es la misma
   volumetría que se explora en TYPOLOGY. Donde hicimos unifamiliar aparece
   una unifamiliar —dos plantas y el garaje adelantado—, y donde hicimos
   adosados aparece la tira con sus hastiales repetidos. */
function miniModel(kind,cx,cy,sc){
  const q = (a,b,z) => [cx + (a-b)*.866*sc, cy + ((a+b)*.5 - z)*sc];
  const P2 = p => p[0].toFixed(1)+","+p[1].toFixed(1);
  const poly = (pp,f) => '<polygon points="'+pp.map(P2).join(" ")+'" fill="var(--'+f+')"/>';
  /* un cuerpo a dos aguas, con el hastial mirando al frente */
  const gab = (x0,y0,w,d,z,h,ri,hue) => {
    const A = q(x0,y0,z),     B = q(x0+w,y0,z),     C = q(x0+w,y0+d,z);
    const a = q(x0,y0,z+h),   b = q(x0+w,y0,z+h),   c = q(x0+w,y0+d,z+h), e = q(x0,y0+d,z+h);
    const R0 = q(x0+w/2,y0,z+h+ri), R1 = q(x0+w/2,y0+d,z+h+ri);
    return poly([A,B,b,a],hue+"-3") + poly([B,C,c,b],hue+"-2")
         + poly([a,b,R0],hue+"-1") + poly([b,c,R1,R0],hue+"-2") + poly([a,R0,R1,e],hue+"-1");
  };
  const slab = (x0,y0,w,d,z,h,hue) => {
    const A = q(x0,y0,z), B = q(x0+w,y0,z), C = q(x0+w,y0+d,z);
    const a = q(x0,y0,z+h), b = q(x0+w,y0,z+h), c = q(x0+w,y0+d,z+h), e = q(x0,y0+d,z+h);
    return poly([A,B,b,a],hue+"-3") + poly([B,C,c,b],hue+"-2") + poly([a,b,c,e],hue+"-1");
  };

  if(kind === "twh"){
    /* tira de tres unidades pegadas, cada una con su hastial al frente */
    let s = slab(-.6,-.6,16.2,8.2,0,1,"slate");
    for(let i=0;i<3;i++) s += gab(i*5.2, 0, 4.9, 7, 1, 8, 3.6, "blue");
    return s;
  }
  /* unifamiliar: cuerpo de dos plantas, hastial al frente y garaje bajo */
  let s = slab(-.6,-.6,10.4,8.6,0,.9,"slate");
  s += gab(0, 1.6, 6.4, 6.4, .9, 8.2, 3.4, "blue");       /* cuerpo */
  s += gab(6.6, 0, 5.2, 5.6, 0, 4.4, 2.4, "blue");        /* garaje adelantado */
  return s;
}

/* ---------- el territorio ----------
   La retícula se acuesta en axonometría suave: sigue leyéndose de oeste a este
   como cualquier mapa de Estados Unidos, pero tiene profundidad. Lo que se
   levanta encima —las casitas— va recto, que es como se dibuja una implantación:
   el plano se tumba, los objetos no. */
const CW = 30, CH = 26;                 /* celda del mapa, antes de acostarla */
const MPX = -11*CW/2, MPY = -8*CH/2;
/* el plano tumbado: corre a la derecha al alejarse y se comprime en vertical */
const MSX = .40, MSY = -.115, MDY = .58;
const mpt = (x,y) => [x + y*MSX, x*MSY + y*MDY];
const mx = c => MPX + c*CW, my = r => MPY + r*CH;
const mp = (x,y) => { const p = mpt(x,y); return p[0].toFixed(1)+","+p[1].toFixed(1); };


function buildMap(){
  if(gMap.hasChildNodes()) return;
  let s = "";
  s += '<circle class="hq-dot" cx="0" cy="'+(-MAPY)+'" r="5"/>'
     + '<text class="hq-txt" x="16" y="'+(-MAPY+3)+'">REMOTE CITY · HQ NETWORK</text>';

  /* de atrás hacia adelante, que en un plano tumbado también manda el orden */
  GRID.slice().sort((a,b) => a[2]-b[2]).forEach(g => {
    const code = g[0], X = mx(g[1]), Y = my(g[2]), W = CW-4, H = CH-4;
    const on = WON(code);
    let t = '<g class="st'+(on ? " on" : "")+'" data-s="'+code+'"'
          + (on ? ' tabindex="0" role="button" aria-label="'+code+'"' : '')+'>';
    /* la celda, ya acostada */
    const quad = mp(X,Y)+" "+mp(X+W,Y)+" "+mp(X+W,Y+H)+" "+mp(X,Y+H);
    t += '<polygon class="st-cell'+(on ? " on" : "")+'" points="'+quad+'"/>';
    if(on){
      const sfr = !!WSTATES[code].sfr;
      /* la casita se planta en el punto del plano, pero se dibuja de pie */
      /* la volumetría de la tipología, plantada en el punto del plano */
      /* el modelo crece hacia la izquierda desde su origen: hay que anclarlo
         a la derecha de la celda para que caiga centrado */
      const p = mpt(X + (sfr ? 11 : 12), Y + 6);
      t += miniModel(sfr ? "sfr" : "twh", p[0], p[1], sfr ? .82 : .66);
      const lp = mpt(X+4, Y+H-3);
      t += '<text class="st-code" x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'">'+code+'</text>';
    }
    t += '<polygon points="'+quad+'" fill="transparent"/></g>';
    s += t;
  });

  /* el total, al pie del territorio */
  const tp = mpt(MPX-16, my(10)+44);
  s += '<text class="tot-n" x="'+tp[0].toFixed(1)+'" y="'+tp[1].toFixed(1)+'">+2,500</text>'
     + '<text class="tot-l" x="'+(tp[0]+2).toFixed(1)+'" y="'+(tp[1]+26).toFixed(1)+'">'+u("totLine")+'</text>';
  gMap.innerHTML = s;
}

/* ---------- tipologías ---------- */
/* ---------- volúmenes de tipología ----------
   No son iconos: son las dos casas que documentamos de verdad. La unifamiliar
   de Idaho —cuerpo bajo y ancho, hastial de entrada y garaje adelantado— y la
   tira de adosados, con su hastial repetido por unidad y el porche corrido. */

/* cuerpo con cubierta a dos aguas; la cumbrera corre en Y, así que el hastial
   mira al frente, que es como se ven estas casas desde la calle */
function gabY(bx,by,w,d,z,h,rise,c1,c2){
  const A = P(bx,by,z+h),     B = P(bx+w,by,z+h);
  const C = P(bx+w,by+d,z+h), D = P(bx,by+d,z+h);
  const R0 = P(bx+w/2,by,z+h+rise), R1 = P(bx+w/2,by+d,z+h+rise);
  return box(bx,by,w,d,z,h,c1)
    + '<polygon class="f" points="'+pts([B,C,R1,R0])+'" fill="var(--'+c2+'-2)"/>'
    + '<polygon class="f" points="'+pts([A,D,R1,R0])+'" fill="var(--'+c2+'-3)"/>'
    + '<polygon class="f" points="'+pts([B,A,R0])+'" fill="var(--'+c2+'-1)"/>';
}
/* la misma, girada: cumbrera en X para los cuerpos que se ven de lado */
function gabX(bx,by,w,d,z,h,rise,c1,c2){
  const A = P(bx,by,z+h),     B = P(bx+w,by,z+h);
  const C = P(bx+w,by+d,z+h), D = P(bx,by+d,z+h);
  const R0 = P(bx,by+d/2,z+h+rise), R1 = P(bx+w,by+d/2,z+h+rise);
  return box(bx,by,w,d,z,h,c1)
    + '<polygon class="f" points="'+pts([A,B,R1,R0])+'" fill="var(--'+c2+'-2)"/>'
    + '<polygon class="f" points="'+pts([D,C,R1,R0])+'" fill="var(--'+c2+'-3)"/>'
    + '<polygon class="f" points="'+pts([B,C,R1])+'" fill="var(--'+c2+'-1)"/>';
}

function typoModel(k,x,y){
  let s = "";

  if(k === "sfr"){
    /* dos plantas con revestimiento vertical, garaje de una planta adelantado
       y porche cubierto: la producción típica de Texas e Idaho.
       Se pinta de atrás hacia adelante, que en isométrica es la profundidad. */
    s += box(x+.26, y+.82, 1.94, 1.26, 0, .10, "slate");                  /* zócalo */
    s += gabX(x+.30, y+.86, 1.86, 1.18, .10, .90, .40, "blue", "blue");   /* cuerpo de dos plantas */
    s += box(x+.52, y+1.30, .16, .16, 1.00, .30, "slate");                /* chimenea */
    s += gabY(x+.40, y+.28, .88, .92, .10, .98, .46, "blue", "blue");     /* hastial al frente */
    /* porche cubierto sobre la planta baja */
    s += box(x+1.34, y+.30, .82, .28, .58, .05, "slate");
    [0,1,2].forEach(i => s += box(x+1.40+i*.34, y+.32, .05, .05, .10, .48, "slate"));
    /* garaje: una sola planta, adelantado y con su hastial */
    s += box(x+2.16, y+.22, 1.22, 1.30, 0, .10, "slate");
    s += gabY(x+2.20, y+.26, 1.14, 1.22, .10, .52, .34, "blue", "blue");
    return s;
  }

  if(k === "twh"){
    /* primero el zócalo corrido, que es lo que queda debajo de todo */
    s += box(x+.24, y+.51, 3.20, 1.43, 0, .16, "slate");
    /* cuatro unidades pegadas, cada una con su hastial al frente */
    for(let i=0;i<4;i++){
      const bx = x+.28 + i*.78;
      s += gabY(bx, y+.55, .74, 1.35, .16, .82, .44, "blue", "blue");
      if(i < 3) s += box(bx+.74, y+.60, .04, 1.25, .16, .62, "slate");
    }
    /* el porche es una marquesina, no un muro: va a altura de alero */
    s += box(x+.26, y+.30, 3.16, .30, .60, .05, "slate");
    for(let i=0;i<5;i++) s += box(x+.30 + i*.78, y+.32, .05, .05, .16, .44, "slate");
    return s;
  }

  return s;
}

function buildTypo(){
  if(gTypo.hasChildNodes()) return;
  const spots = [[-4.6,-1.9],[.9,-1.9],[-4.6,1.8],[.9,1.8]];
  let s = "";
  TYPES.forEach((t,i) => {
    const x = spots[i][0], y = spots[i][1];
    /* el rótulo sale del conjunto: a la izquierda o a la derecha según la columna */
    const left = (i % 2) === 0;
    const c = left ? P(x-.5,y+3.1,0) : P(x+3.7,y-.5,0);
    const lx = c[0] + (left ? -13 : 13);
    s += '<g class="ty" data-t="'+t[0]+'" tabindex="0" role="button" aria-label="'+t[1]+'">'
       + '<polygon class="ty-plate" points="'+pts([P(x-.5,y-.5,0),P(x+3.7,y-.5,0),P(x+3.7,y+3.1,0),P(x-.5,y+3.1,0)])+'"/>'
       + typoModel(t[0],x,y)
       + '<polygon points="'+pts([P(x-.5,y-.5,2.6),P(x+3.7,y-.5,2.6),P(x+3.7,y+3.1,2.6),P(x-.5,y+3.1,2.6)])+'" fill="transparent"/>'
       + '<line class="ty-lead" x1="'+n1(c[0])+'" y1="'+n1(c[1])+'" x2="'+n1(lx)+'" y2="'+n1(c[1])+'"/>'
       + '<circle class="ty-dot" cx="'+n1(c[0])+'" cy="'+n1(c[1])+'" r="1.5"/>'
       + '<text class="ty-name" x="'+n1(lx + (left ? -5 : 5))+'" y="'+n1(c[1]+2.4)
       + '" text-anchor="'+(left ? "end" : "start")+'">'+t[1]+'</text></g>';
  });
  gTypo.innerHTML = s;
}

/* ---------- estado ---------- */
const MAP = { on:false, arrived:false, closing:false, closeAt:0, mode:"territory", sel:null, timers:[] };
const msTitle = document.getElementById("msTitle"), msSub = document.getElementById("msSub");
const mapStatus = document.getElementById("mapStatus");
function msg(a,b){ msTitle.textContent = a; msSub.textContent = b || ""; mapStatus.classList.add("on"); }
function msgOff(){ mapStatus.classList.remove("on"); }
function clearTimers(){ MAP.timers.forEach(clearTimeout); MAP.timers = []; }
const later = (f,ms) => MAP.timers.push(setTimeout(f,ms));

function mapPanel(){
  frameLoop.request();
  panel.style.setProperty("--accent","var(--blue-3)");
  const t = MAP.sel;
  let h = '<div class="eyebrow">'
        +'<div class="mono">'+u("extTerr")+' · US</div>'
        +'<h2>'+u("usTitle")+'</h2>'
        +'<p class="sub">'+(MAP.mode === "territory" ? u("territory") : u("typology"))+'</p></div>'
    +'<p class="lead"><b>'+u("privTitle")+'</b><br>'+u("privBody")+'</p>'
    +'<div class="modes">'
      +'<button type="button" data-m="territory" aria-current="'+(MAP.mode === "territory")+'">'+u("territory")+'</button>'
      +'<button type="button" data-m="typology" aria-current="'+(MAP.mode === "typology")+'">'+u("typology")+'</button>'
    +'</div><hr class="rule">';
  if(MAP.mode === "territory"){
    if(t && WSTATES[t]){
      const d = WSTATES[t];
      h += '<div class="mono">'+t+' · '+u("region")+' '+REGION[t]+'</div>'
        + '<div class="specs"><div><span class="n">'+TYPES.filter(x => d[x[0]])[0][1]+'</span><span class="l">'+u("typology2")+'</span></div>'
        + '<div><span class="n">'+u("active")+'</span><span class="l">'+u("status")+'</span></div>'
        + '<div><span class="n">'+u("region")+' '+REGION[t]+'</span><span class="l">US</span></div></div>'
        + '<ul class="items">'+TYPES.filter(x => d[x[0]]).map(x =>
            '<li><span class="k">'+String(d[x[0]]).padStart(2,"0")+'</span><span><span class="t">'+u("ty_"+x[0])+'</span></span></li>').join("")+'</ul>'
        + '<div class="mono">'+u("scope")+'</div>'
        + '<p class="lead">BIM · REVIT · AUTOCAD<br>'+u("scopeBody")+'</p>';
    }else{
      h += '<div class="specs">'
        + '<div><span class="n">'+String(Object.keys(WSTATES).length).padStart(2,"0")+'</span><span class="l">'+u("activeStates")+'</span></div>'
        + '<div><span class="n">02</span><span class="l">'+u("typologies")+'</span></div>'
        + '<div><span class="n">+'+WTOTAL.toLocaleString("en-US")+'</span><span class="l">'+u("operations")+'</span></div></div>'
        + '<p class="lead">'+u("pickState")+'</p>';
    }
  }else{
    const k = MAP.sel;
    if(k && TYPES.filter(x => x[0] === k).length){
      h += '<div class="mono">'+u("ty_"+k)+' · '+u("sector")+' A-0'+(TYPES.findIndex(x => x[0] === k)+1)+'</div>'
        + '<p class="lead">'+u("tyd_"+k)+'</p>'
        + '<div class="mono">'+u("experience")+'</div>'
        + '<ul class="items">'+u("tye_"+k).map((l,i) =>
            '<li><span class="k">'+String(i+1).padStart(2,"0")+'</span><span><span class="t">'+l+'</span></span></li>').join("")+'</ul>'
        + '<div class="specs"><div><span class="n">'+Object.keys(WSTATES).filter(s => (WSTATES[s][k] || 0) > 0).length+'</span><span class="l">'+u("states")+'</span></div>'
        + '<div><span class="n">'+u("active")+'</span><span class="l">'+u("status")+'</span></div>'
        + '<div><span class="n">ARC · STR<br>MEP</span><span class="l">'+u("disciplines")+'</span></div></div>';
    }else{
      h += '<p class="lead">'+u("pickType")+'</p>';
    }
  }
  h += '<button class="back" type="button">'+u("returnCity")+'</button>';
  panel.innerHTML = h;
  [].forEach.call(panel.querySelectorAll("[data-m]"), b =>
    b.addEventListener("click", () => setMode(b.dataset.m)));
  panel.querySelector(".back").addEventListener("click", closeMap);
  panel.classList.add("open");
  /* con la hoja ya medida, el territorio se acomoda encima de ella */
  fitTo(MAP.mode === "territory" ? "#usmap .st" : "#typo .ty");
}

function setMode(m){
  if(m === "typology") buildTypo();
  else buildMap();
  MAP.mode = m; MAP.sel = null;
  gMap.classList.toggle("hide", m !== "territory");
  gTypo.classList.toggle("hide", m !== "typology");
  [].forEach.call(document.querySelectorAll(".st, .ty"), g => g.classList.remove("sel"));
  sndTick();
  if(MAP.on) mapPanel();
}
function pickState(code){
  if(!WSTATES[code] || !MAP.on) return;
  MAP.sel = code;
  [].forEach.call(gMap.querySelectorAll(".st"), g => g.classList.toggle("sel", g.dataset.s === code));
  sndPick(GRID.findIndex(g => g[0] === code) % 5);
  mapPanel();
}
function pickType(k){
  if(!MAP.on) return;
  MAP.sel = k;
  [].forEach.call(gTypo.querySelectorAll(".ty"), g => g.classList.toggle("sel", g.dataset.t === k));
  sndPick(TYPES.findIndex(x => x[0] === k));
  mapPanel();
}

/* ---------- salir de la ciudad ---------- */
function openMap(){
  if(MAP.on) return;
  buildMap();
  if(MAP.mode === "typology") buildTypo();
  clearTimers();
  MAP.on = true; MAP.arrived = false; MAP.closing = false; MAP.sel = null;
  if(ORI.on) closeOrigin();
  if(PROTO.phase !== "idle") protoReset();
  if(current) unfocus();
  closePerson();
  panel.classList.remove("open","person","form");
  const wlab = dx(ISLES.filter(i => i.id === "work")[0],"label");
  readout.textContent = wlab + " · " + u("extTerr");
  gMap.classList.toggle("hide", MAP.mode !== "territory");
  gTypo.classList.toggle("hide", MAP.mode !== "typology");
  sndProto();
  msg(wlab, u("extTerr"));
  tween({ k:.15, x:0, y:0 }, 1500);                      /* la ciudad se hace un punto */
  later(() => { msg(u("leaving"), "..."); document.body.classList.add("mapmode");
                tween({ k:.13, x:0, y:MAPY*.5 }, 1500); }, 1600);
  later(() => { msg(u("detected"), ""); sndLink();
                tween({ k:mob() ? .92 : 1.25, x:0, y:MAPY }, 1600); }, 3200);
  later(() => { msgOff(); MAP.arrived = true; mapPanel(); }, 4900);
}
function closeMap(){
  if(!MAP.on) return;
  clearTimers();
  MAP.on = false; MAP.arrived = false; MAP.sel = null;
  MAP.closing = true; MAP.closeAt = performance.now();
  MOBFIT = null;
  panel.classList.remove("open");
  msg(u("returning"), "REMOTE CITY");
  tween({ k:.14, x:0, y:MAPY*.55 }, 1400);
  later(() => { document.body.classList.remove("mapmode"); tween({ k:.2, x:0, y:0 }, 1300); }, 1500);
  later(() => { tween({ k:homeK(), x:HOME.x, y:HOME.y }, 1300); }, 2800);
  later(() => { MAP.closing = false; msgOff();
                /* si mientras volvíamos se eligió un destino, no se le borra el rótulo */
                if(!current && !ORI.on) readout.textContent = "— — —"; }, 3900);
  sndBack();
}

function territoryAction(event){
  if(event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest(".st.on, .ty");
  if(!target || !event.currentTarget.contains(target)) return;
  event.preventDefault();
  event.stopPropagation();
  if(target.dataset.s) pickState(target.dataset.s);
  else pickType(target.dataset.t);
}
[gMap, gTypo].forEach(group => {
  group.addEventListener("click", territoryAction);
  group.addEventListener("keydown", territoryAction);
});

/* ============================================================
   9. SYSTEM ORIGIN — ABOUT US no agrega un lugar: desarma este
   La cámara no se mueve. Lo que cambia es la ciudad: se cae y se
   vuelve a levantar mientras se cuenta por qué existe.
   ============================================================ */
const ORI = { on:false, step:0, timers:[], disc:null };
const oLater = (f,ms) => ORI.timers.push(setTimeout(f,ms));
function oClear(){ ORI.timers.forEach(clearTimeout); ORI.timers = []; }

/* orden de construcción: del núcleo hacia afuera */
const BUILD = ISLES.map((_,i) => i).sort((a,b) =>
  (Math.abs(ISLES[a].wx)+Math.abs(ISLES[a].wy)) - (Math.abs(ISLES[b].wx)+Math.abs(ISLES[b].wy)));
const STEPN = [1,3,7,11,ISLES.length];        /* nodos visibles en cada capítulo */

function oStats(){
  const box2 = panel.querySelector("#oStats");
  if(!box2) return;
  const n = document.querySelectorAll("#islands .isl.built").length;
  const c = document.querySelectorAll("#links .link.built").length;
  box2.innerHTML =
      '<div><span class="n">'+String(n).padStart(2,"0")+'</span><span class="l">'+u("oNodes")+'</span></div>'
    + '<div><span class="n">'+String(c).padStart(2,"0")+'</span><span class="l">'+u("oConn")+'</span></div>'
    + '<div><span class="n">'+String(Math.min(5,Math.max(1,Math.ceil(n/3)))).padStart(2,"0")+'</span><span class="l">'+u("oDisc")+'</span></div>';
}
/* enciende las conexiones cuyos dos extremos ya existen */
function linkUp(quiet){
  linkEls.forEach(l => {
    const ok = l.a.g.classList.contains("built") && l.b.g.classList.contains("built");
    if(ok && !l.el.classList.contains("built")){
      l.el.classList.add("built");
      if(!quiet) ping(NOTE[3]*2,.22,.014,"sine");
    }
    if(!ok) l.el.classList.remove("built");
  });
  oStats();
}
/* deja visibles los primeros k nodos del orden de construcción */
function buildTo(k,stagger){
  BUILD.forEach((idx,i) => {
    const show = i < k;
    if(show && !ISLES[idx].g.classList.contains("built")){
      oLater(() => { ISLES[idx].g.classList.add("built"); linkUp(); ping(NOTE[i%5]*2,.3,.02,"sine"); },
             stagger ? 120 + (i - Math.max(0,k-6))*220 : 0);
    }else if(!show){
      ISLES[idx].g.classList.remove("built");
    }
  });
  if(!stagger) linkUp(true);
  oLater(oStats, 40);
}
/* la ciudad se cae: primero los hilos, después los edificios */
function runTear(){
  ISLES.forEach(o => o.g.classList.add("built"));
  linkEls.forEach(l => l.el.classList.add("built"));
  oStats();
  linkEls.forEach((l,i) => oLater(() => { l.el.classList.remove("built"); oStats(); }, 300 + i*38));
  const rev = BUILD.slice().reverse();
  rev.forEach((idx,k) => {
    if(k >= rev.length-1) return;
    oLater(() => { ISLES[idx].g.classList.remove("built"); oStats();
                   if(k % 3 === 0) ping(NOTE[4-(k%5)]*1.5,.26,.016,"sine"); }, 1150 + k*120);
  });
}

function originPanel(){
  panel.style.setProperty("--accent","var(--magenta-3)");
  const s = ORI.step;
  let h = '<div class="eyebrow"><div class="mono">'+u("oSector")[s]+'</div>'
        + '<h2>'+u("oTitle")[s]+'</h2><p class="sub">'+u("oSub")[s]+'</p></div>'
        + '<p class="lead">'+u("oLead")[s]+'</p>';
  if(s === 0) h += '<div class="specs" id="oStats"></div>';
  if(s === 1) h += '<div class="specs" id="oStats"></div>';
  if(s === 2) h += '<div class="specs" id="oStats"></div>';
  /* la red no enumera capacidades: eso es trabajo de SERVICES */
  if(s === 3){
    h += '<div class="specs"><div><span class="n">03</span><span class="l">'+u("oPeople")+'</span></div>'
      + '<div><span class="n">05</span><span class="l">'+u("oDisc")+'</span></div>'
      + '<div><span class="n">03</span><span class="l">'+u("oPlaces")+'</span></div></div>';
  }
  if(s === 4){
    h += '<figure class="human"><img decoding="async" src="'+PHOTOS.agu+'" alt="Agustín Garombo Garelis">'
      +  '<blockquote>'+u("oClaim")+'</blockquote>'
      +  '<figcaption><span class="mono">'+u("oSign")+'</span></figcaption></figure>'
      +  '<p class="lead">'+u("oWhy")+'</p>'
      +  '<dl class="block wide"><div><dt>NETWORK STATUS</dt><dd>'+u("oActive")+'</dd></div>'
      +  '<div><dt>NODES</dt><dd>'+ISLES.length+'</dd></div></dl>'
      +  '<button class="cta" id="oGo" type="button">'+u("oExplore")+'</button>';
  }
  h += '<div class="steps">'
     + '<button class="lab-btn" id="oPrev" type="button"'+(s === 0 ? " disabled" : "")+'>‹</button>'
     + '<span class="mono">0'+(s+1)+' / 05</span>'
     + '<button class="lab-btn go" id="oNext" type="button"'+(s === 4 ? " disabled" : "")+'>'+u("oNext")+'</button>'
     + '</div><button class="back" type="button">'+u("back")+'</button>';
  panel.innerHTML = h;
  oStats();
  panel.querySelector("#oPrev").addEventListener("click", () => originStep(ORI.step-1));
  panel.querySelector("#oNext").addEventListener("click", () => originStep(ORI.step+1));
  panel.querySelector(".back").addEventListener("click", closeOrigin);
  const go = panel.querySelector("#oGo");
  if(go) go.addEventListener("click", () => {
    closeOrigin();
    setTimeout(() => focusIsle(ISLES.filter(i => i.id === "team")[0]), 900);
  });
  panel.classList.add("open");
  /* en el móvil la ciudad entera tiene que caber por encima del texto */
  fitTo("#islands .isl");
}


function originStep(n){
  if(n < 0 || n > 4) return;
  oClear();
  const back = n < ORI.step;
  ORI.step = n; ORI.disc = null;
  linkEls.forEach(l => l.el.classList.remove("hot"));
  document.body.classList.toggle("wiremode", n === 3);
  if(n === 0) runTear();
  else buildTo(STEPN[n], !back);
  originPanel();
  sndTick();
}

function openOrigin(){
  if(ORI.on) return;
  oClear();
  ORI.on = true; ORI.step = 0; ORI.disc = null;
  if(MAP.on) closeMap();
  if(PROTO.phase !== "idle") protoReset();
  closePerson();
  current = null;
  ISLES.forEach(i => i.g.classList.remove("focus","dimmed"));
  document.body.classList.add("originmode");
  readout.textContent = u("oSector")[0];
  /* la cámara no se mueve: sólo vuelve al encuadre de la ciudad */
  tween({ k:homeK(), x:HOME.x, y:HOME.y }, 700);
  sndBack();
  originStep(0);
}
function closeOrigin(){
  frameLoop.request();
  if(!ORI.on) return;
  oClear();
  ORI.on = false; ORI.disc = null;
  document.body.classList.remove("originmode","wiremode");
  MOBFIT = null;
  ISLES.forEach(o => o.g.classList.remove("built"));
  linkEls.forEach(l => l.el.classList.remove("built","hot"));
  panel.classList.remove("open");
  readout.textContent = "— — —";
  sndLink();
}

/* ============================================================
   6. BUCLE
   ============================================================ */
let intro = 0;
let motionDirty = true;
let ambientElapsed = 0;
const frameLoop = createFrameLoop(frame);

function frame(now, elapsed){
  const t = now / 1000;
  const wasMoving = !!from;
  if(from){
    const oldScale = cam.k;
    const p = Math.min(1,(now - t0)/dur), e = ease(p);
    cam.k = from.k + (target.k - from.k)*e;
    cam.x = from.x + (target.x - from.x)*e;
    cam.y = from.y + (target.y - from.y)*e;
    if(p >= 1){ from = null; document.documentElement.classList.add("still"); }
    if(cam.k !== oldScale) updateScale();
  }
  const at = anchor();
  if(!aCur || reduce) aCur = at.slice();
  else {
    aCur[0] = approach(aCur[0], at[0], elapsed);
    aCur[1] = approach(aCur[1], at[1], elapsed);
  }
  const anchorMoving = aCur[0] !== at[0] || aCur[1] !== at[1];
  const vx = aCur[0] - cam.x*cam.k, vy = aCur[1] - cam.y*cam.k;
  setAttr(gWorld,"transform","translate("+vx.toFixed(2)+","+vy.toFixed(2)+") scale("+cam.k.toFixed(4)+")");

  // Drift is decorative: keep it in the overview, hold the city steady while
  // reading or travelling, and update its slow motion at most 30 times/second.
  const drift = !reduce && !SHOT && !current && !MAP.on && !MAP.closing
    && !LAB.mode && !ORI.on && PROTO.phase === "idle";
  ambientElapsed += elapsed;
  const animate = drift && !wasMoving && ambientElapsed >= 1000/30;
  if(animate || motionDirty){
    ISLES.forEach(o => {
      o.dy = reduce ? 0 : Math.sin(t*.55 + o.phase)*o.amp;
      setAttr(o.bob,"transform","translate(0,"+o.dy.toFixed(2)+")");
    });
    sats.forEach(s => {
      const ang = s.t + (reduce ? 0 : t*.06);
      setAttr(s.el,"cx",(Math.cos(ang)*ORX).toFixed(1));
      setAttr(s.el,"cy",(Math.sin(ang)*ORY + 40).toFixed(1));
    });
    SHIPS.forEach((sh,i) => {
      if(animate){
        sh.x += sh.v*Math.min(ambientElapsed,100)/(1000/60);
        if(sh.x > 1900) sh.x = -1900;
        if(sh.x < -1900) sh.x = 1900;
      }
      const bob = reduce ? 0 : Math.sin(t*.4+i)*14;
      const tilt = reduce ? 0 : Math.sin(t*.3+i)*3;
      setAttr(sh.g,"transform","translate("+sh.x.toFixed(1)+","+(sh.y+bob).toFixed(1)+") rotate("+tilt.toFixed(2)+")");
    });
    ambientElapsed = 0;
    motionDirty = false;
  }

  ISLES.forEach(o => {
    if(!o.tag) return;
    const on = (current === o && !LAB.mode) || (!current && hovered === o);
    if(o.tagOn !== on){ o.tag.classList.toggle("on",on); o.tagOn = on; }
    if(on) setAttr(o.tag,"transform","translate("+(vx + o.wx*cam.k).toFixed(1)+","+(vy + (o.wy + o.topY + (o.dy || 0))*cam.k).toFixed(1)+")");
  });
  updatePulses(now);
  if(intro < 1){ intro = reduce ? 1 : Math.min(1, intro + elapsed/1200); gWorld.style.opacity = intro; }
  return !!from || anchorMoving || intro < 1 || !!PROTO.pulses || drift;
}

// Input can change the anchor even without starting a camera tween.
addEventListener("click", frameLoop.request, true);
addEventListener("keydown", frameLoop.request, true);
vbFactor(); updateScale();
applyLang();
tween({ k:homeK(), x:HOME.x, y:HOME.y },1800);


/* ---------- A-401 · sección constructiva ----------
   La pieza que demuestra oficio: el paquete completo de un muro exterior de
   entramado de madera, de la zapata al alero. Dibujada en pulgadas, que es
   como se acota, y a escala 1 1/2" = 1'-0".
   Todo es geometría nuestra: no hay una línea tomada de ningún proyecto. */
const DET = { on:false };
const dR = (x,y,w,h,c) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" class="'+c+'"/>';
const dL = (x1,y1,x2,y2,c) => '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" class="'+(c||"d-thin")+'"/>';

function detailSVG(){
  /* el muro se dibuja en vertical con su espesor real exagerado, que es como
     se dibuja un detalle ampliado, y se parte con una línea de rotura: un
     muro entero a escala sería una franja de un dedo de ancho */
  const A = 150, W = 46;      /* eje interior del entramado */
  const SH = A - 9, SI = A - 20, GY = A + W;   /* tablero, revestimiento, yeso */
  let s = "";

  /* ---- alero: cordón, faldón, sofito y fascia ---- */
  s += '<path class="d-cut" d="M'+(A-56)+' 96 L'+(A+150)+' 30 L'+(A+150)+' 43 L'+(A-56)+' 109 Z"/>';
  s += '<path class="d-fine" d="M'+(A-60)+' 88 L'+(A+150)+' 21"/>';
  s += dR(A-56,109,206,8,"d-cut");                       /* cordón inferior */
  s += dR(A-56,117,52,7,"d-fine");                       /* sofito ventilado */
  s += dR(A-62,96,7,28,"d-cut");                         /* fascia 2x8 */
  s += dR(A-6,101,12,8,"d-fine");                        /* bloqueo del talón */

  /* ---- muro alto ---- */
  s += dR(A,117,W,7,"d-cut") + dR(A,124,W,7,"d-cut");    /* doble solera */
  s += dR(A,131,W,88,"d-batt");
  for(let y=137;y<216;y+=8) s += dL(A+3,y,A+W-3,y-4,"d-batt-l");
  s += dR(A,131,W,88,"d-stud");
  s += dR(SH,117,9,102,"d-cut") + dR(SI,117,11,102,"d-fine");
  s += dL(SH-.7,117,SH-.7,219,"d-wrap");
  s += dR(GY,131,7,88,"d-fine");

  /* ---- rotura ---- */
  const brk = y => '<path class="d-brk" d="M'+(SI-14)+' '+y+' L'+(A-4)+' '+(y-7)
    + ' L'+(A+W/2)+' '+(y+7)+' L'+(GY+3)+' '+(y-6)+' L'+(GY+16)+' '+y+'"/>';
  s += brk(228) + brk(246);
  s += '<text class="d-note" x="'+(GY+22)+'" y="242">BREAK</text>';

  /* ---- muro bajo, entrepiso y fundación ---- */
  s += dR(A,255,W,72,"d-batt");
  for(let y=261;y<324;y+=8) s += dL(A+3,y,A+W-3,y-4,"d-batt-l");
  s += dR(A,255,W,72,"d-stud");
  s += dR(SH,255,9,72,"d-cut") + dR(SI,255,11,72,"d-fine");
  s += dL(SH-.7,255,SH-.7,327,"d-wrap");
  s += dR(GY,255,7,72,"d-fine");
  s += dR(A,327,W,8,"d-cut");                            /* solera inferior */

  s += dR(SH,335,W+16,5,"d-cut");                        /* subpiso 3/4" T&G */
  s += dR(SH,340,13,40,"d-cut");                         /* viga de borde LVL */
  s += dR(SH+16,340,W-8,40,"d-fine");                    /* vigueta 2x10 detrás */
  for(let x=SH+22;x<A+W;x+=10) s += dL(x,343,x,377,"d-batt-l");
  s += dR(SH,380,W+16,7,"d-cut");                        /* solera de apoyo */

  s += dR(SH,387,W+12,66,"d-conc");                      /* muro de fundación */
  for(let y=393;y<451;y+=8) s += dL(SH,y,SH+W+12,y-8,"d-conc-l");
  s += dR(SH-16,453,W+44,20,"d-conc");                   /* zapata corrida */
  for(let y=458;y<471;y+=8) s += dL(SH-16,y,SH+W+28,y-8,"d-conc-l");
  s += dL(A+16,384,A+16,418,"d-bolt") + '<circle cx="'+(A+16)+'" cy="384" r="3" class="d-dot"/>';
  s += '<path class="d-soil" d="M'+(SI-52)+' 414 L'+SH+' 414"/>';
  for(let x=SI-52;x<SH-2;x+=9) s += dL(x,414,x+5,420,"d-soil");

  /* ---- notas: la guía sale corta y el texto se alinea en una columna ---- */
  const T = A + 168;
  const N = [[A+60,60,52,'ASPHALT SHINGLES O/ 15# FELT'],
             [A+40,78,76,'7/16" OSB ROOF SHEATHING'],
             [A+30,113,100,'PREFAB TRUSS @ 24" O.C.'],
             [A-40,120,124,'VENTED SOFFIT · 2x8 FASCIA'],
             [A+W/2,121,148,'DBL 2x6 TOP PLATE'],
             [A+W/2,170,172,'2x6 STUDS @ 16" O.C.'],
             [A+W-8,196,196,'R-21 BATT INSULATION'],
             [SH+4,196,220,'7/16" OSB SHTG + WRB'],
             [SI+5,280,278,'FIBER CEMENT SIDING'],
             [GY+3,290,302,'1/2" GYPSUM BOARD'],
             [A+W/2,331,326,'2x6 BOTTOM PLATE'],
             [A+20,337,350,'3/4" T&G SUBFLOOR'],
             [SH+34,360,374,'2x10 FLOOR JOIST @ 16" O.C.'],
             [SH+6,360,398,'LVL RIM BOARD'],
             [A+16,400,422,'1/2" ANCHOR BOLT @ 6\'-0" O.C.'],
             [A+10,432,446,'8" CONC. FOUNDATION WALL'],
             [A+10,463,470,'16"x8" CONT. CONC. FOOTING'],
             [SI-30,416,494,'FINISH GRADE']];
  N.forEach(n => {
    const [x,y,ty,t] = n;
    s += dL(x,y,T-14,ty-3,"d-lead") + dL(T-14,ty-3,T-4,ty-3,"d-lead")
       + '<circle cx="'+x+'" cy="'+y+'" r="2" class="d-dot"/>'
       + '<text class="d-note" x="'+T+'" y="'+ty+'">'+t+'</text>';
  });

  /* cotas verticales */
  const dim = (y0,y1,t) => dL(SI-22,y0,SI-22,y1,"d-dim")
    + dL(SI-26,y0,SI-18,y0,"d-dim") + dL(SI-26,y1,SI-18,y1,"d-dim")
    + '<text class="d-dim-t" x="'+(SI-28)+'" y="'+((y0+y1)/2+3)+'" text-anchor="end">'+t+'</text>';
  s += dim(124,335,'9\'-0"') + dim(340,387,'11-7/8"');

  return '<svg viewBox="60 14 470 480" role="img" aria-label="Sección constructiva de muro exterior">'+s+'</svg>';
}

/* la misma ventana sirve para un dibujo o para una nota: lo que cambia
   es el cuerpo. La de automatización no necesita dibujar nada. */
function openDetail(kind){
  if(DET.on) return;
  DET.on = true;
  const auto = kind === "auto";
  const d = document.getElementById("detail");
  d.innerHTML =
      '<div class="d-head"><div class="mono">'+u("docRef")+' · '+(auto ? "AUT-01" : "A-401")+'</div>'
    + '<b>'+(auto ? u("autTitle") : u("detTitle"))+'</b></div>'
    + (auto ? '<div class="d-body"><p class="lead">'+u("autLead")+'</p>'
              +'<ul class="items">'+u("autList").map((l,i) =>
                  '<li><span class="k">'+String(i+1).padStart(2,"0")+'</span><span><span class="t">'+l[0]
                  +'</span><span class="d">'+l[1]+'</span></span></li>').join("")+'</ul></div>'
            : '<div class="d-draw">'+detailSVG()+'</div>')
    + '<dl class="block wide d-foot">'
      + '<div><dt>'+(auto ? u("scope") : u("scale"))+'</dt><dd>'+(auto ? "AUTOCAD · LISP" : '1 1/2" = 1'+String.fromCharCode(39)+'-0"')+'</dd></div>'
      + '<div><dt>'+u("status")+'</dt><dd class="live">'+(auto ? u("active") : u("coordinated"))+'</dd></div>'
    + '</dl>'
    + '<button class="lab-btn" id="detClose" type="button">✕ '+u("labBack")+'</button>';
  d.classList.add("on");
  d.querySelector("#detClose").addEventListener("click", closeDetail);
  sndPick(1);
}
function closeDetail(){
  if(!DET.on) return;
  DET.on = false;
  document.getElementById("detail").classList.remove("on");
  sndBack();
}


/* ---------- modo captura ----------
   index.html?shot=city deja sólo el dibujo, encuadrado para un cuadrado de
   Instagram. Sin el parámetro no se ejecuta nada de esto, así que el sitio
   publicado no se entera de que existe. */
(function shots(){
  const key = new URLSearchParams(location.search).get("shot");
  if(!key) return;
  const PLAN = {
    city : { look:new URLSearchParams(location.search).get("look") || "bw",
             sel:"#islands .isl", pad:.80, wait:500 },
    plan : { look:"bw",    sel:"#islands .isl.focus", pad:.76, wait:3000,
             run:() => openLab("autocad") },
    flat : { look:"bw",    sel:".plan-g",             pad:.90, wait:3400,
             run:() => { openLab("autocad");
               const n = +(new URLSearchParams(location.search).get("sheet") || 0);
               setTimeout(() => { LAB.sheet = n; drawLab(); setFlat(true); }, 900); } },
    bim  : { look:"bw",    sel:"#islands .isl.focus", pad:.76, wait:3000,
             run:() => openLab("revit") },
    typo : { look:"light", sel:"#typo .ty",           pad:.92, wait:6000,
             run:() => { openMap(); setTimeout(() => setMode("typology"), 5200); } },
    map  : { look:"light", sel:"#usmap .st-cell",     pad:.90, wait:6000,
             run:() => openMap() },
    rings: { look:"bw",    sel:"#islands .isl",       pad:.80, wait:500,
             run:() => {
               /* los anillos se congelan en un instante elegido: la animación
                  en curso no se puede fotografiar de forma repetible */
               const sh = document.getElementById("shock");
               sh.classList.add("go","frozen");
               const R = sh.querySelectorAll(".shockring");
               [[9,.85],[15,.5],[22,.24]].forEach((v,i) => {
                 if(!R[i]) return;
                 R[i].style.animation = "none";
                 R[i].style.transform = "scale("+v[0]+")";
                 R[i].style.opacity = v[1];
               });
             } }
  }[key];
  if(!PLAN) return;

  document.documentElement.classList.add("shot");
  SHOT = true;
  SND.on = false;
  setLook(PLAN.look);
  intro = 1; gWorld.style.opacity = 1;
  if(PLAN.run) PLAN.run();

  /* el encuadre no se adivina: se mide lo que hay que enseñar y se ajusta */
  setTimeout(() => {
    const bb = unionBB(document.querySelectorAll(PLAN.sel));
    if(bb && bb.width && bb.height){
      const win = 1000;                    /* ventana visible en formato cuadrado */
      cam.k = Math.min(win*PLAN.pad/bb.width, win*PLAN.pad/bb.height);
      cam.x = bb.x + bb.width/2;
      cam.y = bb.y + bb.height/2;
      from = null; target = { k:cam.k, x:cam.x, y:cam.y };
      /* en captura no se puede confiar en el bucle de animación: el navegador
         sin ventana apenas lo ejecuta. La transformación se escribe a mano. */
      gWorld.setAttribute("transform",
        "translate("+(800-cam.x*cam.k).toFixed(2)+","+(500-cam.y*cam.k).toFixed(2)+
        ") scale("+cam.k.toFixed(4)+")");
    }
    /* el navegador sin ventana se queda con el primer pintado: hay que
       invalidarlo a mano. Rehacer el nodo es lo único que lo obliga a
       rasterizar de nuevo la escena ya encuadrada. */
    frameLoop.stop();
    gWorld.parentNode.replaceChild(gWorld.cloneNode(true), gWorld);
    document.documentElement.classList.add("still");
    document.documentElement.classList.add("shot-ready");
  }, PLAN.wait);
})();
