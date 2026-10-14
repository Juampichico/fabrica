// Stock de insumos en unidades, con + / − rápidos.
Pantallas.stock = {
  titulo: 'Stock',

  // Grupos del stock. El texto es lo que se guarda en cada insumo ("categoria").
  CATEGORIAS: [
    ['fermentos', '🧪 Fermentos y cuajo'],
    ['ingredientes', '🌿 Condimentos e ingredientes'],
    ['embalaje', '📦 Embalaje y varios'],
  ],

  dibujar() {
    const S = Pantallas.stock;
    const insumos = Datos.lista('insumos').sort((a, b) =>
      (Calc.bajoMinimo(b) - Calc.bajoMinimo(a)) || a.nombre.localeCompare(b.nombre));
    if (!insumos.length) return '<div class="vacio">Todavía no hay insumos. Tocá <b>+</b> para agregar.</div>';

    const conocidas = S.CATEGORIAS.map(([clave]) => clave);
    const grupos = [...S.CATEGORIAS, ['', '❔ Sin grupo']].map(([clave, nombre]) => {
      const delGrupo = insumos.filter((i) => (conocidas.includes(i.categoria) ? i.categoria : '') === clave);
      if (!delGrupo.length) return '';
      const bajos = delGrupo.filter(Calc.bajoMinimo).length;
      return `<div class="seccion">${nombre} <span class="cuenta">${delGrupo.length}</span>
          ${bajos ? `<span class="cuenta" style="background:var(--rojo);color:#fff">${bajos} para comprar</span>` : ''}</div>
        ${delGrupo.map(S.tarjeta).join('')}`;
    });
    return `
      <p class="ayuda">Usaste uno: <b>−</b>. Compraste: <b>+</b>. Si llega al mínimo, pasa solo a <b>Compras</b>.
        Tocá el nombre para editarlo.</p>
      ${grupos.join('')}`;
  },

  tarjeta(i) {
    const bajo = Calc.bajoMinimo(i);
    const det = [`mínimo ${i.minimo}`];
    if (i.proveedor) det.push(U.esc(i.proveedor));
    if (i.pedidoEl) det.push(`pedido el ${U.fechaCorta(i.pedidoEl)}`);
    return `
      <div class="tarjeta ${bajo ? 'bajo atrasado' : ''}">
        <div class="tarjeta-cuerpo tarjeta-tocable" data-accion="stock.editar" data-id="${i.id}">
          <div class="tarjeta-titulo">${U.esc(i.nombre)}</div>
          <div class="tarjeta-detalle">${U.esc(i.unidad || 'unidades')} · ${det.join(' · ')}</div>
          ${bajo ? '<div class="tarjeta-detalle rojo">Hay que comprar</div>' : ''}
        </div>
        <div class="contador">
          <button data-accion="stock.menos" data-id="${i.id}" aria-label="Restar uno">−</button>
          <span class="numero">${i.cantidad}</span>
          <button data-accion="stock.mas" data-id="${i.id}" aria-label="Sumar uno">+</button>
        </div>
      </div>`;
  },

  agregar() { Pantallas.stock.acciones.editar(); },

  acciones: {
    mas(id) {
      const i = Datos.obtener('insumos', id);
      Datos.poner('insumos', { id, cantidad: Number(i.cantidad) + 1 });
    },
    menos(id) {
      const i = Datos.obtener('insumos', id);
      if (Number(i.cantidad) <= 0) return U.avisar('Ya está en 0');
      const cantidad = Number(i.cantidad) - 1;
      Datos.poner('insumos', { id, cantidad });
      if (cantidad <= Number(i.minimo) && !Calc.bajoMinimo(i)) U.avisar(`${i.nombre}: pasó a la lista de compras`);
    },
    editar(id) {
      const i = id ? Datos.obtener('insumos', id) : {};
      Hoja.formulario({
        titulo: id ? i.nombre : 'Nuevo insumo',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre', valor: i.nombre, obligatorio: true, ejemplo: 'Ej: Rollos de aluminio' },
          { nombre: 'categoria', etiqueta: 'Grupo', tipo: 'opciones', valor: i.categoria || 'ingredientes',
            opciones: Pantallas.stock.CATEGORIAS },
          { nombre: 'cantidad', etiqueta: '¿Cuántos hay ahora?', tipo: 'numero', valor: i.cantidad ?? 0 },
          { nombre: 'minimo', etiqueta: 'Mínimo (si llega a esto, hay que comprar)', tipo: 'numero', valor: i.minimo ?? 1 },
          { nombre: 'unidad', etiqueta: 'Se cuenta en…', valor: i.unidad, ejemplo: 'Ej: sobres, bidones, rollos' },
          { nombre: 'pedir', etiqueta: '¿Cuántos se piden normalmente?', tipo: 'numero', valor: i.pedir, opcional: true },
          { nombre: 'proveedor', etiqueta: 'Proveedor', valor: i.proveedor, opcional: true },
          { nombre: 'telefono', etiqueta: 'Teléfono del proveedor (WhatsApp)', tipo: 'telefono', valor: i.telefono,
            opcional: true, ejemplo: '2297 123456', nota: 'Con característica, sin 0 ni 15.' },
          { nombre: 'demora', etiqueta: '¿Cuántos días tarda en llegar?', tipo: 'numero', valor: i.demora, opcional: true },
        ],
        alGuardar(v) {
          Datos.poner('insumos', { id, ...v, cantidad: v.cantidad || 0, minimo: v.minimo || 0 });
          U.avisar('Guardado');
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Borrar "${i.nombre}" del stock?`)) { Datos.borrar('insumos', id); U.avisar('Borrado'); }
        }),
      });
    },
  },
};
