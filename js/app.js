// Arranque y navegación entre pantallas.
//
// Cada pantalla (js/pantallas/*.js) se registra en "Pantallas" con:
//   titulo, menu (qué botón de abajo se ilumina), volver (ruta del botón ‹),
//   dibujar(param) → HTML, agregar() → qué hace el botón "+", acciones { ... }
// Los botones usan data-accion="pantalla.accion" y data-id, y acá se reparten.
const App = {
  ruta: 'hoy',
  param: '',

  iniciar() {
    Datos.cargar();
    Datos.alCambiar(() => App.mostrar());
    Sincro.iniciar();
    window.addEventListener('hashchange', App.leerRuta);
    window.addEventListener('online', App.mostrarConexion);
    window.addEventListener('offline', App.mostrarConexion);
    document.getElementById('btn-volver').onclick = () => (location.hash = Pantallas[App.ruta].volver);
    document.getElementById('btn-agregar').onclick = () => Pantallas[App.ruta].agregar();
    document.addEventListener('click', App.repartirClick);
    App.leerRuta();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  leerRuta() {
    const [ruta, param] = (location.hash.slice(1) || 'hoy').split('/');
    App.ruta = Pantallas[ruta] ? ruta : 'hoy';
    App.param = param ? decodeURIComponent(param) : '';
    window.scrollTo(0, 0);
    App.mostrar();
  },

  mostrar() {
    const main = document.getElementById('contenido');
    const menu = document.getElementById('menu');
    document.getElementById('banda-prueba').hidden = Datos.espacio !== 'prueba';
    App.mostrarConexion();

    // Primera vez en este celular: código del equipo (si hay servidor) y después el nombre
    const sinCodigo = Sincro.hayServidor() && !Sincro.codigo;
    if (sinCodigo || !Datos.usuario) {
      document.getElementById('titulo').textContent = 'Bienvenido';
      document.getElementById('btn-volver').hidden = true;
      document.getElementById('btn-agregar').hidden = true;
      menu.hidden = true;
      if (sinCodigo && document.getElementById('codigo-equipo')) return; // no borrar lo que está escribiendo
      main.innerHTML = sinCodigo ? Pantallas.mas.pedirCodigoHTML() : Pantallas.mas.elegirNombreHTML();
      return;
    }
    menu.hidden = false;

    const p = Pantallas[App.ruta];
    document.getElementById('titulo').textContent = typeof p.titulo === 'function' ? p.titulo(App.param) : p.titulo;
    document.getElementById('btn-volver').hidden = !p.volver;
    document.getElementById('btn-agregar').hidden = !p.agregar;
    main.innerHTML = p.dibujar(App.param);

    menu.querySelectorAll('a').forEach((a) =>
      a.classList.toggle('activo', a.dataset.ruta === (p.menu || App.ruta)));
    App.actualizarGlobos();
  },

  actualizarGlobos() {
    const pend = Calc.pendientesHoy();
    const urgentes = pend.filter((x) => x.nivel === 'atrasado' || x.nivel === 'hoy').length;
    const poner = (k, n) => (document.querySelector(`[data-globo="${k}"]`).textContent = n > 0 ? n : '');
    poner('hoy', urgentes);
    poner('tareas', Calc.tareasPendientes().length);
    poner('compras', Calc.compras().total);
    poner('mas', Calc.services().filter((s) => s.nivel !== 'pronto').length);
  },

  mostrarConexion() {
    const el = document.getElementById('estado-conexion');
    const { texto, mal } = Sincro.textoEstado();
    el.textContent = texto;
    el.classList.toggle('mal', mal);
    el.hidden = !texto;
    const banda = document.getElementById('banda-conexion');
    banda.hidden = !mal || !Datos.usuario;
    banda.textContent = 'Sin conexión: ves lo último que se cargó. Lo que anotes se manda solo cuando vuelva.';
  },

  repartirClick(ev) {
    const el = ev.target.closest('[data-accion]');
    if (!el) return;
    const [pantalla, accion] = el.dataset.accion.split('.');
    const fn = Pantallas[pantalla]?.acciones?.[accion];
    if (fn) { ev.preventDefault(); fn(el.dataset.id, el); }
  },
};

document.addEventListener('DOMContentLoaded', App.iniciar);
