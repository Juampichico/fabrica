// Utilidades generales: fechas en formato argentino, textos, avisos.
const U = {
  // ---- Fechas (siempre como texto "AAAA-MM-DD" para guardar) ----
  aTexto(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  aFecha(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d || 1);
  },
  hoy() { return U.aTexto(new Date()); },
  sumarDias(iso, n) {
    const d = U.aFecha(iso);
    d.setDate(d.getDate() + Number(n));
    return U.aTexto(d);
  },
  diasEntre(desde, hasta) {
    return Math.round((U.aFecha(hasta) - U.aFecha(desde)) / 86400000);
  },
  // 14/10/2026
  fecha(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  },
  // 14/10
  fechaCorta(iso) {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  },
  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'],
  DIAS: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  // "2026-12" → "diciembre"
  nombreMes(mes) { return U.MESES[Number(mes.split('-')[1]) - 1]; },
  // Texto amable: "hoy", "mañana", "hace 3 días", "en 5 días"
  cuando(iso) {
    const n = U.diasEntre(U.hoy(), iso);
    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    if (n === -1) return 'ayer';
    return n < 0 ? `hace ${-n} días` : `en ${n} días`;
  },
  hora() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  frecuencia(dias) {
    const n = Number(dias);
    const nombres = { 1: 'todos los días', 7: 'cada semana', 14: 'cada 2 semanas', 15: 'cada 15 días',
      30: 'cada mes', 60: 'cada 2 meses', 90: 'cada 3 meses', 180: 'cada 6 meses', 365: 'cada año' };
    return nombres[n] || `cada ${n} días`;
  },

  // ---- Textos ----
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  plural(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; },

  // ---- WhatsApp ----
  // El teléfono se carga con característica, sin 0 ni 15 (ej. 2297 123456).
  linkWhatsApp(telefono, texto) {
    let num = String(telefono || '').replace(/\D/g, '');
    if (num && !num.startsWith('54')) num = '549' + num.replace(/^0/, '');
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
  },

  // ---- Aviso flotante corto ("Guardado", "Marcado como hecho") ----
  avisar(texto) {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(U._t);
    U._t = setTimeout(() => (el.hidden = true), 2200);
  },

  // ---- Fotos: se achican antes de guardar para no gastar espacio ----
  achicarFoto(archivo, maximo = 900, calidad = 0.6) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maximo / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = mal;
      img.src = URL.createObjectURL(archivo);
    });
  },
};

// Registro de pantallas (cada archivo de js/pantallas agrega la suya)
const Pantallas = {};

// Personas del equipo (se editan en Más → Ajustes)
const Personas = () => Datos.config('personas', ['Hermano', 'Encargado', 'Fran', 'Juampi']);
