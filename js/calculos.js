// Cálculos: qué está atrasado, qué hay que comprar, qué service toca.
// Todas las pantallas sacan la información de acá, así nunca se contradicen.
const AVISO_PLAN_DIAS = 30;     // cuántos días antes de la fecha límite empieza a avisar el plan
const AVISO_SERVICE_DIAS = 10;  // cuántos días antes del service empieza a avisar
const AVISO_TAREA_DIAS = 2;     // tareas sueltas con fecha: aparecen como "pronto" 2 días antes

const Calc = {
  // Nivel según una fecha límite: atrasado / hoy / pronto / null (todavía falta)
  nivel(fecha, anticipo) {
    if (!fecha) return null;
    const n = U.diasEntre(U.hoy(), fecha);
    if (n < 0) return 'atrasado';
    if (n === 0) return 'hoy';
    if (n <= anticipo) return 'pronto';
    return null;
  },

  // ---- Stock ----
  bajoMinimo(i) { return Number(i.cantidad) <= Number(i.minimo); },

  // ---- Plan de quesos: insumos especiales que hay que pedir ----
  // Fecha límite = día 1 del mes del queso menos los días que tarda en llegar.
  pedidosPlan() {
    const res = [];
    Datos.lista('plan').forEach((q) => {
      (q.especiales || []).forEach((e) => {
        if (e.listo) return;
        const limite = U.sumarDias(q.mes + '-01', -Number(e.demora || 0));
        res.push({ queso: q, especial: e, limite, nivel: Calc.nivel(limite, AVISO_PLAN_DIAS) });
      });
    });
    return res.sort((a, b) => a.limite.localeCompare(b.limite));
  },

  // ---- Proveedores (salen de lo cargado en cada insumo) ----
  mismoProveedor(a, b) {
    return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  },
  proveedores() {
    const lista = [];
    Datos.lista('insumos').forEach((i) => {
      if (!i.proveedor?.trim()) return;
      const p = lista.find((x) => Calc.mismoProveedor(x.nombre, i.proveedor));
      if (!p) lista.push({ nombre: i.proveedor.trim(), telefono: i.telefono || '' });
      else if (!p.telefono && i.telefono) p.telefono = i.telefono;
    });
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  // ---- Lista de compras ----
  compras() {
    const insumos = Datos.lista('insumos').filter(Calc.bajoMinimo)
      .sort((a, b) => (a.cantidad - a.minimo) - (b.cantidad - b.minimo));
    const enCamino = insumos.filter((i) => i.pedidoEl);
    const faltan = insumos.filter((i) => !i.pedidoEl);
    const plan = Calc.pedidosPlan().filter((p) => p.nivel);
    return { faltan, enCamino, plan, total: faltan.length + plan.length };
  },

  // ---- Services ----
  proximoService(eq) {
    return eq.ultimo ? U.sumarDias(eq.ultimo, eq.cadaDias) : '';
  },
  services() {
    return Datos.lista('equipos')
      .map((eq) => {
        const proximo = Calc.proximoService(eq);
        return { equipo: eq, proximo, nivel: Calc.nivel(proximo, AVISO_SERVICE_DIAS) };
      })
      .filter((s) => s.nivel)
      .sort((a, b) => a.proximo.localeCompare(b.proximo));
  },

  // ---- Tareas ----
  tareasPendientes() {
    return Datos.lista('tareas').filter((t) => {
      if (t.tipo === 'repite') return Calc.nivel(t.proxima, 0);
      return !t.hecha;
    });
  },
  nivelTarea(t) {
    if (t.tipo === 'repite') return Calc.nivel(t.proxima, 0);
    if (t.fecha) return Calc.nivel(t.fecha, AVISO_TAREA_DIAS) || (t.urgente ? 'hoy' : 'pronto');
    return t.urgente ? 'hoy' : 'pronto';
  },

  // ---- Checklist de cierre de hoy ----
  checklistHoy() {
    const items = Datos.lista('checklistItems').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const hechos = {};
    Datos.lista('checklistHechos').filter((h) => h.fecha === U.hoy()).forEach((h) => (hechos[h.item] = h));
    const listos = items.filter((i) => hechos[i.id]).length;
    return { items, hechos, listos, completo: items.length > 0 && listos === items.length };
  },

  // ---- Todo lo pendiente para la pantalla Hoy ----
  pendientesHoy() {
    const lista = [];
    Calc.tareasPendientes().forEach((t) => lista.push({ tipo: 'tarea', nivel: Calc.nivelTarea(t), dato: t }));
    Calc.services().forEach((s) => lista.push({ tipo: 'service', nivel: s.nivel, dato: s }));
    const c = Calc.compras();
    c.faltan.forEach((i) => lista.push({ tipo: 'insumo', nivel: Number(i.cantidad) <= 0 ? 'atrasado' : 'hoy', dato: i }));
    c.plan.forEach((p) => lista.push({ tipo: 'plan', nivel: p.nivel, dato: p }));
    return lista;
  },
};
