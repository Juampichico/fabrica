// Carga inicial de ejemplo. Todo se puede editar o borrar desde la app.
// Las frecuencias de services son estimadas: hay que confirmarlas con Juampi.
const Semilla = {
  cargar(conEjemplos) {
    const hoy = U.hoy();
    const p = (col, r) => Datos.poner(col, r, { silencioso: true });

    // Checklist de cierre (siempre, aunque se empiece "vacío")
    ['Cámaras de frío cerradas', 'Gas cortado', 'Mangueras guardadas', 'Luces apagadas', 'Puertas con llave']
      .forEach((texto, i) => p('checklistItems', { texto, orden: i }));

    // Equipos de la fábrica (sin fecha de último service: se carga cuando se sepa)
    [
      ['Caldera', 180], ['Bomba de agua de la caldera', 180], ['Compresor', 90],
      ['Tanque de leche (frío y revolvedor)', 180], ['Tina con revolvedor', 180], ['Prensa neumática', 180],
      ['Cámara de frío grande', 180], ['Cámara chica del local', 180], ['Envasadora al vacío', 180],
      ['Amasadora de pasta hilada', 180], ['Bomba de agua del pozo', 365], ['Bomba de suero', 180],
      ['Heladeras', 180], ['Aires acondicionados', 180], ['Extractor', 180], ['Ventilador', 365],
    ].forEach(([nombre, cadaDias]) => p('equipos', { nombre, cadaDias, ultimo: '' }));

    if (!conEjemplos) { Datos.guardar(); return; }

    // Insumos de ejemplo
    const grupo = (categoria, lista) => lista.forEach((r) => p('insumos', { categoria, ...r }));
    grupo('fermentos', [
      { nombre: 'SA 500 (fermento)', unidad: 'sobres', cantidad: 4, minimo: 3, pedir: 6, demora: 7 },
      { nombre: 'Cuajo', unidad: 'bidones', cantidad: 2, minimo: 1, pedir: 2, demora: 5 },
    ]);
    grupo('ingredientes', [
      { nombre: 'Orégano', unidad: 'bolsas', cantidad: 3, minimo: 1, pedir: 2, demora: 3 },
      { nombre: 'Ají molido', unidad: 'bolsas', cantidad: 2, minimo: 1, pedir: 2, demora: 3 },
      { nombre: 'Sal', unidad: 'bolsas', cantidad: 6, minimo: 2, pedir: 4, demora: 2 },
      { nombre: 'Manteca', unidad: 'panes', cantidad: 4, minimo: 2, pedir: 6, demora: 2 },
      { nombre: 'Sobrasada', unidad: 'kg', cantidad: 1, minimo: 1, pedir: 2, demora: 5 },
    ]);
    grupo('embalaje', [
      { nombre: 'Bolsas camiseta (local)', unidad: 'paquetes', cantidad: 1, minimo: 2, pedir: 5, demora: 3 },
      { nombre: 'Bolsas de vacío', unidad: 'paquetes', cantidad: 2, minimo: 2, pedir: 3, demora: 10 },
      { nombre: 'Rollos de aluminio', unidad: 'rollos', cantidad: 5, minimo: 2, pedir: 4, demora: 3 },
      { nombre: 'Cinta de embalar', unidad: 'rollos', cantidad: 3, minimo: 1, pedir: 3, demora: 2 },
      { nombre: 'Papel para envolver', unidad: 'resmas', cantidad: 2, minimo: 1, pedir: 2, demora: 3 },
      { nombre: 'Tijeras', unidad: 'unidades', cantidad: 2, minimo: 1, pedir: 1, demora: 2 },
    ]);

    // Plan de quesos (ejemplo: el caso de las aceitunas)
    p('plan', { mes: hoy.slice(0, 7), queso: 'Provoleta', especiales: [] });
    p('plan', {
      mes: U.sumarDias(hoy.slice(0, 7) + '-01', 62).slice(0, 7),
      queso: 'Ravioli con aceitunas',
      especiales: [{ id: U.id(), nombre: 'Aceitunas', demora: 30, listo: false }],
    });

    // Tareas que se repiten
    [
      { texto: 'Limpiar cámara de frío grande', cadaDias: 7, proxima: hoy },
      { texto: 'Limpiar desagües', cadaDias: 7, proxima: U.sumarDias(hoy, 3) },
      { texto: 'Limpieza profunda de la tina', cadaDias: 30, proxima: U.sumarDias(hoy, -2) },
    ].forEach((r) => p('tareas', { ...r, tipo: 'repite' }));

    // Tarea suelta de ejemplo
    p('tareas', { tipo: 'suelta', texto: 'Arreglar el cable de la bomba de leche', urgente: true, hecha: false });

    Datos.guardar();
  },
};
