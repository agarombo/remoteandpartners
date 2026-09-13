import { DISTRICTS, SHEETS, u, dx } from "./content.js";

/* ============================================================
   2. ISOMETRÍA
   ============================================================ */
const U = 22, IX = .866, IY = .5, IZ = .82, SP = 6.2;
/* el cliente está en Estados Unidos: se acota en pies y pulgadas.
   Una unidad de la isometría son 12 pies exactos. */
const FT = 12;
function ftin(un){
  const t = Math.round(un*FT*12);          /* a pulgadas enteras */
  const f = Math.floor(t/12);
  return f + "'-" + (t - f*12) + '"';
}
const P = (x,y,z) => [ (x-y)*U*IX, (x+y)*U*IY - z*U*IZ ];
const pts = a => a.map(p => p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
const n1 = v => v.toFixed(1);

function rng(seed){
  let s = seed >>> 0;
  return function(){
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* caja isométrica: cara superior, izquierda y derecha */
/* ---------- la luz ----------
   Una sola lámpara, alta y a la izquierda: ilumina la cara de mayor Y y deja
   en penumbra la de mayor X, que es como ya venían sombreadas las caras. La
   sombra arrojada cae hacia +X −Y, es decir a la derecha en pantalla, y se
   alarga con la altura. Mientras se construye una isla, cada caja deja su
   sombra en esta cola; la isla la pinta sobre la losa, debajo de todo. */
let SHD = null, CPN = 0;
const SHK = [.62,-.38];
function box(x,y,sx,sy,z,h,c,tex){
  const t = [P(x,y,z+h),P(x+sx,y,z+h),P(x+sx,y+sy,z+h),P(x,y+sy,z+h)];
  const l = [P(x,y+sy,z+h),P(x+sx,y+sy,z+h),P(x+sx,y+sy,z),P(x,y+sy,z)];
  const r = [P(x+sx,y,z+h),P(x+sx,y+sy,z+h),P(x+sx,y+sy,z),P(x+sx,y,z)];
  if(SHD && h >= .3 && sx*sy >= .03){
    /* casco de la huella proyectada desde la base y desde la coronación */
    const F = k => [P(x+SHK[0]*k,y+SHK[1]*k,0), P(x+sx+SHK[0]*k,y+SHK[1]*k,0),
                    P(x+sx+SHK[0]*k,y+sy+SHK[1]*k,0), P(x+SHK[0]*k,y+sy+SHK[1]*k,0)];
    const a = F(z), b = F(z+h);
    SHD.push('<polygon points="'+pts([a[3],a[0],b[0],b[1],b[2],a[2]])+'"/>');
    /* lo que apoya en el suelo oscurece el suelo a su alrededor */
    if(z <= .15) SHD.push('<polygon class="ao" points="'
      + pts([P(x-.08,y-.08,0),P(x+sx+.08,y-.08,0),P(x+sx+.08,y+sy+.08,0),P(x-.08,y+sy+.08,0)])+'"/>');
  }
  /* cada cara lleva su degradado de luz: la cubierta se aclara hacia el foco,
     los paramentos se oscurecen hacia el suelo. Es lo que hace que una caja
     deje de ser un diagrama y pase a ser un volumen con material. */
  let s = '<polygon class="f" points="'+pts(t)+'" fill="url(#gt-'+c+')"/>'
        + '<polygon class="f" points="'+pts(l)+'" fill="url(#gl-'+c+')"/>'
        + '<polygon class="f" points="'+pts(r)+'" fill="url(#gr-'+c+')"/>';
  if(tex) s += '<polygon class="tex" points="'+pts(l)+'" fill="url(#slat)"/>'
             + '<polygon class="tex" points="'+pts(r)+'" fill="url(#slat)"/>';
  /* la luz roza las aristas de la coronación y la esquina que mira al frente */
  if(h >= .3) s += '<polyline class="hl" points="'+pts([t[3],t[2],t[1]])+' '+pts([t[2],l[2]])+'"/>';
  return s;
}

/* línea suelta entre dos puntos ya proyectados */
function seg(a,b,stroke,w,op){
  return '<line x1="'+n1(a[0])+'" y1="'+n1(a[1])+'" x2="'+n1(b[0])+'" y2="'+n1(b[1])
       + '" stroke="var(--'+stroke+')" stroke-width="'+w+'"'+(op ? ' opacity="'+op+'"' : '')+'/>';
}

/* ventanas: retícula regular con montantes, idéntica en todas las plantas */
function windows(x,y,sx,sy,z,h){
  let s = "";
  const Y = y+sy, X = x+sx, z0 = z+h*.24, z1 = z+h*.80;
  const nx = Math.max(1,Math.round(sx/.5)), ny = Math.max(1,Math.round(sy/.5));
  const px = (sx-.20)/nx, py = (sy-.20)/ny;
  for(let i=0;i<nx;i++){
    const wx = x+.10+i*px, ww = px*.72;
    s += '<polygon points="'+pts([P(wx,Y,z1),P(wx+ww,Y,z1),P(wx+ww,Y,z0),P(wx,Y,z0)])+'" fill="url(#glassL)"/>';
  }
  for(let i=0;i<ny;i++){
    const wy = y+.10+i*py, wh = py*.72;
    s += '<polygon points="'+pts([P(X,wy,z1),P(X,wy+wh,z1),P(X,wy+wh,z0),P(X,wy,z0)])+'" fill="url(#glassR)"/>';
  }
  return s;
}

/* torre: planta baja sobre columnas, losas de entrepiso a altura constante,
   núcleo de circulación adosado y equipos en cubierta */
function tower(rnd,x,y,sx,sy,levels,c){
  let s = "", z = 0;
  const LH = 1, GH = 1.4;                       /* altura de planta y de planta baja */

  /* planta baja retranqueada, acristalada, con las cuatro columnas a la vista
     y una marquesina fina sobre la entrada */
  s += box(x+.34,y+.34,sx-.68,sy-.68,0,GH,"stone") + windows(x+.34,y+.34,sx-.68,sy-.68,0,GH);
  s += box(x+sx*.5-.45,y+sy-.34,.9,.42,GH*.62,.05,"stone");
  [[x+.10,y+.10],[x+sx-.24,y+.10],[x+.10,y+sy-.24],[x+sx-.24,y+sy-.24]]
    .sort((a,b) => (a[0]+a[1])-(b[0]+b[1]))
    .forEach(p => { s += box(p[0],p[1],.14,.14,0,GH,c); });
  z = GH;

  /* plantas tipo: losa + volumen + carpintería. Cada torre decide una vez si
     lleva balcones en la cara iluminada y parasoles en la de penumbra. */
  const balc = rnd() > .45, fins = rnd() > .5;
  let tx = x, ty = y, tw = sx, th = sy;
  for(let i=0;i<levels;i++){
    const set = i > levels*.64 ? .24 : 0;
    tx = x+set; ty = y+set; tw = sx-set*2; th = sy-set*2;
    s += box(tx-.08,ty-.08,tw+.16,th+.16,z,.08,"stone");
    s += box(tx,ty,tw,th,z+.08,LH-.08,c,1);
    s += windows(tx,ty,tw,th,z+.08,LH-.08);
    if(balc && i > 0 && (i % 2 === 1)){
      /* balcón: losa volada y baranda, en un tramo de la fachada iluminada */
      const bx = tx+tw*.18, bw = tw*.42, by = ty+th;
      s += box(bx,by,bw,.26,z+.08,.05,"stone");
      s += seg(P(bx,by+.26,z+.13),P(bx+bw,by+.26,z+.13),"stone-4",".4",".9")
         + seg(P(bx,by+.26,z+.13),P(bx,by+.26,z+.46),"stone-4",".4",".9")
         + seg(P(bx+bw,by+.26,z+.13),P(bx+bw,by+.26,z+.46),"stone-4",".4",".9")
         + seg(P(bx,by+.26,z+.46),P(bx+bw,by+.26,z+.46),"stone-4",".55","1");
    }
    if(fins) s += box(tx+tw,ty+.10,.13,th-.20,z+LH-.14,.045,"stone");   /* parasol corrido */
    z += LH;
  }

  /* núcleo de circulación adosado al frente, con sus descansos */
  const cw = .46, cx = x+sx*.5-cw/2, cy = y+sy;
  s += box(cx,cy,cw,cw,0,z-.6,"stone");
  for(let i=1;i<Math.round(z-.6);i++)
    s += seg(P(cx,cy+cw,i), P(cx+cw,cy+cw,i), "stone-4", ".45", ".8");

  /* cubierta: parapeto, caja de escalera, tanque sobre patas y antena */
  s += box(tx-.06,ty-.06,tw+.12,th+.12,z,.12,"stone");
  if(rnd() > .35) s += box(tx+.16,ty+.16,.5,.5,z+.12,.45,"stone");
  if(rnd() > .45){
    const bx = tx+tw-.72, by = ty+th-.72;
    s += box(bx,by,.09,.09,z+.12,.32,"stone") + box(bx+.42,by+.42,.09,.09,z+.12,.32,"stone");
    s += box(bx-.06,by-.06,.6,.6,z+.44,.34,"stone");
  }
  if(rnd() > .5){
    const a0 = P(tx+tw*.5,ty+th*.5,z+.12), a1 = P(tx+tw*.5,ty+th*.5,z+1.6);
    s += seg(a0,a1,"stone-4",".7") + seg(a1,P(tx,ty+th,z+.12),"stone-4",".35",".6")
       + seg(a1,P(tx+tw,ty,z+.12),"stone-4",".35",".6");
  }
  return { svg:s, top:z+.12 };
}

/* árbol de copa colgante */
function tree(rnd,x,y,c){
  const hh = .8+rnd()*.7, p0 = P(x,y,0), p1 = P(x,y,hh);
  if(SHD){
    const q = P(x+SHK[0]*hh*.6, y+SHK[1]*hh*.6, 0);
    SHD.push('<ellipse cx="'+n1(q[0])+'" cy="'+n1(q[1])+'" rx="4.2" ry="2.1"/>');
  }
  /* copa como esfera de maqueta: dos bolas con la luz arriba a la izquierda,
     sobre un tronco fino. Se consumen las mismas llamadas a rnd() que antes
     para no mover el resto del azar de la isla. */
  const r1 = 2.7+rnd()*1.7, dx = (rnd()-.5)*3, r2 = r1*(.55+rnd()*.2);
  let s = '<line x1="'+n1(p0[0])+'" y1="'+n1(p0[1])+'" x2="'+n1(p1[0])+'" y2="'+n1(p1[1])+'" stroke="var(--slate-4)" stroke-width="1.1" stroke-linecap="round"/>'
        + '<circle cx="'+n1(p1[0]+dx*.4)+'" cy="'+n1(p1[1]-r1*.75)+'" r="'+n1(r1)+'" fill="url(#tb-'+c+')"/>'
        + '<circle cx="'+n1(p1[0]+dx+r1*.55)+'" cy="'+n1(p1[1]-r1*.35)+'" r="'+n1(r2)+'" fill="url(#tb-'+c+')"/>';
  for(let i=0;i<15;i++) rnd();
  return s;
}

/* proyección de un plano 2D sobre el piso isométrico: deja dibujar el
   plano en coordenadas del edificio y que caiga sobre la losa del corte */
const FA = IX*U, FB = IY*U;
const flat = (ox,oy,z) => 'matrix('+FA.toFixed(3)+','+FB.toFixed(3)+','+(-FA).toFixed(3)+','+FB.toFixed(3)
  + ','+((ox-oy)*FA).toFixed(2)+','+(((ox+oy)*FB)-z*IZ*U).toFixed(2)+')';
const fR = (x,y,w,h,c) => '<rect x="'+x.toFixed(3)+'" y="'+y.toFixed(3)+'" width="'+w.toFixed(3)+'" height="'+h.toFixed(3)+'" class="'+c+'"/>';
const fL = (x1,y1,x2,y2,c) => '<line x1="'+x1.toFixed(3)+'" y1="'+y1.toFixed(3)+'" x2="'+x2.toFixed(3)+'" y2="'+y2.toFixed(3)+'" class="'+c+'"/>';
const fC = (x,y,r,c) => '<circle cx="'+x.toFixed(3)+'" cy="'+y.toFixed(3)+'" r="'+r.toFixed(3)+'" class="'+c+'"/>';

/* ---------- la casa de demostración ----------
   Una vivienda unifamiliar de dos plantas con estructura de madera, del tipo
   que documentamos para builders norteamericanos. Está dibujada entera por
   nosotros: no pertenece a ningún cliente y por eso se puede enseñar.
   Una unidad isométrica son 12 pies, así que la huella mide 48'-0" × 50'-5". */
const PB = { x:-2.0, y:-2.1, w:4.0, d:4.2, lv:2, lh:.75, cut:1 };
const EXT = .05, INT = .03;          /* 2x6 con acabados, y tabique de 2x4 */

/* muros ya partidos por sus vanos: de acá salen tanto los tabiques cortados
   en tres dimensiones como el poché de la planta */
const PW = [
  /* fachada norte: portón de garaje, entrada y dos ventanas del estudio */
  [0,0,.30,EXT],[1.55,0,.35,EXT],[2.25,0,.45,EXT],[3.20,0,.20,EXT],[3.90,0,.10,EXT],
  /* fachada sur: ventana de servicio y puerta corrediza del salón */
  [0,4.15,.30,EXT],[.70,4.15,1.50,EXT],[3.40,4.15,.60,EXT],
  /* laterales */
  [0,EXT,EXT,.75],[0,1.30,EXT,1.90],[0,3.70,EXT,.45],
  [3.95,EXT,EXT,.35],[3.95,.90,EXT,.80],[3.95,2.20,EXT,1.00],[3.95,3.80,EXT,.35],
  /* separación del garaje: muro cortafuegos y fondo */
  [1.70,EXT,INT,2.15],[EXT,2.20,1.65,INT],
  /* zaguán, estudio y cocina */
  [2.45,EXT,INT,1.35],[2.48,1.40,1.47,INT],
  /* servicio */
  [EXT,2.80,1.65,INT],[.75,2.85,INT,.68],[EXT,3.50,.72,INT]
].sort((a,b) => (a[0]+a[1])-(b[0]+b[1]));

/* [x, y, ancho, horizontal?] */
const PDOORS = [[1.90,0,.35,1],[1.70,2.40,.30,0],[.90,2.80,.30,1],
                [.75,3.05,.28,0],[2.45,.50,.30,0]];
/* [x, y, largo, horizontal?] */
const PWIN = [[2.70,0,.50,1],[3.40,0,.50,1],
              [.30,4.15,.40,1],[2.20,4.15,1.20,1],
              [0,.80,.50,0],[0,3.20,.50,0],
              [3.95,.40,.50,0],[3.95,1.70,.50,0],[3.95,3.20,.60,0]];

const PGX = [EXT,1.70,2.45,3.95], PGY = [EXT,1.40,2.80,4.15];
/* [nombre, cx, cy, superficie] */
const PROOMS = [["GARAGE",.87,1.05,"511 SF"],["FOYER",2.10,.70,"136 SF"],
                ["STUDY",3.20,.70,"282 SF"],["KITCHEN",2.85,2.05,"412 SF"],
                ["MUDROOM",.87,2.50,"131 SF"],["POWDER",.40,3.18,"65 SF"],
                ["GREAT ROOM",2.30,3.35,"612 SF"]];
function projSolid(){
  const b = PB; let s = "";
  for(let i=0;i<b.lv;i++){
    const z = i*b.lh;
    s += box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,z,.07,"stone")
       + box(b.x,b.y,b.w,b.d,z+.07,b.lh-.07,"purple")
       + windows(b.x,b.y,b.w,b.d,z+.07,b.lh-.07);
  }
  const zt = b.lv*b.lh;
  s += box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,zt,.1,"stone")
     + box(b.x+.45,b.y+.4,.85,.8,zt+.1,.44,"stone")
     + box(b.x+b.w-1.7,b.y+b.d-1.3,1.1,.8,zt+.1,.3,"stone");
  return s;
}

/* mobiliario y equipamiento, dibujado en planta sobre la losa */
/* mobiliario y aparatos de la planta baja */
function projFurniture(){
  let s = "";
  /* garaje: dos coches y la puerta seccional */
  [[.20,.35],[.98,.35]].forEach(p =>
    s += '<rect x="'+p[0]+'" y="'+p[1]+'" width=".52" height="1.30" rx=".16" class="fl-fine"/>'
       + '<rect x="'+(p[0]+.09)+'" y="'+(p[1]+.30)+'" width=".34" height=".38" rx=".08" class="fl-fine"/>');
  /* zaguán: escalera de 14 huellas con su flecha de subida */
  for(let i=0;i<14;i++) s += fL(1.80,.18+i*.085,2.40,.18+i*.085,"fl-fine");
  s += fL(2.10,1.32,2.10,.24,"fl-thin") + fL(2.04,.37,2.10,.24,"fl-thin") + fL(2.16,.37,2.10,.24,"fl-thin");
  /* estudio: escritorio y silla */
  s += fR(2.62,.18,.95,.30,"fl-thin") + fC(3.10,.62,.13,"fl-fine");
  s += fR(3.60,.18,.28,.90,"fl-fine");
  /* cocina: mesadas en L, isla, bajo mesada y heladera */
  s += fR(2.52,1.48,1.40,.28,"fl-thin")
     + fR(3.64,1.76,.28,.86,"fl-thin")
     + fR(2.70,2.10,.90,.34,"fl-thin");                       /* isla */
  s += '<rect x="2.86" y="2.18" width=".40" height=".18" rx=".05" class="fl-fine"/>';   /* bacha */
  s += fR(2.95,1.52,.34,.20,"fl-fine") + fC(3.02,1.62,.05,"fl-fine") + fC(3.22,1.62,.05,"fl-fine");
  s += fR(3.66,2.16,.24,.40,"fl-fine");                       /* heladera */
  /* servicio: banco con percheros */
  s += fR(.12,2.30,1.10,.18,"fl-fine");
  for(let i=0;i<5;i++) s += fC(.22+i*.22,2.26,.03,"fl-fine");
  s += fR(1.30,2.28,.32,.44,"fl-fine");                       /* lavarropas */
  /* toilette: inodoro y lavatorio */
  s += '<rect x=".14" y="3.14" width=".18" height=".24" rx=".07" class="fl-fine"/>'
     + fC(.58,3.02,.08,"fl-fine");
  /* salón: sofá, mesa baja y comedor */
  s += fR(1.06,3.36,.22,.72,"fl-fine") + fR(1.28,3.36,.80,.20,"fl-fine")
     + fR(1.42,3.70,.50,.26,"fl-fine");
  s += '<rect x="2.62" y="3.42" width=".92" height=".50" rx=".05" class="fl-fine"/>';
  [[2.72,3.34],[3.02,3.34],[3.32,3.34],[2.72,3.98],[3.02,3.98],[3.32,3.98]].forEach(p =>
    s += fR(p[0],p[1],.16,.06,"fl-fine"));
  return s;
}

/* las cuatro láminas, dibujadas sobre la misma losa */
function projSheet(id){
  let s = "";
  const b0w = PB.w - EXT, b0d = PB.d - EXT;   /* cara exterior del muro */
  if(id === "arq") return projFurniture() + projDoors() + projWindows();

  if(id === "fnd"){
    /* Fundación de vivienda con crawl space: zapata corrida perimetral,
       muro de arranque, zapatas aisladas bajo cargas puntuales, pony wall
       y las viguetas del entrepiso bajo. La losa sólo va en el garaje. */
    const nt = (x,y,t,sz) => '<text class="fl-lay-t" x="'+x+'" y="'+y+'" font-size="'+(sz||.062)+'">'+t+'</text>';
    let f = "";

    /* zapata corrida: línea discontinua por fuera del muro de arranque */
    const FT = .10;
    f += fR(-FT,-FT,b0w+FT*2,FT,"fl-ftg") + fR(-FT,b0d,b0w+FT*2,FT,"fl-ftg")
       + fR(-FT,0,FT,b0d,"fl-ftg") + fR(b0w,0,FT,b0d,"fl-ftg");
    /* muro de arranque */
    f += fR(0,0,b0w,.05,"fl-lay") + fR(0,b0d-.05,b0w,.05,"fl-lay")
       + fR(0,0,.05,b0d,"fl-lay") + fR(b0w-.05,0,.05,b0d,"fl-lay");

    /* garaje: losa sobre terreno, no crawl */
    f += fR(.05,.05,1.65,2.15,"fl-slab")
       + nt(.42,1.15,'4" CONC. SLAB ON GRADE',.07)
       + nt(.42,1.24,'SLOPE 2% MIN TO DOOR',.075)
       + nt(.30,.30,'BLOCK OUT FOR GARAGE DOOR',.072);

    /* crawl space: viguetas 9-1/2" TJI a 24" del centro */
    const SP = 24/144;
    for(let x=1.80;x<3.90;x+=SP) f += fL(x,.10,x,4.10,"fl-lay-d");
    for(let x=.12;x<1.68;x+=SP)  f += fL(x,2.30,x,4.10,"fl-lay-d");
    f += nt(2.00,2.62,'9-1/2" TJI 110 AT 24" O.C.',.075)
       + fL(2.90,2.20,2.90,3.00,"fl-thin")
       + fL(2.85,2.28,2.90,2.20,"fl-thin") + fL(2.95,2.28,2.90,2.20,"fl-thin")
       + fL(2.85,2.92,2.90,3.00,"fl-thin") + fL(2.95,2.92,2.90,3.00,"fl-thin")
       + nt(3.02,2.98,'JOIST LAYOUT',.072);

    /* pony wall sobre zapata interior */
    f += fR(.05,2.22,3.90,.06,"fl-lay")
       + nt(.20,2.18,'2x4 PONY WALL ON 14"x8" FOOTING, TYP.',.075);
    f += fR(1.72,.05,.06,2.20,"fl-lay");

    /* zapatas aisladas bajo apoyos puntuales */
    [[1.72,1.38],[2.45,1.38],[1.72,2.25],[2.45,2.25],[3.10,2.25]].forEach(p =>
      f += fR(p[0]-.09,p[1]-.09,.18,.18,"fl-ftg2")
         + fR(p[0]-.035,p[1]-.035,.07,.07,"fl-lay-f"));
    f += nt(2.52,1.32,'24"x24"x8" FTG. W/ (2) #4 E.W.',.072)
       + nt(3.18,2.20,'36"x36"x8" FTG. W/ (3) #4 E.W.',.072);

    /* ventilaciones y acceso al crawl */
    [[.60,4.13],[1.90,4.13],[3.10,4.13],[.60,-.03],[2.60,-.03]].forEach(p =>
      f += fR(p[0],p[1],.22,.05,"fl-lay-f"));
    f += nt(1.94,4.24,'6x30 FND VENT, TYP.',.072);
    f += fR(1.30,3.95,.34,.18,"fl-ftg2")
       + nt(.62,4.06,'BLOCK-OUT FOR 18"x24" CRAWL ACCESS',.072);

    /* notas generales del plano */
    f += nt(.10,.14,'TOP OF CONC. TO BE 4" BELOW TOP OF STEM, TYP.',.072)
       + nt(2.30,.20,'36"x8" CONT. FTG. W/ (2) #4 CONT.',.075)
       + nt(2.30,.29,'1/2" ANCHOR BOLT @ 6'+String.fromCharCode(39)+'-0" O.C. MAX',.072)
       + nt(2.30,.38,'12" FROM EACH CORNER, TYP.',.072)
       + nt(.10,2.72,'GARAGE FOUNDATION IS CONTINUOUS',.072)
       + nt(.10,2.81,'THROUGH DOOR OPENINGS, TYP.',.072)
       + nt(2.86,3.86,'SLOPE FOR POSITIVE DRAIN',.072)
       + nt(2.86,3.95,'AWAY FROM STRUCTURE, 5% MIN',.072);
    /* cotas propias de la fundación */
    const fd = (x1,y1,x2,y2,t,horiz) => fL(x1,y1,x2,y2,"fl-thin")
      + fL(x1,y1-.03,x1,y1+.03,"fl-thin") + fL(x2,y2-.03,x2,y2+.03,"fl-thin")
      + nt(horiz ? (x1+x2)/2-.14 : x1+.05, horiz ? y1-.04 : (y1+y2)/2, t,.075);
    f += fd(-.10,-.22,1.70,-.22,'20'+String.fromCharCode(39)+'-5"',1)
       + fd(1.70,-.22,3.95,-.22,'26'+String.fromCharCode(39)+'-11"',1)
       + fd(-.22,-.10,-.22,2.22,'26'+String.fromCharCode(39)+'-8"',0)
       + fd(-.22,2.22,-.22,4.15,'23'+String.fromCharCode(39)+'-2"',0);
    /* llamadas a la sección */
    [[.30,2.26],[2.10,4.12],[3.88,1.60]].forEach((p,i) =>
      f += fC(p[0],p[1],.09,"fl-bub")
         + '<text class="fl-lay-t" x="'+p[0]+'" y="'+(p[1]+.028)+'" font-size=".062" text-anchor="middle">'+(i+1)+'</text>');
    return f;
  }

  if(id === "fra"){
    /* viguetas a 16" del centro: en unidades de 12 pies, 16" son .111 */
    const SP = 16/144;
    for(let x=.20;x<3.90;x+=SP) s += fL(x,.10,x,2.15,"fl-lay-d");
    for(let x=.20;x<3.90;x+=SP) s += fL(x,2.85,x,4.10,"fl-lay-d");
    /* vigas y dinteles sobre los vanos y los muros de carga */
    s += fR(EXT,2.16,3.90,.06,"fl-lay") + fR(EXT,1.37,3.90,.05,"fl-lay");
    s += fR(.28,-.02,1.30,.05,"fl-lay") + fR(2.18,4.12,1.24,.05,"fl-lay");
    /* flechas de dirección de las viguetas */
    [[1.95,.60],[1.95,3.40]].forEach(p =>
      s += fL(p[0],p[1]-.30,p[0],p[1]+.30,"fl-thin")
         + fL(p[0]-.05,p[1]-.22,p[0],p[1]-.30,"fl-thin") + fL(p[0]+.05,p[1]-.22,p[0],p[1]-.30,"fl-thin")
         + fL(p[0]-.05,p[1]+.22,p[0],p[1]+.30,"fl-thin") + fL(p[0]+.05,p[1]+.22,p[0],p[1]+.30,"fl-thin"));
    s += '<text class="fl-lay-t" x="2.02" y="0.56" font-size=".085">2x10 @ 16" O.C.</text>'
       + '<text class="fl-lay-t" x="2.02" y="3.36" font-size=".085">2x10 @ 16" O.C.</text>'
       + '<text class="fl-lay-t" x="0.30" y="2.12" font-size=".075">FLUSH BEAM 3-1/2x11-7/8 LVL</text>';
    /* apoyos puntuales */
    [[1.70,2.19],[2.45,2.19],[1.70,1.39],[2.45,1.39]].forEach(p =>
      s += fR(p[0]-.055,p[1]-.055,.11,.11,"fl-lay-f"));
    return s;
  }

  if(id === "ele"){
    /* Convenciones de una eléctrica residencial norteamericana: cada boca
       lleva su altura de montaje, las de zonas húmedas o exteriores van
       marcadas GFI o WP/GFI, y el retorno del interruptor se dibuja como
       un arco discontinuo hasta el punto de luz que gobierna. */
    const nt = (x,y,t,sz) => '<text class="fl-lay-t" x="'+x+'" y="'+y+'" font-size="'+(sz||.062)+'">'+t+'</text>';
    /* tomacorriente doble: dos barras y su altura */
    const rec = (x,y,h,tag,dy) => {
      let o = fC(x,y,.05,"fl-lay")
        + fL(x-.018,y-.045,x-.018,y+.045,"fl-lay") + fL(x+.018,y-.045,x+.018,y+.045,"fl-lay");
      if(tag) o += nt(x-.10,y+(dy||-.07),tag);
      if(h)   o += nt(x-.08,y+(dy||-.07)+(tag?.075:0),h);
      return o;
    };
    /* punto de luz de techo */
    const lite = (x,y) => fC(x,y,.07,"fl-lay") + fL(x-.07,y,x+.07,y,"fl-lay") + fL(x,y-.07,x,y+.07,"fl-lay");
    /* interruptor, con su letra y el arco que lo une a lo que manda */
    const sw = (x,y,tx,ty,t) => nt(x,y,t||"S",.075)
      + '<path class="fl-lay-d" d="M'+(x+.02)+' '+(y-.03)+' Q'+((x+tx)/2)+' '+((y+ty)/2-.22)+' '+tx+' '+ty+'"/>';

    let e = "";
    /* bocas contra fachada y tabiques, con su altura de montaje */
    [[.30,.11,'+48"','GFI'],[1.20,.11,'+48"',null],[2.70,.11,'+48"',null],[3.50,.11,'+48"',null],
     [.30,4.04,'+48"','GFI'],[1.55,4.04,'+48"',null],[3.20,4.04,'+48"','WP/GFI'],
     [.11,1.00,'+48"',null],[.11,2.55,'+48"','GFI'],[.11,3.70,'+48"',null],
     [3.84,.70,'+48"',null],[3.84,2.05,'+44"','GFI'],[3.84,3.40,'+48"',null],
     [1.85,1.30,'+48"',null],[2.60,1.34,'+44"','GFI'],[3.20,1.34,'+44"','GFI'],
     [1.80,2.95,'+48"',null],[2.90,2.30,'+44"','GFI']].forEach(p => e += rec(p[0],p[1],p[2],p[3]));
    /* garaje: dos bocas altas y los sensores del portón */
    e += rec(.90,.14,'+79"','WP') + rec(1.55,2.05,'+48"','GFI');
    e += nt(.20,1.85,'TYPICAL GARAGE DOOR SENSORS',.072)
       + fC(.28,2.12,.035,"fl-lay-f") + fC(1.58,2.12,.035,"fl-lay-f")
       + nt(.24,2.20,'GD',.072) + nt(1.54,2.20,'GD',.072);
    /* tablero y servicio */
    e += fR(1.44,.14,.20,.09,"fl-lay-f")
       + nt(1.10,.34,'200 AMP ELECTRICAL PANEL',.072);
    /* detectores */
    [[2.10,1.10,'SD'],[2.85,3.05,'SD'],[.95,2.55,'CM'],[1.10,1.20,'HEAT DETECTOR']].forEach(p =>
      e += fC(p[0],p[1],.045,"fl-lay-f") + nt(p[0]+.07,p[1]+.02,p[2],.072));
    /* puntos de luz */
    const L = [[.87,1.05],[2.10,.70],[3.20,.70],[2.85,1.95],[.87,2.50],[.40,3.20],[2.30,3.45],[3.30,3.10]];
    L.forEach(p => e += lite(p[0],p[1]));
    /* interruptores y sus arcos */
    e += sw(1.96,.42,2.10,.63)
       + sw(2.52,.42,3.16,.63)
       + sw(1.66,2.42,.95,2.46)
       + sw(1.82,2.86,2.28,3.38)
       + sw(2.44,1.52,2.82,1.88,"S3")
       + sw(3.46,2.92,3.32,3.04,"S3");
    /* extracciones y notas */
    e += nt(.10,3.02,'VENT EXHAUST TO EXTERIOR',.072)
       + nt(2.62,2.62,'TO LIGHT ABOVE',.072)
       + nt(3.30,.98,'TO LIGHT ABOVE',.072);
    return e;
  }
  return s;
}

function projDoors(){
  return PDOORS.map(d => {
    const x = d[0], y = d[1], w = d[2];
    return d[3]
      ? fL(x,y,x,y+w,"fl-cut") + '<path class="fl-fine" d="M'+x+' '+(y+w)+' A'+w+' '+w+' 0 0 1 '+(x+w)+' '+y+'"/>'
      : fL(x,y,x+w,y,"fl-cut") + '<path class="fl-fine" d="M'+(x+w)+' '+y+' A'+w+' '+w+' 0 0 1 '+x+' '+(y+w)+'"/>';
  }).join("");
}
/* carpintería: el triple trazo de siempre dentro del hueco */
function projWindows(){
  return PWIN.map(v => {
    const x = v[0], y = v[1], l = v[2];
    return v[3]
      ? fL(x,y,x+l,y,"fl-thin") + fL(x,y+EXT,x+l,y+EXT,"fl-thin") + fL(x,y+EXT/2,x+l,y+EXT/2,"fl-fine")
      : fL(x,y,x,y+l,"fl-thin") + fL(x+EXT,y,x+EXT,y+l,"fl-thin") + fL(x+EXT/2,y,x+EXT/2,y+l,"fl-fine");
  }).join("");
}

/* la planta acostada: misma losa, mirada desde arriba y sin deformación */
const QS = 36, QF = -(PB.cut*PB.lh+.07)*IZ*U;
const planMatrix = () => 'matrix('+QS+',0,0,'+QS+','+(PB.x*QS).toFixed(2)+','+(PB.y*QS+QF).toFixed(2)+')';
const isoMatrix = () => flat(PB.x,PB.y,PB.cut*PB.lh+.07);

/* corte horizontal: los niveles de abajo quedan, el del corte se abre */
function projCut(id){
  const b = PB, zc = b.cut*b.lh, zf = zc+.07;
  let s = '<g class="cut-3d">';
  for(let i=0;i<b.cut;i++){
    const z = i*b.lh;
    s += box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,z,.07,"stone")
       + box(b.x,b.y,b.w,b.d,z+.07,b.lh-.07,"purple")
       + windows(b.x,b.y,b.w,b.d,z+.07,b.lh-.07);
  }
  s += box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,zc,.07,"stone")                 /* losa del corte */
     + PW.map(w => box(b.x+w[0],b.y+w[1],w[2],w[3],zf,.22,
                       id === "arq" ? "stone" : "slate")).join("")
     + '</g>';
  /* el contenido de la planta vive en un grupo que gira de isométrica a planta */
  s += '<g class="plan-g" transform="'+isoMatrix()+'">'
     + '<rect class="plan-sheet" x="-.4" y="-.4" width="'+(b.w+.8)+'" height="'+(b.d+.8)+'"/>'
     + '<g class="plan-poche">' + PW.map(w => fR(w[0],w[1],w[2],w[3], id === "arq" ? "fl-poche" : "fl-poche-lite")).join("") + '</g>'
     + projSheet(id) + '</g>';
  return s;
}

