import aguPhoto from "./assets/portraits/agu.jpg";
import tomPhoto from "./assets/portraits/tom.jpg";
import roPhoto from "./assets/portraits/ro.jpg";

/* ============================================================
   1. CONTENIDO — editá acá los distritos, textos y colores
   ============================================================ */
/* Retratos: Vite emite URLs con hash; se descargan al abrir el equipo. */
const PHOTOS = {
  agu: aguPhoto,
  tom: tomPhoto,
  ro: roPhoto,
};

/* ---------- datos de contacto ----------
   BOOKING: pegá acá el link de tu agenda (Google Calendar → Programación de citas
   → Compartir → copiar el enlace de la página de reservas). Mientras esté vacío,
   el botón abre un correo a MAIL. */
const MAIL = "agustin@remoteandpartners.com";
const BOOKING = "";

const DISTRICTS = [
  {
    id: "about",
    label: "NOSOTROS",
    sub: "DISTRITO RESIDENCIAL",
    hue: "magenta",
    a: 1.9,
    b: 3.5,
    size: 7,
    seed: 12,
  },

  {
    id: "services",
    label: "SERVICIOS",
    sub: "DISTRITO CENTRAL",
    hue: "purple",
    a: 0,
    b: 0,
    size: 8,
    seed: 7,
    lead: "Dos formas de trabajar sobre el mismo proyecto: la documentación 2D que se lleva a la obra y el modelo federado donde todas las disciplinas conviven. Entrá a cualquiera de las dos y miralas por dentro.",
    listTitle: "SERVICIOS",
    items: [
      [
        "01",
        "AutoCAD",
        "Documentación completa: arquitectura, entramado, eléctrico y cielorrasos.",
        "autocad",
      ],
      [
        "02",
        "Revit",
        "Modelo BIM federado, con arquitectura, estructura e instalaciones coordinadas.",
        "revit",
      ],
      [
        "03",
        "Automatización",
        "Rutinas LISP, plantillas y catálogos de bloques que hacen que tu equipo dibuje siempre igual.",
        "auto",
      ],
    ],
    specs: [
      ["4", "LÁMINAS"],
      ["3", "DISCIPLINAS"],
      ["LOD 350", "DETALLE"],
    ],
  },

  {
    id: "work",
    label: "OPERACIONES",
    sub: "PUERTO ORBITAL",
    hue: "blue",
    a: 0.4,
    b: -2.6,
    size: 7,
    seed: 31,
  },

  {
    id: "team",
    label: "LA RED",
    sub: "NODOS CONECTADOS",
    hue: "orange",
    a: -2.6,
    b: 0.4,
    size: 6.5,
    seed: 55,
    lead: "No hay una oficina que nos contenga. Remote &amp; Partners es un núcleo de dirección conectado a nodos especializados que se activan según lo que cada proyecto necesita, y que pueden estar en cualquier ciudad.",
    listTitle: "NODOS ACTIVOS",
    network: true,
    people: [
      {
        key: "agu",
        ph: "agu",
        hue: "blue",
        area: "LEADERSHIP &amp; STRATEGY",
        core: true,
        city: "BARCELONA · ES",
        name: "Agustín Garombo Garelis",
        role: "Leadership &amp; Strategy",
        bio: "Dirección creativa y estratégica del estudio. Visión global, desarrollo de negocio y construcción de la red de Remote &amp; Partners.",
      },
      {
        key: "tom",
        ph: "tom",
        hue: "magenta",
        area: "BIM &amp; DIGITAL ARCHITECTURE",
        city: "CÓRDOBA · AR",
        name: "Tomás Linares",
        role: "BIM Specialist",
        bio: "Desarrollo y coordinación BIM, modelado y optimización de workflows digitales aplicados a arquitectura.",
      },
      {
        key: "ro",
        ph: "ro",
        hue: "purple",
        area: "TECHNICAL DESIGN &amp; AI",
        city: "BUENOS AIRES · AR",
        name: "Rocío González",
        role: "AutoCAD Specialist · AI Team",
        bio: "Documentación y desarrollo técnico en AutoCAD. Integra además el área de AI, explorando e implementando inteligencia artificial dentro de los procesos del estudio.",
      },
    ],
    specs: [
      ["3", "NODOS"],
      ["0", "OFICINAS"],
      ["100%", "REMOTO"],
    ],
  },
];

