// Checklist de cierre del día: se tilda antes de irse y se reinicia cada día.
Pantallas.checklist = {
  titulo: 'Cierre del día',
  menu: 'mas',
  volver: 'mas',

  dibujar() {
    const c = Calc.checklistHoy();
    const ultimo = Object.values(c.hechos).sort((a, b) => b.hora.localeCompare(a.hora))[0];
    return `
      ${c.completo
        ? `<div class="estado-general bien"><div class="grande">Cierre completo ✓</div>
            <div class="chico">Último tilde: ${U.esc(ultimo.por)} a las ${ultimo.hora}</div></div>`
        : `<p class="ayuda">Antes de irte, tildá cada cosa. Se reinicia todos los días.
            Para cambiar un ítem tocá ✏️; para agregar, <b>+</b>.</p>`}
      <div class="seccion">Hoy ${U.fecha(U.hoy())} <span class="cuenta">${c.listos}/${c.items.length}</span></div>
      ${c.items.map((i) => {
        const h = c.hechos[i.id];
        return `<div style="display:flex;gap:8px;align-items:stretch">
          <button class="check ${h ? 'hecho' : ''}" data-accion="checklist.tildar" data-id="${i.id}">
            <span class="caja">${h ? '✓' : ''}</span>
            <span><span class="tarjeta-titulo">${U.esc(i.texto)}</span>
            ${h ? `<span class="tarjeta-detalle" style="display:block">${U.esc(h.por)} · ${h.hora}</span>` : ''}</span>
          </button>
          <button class="btn" style="margin-bottom:10px" data-accion="checklist.editar" data-id="${i.id}" aria-label="Editar">✏️</button>
        </div>`;
      }).join('') || '<div class="vacio">No hay ítems. Tocá <b>+</b> para agregar.</div>'}`;
  },

  agregar() { Pantallas.checklist.acciones.editar(); },

  acciones: {
    tildar(itemId) {
      const id = U.hoy() + '_' + itemId;
      if (Datos.obtener('checklistHechos', id)) Datos.borrar('checklistHechos', id);
      else Datos.poner('checklistHechos', { id, fecha: U.hoy(), item: itemId, hora: U.hora() });
      const c = Calc.checklistHoy();
      if (c.completo) U.avisar('Cierre completo ✓ ¡Buen trabajo!');
    },
    editar(id) {
      const i = id ? Datos.obtener('checklistItems', id) : {};
      Hoja.formulario({
        titulo: id ? 'Editar ítem' : 'Nuevo ítem del cierre',
        campos: [{ nombre: 'texto', etiqueta: '¿Qué hay que revisar?', valor: i.texto, obligatorio: true, ejemplo: 'Ej: Gas cortado' }],
        alGuardar(v) {
          Datos.poner('checklistItems', { id, texto: v.texto, orden: i.orden ?? Datos.lista('checklistItems').length });
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Sacar "${i.texto}" del cierre?`)) Datos.borrar('checklistItems', id);
        }),
      });
    },
  },
};