/* acotaciones del corte, en el espacio de la isla */
/* ---------- el aparato documental de la lámina ----------
   Lo que separa un esquema de un plano de obra: cajetín, norte, marcadores
   de sección, etiquetas de carpintería y las cotas de cada local. */
function projDocs(PT,b,id){
  let s = "";
  const T = (x,y,t,c,anc) => '<text class="'+(c||"ob-txt")+'" x="'+n1(PT(b.x+x,b.y+y)[0])
    + '" y="'+n1(PT(b.x+x,b.y+y)[1])+'"'+(anc ? ' style="text-anchor:'+anc+'"' : '')+'>'+t+'</text>';
  const LN = (x1,y1,x2,y2,c) => { const a = PT(b.x+x1,b.y+y1), d = PT(b.x+x2,b.y+y2);
    return '<line class="'+(c||"ob-dim")+'" x1="'+n1(a[0])+'" y1="'+n1(a[1])
         + '" x2="'+n1(d[0])+'" y2="'+n1(d[1])+'"/>'; };
  const CI = (x,y,r,c) => { const a = PT(b.x+x,b.y+y);
    return '<circle class="'+(c||"ob-bub")+'" cx="'+n1(a[0])+'" cy="'+n1(a[1])+'" r="'+r+'"/>'; };

  /* ---- norte ---- */
  const nx = b.w + .55, ny = -.75;
  s += CI(nx,ny,3.4,"ob-bub")
     + LN(nx,ny+.22,nx,ny-.22,"ob-dim")
     + LN(nx-.07,ny-.08,nx,ny-.22,"ob-dim") + LN(nx+.07,ny-.08,nx,ny-.22,"ob-dim")
     + T(nx,ny-.30,"N","ob-txt","middle");

  /* ---- marcador de sección: apunta al detalle que existe de verdad ---- */
  const sx = -.42;
  s += LN(sx,.9,sx,2.6,"ob-cutline")
     + CI(sx,.72,3.4,"ob-bub") + T(sx,.755,"1","ob-txt","middle")
     + LN(sx,.62,sx+.16,.62,"ob-dim") + LN(sx+.10,.58,sx+.16,.62,"ob-dim")
     + LN(sx+.10,.66,sx+.16,.62,"ob-dim")
     + '<g class="det-open" role="button" tabindex="0" aria-label="A-401">'
     + CI(sx,2.78,3.4,"ob-bub") + T(sx,2.815,"A-401","ob-mark","middle")
     + CI(sx,2.78,5.4,"ob-hit") + '</g>';

  /* ---- etiquetas de carpintería ---- */
  const tag = (x,y,t,sq) => sq
    ? '<rect class="ob-bub" x="'+n1(PT(b.x+x,b.y+y)[0]-3)+'" y="'+n1(PT(b.x+x,b.y+y)[1]-2.8)
      + '" width="6" height="5.6" rx=".8"/>' + T(x,y+.026,t,"ob-txt","middle")
    : CI(x,y,2.9,"ob-bub") + T(x,y+.026,t,"ob-txt","middle");
  if(id === "arq"){
  PDOORS.forEach((d,i) => {
    const x = d[3] ? d[0]+d[2]/2 : d[0]+(d[0] > b.w/2 ? -.17 : .17);
    const y = d[3] ? d[1]+(d[1] > b.d/2 ? -.17 : .17) : d[1]+d[2]/2;
    s += tag(x,y,"D"+(i+1),true);
  });
  PWIN.forEach((w,i) => {
    const x = w[3] ? w[0]+w[2]/2 : w[0]+(w[0] > b.w/2 ? -.2 : .2);
    const y = w[3] ? w[1]+(w[1] > b.d/2 ? -.2 : .2) : w[1]+w[2]/2;
    s += tag(x,y,"W"+(i+1),false);
  });

  }

  /* ---- nota de escalera ---- */
  if(id === "arq") s += T(2.10,1.52,'14 R @ 7 3/4"  ·  13 T @ 11"',"ob-mark","middle");

  /* ---- cajetín ---- */
  const bx = b.w - 1.34, by = b.d + 1.72, bw = 1.34, bh = .98;
  const box2 = (x,y,w,h) => { const a = PT(b.x+x,b.y+y), c = PT(b.x+x+w,b.y+y),
                              d = PT(b.x+x+w,b.y+y+h), e = PT(b.x+x,b.y+y+h);
    return '<polygon class="ob-tb" points="'+n1(a[0])+','+n1(a[1])+' '+n1(c[0])+','+n1(c[1])
         + ' '+n1(d[0])+','+n1(d[1])+' '+n1(e[0])+','+n1(e[1])+'"/>'; };
  s += box2(bx,by,bw,bh);
  [.34,.66].forEach(o => s += LN(bx,by+o,bx+bw,by+o,"ob-tbl"));
  const sh = SHEETS.find(x => x.id === id) || SHEETS[0];
  /* las filas van alineadas a la izquierda: la clase de texto que se reutiliza
     viene centrada, así que hay que pedir el anclaje de forma explícita */
  s += T(bx+.06,by+.13,"REMOTE &amp; PARTNERS","ob-mark","start")
     + T(bx+.06,by+.26,u("demoProj"),"ob-txt","start")
     + T(bx+.06,by+.47,u("sheetTitle"),"ob-mark","start")
     + T(bx+.06,by+.60,u("sheets")[SHEETS.indexOf(sh)][1].toUpperCase(),"ob-txt","start")
     + T(bx+.06,by+.81,'1/4" = 1\'-0"',"ob-mark","start")
     + T(bx+bw-.06,by+.84,sh.code,"ob-code","end");
  return s;
}

