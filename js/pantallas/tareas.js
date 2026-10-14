// Tareas: sueltas (arreglos, pendientes) y las que se repiten (limpiezas).
Pantallas.tareas = {
  titulo: 'Tareas',
  REPETIR: [['', 'No se repite'], [1, 'Todos los días'], [7, 'Cada semana'], [14, 'Cada 2 semanas'],
    [30, 'Cada mes'], [90, 'Cada 3 meses'], [180, 'Cada 6 meses']],

  dibujar() {
    const todas = Datos.lista('tareas');
    const sueltas = todas.filter((t) => t.tipo !== 'repite' && !t.hecha)
      .sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0) || (a.fecha || '9').localeCompare(b.fecha || '9'));
    const repiten = todas.filter((t) => t.tipo === 'repite').sort((a, b) => a.proxima.localeCompare(b.proxima));
    const hechas = todas.filter((t) => t.tipo !== 'repite' && t.hecha && U.diasEntre(t.hechaEl, U.hoy()) <= 7)
      .sort((a, b) => b.hechaEl.localeCompare(a.hechaEl));
    const T = Pantallas.tareas;

    return `
      <p class="ayuda">¿Viste algo roto o pendiente? Tocá <b>+</b> y anotalo en segundos.</p>
      <div class="seccion">Pendientes <span class="cuenta">${sueltas.length}</span></div>
      ${sueltas.map(T.tarjeta).join('') || '<div class="vacio">No hay arreglos ni pendientes anotados 👌</div>'}
      <div class="seccion">Se repiten <span class="cuenta">${repiten.length}</span></div>
      ${repiten.map(T.tarjeta).join('') || '<div class="vacio">No hay tareas que se repitan</div>'}
      ${hechas.length ? `<div class="seccion">Hechas esta semana</div>${hechas.map(T.tarjeta).join('')}` : ''}`;
  },

  // Tarjeta de una tarea (se usa también en Hoy)
  tarjeta(t) {
    const nivel = t.hecha ? 'ok' : Calc.nivelTarea(t);
    const det = [];
    if (t.tipo === 'repite') {
      det.push(U.frecuencia(t.cadaDias));
      if (nivel === 'atrasado') det.push(`<span class="rojo">tocaba el ${U.fechaCorta(t.proxima)} (${U.cuando(t.proxima)})</span>`);
      else if (nivel === 'hoy') det.push('toca hoy');
      else det.push(`próxima: ${U.fechaCorta(t.proxima)}`);
      if (t.ultima) det.push(`última: ${U.fechaCorta(t.ultima)}, ${U.esc(t.ultimaPor)}`);
    } else if (t.hecha) {
      det.push(`✓ hecha por ${U.esc(t.hechaPor)}, ${U.fechaCorta(t.hechaEl)}`);
    } else {
      if (t.fecha) det.push(`${nivel === 'atrasado' ? '<span class="rojo">' : ''}para el ${U.fechaCorta(t.fecha)} (${U.cuando(t.fecha)})${nivel === 'atrasado' ? '</span>' : ''}`);
      if (t.asignado) det.push(`le toca a ${U.esc(t.asignado)}`);
      if (t.creadoPor) det.push(`anotó ${U.esc(t.creadoPor)}, ${U.fechaCorta(t.creado)}`);
    }
    const pendiente = !t.hecha && (t.tipo !== 'repite' || Calc.nivel(t.proxima, 0));
    return `
      <div class="tarjeta ${nivel || ''}">
        ${t.foto ? `<img class="miniatura" src="${t.foto}" alt="">` : ''}
        <div class="tarjeta-cuerpo tarjeta-tocable" data-accion="tareas.editar" data-id="${t.id}">
          <div class="tarjeta-titulo">${t.urgente && !t.hecha ? '<span class="etiqueta urgente">URGENTE</span>' : ''}${U.esc(t.texto)}</div>
          <div class="tarjeta-detalle">${det.join(' · ')}</div>
        </div>
        ${pendiente ? `<button class="btn btn-hecho" data-accion="tareas.hecha" data-id="${t.id}">✓ Hecho</button>` : ''}
        ${t.hecha ? `<button class="btn btn-chico" data-accion="tareas.deshacer" data-id="${t.id}">Deshacer</button>` : ''}
      </div>`;
  },

  agregar() { Pantallas.tareas.acciones.editar(); },

  acciones: {
    hecha(id) {
      const t = Datos.obtener('tareas', id);
      if (t.tipo === 'repite') {
        Datos.poner('tareas', { id, ultima: U.hoy(), ultimaPor: Datos.usuario, proxima: U.sumarDias(U.hoy(), t.cadaDias) });
        U.avisar(`Hecho ✓ · vuelve ${U.cuando(U.sumarDias(U.hoy(), t.cadaDias))}`);
      } else {
        Datos.poner('tareas', { id, hecha: true, hechaPor: Datos.usuario, hechaEl: U.hoy() });
        U.avisar('Hecho ✓');
      }
    },
    deshacer(id) {
      Datos.poner('tareas', { id, hecha: false, hechaPor: '', hechaEl: '' });
      U.avisar('Volvió a pendientes');
    },
    editar(id) {
      const t = id ? Datos.obtener('tareas', id) : {};
      const repite = t.tipo === 'repite';
      Hoja.formulario({
        titulo: id ? 'Editar tarea' : 'Nueva tarea',
        campos: [
          { nombre: 'texto', etiqueta: '¿Qué hay que hacer?', valor: t.texto, obligatorio: true, ejemplo: 'Ej: arreglar el cable de la bomba' },
          { nombre: 'urgente', etiqueta: 'Es urgente', tipo: 'si-no', valor: t.urgente },
          { nombre: 'foto', etiqueta: 'Foto', tipo: 'foto', valor: t.foto, opcional: true },
          { nombre: 'fecha', etiqueta: repite ? 'Próxima vez' : 'Fecha límite', tipo: 'fecha', valor: repite ? t.proxima : t.fecha, opcional: true },
          { nombre: 'asignado', etiqueta: '¿A quién le toca?', tipo: 'opciones', valor: t.asignado,
            opciones: [['', 'A cualquiera'], ...Personas()], opcional: true },
          { nombre: 'cadaDias', etiqueta: '¿Se repite?', tipo: 'opciones', valor: t.cadaDias || '',
            opciones: Pantallas.tareas.REPETIR, opcional: true, nota: 'Si se repite, al marcarla hecha se reprograma sola.' },
        ],
        alGuardar(v) {
          const reg = { id, texto: v.texto, urgente: v.urgente, foto: v.foto, asignado: v.asignado };
          if (v.cadaDias) {
            Object.assign(reg, { tipo: 'repite', cadaDias: Number(v.cadaDias), proxima: v.fecha || U.hoy(), fecha: '' });
          } else {
            Object.assign(reg, { tipo: 'suelta', fecha: v.fecha, cadaDias: '' });
            if (!id) reg.hecha = false;
          }
          Datos.poner('tareas', reg);
          U.avisar(id ? 'Guardado' : 'Tarea anotada ✓');
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Borrar "${t.texto}"?`)) { Datos.borrar('tareas', id); U.avisar('Borrada'); }
        }),
      });
    },
  },
};