/* ============================================================
   IDIOMA — el contenido base está en español y acá vive el inglés.
   Para traducir algo nuevo alcanza con agregar la clave en EN.
   ============================================================ */
/* el idioma de casa es el inglés: la mayoría de los estudios con los que
   trabajamos está en Estados Unidos. El español queda a un clic. */
let LANG = "en";
const setLanguage = (value) => {
  LANG = value;
};

const UI = {
  es: {
    city: "CIUDAD REMOTE &amp; PARTNERS · 4 DISTRITOS · ALT 4,000 FT",
    hint: "CLIC EN UNA ISLA PARA ATERRIZAR <kbd>ESC</kbd> PARA VOLVER",
    sound: "SONIDO",
    sector: "SECTOR",
    alt: "ALT",
    back: "← VOLVER A LA CIUDAD",
    backNet: "← VOLVER A LA RED",
    labBack: "✕ VOLVER",
    others: "OTROS NODOS",
    node: "NODO",
    openSheet: "ABRIR LÁMINA",
    openModel: "ABRIR MODELO",
    openNote: "VER LA NOTA",

    next: "SIGUIENTE LÁMINA ›",
    toFlat: "VER EN PLANTA",
    toIso: "VER EN ISOMÉTRICA",
    viewDoc: "VER LA DOCUMENTACIÓN →",
    openDet: "VER EL DETALLE A-401 →",
    docRef: "REFERENCIA",
    detTitle: "Sección de muro exterior tipo",
    coordinated: "COORDINADO",
    autTitle: "Automatización de dibujo",
    autLead:
      "El mismo juego de láminas, dibujado siempre igual. Automatizamos lo repetitivo para que tu equipo no lo dibuje dos veces.",
    autList: [
      [
        "Rutinas LISP",
        "Comandos propios para las tareas que se repiten en cada proyecto.",
      ],
      [
        "Plantillas",
        "Capas, estilos de cota, textos y cajetín, estandarizados en un solo archivo.",
      ],
      [
        "Catálogos de bloques",
        "Bibliotecas de carpintería, artefactos y detalles listas para insertar.",
      ],
      [
        "Consolidación",
        "Un archivo maestro por equipo, para que todos dibujen con lo mismo.",
      ],
    ],
    demoProj: "VIVIENDA DE DEMOSTRACIÓN",
    sheetTitle: "LÁMINA",
    location: "UBICACIÓN",
    status: "ESTADO",
    active: "ACTIVO",
    sheet: "LÁMINA",
    scale: "ESCALA",
    cut: "CORTE",
    model: "MODELO",
    levels: "NIVELES",
    lod: "DETALLE",
    roof: "+ CUBIERTA",
    level: "NIVEL",
    federated: "Modelo federado",
    looks: ["MAQUETA", "CLARO", "APAGADO", "OSCURO", "B/N"],
    connect: "CONECTAR CON LA RED",
    channel: "REMOTE CHANNEL AVAILABLE",
    cShort: "CONECTAR",
    cShortRun: "CONECTANDO...",
    cShortGo: "CONECTAR →",
    establishing: "ESTABLECIENDO CONEXIÓN...",
    startProject: "INICIAR UNA CONEXIÓN →",
    nodeReady: "SECTOR 06 · NODO EXTERNO ACTIVO",
    newConn: "Conexión nueva",
    extNode: "NODO EXTERNO",
    tellUs: "Contanos de tu proyecto.",
    fName: "NOMBRE",
    fCompany: "EMPRESA / ESTUDIO",
    fEmail: "CORREO",
    fNeed: "¿QUÉ NECESITÁS?",
    fProject: "PROYECTO",
    establish: "ESTABLECER CONEXIÓN →",
    backCity: "← VOLVER A LA CIUDAD",
    established: "Conexión establecida",
    received: "RECIBIDO",
    call30: "¿PREFERÍS UNA LLAMADA DE 30 MIN? →",
    about: "ABOUT US",
    oNext: "SIGUIENTE ›",
    oNodes: "NODOS",
    oDisc: "DISCIPLINAS",
    oConn: "CONEXIONES",
    oSector: [
      "NOSOTROS · SYSTEM ORIGIN · 00",
      "01 · REMOTE",
      "02 · PARTNERS",
      "03 · LA RED",
      "REMOTE CITY · ONLINE",
    ],
    oTitle: [
      "El origen",
      "Remote",
      "Partners",
      "La red",
      "Remote &amp; Partners",
    ],
    oSub: [
      "UNA IDEA",
      "SIN UN CENTRO",
      "CÓMO TRABAJAMOS",
      "LO QUE ESTABAS MIRANDO",
      "LA CIUDAD ESTÁ ACTIVA",
    ],
    oLead: [
      "Remote &amp; Partners nació de una idea simple: para trabajar juntos no hace falta estar en el mismo lugar.",
      "Construimos una forma de trabajar donde la distancia no define el equipo. Cada persona aporta desde donde está; el proyecto los conecta.",
      "<b>Remote habla de dónde estamos. Partners, de cómo trabajamos.</b><br>Personas y disciplinas distintas que se conectan alrededor de cada proyecto para funcionar como un solo equipo.",
      "A esta altura ya reconocés la ciudad. Lo importante nunca fueron los edificios, sino lo que ocurre entre ellos. Personas y disciplinas distintas trabajando como un solo equipo.",
      "Esta es nuestra forma de trabajar: una red distribuida, conectada alrededor de cada proyecto.",
    ],
    oClaim: "Built remotely. Designed together.",
    oSign: "AGUSTÍN GAROMBO GARELIS · LEADERSHIP & STRATEGY",
    oWhy: "Por eso la ciudad que acabás de recorrer no tiene centro administrativo: tiene nodos que se encienden según lo que cada proyecto necesita.",
    oActive: "ACTIVA",

    oPeople: "PERSONAS",
    oPlaces: "CIUDADES",
    oExplore: "EXPLORAR LA RED →",
    extTerr: "TERRITORIO EXTERNO",
    usTitle: "Estados Unidos",
    territory: "TERRITORIO",
    typology: "TIPOLOGÍA",
    returnCity: "ESC · VOLVER A CIUDAD REMOTE",
    privTitle: "EL TRABAJO ES REAL. LA INFORMACIÓN ES PRIVADA.",
    privBody:
      "Por acuerdos de confidencialidad, la identidad de los proyectos y su documentación quedan protegidas. La experiencia se recorre por territorio, tipología y alcance.",
    operations: "PROYECTOS RESIDENCIALES",
    typologies: "TIPOLOGÍAS",
    states: "ESTADOS",
    totLine: "PROYECTOS REALIZADOS Y ENVIADOS",
    activeStates: "ESTADOS ACTIVOS",
    region: "REGIÓN",
    scope: "ALCANCE",
    disciplines: "DISCIPLINAS",
    experience: "EXPERIENCIA",
    scopeBody: "Documentación · Coordinación",
    pickState: "Elegí un estado para ver su actividad.",
    pickType: "Elegí una tipología para ver la experiencia acumulada.",
    ty_sfr: "VIVIENDA UNIFAMILIAR",
    ty_twh: "VIVIENDA ADOSADA",
    typology2: "TIPOLOGÍA",
    tyd_sfr:
      "Vivienda unifamiliar con entramado de madera: el juego completo de obra, de la planta al detalle constructivo, para builders de Texas e Idaho.",
    tyd_twh:
      "Vivienda adosada y townhouse: unidades repetidas con medianeras, en corredores urbanos del noreste y del área de Washington.",
    tye_sfr: [
      "Plantas, cortes y alzados",
      "Entramado de piso y cubierta",
      "Detalles constructivos",
      "Planillas de carpintería",
    ],
    tye_twh: [
      "Unidades repetidas y medianeras",
      "Coordinación entre tipos",
      "Documentación municipal",
      "Adaptación al lote",
    ],
    inTouch: "Te escribimos en menos de 48 horas.",
    discActive: "DE 3 DISCIPLINAS ACTIVAS",
    disc: ["ARQUITECTURA", "ESTRUCTURA", "INSTALACIONES"],
    rooms: [
      "GARAJE",
      "ZAGUÁN",
      "ESTUDIO",
      "COCINA",
      "SERVICIO",
      "TOILETTE",
      "SALÓN",
    ],
    sheets: [
      ["ARQUITECTURA", "Planta baja"],
      ["ENTREPISO", "Planta de entramado de entrepiso"],
      ["ELÉCTRICO", "Planta eléctrica"],
      ["FUNDACIÓN", "Planta de fundaciones"],
    ],
  },
  en: {
    city: "REMOTE &amp; PARTNERS CITY · 4 DISTRICTS · ALT 4,000 FT",
    hint: "CLICK AN ISLAND TO LAND <kbd>ESC</kbd> TO GO BACK",
    sound: "SOUND",
    sector: "SECTOR",
    alt: "ALT",
    back: "← BACK TO THE CITY",
    backNet: "← BACK TO THE NETWORK",
    labBack: "✕ BACK",
    others: "OTHER NODES",
    node: "NODE",
    openSheet: "OPEN DRAWING",
    openModel: "OPEN MODEL",
    openNote: "OPEN NOTE",

    next: "NEXT DRAWING ›",
    toFlat: "VIEW IN PLAN",
    toIso: "VIEW IN AXONOMETRIC",
    viewDoc: "VIEW DOCUMENTATION →",
    openDet: "OPEN DETAIL A-401 →",
    docRef: "DOCUMENT REF",
    detTitle: "Typ. exterior wall section",
    coordinated: "COORDINATED",
    autTitle: "Drafting automation",
    autLead:
      "The same set, drawn the same way every time. We automate the repetitive part so your team never draws it twice.",
    autList: [
      [
        "LISP routines",
        "Custom commands for the tasks that repeat on every project.",
      ],
      [
        "Templates",
        "Layers, dimension styles, text and title block, standardised in one file.",
      ],
      [
        "Block libraries",
        "Door, window, fixture and detail libraries, ready to insert.",
      ],
      [
        "Consolidation",
        "One master file per team, so everyone draws from the same source.",
      ],
    ],
    demoProj: "DEMONSTRATION RESIDENCE",
    sheetTitle: "DRAWING",
    location: "LOCATION",
    status: "STATUS",
    active: "ACTIVE",
    sheet: "DRAWING",
    scale: "SCALE",
    cut: "CUT",
    model: "MODEL",
    levels: "LEVELS",
    lod: "DETAIL",
    roof: "+ ROOF",
    level: "LEVEL",
    federated: "Federated model",
    looks: ["MODEL", "LIGHT", "MUTED", "DARK", "B/W"],
    connect: "CONNECT TO THE NETWORK",
    channel: "REMOTE CHANNEL AVAILABLE",
    cShort: "CONNECT",
    cShortRun: "CONNECTING...",
    cShortGo: "CONNECT →",
    establishing: "ESTABLISHING CONNECTION...",
    startProject: "START A CONNECTION →",
    nodeReady: "SECTOR 06 · EXTERNAL NODE ONLINE",
    newConn: "New connection",
    extNode: "EXTERNAL NODE",
    tellUs: "Tell us about your project.",
    fName: "NAME",
    fCompany: "COMPANY / STUDIO",
    fEmail: "EMAIL",
    fNeed: "WHAT DO YOU NEED?",
    fProject: "PROJECT",
    establish: "ESTABLISH CONNECTION →",
    backCity: "← BACK TO THE CITY",
    established: "Connection established",
    received: "RECEIVED",
    call30: "RATHER BOOK A 30 MIN CALL? →",
    about: "ABOUT US",
    oNext: "NEXT ›",
    oNodes: "NODES",
    oDisc: "DISCIPLINES",
    oConn: "CONNECTIONS",
    oSector: [
      "ABOUT US · SYSTEM ORIGIN · 00",
      "01 · REMOTE",
      "02 · PARTNERS",
      "03 · THE NETWORK",
      "REMOTE CITY · ONLINE",
    ],
    oTitle: [
      "The origin",
      "Remote",
      "Partners",
      "The network",
      "Remote &amp; Partners",
    ],
    oSub: [
      "ONE IDEA",
      "NO CENTRE",
      "HOW WE WORK",
      "WHAT YOU WERE LOOKING AT",
      "THE CITY IS ACTIVE",
    ],
    oLead: [
      "Remote &amp; Partners started from a simple idea: working together does not require being in the same place.",
      "We built a way of working where distance does not define the team. Everyone contributes from where they are; the project connects them.",
      "<b>Remote is about where we are. Partners is about how we work.</b><br>Different people and disciplines connecting around each project to act as one team.",
      "By now you recognise the city. What mattered was never the buildings, but what happens between them. Different people and disciplines working as one team.",
      "This is how we work: a distributed network, connected around every project.",
    ],
    oClaim: "Built remotely. Designed together.",
    oSign: "AGUSTÍN GAROMBO GARELIS · LEADERSHIP & STRATEGY",
    oWhy: "That is why the city you just explored has no administrative centre: it has nodes that switch on according to what each project needs.",
    oActive: "ACTIVE",

    oPeople: "PEOPLE",
    oPlaces: "CITIES",
    oExplore: "EXPLORE THE NETWORK →",
    extTerr: "EXTERNAL TERRITORY",
    usTitle: "United States",
    territory: "TERRITORY",
    typology: "TYPOLOGY",
    returnCity: "ESC · RETURN TO REMOTE CITY",
    privTitle: "THE WORK IS REAL. THE DATA IS PRIVATE.",
    privBody:
      "Due to confidentiality agreements, project identities and documentation remain protected. Explore our experience by territory, typology and scope.",
    operations: "RESIDENTIAL PROJECTS",
    typologies: "TYPOLOGIES",
    states: "STATES",
    totLine: "PROJECTS DRAWN AND DELIVERED",
    activeStates: "ACTIVE STATES",
    region: "REGION",
    scope: "SCOPE",
    disciplines: "DISCIPLINES",
    experience: "EXPERIENCE",
    scopeBody: "Documentation · Coordination",
    pickState: "Select a state to see its activity.",
    pickType: "Select a typology to see the accumulated experience.",
    ty_sfr: "SINGLE FAMILY",
    ty_twh: "TOWNHOUSE",
    typology2: "TYPOLOGY",
    tyd_sfr:
      "Single-family wood framing: the full construction set, from floor plan to wall section, for builders in Texas and Idaho.",
    tyd_twh:
      "Townhouse and attached housing: repeated units with party walls, in Northeast corridors and the Washington metro area.",
    tye_sfr: [
      "Plans, sections and elevations",
      "Floor and roof framing",
      "Construction details",
      "Door and window schedules",
    ],
    tye_twh: [
      "Repeated units and party walls",
      "Coordination between unit types",
      "Permit documentation",
      "Adaptation to lot",
    ],
    inTouch: "We'll be in touch within 48 hours.",
    discActive: "OF 3 DISCIPLINES ACTIVE",
    disc: ["ARCHITECTURE", "STRUCTURE", "MEP"],
    rooms: [
      "GARAGE",
      "FOYER",
      "STUDY",
      "KITCHEN",
      "MUDROOM",
      "POWDER",
      "GREAT ROOM",
    ],
    sheets: [
      ["FOUNDATION", "Foundation plan"],
      ["STRUCTURAL", "Floor framing plan"],
      ["ARCHITECTURAL", "First floor plan"],
      ["ELECTRICAL", "Electrical plan"],
    ],
  },
};
const u = (k) => UI[LANG][k];