function projNotes(sheet,mapper){
  const b = PB, zf = b.cut*b.lh+.07;
  const PT = mapper || ((x,y) => P(x,y,zf));
  let s = projDocs(PT,b,(SHEETS[sheet] || SHEETS[0]).id);
  PGX.forEach((x,i) => {
    const a = PT(b.x+x,b.y-1.15), c = PT(b.x+x,b.y+b.d);
    s += '<line class="ob-axis" x1="'+n1(a[0])+'" y1="'+n1(a[1])+'" x2="'+n1(c[0])+'" y2="'+n1(c[1])+'"/>'
       + '<circle class="ob-bub" cx="'+n1(a[0])+'" cy="'+n1(a[1])+'" r="3.2"/>'
       + '<text class="ob-txt" x="'+n1(a[0])+'" y="'+n1(a[1]+1.15)+'">'+"ABC".charAt(i)+'</text>';
  });
  PGY.forEach((y,i) => {
    const a = PT(b.x-1.15,b.y+y), c = PT(b.x+b.w,b.y+y);
    s += '<line class="ob-axis" x1="'+n1(a[0])+'" y1="'+n1(a[1])+'" x2="'+n1(c[0])+'" y2="'+n1(c[1])+'"/>'
       + '<circle class="ob-bub" cx="'+n1(a[0])+'" cy="'+n1(a[1])+'" r="3.2"/>'
       + '<text class="ob-txt" x="'+n1(a[0])+'" y="'+n1(a[1]+1.15)+'">'+(i+1)+'</text>';
  });
  const met = ftin;
  /* ---------- cadenas de cota ----------
     Una lámina de obra lleva tres cadenas apiladas por lado y las cuatro
     caras acotadas: la de huecos, la de ejes y la total. Con una sola,
     el dibujo parece un esquema. */
  const chain = (from,to,off,side,txt) => {
    /* side 0 sur · 1 este · 2 norte · 3 oeste */
    const at = (v,o) => side === 0 ? PT(b.x+v, b.y+b.d+o)
                      : side === 1 ? PT(b.x+b.w+o, b.y+v)
                      : side === 2 ? PT(b.x+v, b.y-o)
                                   : PT(b.x-o, b.y+v);
    const horiz = side === 0 || side === 2;
    const a = at(from,off), c = at(to,off), t = at((from+to)/2,off);
    if(Math.abs(to-from) < .06) return "";
    return '<line class="ob-dim" x1="'+n1(a[0])+'" y1="'+n1(a[1])+'" x2="'+n1(c[0])+'" y2="'+n1(c[1])+'"/>'
      + '<line class="ob-dim" x1="'+n1(a[0]-1.4)+'" y1="'+n1(a[1]-1.4)+'" x2="'+n1(a[0]+1.4)+'" y2="'+n1(a[1]+1.4)+'"/>'
      + '<line class="ob-dim" x1="'+n1(c[0]-1.4)+'" y1="'+n1(c[1]-1.4)+'" x2="'+n1(c[0]+1.4)+'" y2="'+n1(c[1]+1.4)+'"/>'
      + '<text class="ob-txt" x="'+n1(t[0])+'" y="'+n1(t[1]+(horiz ? (side === 0 ? 5 : -2.4) : -2.2))+'">'+txt+'</text>';
  };
  /* los quiebres de cada fachada salen de sus propios huecos */
  const faceBreaks = (horiz, at2) => {
    const p = [0];
    PWIN.concat(PDOORS).forEach(o => {
      if((o[3] === 1) !== horiz) return;
      const c = horiz ? o[1] : o[0];
      if(Math.abs(c - at2) > .14) return;
      const s0 = horiz ? o[0] : o[1];
      p.push(+s0.toFixed(3), +(s0+o[2]).toFixed(3));
    });
    p.push(horiz ? b.w : b.d);
    return p.sort((x,y) => x-y).filter((v,i,a) => i === 0 || v-a[i-1] > .05);
  };
  const stack = (side, grid, span, horiz, at2) => {
    const br = faceBreaks(horiz, at2);
    for(let i=0;i<br.length-1;i++) s += chain(br[i],br[i+1],.46,side,met(br[i+1]-br[i]));
    for(let i=0;i<grid.length-1;i++) s += chain(grid[i],grid[i+1],1.02,side,met(grid[i+1]-grid[i]));
    s += chain(0,span,1.58,side,met(span));
  };
  stack(0,PGX,b.w,true,b.d);    /* sur */
  stack(2,PGX,b.w,true,0);      /* norte */
  stack(1,PGY,b.d,false,b.w);   /* este */
  stack(3,PGY,b.d,false,0);     /* oeste */
  /* rótulo de cada local: en las láminas de estructura estorba */
  const shId = (SHEETS[sheet] || SHEETS[0]).id;
  if(shId === "arq" || shId === "ele") PROOMS.forEach((r,i) => {
    const p = PT(b.x+r[1],b.y+r[2]);
    s += '<text class="ob-room" x="'+n1(p[0])+'" y="'+n1(p[1])+'">'+u("rooms")[i]+'</text>'
       + (r[3] ? '<text class="ob-area" x="'+n1(p[0])+'" y="'+n1(p[1]+3.4)+'">'+r[3]+'</text>' : "");
  });
  const lv = PT(b.x+b.w+.35,b.y+b.d+2.1);
  s += '<text class="ob-txt" x="'+n1(lv[0])+'" y="'+n1(lv[1])+'" text-anchor="start">'+u("level")+' 0'+PB.cut+' · +'+ftin(PB.cut*PB.lh)+'</text>';
  return s;
}

