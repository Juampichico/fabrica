// Lista de compras: insumos bajo el mínimo + lo que pide el plan de quesos con anticipación.
Pantallas.compras = {
  titulo: 'Compras',

  dibujar() {
    const c = Calc.compras();
    const C = Pantallas.compras;
    const hayAlgo = c.total + c.enCamino.length > 0;
    return `
      ${c.plan.length ? `<div class="seccion">Para el plan de quesos <span class="cuenta">${c.plan.length}</span></div>
        ${c.plan.map(C.tarjetaPlan).join('')}` : ''}
      ${C.porProveedor(c.faltan).map(C.bloqueProveedor).join('')}
      ${c.enCamino.length ? `<div class="seccion">Pedidos, falta que lleguen <span class="cuenta">${c.enCamino.length}</span></div>
        ${c.enCamino.map(C.tarjetaInsumo).join('')}` : ''}
      ${hayAlgo ? '' : '<div class="vacio">✓ No hay nada para comprar</div>'}`;
  },

  // Agrupa lo que falta por proveedor; lo que no tiene proveedor va al final.
  porProveedor(insumos) {
    const grupos = [];
    insumos.forEach((i) => {
      const nombre = i.proveedor?.trim() || '';
      let g = grupos.find((x) => (nombre ? Calc.mismoProveedor(x.nombre, nombre) : !x.nombre));
      if (!g) grupos.push((g = { nombre, insumos: [] }));
      g.insumos.push(i);
    });
    grupos.forEach((g) => (g.telefono = Calc.proveedores().find((p) => Calc.mismoProveedor(p.nombre, g.nombre))?.telefono || ''));
    return grupos.sort((a, b) => (!a.nombre) - (!b.nombre) || a.nombre.localeCompare(b.nombre));
  },

  // Mensaje con todo lo que hay que pedirle a un proveedor
  mensaje(g) {
    const lineas = g.insumos.map((i) =>
      `• ${i.pedir ? `${i.pedir} ${i.unidad || ''} de ` : ''}${i.nombre}`.replace(/\s+/g, ' '));
    return `Hola! Te paso el pedido de Manjares Pampeanos:\n${lineas.join('\n')}\n\nGracias!`;
  },

  bloqueProveedor(g) {
    const C = Pantallas.compras;
    const nombre = g.nombre ? `🏪 ${U.esc(g.nombre)}` : 'Sin proveedor';
    let botones = '';
    if (g.nombre && g.telefono) {
      botones = `<div class="fila-botones">
          <a class="btn btn-wa" href="${U.linkWhatsApp(g.telefono, C.mensaje(g))}" target="_blank" rel="noopener"
            style="text-align:center;text-decoration:none">💬 Pedirle todo a ${U.esc(g.nombre)}</a></div>
        <button class="btn btn-ancho btn-chico" data-accion="compras.pedidoTodo" data-id="${U.esc(g.nombre)}">Ya se lo pedí todo</button>`;
    } else if (g.nombre) {
      botones = `<p class="ayuda">Para pedirle por WhatsApp, cargale el teléfono a ${U.esc(g.nombre)}: tocá cualquiera de sus insumos en Stock.</p>`;
    }
    return `<div class="seccion">${nombre} <span class="cuenta">${g.insumos.length}</span></div>
      ${botones}
      ${g.insumos.map(C.tarjetaInsumo).join('')}`;
  },

  tarjetaInsumo(i) {
    const det = [`quedan ${i.cantidad} ${U.esc(i.unidad || '')} (mín. ${i.minimo})`];
    if (i.pedir) det.push(`pedir ${i.pedir}`);
    if (i.demora) det.push(`tarda ${i.demora} días`);
    let estado = '';
    if (i.pedidoEl) {
      const llega = i.demora ? ` · llegaría ${U.fechaCorta(U.sumarDias(i.pedidoEl, i.demora))}` : '';
      estado = `<div class="tarjeta-detalle">Pedido el ${U.fechaCorta(i.pedidoEl)} por ${U.esc(i.pedidoPor)}${llega}</div>`;
    }
    return `
      <div class="tarjeta ${i.pedidoEl ? 'pronto' : (Number(i.cantidad) <= 0 ? 'atrasado' : 'hoy')}">
        <div class="tarjeta-cuerpo">
          <div class="tarjeta-titulo">${U.esc(i.nombre)}</div>
          <div class="tarjeta-detalle">${det.join(' · ')}</div>
          ${estado}
          <div class="fila-botones">
            ${i.pedidoEl ? '' : `<button class="btn btn-chico" data-accion="compras.pedido" data-id="${i.id}">Lo pedí</button>`}
            <button class="btn btn-hecho btn-chico" data-accion="compras.comprado" data-id="${i.id}">✓ ${i.pedidoEl ? 'Llegó' : 'Comprado'}</button>
          </div>
        </div>
      </div>`;
  },

  tarjetaPlan(p) {
    const color = p.nivel === 'atrasado' ? 'rojo' : 'ambar';
    const texto = p.nivel === 'atrasado'
      ? `¡Ya se pasó la fecha! Había que pedirlo antes del ${U.fecha(p.limite)}`
      : `Pedir antes del ${U.fecha(p.limite)} (${U.cuando(p.limite)})`;
    return `
      <div class="tarjeta ${p.nivel}">
        <div class="tarjeta-cuerpo">
          <div class="tarjeta-titulo">${U.esc(p.especial.nombre)}</div>
          <div class="tarjeta-detalle">En ${U.nombreMes(p.queso.mes)} va ${U.esc(p.queso.queso)} · tarda ${p.especial.demora} días</div>
          <div class="tarjeta-detalle ${color}">${texto}</div>
        </div>
        <button class="btn btn-hecho" data-accion="plan.listo" data-id="${p.queso.id}|${p.especial.id}">✓ Pedido</button>
      </div>`;
  },

  acciones: {
    pedido(id) {
      Datos.poner('insumos', { id, pedidoEl: U.hoy(), pedidoPor: Datos.usuario });
      U.avisar('Marcado como pedido');
    },
    comprado(id) {
      const i = Datos.obtener('insumos', id);
      const sugerido = i.pedir || Math.max(1, Number(i.minimo) * 2 - Number(i.cantidad));
      Hoja.abrir(`
        <h2>${U.esc(i.nombre)}: ¿cuántos ${U.esc(i.unidad || 'unidades')} llegaron?</h2>
        <div class="campo"><input id="cant-compra" type="number" inputmode="decimal" value="${sugerido}"></div>
        <div class="botones-rapidos">${[1, 2, 3, 5, 10].map((n) =>
          `<button class="btn" onclick="document.getElementById('cant-compra').value=${n}">${n}</button>`).join('')}</div>
        <div class="fila-botones">
          <button class="btn" onclick="Hoja.cerrar()">Cancelar</button>
          <button class="btn btn-principal" id="ok-compra">Sumar al stock</button>
        </div>`);
      document.getElementById('ok-compra').onclick = () => {
        const n = Number(document.getElementById('cant-compra').value) || 0;
        Datos.poner('insumos', { id, cantidad: Number(i.cantidad) + n, pedidoEl: '', pedidoPor: '' });
        Hoja.cerrar();
        U.avisar(`+${n} ${i.nombre} ✓`);
      };
    },
    // Marca como pedido todo lo que falta de un proveedor (después de mandarle el WhatsApp)
    pedidoTodo(proveedor) {
      const insumos = Calc.compras().faltan.filter((i) => Calc.mismoProveedor(i.proveedor, proveedor));
      insumos.forEach((i) => Datos.poner('insumos', { id: i.id, pedidoEl: U.hoy(), pedidoPor: Datos.usuario }, { silencioso: true }));
      Datos.guardar();
      U.avisar(`${U.plural(insumos.length, 'cosa marcada', 'cosas marcadas')} como pedidas a ${proveedor}`);
    },
  },
};