/* traducciones de cada distrito; si falta una clave se usa el español */
const EN = {
  about: {
    label: "ABOUT US",
    sub: "RESIDENTIAL DISTRICT",
  },
  services: {
    label: "SERVICES",
    sub: "CENTRAL DISTRICT",
    lead: "Two ways of working on the same project: the 2D documentation that goes to site, and the federated model where every discipline lives together. Step into either one and look inside.",
    listTitle: "SERVICES",
    items: [
      [
        "01",
        "AutoCAD",
        "Full documentation set: architecture, framing, electrical and ceilings.",
        "autocad",
      ],
      [
        "02",
        "Revit",
        "Federated BIM model, with architecture, structure and MEP coordinated.",
        "revit",
      ],
      [
        "03",
        "Automation",
        "LISP routines, templates and block libraries so your team draws the same way every time.",
        "auto",
      ],
    ],
    specs: [
      ["4", "DRAWINGS"],
      ["3", "DISCIPLINES"],
      ["LOD 350", "DETAIL"],
    ],
  },
  work: {
    label: "WORK",
    sub: "ORBITAL PORT",
  },
  team: {
    label: "THE NETWORK",
    sub: "CONNECTED NODES",
    lead: "There is no office holding us together. Remote &amp; Partners is a leadership core connected to specialist nodes that switch on as each project needs them, and they can be in any city.",
    listTitle: "ACTIVE NODES",
    people: [
      {
        area: "LEADERSHIP &amp; STRATEGY",
        role: "Leadership &amp; Strategy",
        bio: "Creative and strategic direction of the studio. Global vision, business development and building the Remote &amp; Partners network.",
      },
      {
        area: "BIM &amp; DIGITAL ARCHITECTURE",
        role: "BIM Specialist",
        bio: "BIM development and coordination, modelling and optimisation of digital workflows applied to architecture.",
      },
      {
        area: "TECHNICAL DESIGN &amp; AI",
        role: "AutoCAD Specialist · AI Team",
        bio: "Technical documentation and development in AutoCAD. Also part of the AI area, exploring and implementing artificial intelligence across the studio's processes.",
      },
    ],
    specs: [
      ["3", "NODES"],
      ["0", "OFFICES"],
      ["100%", "REMOTE"],
    ],
  },
};