/* modelo por disciplinas: el mismo volumen, abierto en capas */
function projBim(){
  const b = PB; let s = "";
  for(let i=0;i<b.lv;i++){
    const z = i*b.lh;
    const str = [], mep = [], arc = [];
    str.push({ d:-9, s:box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,z,.07,"blue") });
    PGX.forEach(x => PGY.forEach(y =>
      str.push({ d:x+y, s:box(b.x+x-.09,b.y+y-.09,.18,.18,z+.07,b.lh-.24,"blue") })));
    PGY.forEach(y => str.push({ d:y+.4, s:box(b.x,b.y+y-.06,b.w,.12,z+b.lh-.17,.17,"blue") }));
    PGX.forEach(x => str.push({ d:x+.4, s:box(b.x+x-.06,b.y,.12,b.d,z+b.lh-.17,.17,"blue") }));

    mep.push({ d:1.2, s:box(b.x+.3,b.y+.95,b.w-.6,.3,z+b.lh-.5,.2,"magenta") });
    mep.push({ d:2.6, s:box(b.x+1.9,b.y+1.25,.2,1.4,z+b.lh-.48,.16,"magenta") });
    mep.push({ d:3.4, s:box(b.x+.3,b.y+2.9,b.w-.6,.12,z+b.lh-.34,.1,"purple") });
    mep.push({ d:1.6, s:box(b.x+.55,b.y+.3,.16,.16,z,b.lh,"magenta") });

    arc.push({ d:0, s:box(b.x,b.y,b.w,b.d,z+.07,b.lh-.07,"purple")
                    + windows(b.x,b.y,b.w,b.d,z+.07,b.lh-.07) });
    arc.push({ d:1.3, s:box(b.x+1.3,b.y+.09,.05,3.22,z+.07,b.lh-.3,"stone") });

    const wrap = (cls,arr) => '<g class="lay '+cls+'">'+arr.sort((a,b) => a.d-b.d).map(o => o.s).join("")+'</g>';
    s += '<g class="lv">'+wrap("lay-str",str)+wrap("lay-mep",mep)+wrap("lay-arc",arc)+'</g>';
  }
  const zt = b.lv*b.lh;
  s += '<g class="lv"><g class="lay lay-str">'+box(b.x-.07,b.y-.07,b.w+.14,b.d+.14,zt,.1,"blue")+'</g>'
     + '<g class="lay lay-mep">'+box(b.x+b.w-1.5,b.y+b.d-1.2,1,.75,zt+.1,.3,"magenta")+'</g>'
     + '<g class="lay lay-arc">'+box(b.x+.35,b.y+.3,.75,.75,zt+.1,.42,"purple")+'</g></g>';
  return s;
}

