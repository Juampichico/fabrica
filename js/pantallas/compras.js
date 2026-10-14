// Lista de compras: insumos bajo el mínimo + lo que pide el plan de quesos con anticipación.
Pantallas.compras = {
  titulo: 'Compras',

  dibujar() {
    const c = Calc.compras();
    const C = Pantallas.compras;
    const hayAlgo = c.total + c.enCamino.length > 0;
    return `
      ${c.total ? `<button class="btn btn-wa btn-ancho" data-accion="compras.whatsapp">💬 Mandar la lista por WhatsApp</button>` : ''}
      ${c.plan.length ? `<div class="seccion">Para el plan de quesos <span class="cuenta">${c.plan.length}</span></div>
        ${c.plan.map(C.tarjetaPlan).join('')}` : ''}
      ${c.faltan.length ? `<div class="seccion">Faltan en el stock <span class="cuenta">${c.faltan.length}</span></div>
        ${c.faltan.map(C.tarjetaInsumo).join('')}` : ''}
      ${c.enCamino.length ? `<div class="seccion">Pedidos, falta que lleguen <span class="cuenta">${c.enCamino.length}</span></div>
        ${c.enCamino.map(C.tarjetaInsumo).join('')}` : ''}
      ${hayAlgo ? '' : '<div class="vacio">✓ No hay nada para comprar</div>'}`;
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
            ${i.telefono ? `<a class="btn btn-wa btn-chico" href="${U.linkWhatsApp(i.telefono, `Hola! Necesito ${i.pedir ? i.pedir + ' ' + (i.unidad || '') + ' de ' : ''}${i.nombre}. Gracias!`)}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">💬 ${U.esc(i.proveedor || 'Proveedor')}</a>` : ''}
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
    whatsapp() {
      const c = Calc.compras();
      const lineas = [
        ...c.faltan.map((i) => `• ${i.pedir ? i.pedir + ' ' + (i.unidad || '') + ' ' : ''}${i.nombre}`.replace(/\s+/g, ' ')),
        ...c.plan.map((p) => `• ${p.especial.nombre} (para ${p.queso.queso}, ${U.nombreMes(p.queso.mes)})`),
      ];
      const texto = `Comprar (${U.fecha(U.hoy())}):\n${lineas.join('\n')}`;
      // Copia la lista por las dudas: si WhatsApp no la recibe, se pega a mano
      navigator.clipboard?.writeText(texto).catch(() => {});
      // Sin número, "wa.me" en iPhone abre WhatsApp pero pierde el texto; "whatsapp://" lo conserva.
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        location.href = 'whatsapp://send?text=' + encodeURIComponent(texto);
      } else {
        window.open(U.linkWhatsApp('', texto), '_blank');
      }
      U.avisar('Lista copiada · elegí a quién mandarla');
    },
  },
};
