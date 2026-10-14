// Pantalla principal: todo lo pendiente de un vistazo.
Pantallas.hoy = {
  titulo: 'Hoy',

  dibujar() {
    const pend = Calc.pendientesHoy();
    const insumos = pend.filter((x) => x.tipo === 'insumo');
    const resto = pend.filter((x) => x.tipo !== 'insumo');
    const grupo = (nivel) => resto.filter((x) => x.nivel === nivel);
    const atrasados = grupo('atrasado');
    const hoy = grupo('hoy');
    const pronto = grupo('pronto');
    const c = Calc.checklistHoy();
    const H = Pantallas.hoy;

    const urgentes = atrasados.length + hoy.length + insumos.length;
    const d = new Date();
    return `
      <div class="saludo">Hola, ${U.esc(Datos.usuario)} · ${U.DIAS[d.getDay()]} ${U.fecha(U.hoy())}</div>
      ${H.estado(atrasados.length, urgentes)}
      ${atrasados.length ? `<div class="seccion">⚠️ Atrasado <span class="cuenta">${atrasados.length}</span></div>${atrasados.map(H.tarjeta).join('')}` : ''}
      ${hoy.length ? `<div class="seccion">Para hoy <span class="cuenta">${hoy.length}</span></div>${hoy.map(H.tarjeta).join('')}` : ''}
      ${insumos.length ? H.resumenCompras(insumos.map((x) => x.dato)) : ''}
      ${pronto.length ? `<div class="seccion">Próximamente <span class="cuenta">${pronto.length}</span></div>${pronto.map(H.tarjeta).join('')}` : ''}
      <div class="seccion">Cierre del día</div>
      <a class="opcion" href="#checklist">
        <span class="icono">${c.completo ? '✅' : '🔒'}</span>
        <span><span class="tarjeta-titulo">${c.completo ? 'Cierre hecho' : 'Falta el cierre'}</span>
          <span class="tarjeta-detalle" style="display:block">${c.listos} de ${c.items.length} tildados${c.completo ? ' · ' + U.esc(Object.values(c.hechos).map((h) => h.por).filter((v, i, a) => a.indexOf(v) === i).join(', ')) : ''}</span></span>
        <span class="flecha">›</span>
      </a>`;
  },

  estado(atrasados, urgentes) {
    if (atrasados) return `<div class="estado-general mal"><div class="grande">${U.plural(atrasados, 'cosa atrasada', 'cosas atrasadas')}</div>
      <div class="chico">Empezá por las de arriba</div></div>`;
    if (urgentes) return `<div class="estado-general medio"><div class="grande">${U.plural(urgentes, 'cosa', 'cosas')} para hoy</div>
      <div class="chico">Nada atrasado, bien</div></div>`;
    return `<div class="estado-general bien"><div class="grande">Todo al día ✓</div>
      <div class="chico">No hay nada pendiente para hoy</div></div>`;
  },

  // Cada tipo de pendiente usa la tarjeta de su pantalla
  tarjeta(x) {
    if (x.tipo === 'tarea') return Pantallas.tareas.tarjeta(x.dato);
    if (x.tipo === 'service') return Pantallas.equipos.tarjeta(x.dato);
    if (x.tipo === 'plan') return Pantallas.compras.tarjetaPlan(x.dato);
    return '';
  },

  resumenCompras(insumos) {
    const nombres = insumos.map((i) => U.esc(i.nombre)).join(', ');
    return `<div class="seccion">🛒 Hay que comprar <span class="cuenta">${insumos.length}</span></div>
      <a class="opcion" href="#compras" style="border-left:6px solid var(--oxido)">
        <span><span class="tarjeta-titulo">${nombres}</span>
          <span class="tarjeta-detalle" style="display:block">Están en el mínimo o por debajo · tocá para ver la lista</span></span>
        <span class="flecha">›</span>
      </a>`;
  },
};