/* el edificio de la red no es un prisma: son tres cuerpos de distinta altura
   encastrados, y cada uno tiene un tramo de fachada abierto con su puesto */
const NB = { x:-2.4, y:-2, lh:1.5, vw:1.5, vd:1.1, cs:.16,
  vols:[
    { x:0,   y:0,   w:2.3, d:2.5, lv:5, pi:2, vx:.5  },   /* cuerpo alto, al fondo */
    /* el cuerpo de Tomás se abre por la cara derecha: es la que mira al
       frente en esta axonometría, y así el escritorio se ve de lleno */
    { x:2.3, y:.7,  w:1.7, d:2.3, lv:3, pi:1, vx:.1, side:"x" },
    { x:1.1, y:2.5, w:1.9, d:1.6, lv:2, pi:0, vx:.25 }    /* cuerpo bajo, al frente */
  ] };
/* el hueco de cada cuerpo está en su penúltimo nivel */
const nbVoidLv = v => v.lv - 1;

function station(p,i,ox,oy,z,rot){
  const hue = p.hue, vw = NB.vw, vd = NB.vd, it = [];
  /* Coordenadas locales del vano: "a" corre a lo ancho y "b" avanza hacia la
     abertura. Si el cuerpo se abre por la cara derecha, el puesto gira con él
     y no hay que reescribir un solo mueble. La profundidad de pintado es a+b,
     que es la misma con giro y sin él. */
  const B = rot ? ((a,b,w,d,zz,hh,c) => box(ox+b,oy+a,d,w,zz,hh,c))
                : ((a,b,w,d,zz,hh,c) => box(ox+a,oy+b,w,d,zz,hh,c));
  const Q = rot ? ((a,b,zz) => P(ox+b,oy+a,zz)) : ((a,b,zz) => P(ox+a,oy+b,zz));
  const W = rot ? vd : vw, DP = rot ? vw : vd;        /* la huella, ya girada */

  it.push({ d:-9, s:'<polygon class="seat-plate" points="'
    + pts([P(ox,oy,z),P(ox+W,oy,z),P(ox+W,oy+DP,z),P(ox,oy+DP,z)])
    + '" fill="var(--'+hue+'-1)"/>' });
  /* persona sentada, contra el fondo del vano */
  it.push({ d:.58, s:B(.42,.16,.34,.3,z,.22,"stone") + B(.42,.12,.34,.06,z+.22,.32,hue) });
  const hp = Q(.59,.34,z+.22);
  it.push({ d:.68, s:B(.46,.22,.26,.24,z+.22,.3,hue)
    + '<circle cx="'+n1(hp[0])+'" cy="'+n1(hp[1]-11.8)+'" r="2.9" fill="var(--ink-soft)"/>' });
  /* escritorio y monitor, contra el vano */
  it.push({ d:.92, s:B(.32,.6,.05,.3,z,.3,"stone") + B(1.06,.6,.05,.3,z,.3,"stone")
                     + B(.24,.55,.96,.42,z+.3,.06,"stone") });
  it.push({ d:1.12, s:B(.52,.6,.05,.28,z+.36,.03,"slate")
                      + B(.5,.58,.04,.32,z+.39,.22,"slate")
                      + B(.475,.57,.025,.34,z+.4,.2,hue) });
  const pl = Q(1.32,.85,z+.12);
  it.push({ d:2.05, s:B(1.26,.79,.13,.13,z,.12,"stone")
    + '<circle cx="'+n1(pl[0])+'" cy="'+n1(pl[1]-4.2)+'" r="3.6" fill="var(--slate-2)" opacity=".75"/>' });

  return '<g class="seat" data-i="'+i+'" tabindex="0" role="button" aria-label="'+p.name+'">'
    + it.sort((a,b) => a.d-b.d).map(o => o.s).join("")
    + '<polygon points="'+pts([P(ox,oy,z+.75),P(ox+W,oy,z+.75),P(ox+W,oy+DP,z+.75),P(ox,oy+DP,z+.75)])+'" fill="transparent"/>'
    + '</g>';
}