/* lee un campo del distrito en el idioma activo */
const dx = (d, f) =>
  LANG === "en" && EN[d.id] && EN[d.id][f] !== undefined ? EN[d.id][f] : d[f];
/* lo mismo para una persona de la red */
const px2 = (d, i, f) =>
  LANG === "en" &&
  EN[d.id] &&
  EN[d.id].people &&
  EN[d.id].people[i][f] !== undefined
    ? EN[d.id].people[i][f]
    : d.people[i][f];

/* islas decorativas: [a, b, tamaño, semilla, tono] */
const SCENERY = [
  [6, 0, 4.5, 101, "stone"],
  [0, 6, 4, 102, "stone"],
  [-6, 0, 4, 103, "stone"],
  [0, -6, 4.5, 104, "stone"],
  [4.8, 3.8, 3.6, 105, "stone"],
  [-2.5, -4.5, 3.6, 106, "stone"],
  [6.6, -3.4, 3.4, 107, "stone"],
  [-3.4, 6.6, 3.4, 108, "stone"],
  [3.2, -4.6, 3, 109, "stone"],
  [-4.6, 3.2, 3, 110, "stone"],
];

/* conexiones entre islas, por índice de la lista completa (distritos 0-3, paisaje 4-13) */
const LINKS = [
  [0, 1],
  [1, 2],
  [1, 3],
  [0, 3],
  [2, 3],
  [0, 5],
  [0, 8],
  [0, 4],
  [2, 7],
  [2, 12],
  [2, 10],
  [3, 6],
  [3, 13],
  [3, 9],
  [1, 8],
  [1, 9],
  [4, 10],
  [5, 11],
  [7, 12],
  [6, 13],
];

const SHEETS = [
  {
    id: "fnd",
    name: "FUNDACIÓN",
    title: "Planta de fundaciones",
    hue: "orange",
    code: "S-101",
  },
  {
    id: "fra",
    name: "ESTRUCTURA",
    title: "Planta de entramado",
    hue: "blue",
    code: "S-201",
  },
  {
    id: "arq",
    name: "ARQUITECTURA",
    title: "Planta baja",
    hue: "ink",
    code: "A-101",
  },
  {
    id: "ele",
    name: "ELÉCTRICO",
    title: "Planta eléctrica",
    hue: "magenta",
    code: "E-101",
  },
];

export {
  PHOTOS,
  MAIL,
  BOOKING,
  DISTRICTS,
  LANG,
  setLanguage,
  u,
  dx,
  px2,
  SCENERY,
  LINKS,
  SHEETS,
};
