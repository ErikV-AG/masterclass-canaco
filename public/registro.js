(function () {
  var form = document.getElementById('registro-form');
  var gracias = document.getElementById('registro-gracias');
  var otra = document.getElementById('registro-otra');
  var errorBox = document.getElementById('registro-error');
  var enviar = document.getElementById('registro-enviar');
  if (!form) return;

  function mostrarError(texto) {
    errorBox.textContent = texto;
    errorBox.style.display = 'block';
  }

  function validar(datos) {
    if (!datos.nombre) return ['f-nombre', 'Escribe tu nombre completo.'];
    if (!datos.giro) return ['f-giro', 'Selecciona tu sector.'];
    if (datos.whatsapp.replace(/\D/g, '').length < 10) return ['f-whatsapp', 'Escribe un número de WhatsApp de 10 dígitos.'];
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) return ['f-correo', 'Revisa el correo electrónico; parece incompleto.'];
    if (!datos.fecha) return [null, 'Elige la fecha que prefieres.'];
    return null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';
    var fd = new FormData(form);
    var datos = {};
    ['nombre', 'negocio', 'giro', 'whatsapp', 'correo', 'fecha', 'reto', 'sitio_web'].forEach(function (k) {
      datos[k] = String(fd.get(k) || '').trim();
    });
    var problema = validar(datos);
    if (problema) {
      mostrarError(problema[1]);
      if (problema[0]) document.getElementById(problema[0]).focus();
      return;
    }
    enviar.disabled = true;
    enviar.textContent = 'Enviando…';
    fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'No se pudo guardar tu registro. Inténtalo de nuevo en unos minutos.');
        form.hidden = true;
        gracias.hidden = false;
        gracias.focus();
      })
      .catch(function (err) {
        mostrarError(err.message && err.message !== 'Failed to fetch'
          ? err.message
          : 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
      })
      .then(function () {
        enviar.disabled = false;
        enviar.textContent = 'Registrarme';
      });
  });

  otra.addEventListener('click', function () {
    form.reset();
    gracias.hidden = true;
    form.hidden = false;
    document.getElementById('f-nombre').focus();
  });
})();