/* llamadas de los puestos: alineadas a la derecha de todo el conjunto */
function netTags(people){
  const b = NB;
  const right = Math.max.apply(null, b.vols.map(v => b.x+v.x+v.w));
  return b.vols.map(v => {
    const k = v.pi, lv = nbVoidLv(v);
    const rot = v.side === "x", zv = lv*b.lh+.08, hue = people[k].hue;
    const vx = rot ? b.x+v.x+v.w-b.vd : b.x+v.x+v.vx;
    const vy = rot ? b.y+v.y+v.vx     : b.y+v.y+v.d-b.vd;
    /* la línea de llamada nace en el borde exterior de la abertura */
    const a = rot ? P(vx+b.vd,vy+b.vw*.5,zv+.42) : P(vx+b.vw,vy+b.vd*.55,zv+.42);
    const bu = [(right-b.y)*IX*U + 44, a[1]-24];
    return '<g class="seat-tag" data-i="'+k+'" tabindex="0" role="button" aria-label="'+people[k].name+'">'
      + '<polyline class="seat-lead" points="'+n1(a[0])+','+n1(a[1])+' '
        + n1(a[0]+22)+','+n1(bu[1])+' '+n1(bu[0]-8)+','+n1(bu[1])+'" stroke="var(--'+hue+'-3)"/>'
      + '<circle class="seat-dot" cx="'+n1(a[0])+'" cy="'+n1(a[1])+'" r="1.7" fill="var(--'+hue+'-3)"/>'
      + '<circle class="seat-bub" cx="'+n1(bu[0])+'" cy="'+n1(bu[1])+'" r="7.6" stroke="var(--'+hue+'-3)"/>'
      + '<text class="seat-num" x="'+n1(bu[0])+'" y="'+n1(bu[1]+1.7)+'" fill="var(--'+hue+'-3)">0'+(k+1)+'</text>'
      + '<text class="seat-name" x="'+n1(bu[0]+12)+'" y="'+n1(bu[1]+2.2)+'" fill="var(--'+hue+'-4)">'
      + people[k].name.split(" ")[0].toUpperCase()+'</text></g>';
  }).join("");
}

function netBuilding(people,hue){
  const b = NB;
  /* los cuerpos se pintan de atrás hacia adelante */
  const order = b.vols.slice().sort((p,q) => (p.x+p.y+(p.w+p.d)/2)-(q.x+q.y+(q.w+q.d)/2));
  let s = "";
  order.forEach(v => {
    const bx = b.x+v.x, by = b.y+v.y, back = v.d - b.vd, vlv = nbVoidLv(v);
    for(let i=0;i<v.lv;i++){
      const z = i*b.lh, zv = z+.08;
      s += box(bx-.07,by-.07,v.w+.14,v.d+.14,z,.08,"stone");
      if(i !== vlv){
        s += box(bx,by,v.w,v.d,zv,b.lh-.08,hue) + windows(bx,by,v.w,v.d,zv,b.lh-.08);
      }else{
        /* por defecto el vano se abre a la cara de mayor Y; con side:"x" se
           abre a la de mayor X. El resto del paño se arma igual en los dos
           casos: fondo ciego, machón de atrás, dintel, puesto y machón de
           delante, que va el último porque es el que puede tapar. */
        const rot = v.side === "x";
        const wall = (x,y,w,d) => box(x,y,w,d,zv,b.lh-.08,hue) + windows(x,y,w,d,zv,b.lh-.08);
        const vx = rot ? bx+v.w-b.vd : bx+v.vx;
        const vy = rot ? by+v.vx     : by+back;
        const vsx = rot ? b.vd : b.vw, vsy = rot ? b.vw : b.vd;
        const r = (rot ? v.d : v.w) - (v.vx+b.vw);
        s += rot ? wall(bx,by,v.w-b.vd,v.d) : wall(bx,by,v.w,back);
        if(v.vx > .02) s += rot ? wall(vx,by,b.vd,v.vx) : wall(bx,vy,v.vx,b.vd);
        s += box(vx,vy,vsx,vsy,zv+b.lh-.3,.22,"stone");            /* dintel del vano */
        s += station(people[v.pi],v.pi,vx,vy,zv,rot);
        if(r > .02) s += rot ? wall(vx,vy+b.vw,b.vd,r) : wall(vx+b.vw,vy,r,b.vd);
      }
    }
    /* remate: losa de cubierta y algún equipo */
    const zt = v.lv*b.lh;
    s += box(bx-.09,by-.09,v.w+.18,v.d+.18,zt,.11,"stone");
    if(v.w > 1.8) s += box(bx+.35,by+.3,.6,.5,zt+.11,.34,"stone");
    else s += box(bx+v.w-.7,by+v.d-.6,.5,.4,zt+.11,.24,"stone");
  });
  return s;
}

/* ---------- WORK: la terminal de partida hacia el territorio ----------
   no es un distrito con contenido, es el puerto desde donde se sale */
