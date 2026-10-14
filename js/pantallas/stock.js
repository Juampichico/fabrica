// Stock de insumos en unidades, con + / − rápidos, separados en apartados.
Pantallas.stock = {
  titulo: 'Stock',

  // Apartados con los que arranca la app. Después se agregan, renombran o borran desde Stock
  // y se guardan compartidos (config "apartados"). Cada insumo guarda la clave en "categoria".
  APARTADOS_INICIALES: [
    ['fermentos', '🧪 Fermentos y cuajo'],
    ['ingredientes', '🌿 Condimentos e ingredientes'],
    ['embalaje', '📦 Embalaje y varios'],
  ],
  apartados() { return Datos.config('apartados', Pantallas.stock.APARTADOS_INICIALES); },

  dibujar() {
    const S = Pantallas.stock;
    const insumos = Datos.lista('insumos').sort((a, b) =>
      (Calc.bajoMinimo(b) - Calc.bajoMinimo(a)) || a.nombre.localeCompare(b.nombre));
    const apartados = S.apartados();
    const claves = apartados.map(([clave]) => clave);

    const secciones = [...apartados, ['', '❔ Sin apartado']].map(([clave, nombre]) => {
      const delApartado = insumos.filter((i) => (claves.includes(i.categoria) ? i.categoria : '') === clave);
      if (!clave && !delApartado.length) return '';
      const bajos = delApartado.filter(Calc.bajoMinimo).length;
      return `<div class="seccion ${clave ? 'tarjeta-tocable' : ''}" ${clave ? `data-accion="stock.editarApartado" data-id="${clave}"` : ''}>
          ${U.esc(nombre)} <span class="cuenta">${delApartado.length}</span>
          ${bajos ? `<span class="cuenta" style="background:var(--rojo);color:#fff">${bajos} para comprar</span>` : ''}
          ${clave ? '<span style="margin-left:auto">✏️</span>' : ''}</div>
        ${delApartado.map(S.tarjeta).join('') ||
          `<div class="vacio tarjeta-tocable" data-accion="stock.nuevoEn" data-id="${clave}">Vacío · tocá para agregar algo acá</div>`}`;
    });
    return `
      <p class="ayuda">Usaste uno: <b>−</b>. Compraste: <b>+</b>. Si llega al mínimo, pasa solo a <b>Compras</b>.
        Tocá el nombre para editarlo; tocá ✏️ para cambiar un apartado.</p>
      ${secciones.join('')}
      <button class="btn btn-ancho" data-accion="stock.editarApartado">+ Nuevo apartado</button>`;
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
    nuevoEn(apartado) { Pantallas.stock.acciones.editar(null, null, apartado); },
    editar(id, _el, apartado) {
      const i = id ? Datos.obtener('insumos', id) : { categoria: apartado };
      const apartados = Pantallas.stock.apartados();
      Hoja.formulario({
        titulo: id ? i.nombre : 'Nuevo insumo',
        campos: [
          { nombre: 'nombre', etiqueta: 'Nombre', valor: i.nombre, obligatorio: true, ejemplo: 'Ej: Rollos de aluminio' },
          { nombre: 'categoria', etiqueta: 'Apartado', tipo: 'opciones', valor: i.categoria || apartados[0]?.[0],
            opciones: [...apartados, ['', 'Sin apartado']] },
          { nombre: 'cantidad', etiqueta: '¿Cuántos hay ahora?', tipo: 'numero', valor: i.cantidad ?? 0 },
          { nombre: 'minimo', etiqueta: 'Mínimo (si llega a esto, hay que comprar)', tipo: 'numero', valor: i.minimo ?? 1 },
          { nombre: 'unidad', etiqueta: 'Se cuenta en…', valor: i.unidad, ejemplo: 'Ej: sobres, bidones, rollos' },
          { nombre: 'proveedor', etiqueta: 'Proveedor', valor: i.proveedor, sugerencias: Calc.proveedores().map((p) => p.nombre),
            nota: 'Si ya existe, elegilo de la lista: así toma su teléfono solo.' },
          { nombre: 'pedir', etiqueta: '¿Cuántos se piden normalmente?', tipo: 'numero', valor: i.pedir, opcional: true },
          { nombre: 'telefono', etiqueta: 'Teléfono del proveedor (WhatsApp)', tipo: 'telefono', valor: i.telefono,
            opcional: true, ejemplo: '2297 123456', nota: 'Con característica, sin 0 ni 15. Se carga una vez por proveedor.' },
          { nombre: 'demora', etiqueta: '¿Cuántos días tarda en llegar?', tipo: 'numero', valor: i.demora, opcional: true },
        ],
        alGuardar(v) {
          if (v.demora < 0 || v.demora > 365) { U.avisar('Los días que tarda tienen que ser entre 0 y 365'); return false; }
          // Mismo proveedor = mismo teléfono para todos sus insumos
          const otro = Calc.proveedores().find((p) => Calc.mismoProveedor(p.nombre, v.proveedor));
          if (v.proveedor && !v.telefono && otro) v.telefono = otro.telefono;
          Datos.poner('insumos', { id, ...v, cantidad: v.cantidad || 0, minimo: v.minimo || 0 }, { silencioso: true });
          if (v.proveedor && v.telefono) {
            Datos.lista('insumos')
              .filter((x) => Calc.mismoProveedor(x.proveedor, v.proveedor) && x.telefono !== v.telefono)
              .forEach((x) => Datos.poner('insumos', { id: x.id, telefono: v.telefono }, { silencioso: true }));
          }
          Datos.guardar();
          U.avisar('Guardado');
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Borrar "${i.nombre}" del stock?`)) { Datos.borrar('insumos', id); U.avisar('Borrado'); }
        }),
      });
    },
    // Crear (sin clave) o renombrar/borrar un apartado
    editarApartado(clave) {
      const apartados = Pantallas.stock.apartados();
      const actual = apartados.find(([c]) => c === clave);
      Hoja.formulario({
        titulo: actual ? 'Cambiar apartado' : 'Nuevo apartado',
        campos: [{ nombre: 'nombre', etiqueta: 'Nombre del apartado', valor: actual?.[1], obligatorio: true,
          ejemplo: 'Ej: Agrilac, Limpieza, Quesos' }],
        alGuardar(v) {
          const nuevos = actual
            ? apartados.map(([c, n]) => [c, c === clave ? v.nombre : n])
            : [...apartados, [U.id(), v.nombre]];
          Datos.ponerConfig('apartados', nuevos);
          U.avisar(actual ? 'Apartado cambiado' : `Apartado "${v.nombre}" creado`);
        },
        alBorrar: actual && (async () => {
          const cuantos = Datos.lista('insumos').filter((i) => i.categoria === clave).length;
          const aviso = cuantos ? ` Sus ${cuantos} insumos pasan a "Sin apartado".` : '';
          if (!(await Hoja.confirmar(`¿Borrar el apartado "${actual[1]}"?${aviso}`))) return;
          Datos.ponerConfig('apartados', apartados.filter(([c]) => c !== clave));
          U.avisar('Apartado borrado');
        }),
      });
    },
  },
};
