// Sincronización con la planilla de Google (ver servidor/Codigo.gs).
//
// Cada vez: manda lo que se cargó en este aparato y trae lo que cargaron los demás desde
// la última vez. Si dos tocaron lo mismo, queda el cambio más nuevo.
// Sin conexión: la app sigue andando con lo último que vio y manda todo cuando vuelve.
const Sincro = {
  estado: 'local', // local | conectando | ok | sinconexion | codigo
  ultimaVez: 0,    // hora de la última sincronización buena (para mostrar)
  ocupado: false,
  repetir: false,

  hayServidor() { return !!CONFIG.servidor; },
  get codigo() { return localStorage.getItem('mp-codigo') || ''; },
  set codigo(v) { localStorage.setItem('mp-codigo', v); },

  iniciar() {
    if (!Sincro.hayServidor()) return;
    Sincro.estado = 'conectando';
    setInterval(() => { if (!document.hidden) Sincro.ya(); }, CONFIG.cadaCuantoActualizar * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) Sincro.ya(); });
    window.addEventListener('online', () => Sincro.ya());
    Sincro.ya();
  },

  // Después de cargar algo: espera un toque (por si se tocan varios + seguidos) y envía.
  pronto() {
    if (!Sincro.hayServidor()) return;
    clearTimeout(Sincro._t);
    Sincro._t = setTimeout(Sincro.ya, 1200);
  },

  async ya() {
    if (!Sincro.hayServidor() || !Sincro.codigo) return;
    if (Sincro.ocupado) { Sincro.repetir = true; return; }
    Sincro.ocupado = true;
    const est = Datos.estado;
    const primeraVez = !est.ultimoSrv;
    const cambios = primeraVez ? [] : Object.entries(est.pendientes).flatMap(([col, ids]) =>
      Object.keys(ids).filter((id) => est.registros[col][id]).map((id) => ({ col, id, reg: est.registros[col][id] })));

    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), 15000); // con wifi malo, no esperar para siempre
    try {
      const r = await fetch(CONFIG.servidor, {
        method: 'POST',
        signal: corte.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita un paso extra que Google no acepta
        body: JSON.stringify({ codigo: Sincro.codigo, espacio: Datos.espacio, desde: est.ultimoSrv, cambios }),
      });
      const resp = await r.json();
      if (!resp.ok) {
        Sincro.estado = resp.error === 'codigo' ? 'codigo' : 'sinconexion';
        if (resp.error === 'codigo') Sincro.codigo = '';
        return;
      }
      if (Datos.estado !== est) return; // cambió de modo prueba/real mientras tanto
      if (primeraVez) Sincro.primeraConexion(resp);
      else Sincro.mezclar(resp, cambios);
      Sincro.estado = 'ok';
      Sincro.ultimaVez = Date.now();
    } catch (e) {
      Sincro.estado = 'sinconexion';
    } finally {
      clearTimeout(reloj);
      Sincro.ocupado = false;
      App.mostrarConexion();
      if (Sincro.estado === 'codigo') App.mostrar();
      if (Sincro.repetir || (Sincro.estado === 'ok' && Datos.cantidadPendientes() && primeraVez)) {
        Sincro.repetir = false;
        Sincro.ya();
      }
    }
  },

  // Primera vez que este aparato se conecta:
  //  - si la planilla ya tiene datos, se usan esos (lo de este aparato se descarta);
  //  - si la planilla está vacía, este aparato la llena (con lo que tenga, o con los ejemplos).
  primeraConexion(resp) {
    const est = Datos.estado;
    if (resp.registros.length) {
      COLECCIONES.forEach((c) => (est.registros[c] = {}));
      resp.registros.forEach(({ col, reg }) => { if (est.registros[col]) est.registros[col][reg.id] = reg; });
      est.pendientes = {};
    } else {
      const hayAlgo = COLECCIONES.some((c) => Object.keys(est.registros[c]).length);
      if (hayAlgo) COLECCIONES.forEach((c) => Object.keys(est.registros[c]).forEach((id) => Datos.marcarPendiente(c, id)));
      else Semilla.cargar(true);
    }
    est.ultimoSrv = resp.ahora;
    Datos.guardar({ enviar: false });
  },

  mezclar(resp, enviados) {
    const est = Datos.estado;
    const traidos = new Set();
    resp.registros.forEach(({ col, reg }) => {
      if (!est.registros[col]) return;
      const local = est.registros[col][reg.id];
      const pendienteLocal = est.pendientes[col]?.[reg.id];
      if (pendienteLocal && local && local.act > reg.act) return; // lo de acá es más nuevo
      if (local && local.act === reg.act && !local.borrado === !reg.borrado) return; // ya lo teníamos
      est.registros[col][reg.id] = reg;
      traidos.add(col + '|' + reg.id);
    });
    // Lo enviado ya llegó: deja de estar pendiente (salvo que se haya vuelto a tocar mientras tanto)
    enviados.forEach(({ col, id, reg }) => {
      if (est.registros[col][id]?.act === reg.act || traidos.has(col + '|' + id)) delete est.pendientes[col]?.[id];
    });
    est.ultimoSrv = resp.ahora;
    if (traidos.size) Datos.guardar({ enviar: false });
    else localStorage.setItem(Datos.clave, JSON.stringify(est));
  },

  // Texto corto para la cabecera
  textoEstado() {
    const pend = Datos.cantidadPendientes();
    if (!Sincro.hayServidor()) return { texto: Datos.usuario, mal: false };
    if (!Sincro.codigo) return { texto: '', mal: false };
    if (!navigator.onLine || Sincro.estado === 'sinconexion') {
      return { texto: pend ? `Sin conexión · ${pend} sin enviar` : 'Sin conexión', mal: true };
    }
    if (Sincro.estado === 'conectando') return { texto: 'Conectando…', mal: false };
    return { texto: (pend ? '↻ ' : '✓ ') + Datos.usuario, mal: false };
  },
};