function workStation(hue){
  let s = "";
  /* marcas de la plataforma, planas sobre la losa */
  let m = '<circle class="pad-ring" cx="0" cy="0" r="2.05"/>'
        + '<circle class="pad-ring2" cx="0" cy="0" r="1.35"/>';
  for(let i=0;i<8;i++){
    const a = i*Math.PI/4;
    m += '<line class="pad-tick" x1="'+(Math.cos(a)*1.5).toFixed(2)+'" y1="'+(Math.sin(a)*1.5).toFixed(2)
       + '" x2="'+(Math.cos(a)*1.98).toFixed(2)+'" y2="'+(Math.sin(a)*1.98).toFixed(2)+'"/>';
  }
  m += '<rect class="pad-mark" x="-.46" y="-.7" width=".2" height="1.4"/>'
     + '<rect class="pad-mark" x=".26" y="-.7" width=".2" height="1.4"/>'
     + '<rect class="pad-mark" x="-.46" y="-.1" width=".92" height=".2"/>';
  s += '<g transform="'+flat(0,0,.03)+'">'+m+'</g>';
  /* la nave amarrada, sobre sus patas */
  [[-.95,-.75],[.5,-.75],[-.95,.4],[.5,.4]].forEach(p =>
    s += box(p[0],p[1],.13,.13,0,.6,"slate"));
  s += box(-1,-.8,1.65,1.3,.6,.5,hue)
     + box(-.8,-.6,1.25,.9,1.1,.32,"stone")
     + box(-.55,-.35,.75,.4,1.42,.14,hue);
  /* torre de control con su mástil y baliza */
  s += box(2,-2.6,.5,.5,0,3.2,"stone")
     + box(1.78,-2.82,.94,.94,3.2,.55,hue)
     + box(1.95,-2.65,.6,.6,3.75,.16,"stone");
  const t1 = P(2.25,-2.35,3.91), t2 = P(2.25,-2.35,4.8);
  s += '<line class="mast" x1="'+n1(t1[0])+'" y1="'+n1(t1[1])+'" x2="'+n1(t2[0])+'" y2="'+n1(t2[1])+'"/>'
     + '<circle class="beacon" cx="'+n1(t2[0])+'" cy="'+n1(t2[1])+'" r="2.3"/>';
  /* balizas de pista */
  [[-2.1,-2.1],[2.1,2.1],[-2.1,2.1]].forEach(p => {
    const q = P(p[0],p[1],.18);
    s += box(p[0]-.09,p[1]-.09,.18,.18,0,.18,"slate")
       + '<circle class="padlight" cx="'+n1(q[0])+'" cy="'+n1(q[1]-2)+'" r="1.7"/>';
  });
  /* vector de descenso hacia el territorio */
  const d0 = P(0,0,-.6), d1 = P(0,0,-4.6);
  s += '<line class="traj" x1="'+n1(d0[0])+'" y1="'+n1(d0[1])+'" x2="'+n1(d1[0])+'" y2="'+n1(d1[1])+'"/>'
     + '<polygon class="traj-tip" points="'+n1(d1[0]-3.4)+','+n1(d1[1]-5)+' '+n1(d1[0]+3.4)+','+n1(d1[1]-5)+' '+n1(d1[0])+','+n1(d1[1]+2)+'"/>';
  return s;
}

