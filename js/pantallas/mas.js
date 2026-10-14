// Pantalla "Más": acceso al plan, equipos, checklist y ajustes. También la bienvenida.
Pantallas.mas = {
  titulo: 'Más',

  dibujar() {
    const avisosPlan = Calc.pedidosPlan().filter((p) => p.nivel).length;
    const services = Calc.services().length;
    const sinDato = Datos.lista('equipos').filter((eq) => !eq.ultimo).length;
    const textoEquipos = services ? `${U.plural(services, 'service', 'services')} para hacer`
      : sinDato ? `Falta cargar el último service de ${U.plural(sinDato, 'equipo', 'equipos')}` : 'Todo al día';
    const c = Calc.checklistHoy();
    const opcion = (ruta, icono, titulo, detalle, alerta) => `
      <a class="opcion" href="#${ruta}">
        <span class="icono">${icono}</span>
        <span><span class="tarjeta-titulo">${titulo}</span>
          <span class="tarjeta-detalle ${alerta ? 'rojo' : ''}" style="display:block">${detalle}</span></span>
        <span class="flecha">›</span>
      </a>`;
    return `
      ${opcion('plan', '🧀', 'Plan de quesos', avisosPlan ? `${U.plural(avisosPlan, 'cosa', 'cosas')} para pedir` : 'Qué se hace cada mes', avisosPlan)}
      ${opcion('equipos', '🔧', 'Equipos y services', textoEquipos, services)}
      ${opcion('checklist', '🔒', 'Cierre del día', c.completo ? 'Hecho hoy ✓' : `${c.listos} de ${c.items.length} tildados hoy`, false)}
      ${opcion('ajustes', '⚙️', 'Ajustes', 'Tu nombre, copias de seguridad, modo prueba', false)}`;
  },

  // Primera vez en el celular (con servidor): código del equipo, para que no entre cualquiera
  pedirCodigoHTML() {
    const error = Sincro.estado === 'codigo';
    return `
      <div class="bienvenida">
        <div style="font-size:56px">🔒</div>
        <h2>Código del equipo</h2>
        <p class="ayuda">Pedíselo a Juampi. Se pone una sola vez en este celular.</p>
        <div class="campo"><input id="codigo-equipo" autocomplete="off" autocapitalize="off" style="text-align:center;font-size:22px"
          onkeydown="if (event.key === 'Enter') Pantallas.mas.acciones.entrarCodigo()"></div>
        ${error ? '<p class="tarjeta-detalle rojo">Ese código no es correcto. Probá de nuevo.</p>' : ''}
        <button class="btn btn-principal" data-accion="mas.entrarCodigo">Entrar</button>
      </div>`;
  },

  // Primera vez en el celular: elegir quién sos
  elegirNombreHTML() {
    return `
      <div class="bienvenida">
        <div style="font-size:56px">🧀</div>
        <h2>¿Quién sos?</h2>
        <p class="ayuda">Así queda registrado quién hizo cada cosa. Se elige una sola vez en este celular.</p>
        ${Personas().map((p) => `<button class="btn btn-principal" data-accion="mas.soy" data-id="${U.esc(p)}">${U.esc(p)}</button>`).join('')}
        <button class="btn" data-accion="mas.otroNombre">Otro nombre…</button>
      </div>`;
  },

  acciones: {
    async entrarCodigo() {
      const codigo = document.getElementById('codigo-equipo').value.trim();
      if (!codigo) return U.avisar('Escribí el código');
      Sincro.codigo = codigo;
      U.avisar('Comprobando…');
      document.getElementById('contenido').innerHTML = '<div class="vacio">Conectando…</div>';
      await Sincro.ya();
      if (Sincro.estado === 'sinconexion') {
        Sincro.codigo = '';
        App.mostrar();
        U.avisar('No hay conexión. Probá de nuevo en un rato.');
        return;
      }
      App.mostrar();
    },
    soy(nombre) {
      Datos.usuario = nombre;
      location.hash = 'hoy';
      App.mostrar();
      U.avisar(`¡Hola, ${nombre}!`);
    },
    otroNombre() {
      Hoja.formulario({
        titulo: '¿Cómo te llamás?',
        campos: [{ nombre: 'nombre', etiqueta: 'Tu nombre', obligatorio: true }],
        alGuardar(v) {
          Datos.ponerConfig('personas', [...Personas(), v.nombre]);
          Pantallas.mas.acciones.soy(v.nombre);
        },
      });
    },
  },
};

