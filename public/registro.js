(function () {
  var $ = function (id) { return document.getElementById(id); };
  var form = $('registro-form'), gracias = $('registro-gracias'), resumen = $('registro-error'), enviar = $('registro-enviar');
  if (!form) return;

  var FECHAS = { '6 nov': 'Viernes 6 de noviembre', '13 nov': 'Viernes 13 de noviembre', 'cualquiera': 'Cualquiera de las dos (te confirmamos cuál)' };
  var GCAL = { '6 nov': '20261106T180000/20261106T190000', '13 nov': '20261113T180000/20261113T190000' };
  var intento = false;
  var ENVIAR_HTML = enviar.innerHTML;

  // WhatsApp: formato 33 1234 5678 mientras se escribe
  var wa = $('f-whatsapp');
  wa.addEventListener('input', function () {
    var d = wa.value.replace(/\D/g, '');
    if (d.length > 10 && (d.indexOf('52') === 0)) d = d.slice(-10);
    d = d.slice(0, 10);
    // Formato con lada de 3 dígitos, como en Michoacán (443 Morelia, 452 Uruapan, 351 Zamora): 443 123 4567
    var f = d.length > 6 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + ' ' + d.slice(3) : d;
    wa.value = f;
  });

  // Canal de llegada: ?origen=facebook (o utm_source). Se conserva durante la visita.
  var ORIGEN = (function () {
    var q = new URLSearchParams(location.search), o = q.get('origen') || q.get('utm_source') || '';
    o = o.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
    try { if (o) sessionStorage.setItem('origen', o); else o = sessionStorage.getItem('origen') || ''; } catch (e) {}
    return o || 'directo';
  })();

  function datos() {
    var fd = new FormData(form), o = {};
    ['nombre', 'negocio', 'giro', 'whatsapp', 'correo', 'fecha', 'reto', 'sitio_web'].forEach(function (k) { o[k] = String(fd.get(k) || '').trim(); });
    return o;
  }

  function reglas(d) {
    var e = {};
    if (!d.fecha) e.fecha = 'Elige el viernes que prefieres.';
    if (!d.nombre) e.nombre = 'Escribe tu nombre completo.';
    if (d.whatsapp.replace(/\D/g, '').length !== 10) e.whatsapp = 'Escribe los 10 dígitos de tu WhatsApp, sin +52.';
    if (!d.giro) e.giro = 'Selecciona el sector que más se parece al tuyo.';
    if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) e.correo = 'Revisa el correo: le falta algo, por ejemplo @ o .com.';
    return e;
  }
  var CAMPO = { fecha: 'f-fecha', nombre: 'f-nombre', whatsapp: 'f-whatsapp', giro: 'f-giro', correo: 'f-correo' };
  var ORDEN = ['fecha', 'nombre', 'whatsapp', 'giro', 'correo'];

  function pintar(k, msg) {
    var c = $(CAMPO[k]), e = $('e-' + k);
    if (msg) { c.setAttribute('aria-invalid', 'true'); e.textContent = msg; e.hidden = false; }
    else { c.removeAttribute('aria-invalid'); e.hidden = true; e.textContent = ''; }
  }

  // Validación en línea: al salir del campo y, después del primer intento, al corregir
  ORDEN.forEach(function (k) {
    var c = $(CAMPO[k]);
    var revisar = function () {
      var d = datos(), errs = reglas(d);
      if (k === 'correo' && !d.correo) return pintar(k, '');
      if (intento || c.getAttribute('aria-invalid')) pintar(k, errs[k]);
      if (intento) actualizarResumen(errs);
    };
    c.addEventListener(k === 'fecha' || k === 'giro' ? 'change' : 'blur', function () {
      var d = datos();
      if (k === 'fecha' || k === 'giro' || d[k]) { var errs = reglas(d); pintar(k, errs[k]); }
      if (intento) actualizarResumen(reglas(d));
    }, true);
    c.addEventListener('input', revisar);
  });

  var ALERTA = '<span class="error-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.6h.01"/></svg></span>';
  var cabecera = function (html) { return '<div class="error-cab">' + ALERTA + '<span>' + html + '</span></div>'; };

  function actualizarResumen(errs) {
    var ks = ORDEN.filter(function (k) { return errs[k]; });
    if (!ks.length) { resumen.hidden = true; resumen.innerHTML = ''; return; }
    resumen.innerHTML = cabecera('<strong>' + (ks.length === 1 ? 'Falta un dato' : 'Faltan ' + ks.length + ' datos') + ' para apartar tu lugar:</strong>') + '<ul>' +
      ks.map(function (k) { return '<li><a href="#' + CAMPO[k] + '" data-k="' + k + '">' + errs[k] + '</a></li>'; }).join('') + '</ul>';
    resumen.hidden = false;
  }
  resumen.addEventListener('click', function (ev) {
    var a = ev.target.closest('a'); if (!a) return;
    ev.preventDefault(); irA(a.getAttribute('data-k'));
  });
  function irA(k) {
    if (k === 'correo') form.querySelector('.mas').open = true;
    var el = k === 'fecha' ? form.querySelector('input[name=fecha]') : $(CAMPO[k]);
    el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    intento = true;
    var d = datos(), errs = reglas(d), ks = ORDEN.filter(function (k) { return errs[k]; });
    ORDEN.forEach(function (k) { pintar(k, errs[k]); });
    if (errs.correo) form.querySelector('.mas').open = true;
    if (ks.length) {
      actualizarResumen(errs);
      if (ks.length === 1) irA(ks[0]); else { resumen.focus(); resumen.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    resumen.hidden = true;
    enviar.disabled = true;
    enviar.innerHTML = '<span class="giro" aria-hidden="true"></span> Apartando tu lugar…';

    fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, d, { origen: ORIGEN }))
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error('servidor'); e.detalle = j.error; throw e; }
          mostrarGracias(d);
        });
      })
      .catch(function (err) {
        resumen.innerHTML = cabecera(err.message === 'servidor'
          ? '<strong>' + (err.detalle || 'No pudimos guardar tu registro.') + '</strong> Tus datos siguen aquí; puedes volver a tocar «Apartar mi lugar».'
          : '<strong>Parece que no hay conexión.</strong> Tus datos siguen aquí; revisa tu internet y vuelve a tocar «Apartar mi lugar».');
        resumen.hidden = false; resumen.focus();
      })
      .then(function () {
        enviar.disabled = false;
        enviar.innerHTML = ENVIAR_HTML;
      });
  });

  // Sonido suave de confirmación (dos notas, sin archivos externos)
  function campanita() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      var ctx = new C(), t = ctx.currentTime;
      [[659.25, 0], [987.77, 0.14]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t + n[1]);
        g.gain.exponentialRampToValueAtTime(0.08, t + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.6);
        o.connect(g); g.connect(ctx.destination); o.start(t + n[1]); o.stop(t + n[1] + 0.65);
      });
      setTimeout(function () { ctx.close(); }, 1200);
    } catch (e) {}
  }

  // Confeti sutil detrás de la confirmación (un solo estallido, ~1.5 s)
  function confeti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var tarjeta = gracias.parentNode, ico = gracias.querySelector('.listo-icono');
    var cv = document.createElement('canvas'); cv.className = 'confeti'; cv.setAttribute('aria-hidden', 'true');
    tarjeta.insertBefore(cv, tarjeta.firstChild);
    var dpr = Math.min(window.devicePixelRatio || 1, 2), R0 = tarjeta.getBoundingClientRect(), Ri = ico.getBoundingClientRect();
    cv.width = R0.width * dpr; cv.height = R0.height * dpr;
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var ox = Ri.left - R0.left + Ri.width / 2, oy = Ri.top - R0.top + Ri.height / 2;
    var colores = ['#D9A441', '#4F6B22', '#071552', '#E8821E', '#C9CFEA', '#9DB36B'], piezas = [];
    for (var i = 0; i < 46; i++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5, vel = 3 + Math.random() * 5.5;
      piezas.push({ x: ox, y: oy, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, w: 4 + Math.random() * 4, h: 6 + Math.random() * 5,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: colores[i % colores.length], redondo: Math.random() < 0.3 });
    }
    var t0 = performance.now(), DUR = 1500;
    (function cuadro(t) {
      var k = (t - t0) / DUR;
      ctx.clearRect(0, 0, R0.width, R0.height);
      if (k >= 1) { cv.remove(); return; }
      ctx.globalAlpha = k < 0.6 ? 0.9 : 0.9 * (1 - (k - 0.6) / 0.4);
      piezas.forEach(function (q) {
        q.vy += 0.16; q.vx *= 0.985; q.vy *= 0.985; q.x += q.vx; q.y += q.vy; q.r += q.vr;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c;
        if (q.redondo) { ctx.beginPath(); ctx.arc(0, 0, q.w / 2, 0, 6.28); ctx.fill(); }
        else ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.r * 1.5)) + 1);
        ctx.restore();
      });
      requestAnimationFrame(cuadro);
    })(t0);
  }

  function mostrarGracias(d) {
    var nombre = d.nombre.split(/\s+/)[0];
    $('gracias-titulo').textContent = 'Listo, ' + nombre + '. Tu lugar está apartado.';
    $('gracias-fecha').textContent = FECHAS[d.fecha] + ', 6:00 p. m. (hora de la Ciudad de México)';
    $('gracias-whatsapp').textContent = d.whatsapp;
    var cal = $('gracias-calendario');
    if (GCAL[d.fecha]) {
      cal.hidden = false;
      cal.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Masterclass IA potenciada por humanos · Academia Global') +
        '&dates=' + GCAL[d.fecha] + '&ctz=America/Mexico_City&details=' + encodeURIComponent('Tres sesiones de 20 minutos. Los detalles de acceso llegan por WhatsApp.') + '&location=' + encodeURIComponent('En línea; el enlace de acceso llega por WhatsApp');
    } else { cal.hidden = true; }
    $('gracias-invitar').href = 'https://wa.me/?text=' + encodeURIComponent('Me registré a la masterclass «IA potenciada por humanos» de Academia Global, en línea el viernes 13 de noviembre a las 6:00 p. m. Regístrate aquí: ' + location.origin + location.pathname + '?origen=invitacion');
    form.hidden = true; gracias.hidden = false;
    campanita();
    confeti();
    // Anuncio en español para lectores de pantalla
    $('anuncio').textContent = 'Registro completado. ' + nombre + ', tu lugar está apartado para ' + FECHAS[d.fecha].replace(' (te confirmamos cuál)', '') + '. Te escribiremos por WhatsApp con los detalles.';
    gracias.scrollIntoView({ block: 'center', behavior: 'smooth' });
    gracias.focus({ preventScroll: true });
  }

  $('registro-corregir').addEventListener('click', function () {
    gracias.hidden = true; form.hidden = false; $('f-nombre').focus();
  });
  $('registro-otra').addEventListener('click', function () {
    form.reset(); intento = false; $('anuncio').textContent = '';
    ORDEN.forEach(function (k) { pintar(k, ''); });
    form.querySelector('.mas').open = false;
    gracias.hidden = true; form.hidden = false; $('f-nombre').focus();
  });

  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Video del hero: carga diferida, se respeta "reducir movimiento" y "ahorro de datos", con botón de pausa ----------
  var video = document.querySelector('.hero-foto video'), pausa = $('hero-pausa');
  var ahorro = navigator.connection && navigator.connection.saveData;
  var pantallaChica = window.matchMedia && matchMedia('(max-width: 900px)').matches;
  if (video && !reducir && !ahorro && !pantallaChica) {
    var pausadoPorUsuario = false;
    // MP4 (H.264) si el navegador lo reproduce; si no, WebM (VP9). Si falla uno, intenta el otro.
    var F = window.HERO_VIDEO || { mp4: video.getAttribute('data-src'), webm: video.getAttribute('data-webm') };
    var orden = video.canPlayType('video/mp4; codecs="avc1.640028"') ? [F.mp4, F.webm] : [F.webm, F.mp4];
    video.addEventListener('error', function () { if (orden.length) { video.src = orden.shift(); intenta(); } });
    video.src = orden.shift();
    video.addEventListener('playing', function () { video.classList.add('lista'); pausa.hidden = false; }, { once: true });
    var intenta = function () { var r = video.play(); if (r && r.catch) r.catch(function () {}); };
    intenta();
    var ICO_PAUSA = pausa.innerHTML;
    var ICO_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
    pausa.addEventListener('click', function () {
      pausadoPorUsuario = !video.paused;
      if (video.paused) intenta(); else video.pause();
      pausa.innerHTML = video.paused || pausadoPorUsuario ? ICO_PLAY : ICO_PAUSA;
      pausa.setAttribute('aria-label', pausadoPorUsuario ? 'Reproducir animación de fondo' : 'Pausar animación de fondo');
    });
    // Ahorra batería: se detiene cuando el hero sale de pantalla
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { if (!pausadoPorUsuario) intenta(); } else video.pause();
      }).observe(video);
    }
  }

  // ---------- Titular que se lee al hacer scroll, en dos tiempos ----------
  var titular = document.querySelector('.lectura');
  if (titular && !reducir) {
    (function partir(nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            var w = document.createElement('span'); w.className = 'w'; w.textContent = t; frag.appendChild(w);
          });
          nodo.replaceChild(frag, n);
        } else if (n.nodeType === 1) partir(n);
      });
    })(titular);
    var palabras = titular.querySelectorAll('.w');
    var corte = titular.querySelector('.em') ? titular.querySelectorAll('.em .w')[0] : null;
    var idxCorte = Array.prototype.indexOf.call(palabras, corte);
    var n1 = idxCorte > 0 ? idxCorte : palabras.length, n2 = palabras.length - n1;
    // Tiempo 1: primera frase entre 0 y 45 % del recorrido; pausa; tiempo 2: segunda frase entre 58 y 100 %
    var umbral = Array.prototype.map.call(palabras, function (w, i) {
      return i < n1 ? (i + 1) / n1 * 0.45 : 0.58 + (i - n1 + 1) / n2 * 0.42;
    });
    var pendiente = false;
    var pintarLectura = function () {
      pendiente = false;
      var r = titular.getBoundingClientRect(), vh = window.innerHeight;
      var prog = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.5)));
      for (var i = 0; i < palabras.length; i++) palabras[i].classList.toggle('on', prog >= umbral[i]);
    };
    window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; requestAnimationFrame(pintarLectura); } }, { passive: true });
    window.addEventListener('resize', pintarLectura);
    pintarLectura();
  }

  // ---------- Mariposa monarca: posada en "Michoacán", vuela hasta "Apartar mi lugar" ----------
  var mari = document.querySelector('.monarca'), palabra = $('michoacan'), cta = $('cta-hero'), portada = document.querySelector('.portada');
  if (mari && palabra && cta && portada) {
    var W = 64, H = 49, aterrizada = false;
    var pos = function (el, modo) {
      var p = portada.getBoundingClientRect(), r = el.getBoundingClientRect();
      return modo === 'inicio'
        ? { x: r.right - p.left + 8, y: r.top - p.top + r.height - H / 2 - 5 }   // justo después de la palabra, sin tapar la línea de arriba
        : { x: r.right - p.left - W * 0.78, y: r.top - p.top - H * 0.6 };              // en la esquina del botón
    };
    var colocar = function (q, rot) { mari.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px) rotate(' + (rot || 0) + 'deg)'; };
    var aterrizar = function () {
      aterrizada = true; mari.classList.remove('volando'); colocar(pos(cta, 'fin'), 10);
      cta.classList.remove('aterriza'); void cta.offsetWidth; cta.classList.add('aterriza');
    };
    var arrancar = function () {
      var heroEnPantalla = cta.getBoundingClientRect().bottom > 0 && portada.getBoundingClientRect().top > -50;
      if (reducir || !heroEnPantalla || !mari.animate) { aterrizar(); mari.classList.add('visible'); return; }
      var a = pos(palabra, 'inicio'), b = pos(cta, 'fin');
      colocar(a, -6); mari.classList.add('visible');
      // Curva de vuelo: sale hacia arriba y a la derecha y baja en arco hasta el botón, con un ligero vaivén
      var c1 = { x: a.x + 140, y: a.y - 90 }, c2 = { x: b.x + 170, y: b.y - 150 };
      var bez = function (t, k) { var u = 1 - t; return u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k]; };
      var frames = [], N = 28, prev = null;
      for (var i = 0; i <= N; i++) {
        var t = i / N, x = bez(t, 'x'), y = bez(t, 'y') + Math.sin(t * Math.PI * 5) * 7 * (1 - t);
        var rot = prev ? Math.max(-35, Math.min(35, Math.atan2(y - prev.y, x - prev.x) * 57.3 + 90)) : -6;
        if (i === N) rot = 10;
        frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + rot + 'deg)' });
        prev = { x: x, y: y };
      }
      setTimeout(function () {
        mari.classList.add('volando');
        var vuelo = mari.animate(frames, { duration: 2700, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' });
        vuelo.onfinish = function () { vuelo.cancel(); aterrizar(); };
      }, 1700); // primero se ve posada sobre "Michoacán"
    };
    window.addEventListener('resize', function () { if (aterrizada) colocar(pos(cta, 'fin'), 10); });
    var listo = function () { requestAnimationFrame(arrancar); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(listo); else window.addEventListener('load', listo);
  } else if (cta && !reducir) {
    // Versión sin mariposa: el botón late dos veces al cargar
    setTimeout(function () { cta.classList.add('aterriza'); }, 1400);
  }

  // Programa: las sesiones aparecen 1, 2, 3 al entrar en pantalla
  var sesiones = document.querySelector('.sesiones');
  if (sesiones) {
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { sesiones.classList.add('ver'); obs.disconnect(); setTimeout(function () { sesiones.classList.add('hecho'); }, 1700); }
      }, { threshold: 0.35 });
      obs.observe(sesiones);
    } else sesiones.classList.add('ver', 'hecho');
  }

  // CTA fijo en móvil: aparece al pasar el hero y se oculta al llegar al registro
  var barra = $('cta-movil'), hero = $('cta-hero'), registro = $('registro');
  if (barra && 'IntersectionObserver' in window) {
    var heroVisible = true, regVisible = false;
    var sync = function () {
      var v = !heroVisible && !regVisible;
      barra.classList.toggle('visible', v);
      barra.setAttribute('aria-hidden', v ? 'false' : 'true');
      barra.querySelector('a').tabIndex = v ? 0 : -1;
    };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; sync(); }).observe(hero);
    new IntersectionObserver(function (e) { regVisible = e[0].isIntersecting; sync(); }, { rootMargin: '0px 0px -30% 0px' }).observe(registro);
  }
})();
