// Equipos y services: cada cuánto lleva service, cuándo fue el último e historial.
Pantallas.equipos = {
  titulo: 'Equipos y services',
  menu: 'mas',
  volver: 'mas',

  dibujar() {
    const todos = Datos.lista('equipos').map((eq) => {
      const proximo = Calc.proximoService(eq);
      return { equipo: eq, proximo, nivel: Calc.nivel(proximo, AVISO_SERVICE_DIAS) };
    }).sort((a, b) => (a.proximo || '9').localeCompare(b.proximo || '9') || a.equipo.nombre.localeCompare(b.equipo.nombre));
    const toca = todos.filter((s) => s.nivel);
    const alDia = todos.filter((s) => s.proximo && !s.nivel);
    const sinDato = todos.filter((s) => !s.proximo);
    const E = Pantallas.equipos;
    return `
      ${toca.length ? `<div class="seccion">Toca service <span class="cuenta">${toca.length}</span></div>${toca.map(E.tarjeta).join('')}` : ''}
      ${alDia.length ? `<div class="seccion">Al día <span class="cuenta">${alDia.length}</span></div>${alDia.map(E.tarjeta).join('')}` : ''}
      ${sinDato.length ? `<div class="seccion">Falta saber el último service <span class="cuenta">${sinDato.length}</span></div>
        <p class="ayuda">Tocá cada equipo y cargá cuándo fue el último service, así la app sabe cuándo avisar.</p>
        ${sinDato.map(E.tarjeta).join('')}` : ''}
      ${todos.length ? '' : '<div class="vacio">No hay equipos cargados. Tocá <b>+</b>.</div>'}`;
  },

  // Tarjeta de un equipo (se usa también en Hoy). s = { equipo, proximo, nivel }
  tarjeta(s) {
    const eq = s.equipo;
    const det = [U.frecuencia(eq.cadaDias)];
    if (eq.ultimo) det.push(`último: ${U.fecha(eq.ultimo)}`);
    let aviso = '';
    if (s.nivel === 'atrasado') aviso = `<div class="tarjeta-detalle rojo">Vencido desde el ${U.fecha(s.proximo)} (${U.cuando(s.proximo)})</div>`;
    else if (s.nivel) aviso = `<div class="tarjeta-detalle ambar">Toca el ${U.fecha(s.proximo)} (${U.cuando(s.proximo)})</div>`;
    else if (s.proximo) det.push(`próximo: ${U.fecha(s.proximo)}`);
    return `
      <div class="tarjeta ${s.nivel || (s.proximo ? 'ok' : '')}">
        <div class="tarjeta-cuerpo tarjeta-tocable" data-accion="equipos.abrir" data-id="${eq.id}">
          <div class="tarjeta-titulo">🔧 ${U.esc(eq.nombre)}</div>
          <div class="tarjeta-detalle">${det.join(' · ')}</div>
          ${aviso}
        </div>
        ${s.nivel ? `<button class="btn btn-hecho" data-accion="equipos.service" data-id="${eq.id}">✓ Hecho</button>` : ''}
      </div>`;
  },

  agregar() { Pantallas.equipos.acciones.editar(); },

  acciones: {
    abrir(id) { location.hash = 'equipo/' + id; },
    editar(id) {
      const eq = id ? Datos.obtener('equipos', id) : {};
      Hoja.formulario({
        titulo: id ? eq.nombre : 'Nuevo equipo',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre del equipo', valor: eq.nombre, obligatorio: true, ejemplo: 'Ej: Compresor' },
          { nombre: 'cadaDias', etiqueta: '¿Cada cuánto lleva service?', tipo: 'opciones', valor: eq.cadaDias || 180,
            opciones: [[30, 'Cada mes'], [60, 'Cada 2 meses'], [90, 'Cada 3 meses'], [120, 'Cada 4 meses'],
              [180, 'Cada 6 meses'], [365, 'Cada año'], [730, 'Cada 2 años']] },
          { nombre: 'ultimo', etiqueta: '¿Cuándo fue el último service?', tipo: 'fecha', valor: eq.ultimo,
            nota: 'Si no sabés, dejalo vacío.' },
        ],
        alGuardar(v) {
          Datos.poner('equipos', { id, ...v, cadaDias: Number(v.cadaDias) });
          U.avisar('Guardado');
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Borrar el equipo "${eq.nombre}"?`)) {
            Datos.borrar('equipos', id);
            location.hash = 'equipos';
          }
        }),
      });
    },
    // Registrar un service hecho
    service(id) {
      const eq = Datos.obtener('equipos', id);
      Hoja.formulario({
        titulo: `Service: ${eq.nombre}`,
        textoGuardar: 'Registrar service',
        campos: [
          { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', valor: U.hoy(), obligatorio: true },
          { nombre: 'que', etiqueta: '¿Qué se hizo?', tipo: 'largo', ejemplo: 'Ej: cambio de aceite y filtro' },
          { nombre: 'quien', etiqueta: '¿Quién lo hizo?', valor: '', opcional: true, ejemplo: 'Ej: técnico Pérez' },
          { nombre: 'costo', etiqueta: '¿Cuánto costó? ($)', tipo: 'numero', opcional: true },
        ],
        alGuardar(v) {
          Datos.poner('services', { equipo: id, ...v }, { silencioso: true });
          Datos.poner('equipos', { id, ultimo: !eq.ultimo || v.fecha > eq.ultimo ? v.fecha : eq.ultimo });
          U.avisar(`Service registrado ✓ · el próximo: ${U.fecha(U.sumarDias(v.fecha, eq.cadaDias))}`);
        },
      });
    },
  },
};

// Detalle de un equipo con su historial de services
Pantallas.equipo = {
  titulo: (id) => Datos.obtener('equipos', id)?.nombre || 'Equipo',
  menu: 'mas',
  volver: 'equipos',

  dibujar(id) {
    const eq = Datos.obtener('equipos', id);
    if (!eq) return '<div class="vacio">Este equipo fue borrado.</div>';
    const proximo = Calc.proximoService(eq);
    const historial = Datos.lista('services').filter((s) => s.equipo === id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const total = historial.reduce((s, h) => s + (Number(h.costo) || 0), 0);
    return `
      ${Pantallas.equipos.tarjeta({ equipo: eq, proximo, nivel: Calc.nivel(proximo, AVISO_SERVICE_DIAS) })}
      <div class="fila-botones">
        <button class="btn" data-accion="equipos.editar" data-id="${id}">✏️ Editar</button>
        <button class="btn btn-principal" data-accion="equipos.service" data-id="${id}">+ Registrar service</button>
      </div>
      <div class="seccion">Historial <span class="cuenta">${historial.length}</span></div>
      ${historial.length ? `<div class="tarjeta"><div class="tarjeta-cuerpo">
        ${historial.map((h) => `
          <div class="historial-item tarjeta-tocable" data-accion="equipo.borrarService" data-id="${h.id}">
            <b>${U.fecha(h.fecha)}</b>${h.costo ? ` · $${Number(h.costo).toLocaleString('es-AR')}` : ''}
            <div>${U.esc(h.que || 'Service')}</div>
            <div class="tarjeta-detalle">${h.quien ? 'Lo hizo ' + U.esc(h.quien) + ' · ' : ''}cargó ${U.esc(h.creadoPor)}</div>
          </div>`).join('')}
        ${total ? `<div class="historial-item"><b>Gastado en total: $${total.toLocaleString('es-AR')}</b></div>` : ''}
      </div></div>` : '<div class="vacio">Todavía no hay services registrados</div>'}`;
  },

  acciones: {
    async borrarService(id) {
      const s = Datos.obtener('services', id);
      if (await Hoja.confirmar(`¿Borrar el service del ${U.fecha(s.fecha)}?`)) Datos.borrar('services', id);
    },
  },
};
