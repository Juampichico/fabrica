// Plan de quesos por mes, con insumos especiales que hay que pedir con anticipación.
Pantallas.plan = {
  titulo: 'Plan de quesos',
  menu: 'mas',
  volver: 'mas',

  // Meses a mostrar: desde el actual hasta diciembre (y los que tengan algo cargado después)
  meses() {
    const actual = U.hoy().slice(0, 7);
    const lista = [];
    for (let m = Number(actual.slice(5)); m <= 12; m++) lista.push(`${actual.slice(0, 4)}-${String(m).padStart(2, '0')}`);
    Datos.lista('plan').forEach((q) => { if (q.mes >= actual && !lista.includes(q.mes)) lista.push(q.mes); });
    return lista.sort();
  },

  dibujar() {
    const quesos = Datos.lista('plan');
    return `
      <p class="ayuda">Cargá qué queso va cada mes y si lleva algún insumo especial que tarda en llegar.
        La app avisa en <b>Hoy</b> y en <b>Compras</b> ${AVISO_PLAN_DIAS} días antes de la fecha para pedirlo.</p>
      ${Pantallas.plan.meses().map((mes) => {
        const delMes = quesos.filter((q) => q.mes === mes);
        return `<div class="seccion">${U.nombreMes(mes)} ${mes.slice(0, 4)}</div>
          ${delMes.map(Pantallas.plan.tarjeta).join('') ||
            `<div class="vacio tarjeta-tocable" data-accion="plan.nuevo" data-id="${mes}">Nada cargado · tocá para agregar</div>`}`;
      }).join('')}`;
  },

  tarjeta(q) {
    const especiales = (q.especiales || []).map((e) => {
      const limite = U.sumarDias(q.mes + '-01', -Number(e.demora || 0));
      const nivel = e.listo ? 'ok' : Calc.nivel(limite, AVISO_PLAN_DIAS);
      const estado = e.listo
        ? `<span style="color:var(--verde)">✓ pedido por ${U.esc(e.listoPor)} el ${U.fechaCorta(e.listoEl)}</span>`
        : `<span class="${nivel === 'atrasado' ? 'rojo' : nivel ? 'ambar' : ''}">pedir antes del ${U.fecha(limite)}</span>`;
      return `<div class="historial-item tarjeta-tocable" data-accion="plan.especial" data-id="${q.id}|${e.id}">
        <b>${U.esc(e.nombre)}</b> · tarda ${e.demora} días<br><span class="tarjeta-detalle">${estado}</span></div>`;
    }).join('');
    return `
      <div class="tarjeta">
        <div class="tarjeta-cuerpo">
          <div class="tarjeta-titulo tarjeta-tocable" data-accion="plan.editar" data-id="${q.id}">🧀 ${U.esc(q.queso)}</div>
          ${especiales}
          <button class="btn btn-chico btn-ancho" data-accion="plan.especial" data-id="${q.id}|">+ Insumo especial</button>
        </div>
      </div>`;
  },

  agregar() { Pantallas.plan.acciones.editar(); },

  acciones: {
    nuevo(mes) { Pantallas.plan.acciones.editar(null, null, mes); },
    editar(id, _el, mes) {
      const q = id ? Datos.obtener('plan', id) : { mes: mes || U.hoy().slice(0, 7) };
      Hoja.formulario({
        titulo: id ? 'Editar queso del plan' : 'Agregar al plan',
        campos: [
          { nombre: 'queso', etiqueta: '¿Qué se hace?', valor: q.queso, obligatorio: true, ejemplo: 'Ej: Ravioli con aceitunas' },
          { nombre: 'mes', etiqueta: '¿En qué mes?', tipo: 'mes', valor: q.mes, obligatorio: true },
        ],
        alGuardar(v) {
          Datos.poner('plan', { id, ...v, especiales: q.especiales || [] });
          U.avisar(id ? 'Guardado' : 'Agregado al plan. Si lleva algo especial, tocá "+ Insumo especial"');
        },
        alBorrar: id && (async () => {
          if (await Hoja.confirmar(`¿Sacar "${q.queso}" del plan?`)) { Datos.borrar('plan', id); U.avisar('Borrado'); }
        }),
      });
    },
    // Agregar o editar un insumo especial de un queso. id = "quesoId|especialId"
    especial(ids) {
      const [qid, eid] = ids.split('|');
      const q = Datos.obtener('plan', qid);
      const e = (q.especiales || []).find((x) => x.id === eid) || {};
      const guardarLista = (lista) => Datos.poner('plan', { id: qid, especiales: lista });
      Hoja.formulario({
        titulo: eid ? e.nombre : `Insumo especial para ${q.queso}`,
        campos: [
          { nombre: 'nombre', etiqueta: '¿Qué insumo?', valor: e.nombre, obligatorio: true, ejemplo: 'Ej: Aceitunas' },
          { nombre: 'demora', etiqueta: '¿Cuántos días tarda en llegar?', tipo: 'numero', valor: e.demora, obligatorio: true },
          ...(eid ? [{ nombre: 'listo', etiqueta: 'Ya está pedido / comprado', tipo: 'si-no', valor: e.listo }] : []),
        ],
        alGuardar(v) {
          if (v.demora < 0 || v.demora > 365) { U.avisar('Los días que tarda tienen que ser entre 0 y 365'); return false; }
          const otros = (q.especiales || []).filter((x) => x.id !== eid);
          const nuevo = { ...e, id: eid || U.id(), nombre: v.nombre, demora: v.demora, listo: !!v.listo };
          if (v.listo && !e.listo) Object.assign(nuevo, { listoPor: Datos.usuario, listoEl: U.hoy() });
          guardarLista([...otros, nuevo]);
          const limite = U.sumarDias(q.mes + '-01', -Number(v.demora));
          U.avisar(`Hay que pedirlo antes del ${U.fecha(limite)}`);
        },
        alBorrar: eid && (async () => {
          if (await Hoja.confirmar(`¿Borrar "${e.nombre}"?`)) guardarLista(q.especiales.filter((x) => x.id !== eid));
        }),
      });
    },
    // Marcar un insumo especial como pedido (desde Hoy o Compras)
    listo(ids) {
      const [qid, eid] = ids.split('|');
      const q = Datos.obtener('plan', qid);
      const especiales = q.especiales.map((e) =>
        e.id === eid ? { ...e, listo: true, listoPor: Datos.usuario, listoEl: U.hoy() } : e);
      Datos.poner('plan', { id: qid, especiales });
      U.avisar('Marcado como pedido ✓');
    },
  },
};