/* ---------- una isla completa ---------- */
function buildIsland(sp){
  const rnd = rng(sp.seed), n = sp.size, h = n/2;
  const c = sp.hue;
  /* las islas sin distrito asignado quedan en gris: el color marca lo navegable */
  const acc = sp.district ? sp.hue : "slate";
  let s = "";

  /* raíz: cono invertido, sub-raíces y enredaderas colgantes */
  const apex = P((rnd()-.5)*.8, (rnd()-.5)*.8, -n*(.85+rnd()*.4));
  s += '<polygon class="f" points="'+pts([P(-h,h,-.5),P(h,h,-.5),apex])+'" fill="var(--stone-2)"/>';
  s += '<polygon class="f" points="'+pts([P(h,-h,-.5),P(h,h,-.5),apex])+'" fill="var(--stone-3)"/>';
  for(let i=0;i<4;i++){
    const ex = -h + rnd()*n;
    const sub = P(ex+(rnd()-.5), h - rnd()*1.4, -n*(.35+rnd()*.5));
    s += '<polygon points="'+pts([P(ex-.7,h,-.5),P(ex+.7,h,-.5),sub])+'" fill="var(--stone-3)" opacity=".9"/>';
  }
  for(let i=0;i<7;i++){
    const t = rnd();
    const a = t < .5 ? P(-h+t*2*n, h, -.5) : P(h, h-(t-.5)*2*n, -.5);
    const len = 12+rnd()*30, dx = (rnd()-.5)*7;
    s += '<path d="M'+n1(a[0])+' '+n1(a[1])+' q'+n1(dx)+' '+n1(len*.6)+' '+n1(dx*.6)+' '+n1(len)+'" stroke="var(--'+acc+'-2)" stroke-width=".85" fill="none" opacity=".5"/>';
  }

  /* viga de fundación bajo la losa */
  s += box(-h+.45,-h+.45,n-.9,n-.9,-.95,.45,"stone");

  /* plataforma: losa, estratos del canto y solado de la plaza */
  s += box(-h,-h,n,n,-.5,.5,"stone");
  s += '<polyline points="'+pts([P(-h,h,-.16),P(h,h,-.16),P(h,-h,-.16)])+'" fill="none" stroke="var(--stone-4)" stroke-width=".45" opacity=".75"/>';
  s += '<polyline points="'+pts([P(-h,h,-.33),P(h,h,-.33),P(h,-h,-.33)])+'" fill="none" stroke="var(--stone-4)" stroke-width=".35" opacity=".45"/>';
  const ins = .55;
  s += '<polygon points="'+pts([P(-h+ins,-h+ins,0),P(h-ins,-h+ins,0),P(h-ins,h-ins,0),P(-h+ins,h-ins,0)])+'" fill="url(#gt-stone)" opacity=".75"/>';
  for(let i=1;i<n;i++){
    s += seg(P(-h+i,-h+ins,0), P(-h+i,h-ins,0), "stone-4", ".3", ".45");
    s += seg(P(-h+ins,-h+i,0), P(h-ins,-h+i,0), "stone-4", ".3", ".45");
  }
  /* desde aquí, todo lo que se levanta deja sombra sobre la losa */
  SHD = [];

  /* elementos ordenados por profundidad (algoritmo del pintor) */
  const items = [];
  /* las torres se agrupan en el centro de la plataforma, la más alta al medio */
  const slots = [[0,0],[-1,.65],[.9,-.75],[-.85,-.95],[1,1.05]];
  const proj = sp.id === "services";                   /* el distrito central lleva el proyecto */
  const net = sp.id === "team";                        /* la red vive en un edificio abierto */
  const port = sp.id === "work";                       /* WORK es la terminal de partida */
  const nT = (proj || net || port) ? 2 : n > 6.5 ? 5 : n > 4.5 ? 3 : 2;
  let topZ = 0;
  if(proj){
    topZ = PB.lv*PB.lh + .52;
    items.push({ d:PB.x+PB.y+(PB.w+PB.d)/2, s:'<g class="proj-solid">'+projSolid()+'</g>' });
  }
  if(port){
    topZ = 5.2;
    items.push({ d:0, s:workStation(c) });
  }
  if(net){
    topZ = Math.max.apply(null, NB.vols.map(v => v.lv*NB.lh)) + .6;
    items.push({ d:0, s:netBuilding(sp.people,sp.hue) });
  }
  for(let i=(proj || net || port) ? 3 : 0;i<((proj || net || port) ? 5 : nT);i++){
    const sx = (proj || net || port) ? 1.2 : 1.5+rnd()*1.0, sy = (proj || net || port) ? 1.2 : 1.5+rnd()*1.0;
    const anx = proj ? [[-3.2,1.9],[2,-3.2]][i-3] : net ? [[-3.4,2.4],[2.2,-3.4]][i-3]
      : port ? [[-3.1,2.4],[2.6,2.4]][i-3] : null;      /* anexos en las esquinas libres */
    const x = anx ? anx[0] : slots[i][0]*n*.21 - sx/2 + (rnd()-.5)*.5;
    const y = anx ? anx[1] : slots[i][1]*n*.21 - sy/2 + (rnd()-.5)*.5;
    const lv = (net || port) ? 2 : proj ? Math.round(2+rnd()*2)
                    : (i === 0 ? Math.round(5 + rnd()*3 + n*.35) : Math.round(2 + rnd()*4));
    /* en la isla de la red los anexos van neutros: el protagonista es el edificio abierto */
    const col = (net || port) ? (rnd() > .5 ? "stone" : "slate")
      : sp.district ? (i === 0 ? c : (rnd() > .35 ? c : "stone"))
      : (rnd() > .5 ? "stone" : "slate");
    const t = tower(rnd,x,y,sx,sy,lv,col);
    if(t.top > topZ) topZ = t.top;
    items.push({ d:x+y+(sx+sy)/2, s:t.svg });
  }
  /* los árboles bordean el perímetro, como en el distrito residencial */
  for(let i=0, m=Math.round(5+n); i<m; i++){
    const side = i % 4, t = .7 + rnd()*(n-1.4);
    const x = side === 0 ? -h+.6 : side === 1 ? h-.6 : -h+t;
    const y = side === 0 || side === 1 ? -h+t : (side === 2 ? -h+.6 : h-.6);
    items.push({ d:x+y, s:tree(rnd,x,y,acc) });
  }

  /* barandas de las dos aristas frontales */
  let rail = "";
  for(let i=0;i<=n;i++){
    const A = P(-h+i,h,0), B = P(-h+i,h,.5), C = P(h,-h+i,0), D = P(h,-h+i,.5);
    rail += '<line x1="'+n1(A[0])+'" y1="'+n1(A[1])+'" x2="'+n1(B[0])+'" y2="'+n1(B[1])+'" stroke="var(--stone-4)" stroke-width=".5"/>'
          + '<line x1="'+n1(C[0])+'" y1="'+n1(C[1])+'" x2="'+n1(D[0])+'" y2="'+n1(D[1])+'" stroke="var(--stone-4)" stroke-width=".5"/>';
  }
  rail += '<polyline points="'+pts([P(-h,h,.5),P(h,h,.5),P(h,-h,.5)])+'" fill="none" stroke="var(--stone-4)" stroke-width=".6"/>';
  items.push({ d:n*2, s:rail });

  /* placa de maqueta en el canto del zócalo: nombre del distrito y escala */
  if(sp.district){
    const d = DISTRICTS.find(q => q.id === sp.id), k = DISTRICTS.indexOf(d);
    const o = P(-h+.55, h, -.07);
    const M = 'matrix('+FA.toFixed(3)+','+FB.toFixed(3)+',0,'+(IZ*U).toFixed(3)+','+n1(o[0])+','+n1(o[1])+')';
    items.push({ d:n*2+.5, s:'<g class="plq" transform="'+M+'">'
      + '<rect class="plq-bg" x="0" y="0" width="1.8" height=".38" rx=".012"/>'
      + '<text class="plq-t b" x=".10" y=".165" font-size=".125">'+dx(d,"label")+'</text>'
      + '<text class="plq-t" x=".10" y=".31" font-size=".085">SECTOR '+String(k+1).padStart(2,"0")+' · REMOTE CITY · 1:50</text>'
      + '</g>' });
  }

  /* capa de detalle: gente y vehículos, sólo visibles al aterrizar. Entran en
     la misma cola que todo lo demás y no encima: si van al final, un coche que
     está detrás del edificio se dibuja sobre la fachada. */
  if(sp.district){
    /* figuras de escala: cuerpo blanco mate y cabeza, con su sombra corta
       hacia la derecha, como las de una maqueta bajo el foco */
    const figure = (x,y) => {
      const a = P(x,y,0), b = P(x,y,.46);
      return '<ellipse cx="'+n1(a[0]+1.4)+'" cy="'+n1(a[1]+.3)+'" rx="2.3" ry=".95" fill="var(--ink)" opacity=".16"/>'
        + '<rect class="fig" x="'+n1(a[0]-.95)+'" y="'+n1(b[1])+'" width="1.9" height="'+n1(a[1]-b[1])+'" rx=".95"/>'
        + '<circle class="fig" cx="'+n1(a[0])+'" cy="'+n1(b[1]-1.25)+'" r="1.05"/>';
    };
    for(let i=0;i<9;i++){
      const x = -h+.8+rnd()*(n-1.6), y = -h+.8+rnd()*(n-1.6);
      items.push({ d:x+y, s:'<g class="detail">'+figure(x,y)+'</g>' });
    }
    /* y algunas caminan por las aceras del borde, de ida y vuelta */
    const L = n-2.2;
    for(let i=0;i<3;i++){
      const along = i < 2;                                  /* dos por el frente, una por el lateral */
      const t = .3+rnd()*.4, x = along ? -h+1.1+t*L*.5 : h-.8, y = along ? h-.8 : -h+1.1+t*L*.5;
      const wx = along ? IX*U*L*.5 : -IX*U*L*.5, wy = IY*U*L*.5;
      items.push({ d:n*1.6, s:'<g class="detail walk" style="--wx:'+n1(wx)+'px;--wy:'+n1(wy)+'px;--dur:'+(14+rnd()*9).toFixed(1)+'s;--del:-'+(rnd()*12).toFixed(1)+'s">'+figure(x,y)+'</g>' });
    }
    for(let i=0;i<2;i++){
      const x = -h+1+rnd()*(n-2.5), y = -h+1+rnd()*(n-2.5);
      items.push({ d:x+y+.75, s:'<g class="detail">'
        + box(x,y,.95,.55,0,.30,"stone") + box(x+.2,y+.08,.5,.4,.30,.18,acc)+'</g>' });
    }
  }

  items.sort((a,b) => a.d - b.d);

  /* capa técnica: ejes, cota del lado y nivel de coronamiento.
     Sólo aparece al aterrizar, cuando el zoom la vuelve legible. */
  let tech = "";
  if(sp.district){
    const ext = 2.6;

    /* ejes de replanteo, con su globo de identificación */
    const axis = (a,b,label) => {
      const A = P(a[0],a[1],0), B = P(b[0],b[1],0);
      return '<line x1="'+n1(A[0])+'" y1="'+n1(A[1])+'" x2="'+n1(B[0])+'" y2="'+n1(B[1])
           + '" stroke="var(--ink-soft)" stroke-width=".6" stroke-dasharray="7 2 1.5 2" opacity=".7"/>'
           + '<circle cx="'+n1(B[0])+'" cy="'+n1(B[1])+'" r="3.4" fill="var(--sky-0)" stroke="var(--ink-soft)" stroke-width=".6"/>'
           + '<text x="'+n1(B[0])+'" y="'+n1(B[1]+1.9)+'" text-anchor="middle">'+label+'</text>';
    };
    tech += axis([-h-ext,0],[h+ext,0],"A") + axis([0,-h-ext],[0,h+ext],"1");

    /* cota del lado sobre la arista frontal */
    const c0 = P(-h,h+1.7,0), c1 = P(h,h+1.7,0);
    tech += '<line x1="'+n1(c0[0])+'" y1="'+n1(c0[1])+'" x2="'+n1(c1[0])+'" y2="'+n1(c1[1])+'" stroke="var(--ink-soft)" stroke-width=".6"/>'
          + seg(P(-h,h+1.2,0),P(-h,h+2.2,0),"ink-soft",".6")
          + seg(P(h,h+1.2,0),P(h,h+2.2,0),"ink-soft",".6")
          + '<text x="'+n1((c0[0]+c1[0])/2)+'" y="'+n1((c0[1]+c1[1])/2+7)+'" text-anchor="middle">'+ftin(n)+'</text>';

    /* nivel de coronamiento de la torre principal */
    const t0 = P(0,-h-.6,topZ);
    tech += '<line x1="'+n1(t0[0])+'" y1="'+n1(t0[1])+'" x2="'+n1(t0[0]+40)+'" y2="'+n1(t0[1])+'" stroke="var(--ink-soft)" stroke-width=".6" stroke-dasharray="4 3"/>'
          + '<polygon points="'+n1(t0[0]-3)+','+n1(t0[1]-4.4)+' '+n1(t0[0]+3)+','+n1(t0[1]-4.4)+' '+n1(t0[0])+','+n1(t0[1])+'" fill="none" stroke="var(--ink-soft)" stroke-width=".6"/>'
          + '<text x="'+n1(t0[0]+44)+'" y="'+n1(t0[1]+2)+'">+'+ftin(topZ)+'</text>';
  }

  /* llamadas de detalle: una por servicio que tenga visor, con su
     globo, su número y la línea quebrada hasta el punto del edificio */
  let calls = "";
  /* tres anclajes: izquierda arriba, derecha arriba y derecha abajo */
  const CP = [{ l:1, tx:-1.2, ty:.6,   tz:.42, f:.55,  dx:0 },
              { l:0, tx:1.4,  ty:-1.4, tz:.66, f:.80,  dx:0 },
              { l:0, tx:1.30, ty:1.60, tz:.02, f:-1.05, dx:34 }];
  (sp.items || []).filter(it => it[3]).forEach((it,i) => {
    const c = CP[i] || CP[0], left = !!c.l;
    const tp = P(c.tx, c.ty, topZ*c.tz);
    const bx = (left ? -1 : 1)*(h*U*IX + 62 + (c.dx || 0));
    const by = -topZ*U*IZ*c.f - 24;
    calls += '<g class="call" data-lab="'+it[3]+'" tabindex="0" role="button" aria-label="Abrir '+it[1]+'">'
           + '<polyline class="call-line" points="'+n1(bx)+','+n1(by + (by > tp[1] ? -13 : 13))+' '+n1(bx)+','+n1(tp[1])+' '+n1(tp[0])+','+n1(tp[1])+'"/>'
           + '<circle class="call-dot" cx="'+n1(tp[0])+'" cy="'+n1(tp[1])+'" r="2.4"/>'
           + '<circle class="call-bub" cx="'+n1(bx)+'" cy="'+n1(by)+'" r="11"/>'
           + '<text class="call-num" x="'+n1(bx)+'" y="'+n1(by+2.4)+'">'+it[0]+'</text>'
           + '<text class="call-name" x="'+n1(bx + (left ? -16 : 16))+'" y="'+n1(by+3)
           + '" text-anchor="'+(left ? "end" : "start")+'">'+it[1].toUpperCase()+'</text>'
           + '</g>';
  });

  /* las sombras van sobre la losa y recortadas a ella: la isla flota, y lo
     que cae fuera del borde no tiene dónde caer */
  const cid = "cp"+(CPN++);
  const shd = '<clipPath id="'+cid+'"><polygon points="'+pts([P(-h,-h,0),P(h,-h,0),P(h,h,0),P(-h,h,0)])+'"/></clipPath>'
            + '<g class="shd" clip-path="url(#'+cid+')">'+SHD.join("")+'</g>';
  SHD = null;

  const bw = n*U*IX, bh = n*U*IY;
  return {
    svg: '<ellipse class="glow" cx="0" cy="'+n1(bh*.2)+'" rx="'+bw.toFixed(0)+'" ry="'+(bh*1.4).toFixed(0)+'" fill="var(--'+acc+'-1)" filter="url(#blur)"/>'
       + s + shd + items.map(i => i.s).join("")
       /* el corte y el modelo se dibujan sobre todo lo demás de la isla */
       + (sp.id === "services" ? '<g class="proj-cut"></g><g class="proj-bim"></g>' : "")
       + (sp.id === "team" ? netTags(sp.people) : "")
       + '<g class="tech">' + tech + '</g>' + calls
       + '<polygon class="frame" points="'+pts([P(-h-1.2,-h-1.2,0),P(h+1.2,-h-1.2,0),P(h+1.2,h+1.2,0),P(-h-1.2,h+1.2,0)])+'"/>'
       + '<polygon class="ring" points="'+pts([P(-h-2,-h-2,0),P(h+2,-h-2,0),P(h+2,h+2,0),P(-h-2,h+2,0)])+'"/>'
       + '<polygon points="'+pts([P(-h,-h,topZ+1),P(h,-h,topZ+1),P(h,h,topZ+1),P(-h,h,topZ+1)])+'" fill="transparent"/>',
    topY: -(topZ*U*IZ + n*U*IY*.5 + 26),
    topZ: topZ
  };
}


export { projBim, U, SP, FT, ftin, P, pts, n1, rng, box, PB, QS, QF, planMatrix, isoMatrix, projCut, projNotes, NB, nbVoidLv, buildIsland };
