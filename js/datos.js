// Datos de la app.
// Se guardan siempre en el aparato (así anda sin conexión) y, si hay servidor configurado
// (js/config.js), se mandan a la planilla de Google para que todos vean lo mismo (js/sincro.js).
// Cada registro lleva fecha de cambio ("act") y quién lo cambió ("por"). Si se borra, queda
// marcado ("borrado") en vez de desaparecer, para que el borrado también llegue a los demás.
const COLECCIONES = ['insumos', 'plan', 'equipos', 'services', 'tareas', 'checklistItems', 'checklistHechos', 'config'];

const Datos = {
  estado: null,
  oyentes: [],

  // ---- Espacio: "real" o "prueba" (datos separados, elegido en cada celular) ----
  get espacio() { return localStorage.getItem('mp-espacio') || 'real'; },
  set espacio(v) { localStorage.setItem('mp-espacio', v); Datos.cargar(); },
  get clave() { return 'mp-fabrica-' + Datos.espacio; },

  // ---- Quién usa este celular ----
  get usuario() { return localStorage.getItem('mp-usuario') || ''; },
  set usuario(v) { localStorage.setItem('mp-usuario', v); },

  estadoVacio() {
    // pendientes: lo cargado acá que todavía no llegó al servidor
    // ultimoSrv: hasta cuándo ya tenemos lo del servidor (0 = nunca se conectó)
    const e = { version: 2, registros: {}, pendientes: {}, ultimoSrv: 0 };
    COLECCIONES.forEach((c) => (e.registros[c] = {}));
    return e;
  },

  cargar() {
    let guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(Datos.clave)); } catch (e) { /* dañado: arranca de cero */ }
    Datos.estado = { ...Datos.estadoVacio(), ...guardado };
    COLECCIONES.forEach((c) => (Datos.estado.registros[c] ||= {}));
    // Versión 1 guardaba los ajustes aparte; ahora son registros (así se comparten)
    if (guardado && guardado.version === 1) {
      Object.entries(guardado.config || {}).forEach(([id, valor]) =>
        (Datos.estado.registros.config[id] = { id, valor, act: Date.now() }));
      delete Datos.estado.config;
      Datos.estado.version = 2;
    }
    // Con servidor, los datos iniciales los trae la sincronización (no se cargan ejemplos en cada celular)
    if (!guardado && !Sincro.hayServidor()) Semilla.cargar(true);
  },

  // Guarda en el aparato, redibuja la pantalla y (si hubo cambios propios) avisa para enviar.
  guardar({ enviar = true } = {}) {
    try {
      localStorage.setItem(Datos.clave, JSON.stringify(Datos.estado));
    } catch (e) {
      alert('No hay más lugar en el celular para guardar. Borrá fotos de tareas viejas o descargá una copia.');
    }
    Datos.oyentes.forEach((fn) => fn());
    if (enviar) Sincro.pronto();
  },

  alCambiar(fn) { Datos.oyentes.push(fn); },

  // ---- Leer ----
  lista(col) {
    return Object.values(Datos.estado.registros[col]).filter((r) => !r.borrado);
  },
  obtener(col, id) {
    const r = Datos.estado.registros[col][id];
    return r && !r.borrado ? r : null;
  },
  config(nombre, porDefecto) {
    return Datos.obtener('config', nombre)?.valor ?? porDefecto;
  },
  cantidadPendientes() {
    return Object.values(Datos.estado.pendientes).reduce((n, ids) => n + Object.keys(ids).length, 0);
  },

  // ---- Escribir ----
  marcarPendiente(col, id) {
    (Datos.estado.pendientes[col] ||= {})[id] = true;
  },
  poner(col, reg, { silencioso = false } = {}) {
    const previo = reg.id ? Datos.obtener(col, reg.id) : null;
    const nuevo = {
      ...previo,
      ...reg,
      id: reg.id || U.id(),
      act: Date.now(),
      por: Datos.usuario,
    };
    delete nuevo.borrado;
    if (!previo) { nuevo.creado = U.hoy(); nuevo.creadoPor = Datos.usuario; }
    Datos.estado.registros[col][nuevo.id] = nuevo;
    Datos.marcarPendiente(col, nuevo.id);
    if (!silencioso) Datos.guardar();
    return nuevo;
  },
  borrar(col, id, { silencioso = false } = {}) {
    if (!Datos.estado.registros[col][id]) return;
    Datos.estado.registros[col][id] = { id, borrado: true, act: Date.now(), por: Datos.usuario };
    Datos.marcarPendiente(col, id);
    if (!silencioso) Datos.guardar();
  },
  ponerConfig(nombre, valor) {
    Datos.poner('config', { id: nombre, valor });
  },

  // ---- Copias ----
  descargarCopia() {
    const copia = { app: 'fabrica', espacio: Datos.espacio, fecha: U.hoy(), registros: Datos.estado.registros };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' }));
    a.download = `copia-fabrica-${Datos.espacio}-${U.hoy()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  // Recupera una copia: sus registros pasan a ser los más nuevos (y se envían a todos).
  restaurarCopia(texto) {
    const d = JSON.parse(texto);
    if (!d || !d.registros) throw new Error('El archivo no es una copia de esta app.');
    Object.entries(d.registros).forEach(([col, regs]) => {
      if (!COLECCIONES.includes(col)) return;
      Object.values(regs).forEach((r) => {
        Datos.estado.registros[col][r.id] = { ...r, act: Date.now() };
        Datos.marcarPendiente(col, r.id);
      });
    });
    Datos.guardar();
  },
  // Borra todo (para todos) y deja solo la lista de equipos y el checklist de cierre.
  empezarLimpio(conEjemplos) {
    COLECCIONES.filter((c) => c !== 'config').forEach((col) =>
      Datos.lista(col).forEach((r) => Datos.borrar(col, r.id, { silencioso: true })));
    Semilla.cargar(conEjemplos);
  },
};
