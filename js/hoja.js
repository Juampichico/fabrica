// Hoja que sube desde abajo: formularios cortos y confirmaciones.
//
// Uso:  Hoja.formulario({ titulo, campos: [...], alGuardar(valores), alBorrar })
// Tipos de campo: texto, numero, fecha, mes, opciones, si-no, largo, foto, telefono
// Un campo con "opcional: true" va dentro de "Más datos (opcional)" para que el formulario se vea corto.
const Hoja = {
  fondo: () => document.getElementById('hoja-fondo'),
  caja: () => document.getElementById('hoja'),

  abrir(html) {
    Hoja.caja().innerHTML = html;
    Hoja.fondo().hidden = false;
    document.body.style.overflow = 'hidden';
  },
  cerrar() {
    Hoja.fondo().hidden = true;
    Hoja.caja().innerHTML = '';
    document.body.style.overflow = '';
  },

  campoHTML(c) {
    const v = c.valor ?? '';
    const id = 'c-' + c.nombre;
    const nota = c.nota ? `<div class="nota">${U.esc(c.nota)}</div>` : '';
    const ph = c.ejemplo ? ` placeholder="${U.esc(c.ejemplo)}"` : '';
    let control = '';
    switch (c.tipo) {
      case 'si-no':
        return `<label class="campo-check"><input type="checkbox" name="${c.nombre}" ${v ? 'checked' : ''}> ${U.esc(c.etiqueta)}</label>`;
      case 'opciones':
        control = `<select id="${id}" name="${c.nombre}">${c.opciones.map((o) => {
          const [val, txt] = Array.isArray(o) ? o : [o, o];
          return `<option value="${U.esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${U.esc(txt)}</option>`;
        }).join('')}</select>`;
        break;
      case 'largo':
        control = `<textarea id="${id}" name="${c.nombre}"${ph}>${U.esc(v)}</textarea>`;
        break;
      case 'foto':
        control = `<input id="${id}" type="file" accept="image/*" data-foto="${c.nombre}">
          <input type="hidden" name="${c.nombre}" value="${U.esc(v)}">
          <img class="foto-previa" ${v ? `src="${v}"` : 'hidden'} alt="">`;
        break;
      case 'numero':
        control = `<input id="${id}" name="${c.nombre}" type="number" inputmode="decimal" step="any" value="${U.esc(v)}"${ph}>`;
        break;
      case 'telefono':
        control = `<input id="${id}" name="${c.nombre}" type="tel" inputmode="tel" value="${U.esc(v)}"${ph}>`;
        break;
      default: {
        const tipos = { fecha: 'date', mes: 'month', texto: 'text' };
        control = `<input id="${id}" name="${c.nombre}" type="${tipos[c.tipo] || 'text'}" value="${U.esc(v)}"${ph}
          ${c.tipo === 'texto' || !c.tipo ? 'autocomplete="off"' : ''}>`;
      }
    }
    return `<div class="campo"><label for="${id}">${U.esc(c.etiqueta)}</label>${control}${nota}</div>`;
  },

  formulario({ titulo, campos, alGuardar, alBorrar, textoGuardar = 'Guardar', textoBorrar = 'Borrar' }) {
    const principales = campos.filter((c) => !c.opcional).map(Hoja.campoHTML).join('');
    const opcionales = campos.filter((c) => c.opcional);
    const algunoLleno = opcionales.some((c) => c.valor);
    Hoja.abrir(`
      <h2>${U.esc(titulo)}</h2>
      <form id="hoja-form" novalidate>
        ${principales}
        ${opcionales.length ? `<details class="opcionales" ${algunoLleno ? 'open' : ''}>
          <summary>Más datos (opcional)</summary>${opcionales.map(Hoja.campoHTML).join('')}</details>` : ''}
        <div class="fila-botones">
          <button type="button" class="btn" data-cancelar>Cancelar</button>
          <button type="submit" class="btn btn-principal">${U.esc(textoGuardar)}</button>
        </div>
        ${alBorrar ? `<button type="button" class="btn btn-peligro btn-ancho" data-borrar>${U.esc(textoBorrar)}</button>` : ''}
      </form>`);

    const form = document.getElementById('hoja-form');
    const primero = form.querySelector('input:not([type=hidden]):not([type=file]), textarea');
    // En celular no abrimos el teclado solo en formularios de edición; sí en los nuevos.
    if (primero && !primero.value) setTimeout(() => primero.focus(), 150);

    form.querySelector('[data-cancelar]').onclick = Hoja.cerrar;
    form.querySelectorAll('[data-foto]').forEach((inp) => {
      inp.onchange = async () => {
        if (!inp.files[0]) return;
        const dato = await U.achicarFoto(inp.files[0]);
        const oculto = form.querySelector(`input[type=hidden][name="${inp.dataset.foto}"]`);
        oculto.value = dato;
        const img = inp.parentElement.querySelector('img');
        img.src = dato; img.hidden = false;
      };
    });
    if (alBorrar) form.querySelector('[data-borrar]').onclick = alBorrar;

    form.onsubmit = (ev) => {
      ev.preventDefault();
      const valores = {};
      campos.forEach((c) => {
        const el = form.elements[c.nombre];
        if (c.tipo === 'si-no') valores[c.nombre] = el.checked;
        else if (c.tipo === 'numero') valores[c.nombre] = el.value === '' ? '' : Number(el.value);
        else valores[c.nombre] = el.value.trim();
      });
      const falta = campos.find((c) => c.obligatorio && (valores[c.nombre] === '' || valores[c.nombre] == null));
      if (falta) { U.avisar(`Falta completar: ${falta.etiqueta}`); return; }
      if (alGuardar(valores) !== false) Hoja.cerrar();
    };
  },

  // Pregunta sí/no antes de borrar o algo importante. Devuelve una promesa.
  confirmar(pregunta, textoSi = 'Sí, borrar') {
    return new Promise((ok) => {
      Hoja.abrir(`
        <h2>${U.esc(pregunta)}</h2>
        <p class="ayuda">Esto lo ven todos los del equipo.</p>
        <div class="fila-botones">
          <button class="btn" data-no>No</button>
          <button class="btn btn-peligro" data-si>${U.esc(textoSi)}</button>
        </div>`);
      Hoja.caja().querySelector('[data-no]').onclick = () => { Hoja.cerrar(); ok(false); };
      Hoja.caja().querySelector('[data-si]').onclick = () => { Hoja.cerrar(); ok(true); };
    });
  },
};

// Tocar afuera de la hoja la cierra
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'hoja-fondo') Hoja.cerrar();
});