// Ajustes
Pantallas.ajustes = {
  titulo: 'Ajustes',
  menu: 'mas',
  volver: 'mas',

  dibujar() {
    const prueba = Datos.espacio === 'prueba';
    return `
      <div class="seccion">Vos</div>
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-titulo">Estás como: ${U.esc(Datos.usuario)}</div>
        <button class="btn btn-ancho" data-accion="ajustes.cambiarNombre">Cambiar de persona</button>
      </div></div>

      <div class="seccion">Equipo</div>
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-detalle">Nombres para elegir: ${Personas().map(U.esc).join(', ')}</div>
        <button class="btn btn-ancho" data-accion="ajustes.personas">Editar nombres</button>
      </div></div>

      <div class="seccion">Datos</div>
      <div class="tarjeta"><div class="tarjeta-cuerpo">
        <div class="tarjeta-detalle">${Pantallas.ajustes.textoDatos()}</div>
        <button class="btn btn-ancho" data-accion="ajustes.descargar">⬇️ Descargar una copia</button>
        <label class="btn btn-ancho" style="text-align:center">⬆️ Recuperar una copia
          <input type="file" accept=".json,application/json" hidden onchange="Pantallas.ajustes.recuperar(this)"></label>
      </div></div>

      <div class="seccion">Modo prueba</div>
      <div class="tarjeta ${prueba ? 'pronto' : ''}"><div class="tarjeta-cuerpo">
        <div class="tarjeta-detalle">${prueba
          ? 'Estás en <b>modo prueba</b>: lo que cargues acá no se mezcla con los datos reales.'
          : 'Para probar sin ensuciar los datos reales, pasá a modo prueba.'}</div>
        <button class="btn btn-ancho" data-accion="ajustes.modo">${prueba ? 'Volver a los datos reales' : 'Pasar a modo prueba'}</button>
        <button class="btn btn-peligro btn-ancho" data-accion="ajustes.limpiar">Borrar todo y empezar de cero${prueba ? ' (prueba)' : ''}</button>
      </div></div>
      <p class="ayuda" style="text-align:center">Manjares Pampeanos · Rauch</p>`;
  },

  textoDatos() {
    if (!Sincro.hayServidor()) {
      return '⚠️ Los datos se guardan <b>solo en este aparato</b>. Falta conectarlo a internet para que los vean todos.';
    }
    const pend = Datos.cantidadPendientes();
    const hora = Sincro.ultimaVez ? new Date(Sincro.ultimaVez).toTimeString().slice(0, 5) : '';
    if (Sincro.estado === 'ok') {
      return `✓ Conectado. Todos ven lo mismo. Última actualización: ${hora}.${pend ? ` Enviando ${pend}…` : ''}
        <br>Además, todas las noches se guarda una copia en el Google Drive de Juampi.`;
    }
    return `⚠️ Sin conexión${hora ? ` desde las ${hora}` : ''}. ${pend ? `Hay ${U.plural(pend, 'cambio', 'cambios')} esperando para enviarse.` : ''}`;
  },

  recuperar(input) {
    const archivo = input.files[0];
    if (!archivo) return;
    archivo.text().then(async (texto) => {
      if (!(await Hoja.confirmar('¿Reemplazar todos los datos por los de la copia?', 'Sí, reemplazar'))) return;
      try { Datos.restaurarCopia(texto); U.avisar('Copia recuperada ✓'); } catch (e) { alert(e.message); }
    });
  },

  acciones: {
    cambiarNombre() { Datos.usuario = ''; App.mostrar(); },
    personas() {
      Hoja.formulario({
        titulo: 'Nombres del equipo',
        campos: [{ nombre: 'lista', etiqueta: 'Separados por coma', tipo: 'largo', valor: Personas().join(', ') }],
        alGuardar(v) {
          const lista = v.lista.split(',').map((s) => s.trim()).filter(Boolean);
          if (lista.length) Datos.ponerConfig('personas', lista);
        },
      });
    },
    descargar() { Datos.descargarCopia(); },
    modo() {
      Datos.espacio = Datos.espacio === 'prueba' ? 'real' : 'prueba';
      App.mostrar();
      Sincro.ya();
      U.avisar(Datos.espacio === 'prueba' ? 'Modo prueba' : 'Datos reales');
    },
    async limpiar() {
      if (!(await Hoja.confirmar('¿Borrar TODO (stock, tareas, plan, services) y empezar de cero?', 'Sí, borrar todo'))) return;
      Datos.empezarLimpio(false);
      U.avisar('Listo, empezaste de cero');
    },
  },
};
