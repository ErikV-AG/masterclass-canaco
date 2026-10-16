'use strict';
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable DATABASE_URL. Conecta una base de datos Postgres en Railway.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5
});

async function prepararBase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id          SERIAL PRIMARY KEY,
      creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
      nombre      TEXT NOT NULL,
      negocio     TEXT NOT NULL,
      giro        TEXT NOT NULL,
      whatsapp    TEXT NOT NULL,
      correo      TEXT,
      fecha       TEXT NOT NULL,
      reto        TEXT
    )`);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Página principal con la URL pública inyectada (vista previa en WhatsApp y redes)
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replaceAll('%%PUBLIC_URL%%', PUBLIC_URL);
app.get(['/', '/index.html'], (req, res) => res.type('html').send(indexHtml));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', index: false }));

app.get('/health', (req, res) => res.json({ ok: true }));

// Límite simple: 8 registros por IP cada hora (la IP no se guarda)
const intentos = new Map();
function limitar(req, res, next) {
  const ahora = Date.now();
  const lista = (intentos.get(req.ip) || []).filter(t => ahora - t < 3600e3);
  if (lista.length >= 8) {
    return res.status(429).json({ error: 'Recibimos demasiados registros desde esta conexión. Inténtalo más tarde.' });
  }
  lista.push(ahora);
  intentos.set(req.ip, lista);
  next();
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, l] of intentos) if (!l.some(t => ahora - t < 3600e3)) intentos.delete(ip);
}, 600e3).unref();

const GIROS = ['Comercio', 'Restaurante o alimentos', 'Hotelería o turismo', 'Servicios', 'Agroindustria', 'Otro'];
const FECHAS = { '6 nov': 'Viernes 6 de noviembre', '13 nov': 'Viernes 13 de noviembre', 'cualquiera': 'Cualquiera de las dos' };
const limpiar = (v, max) => String(v ?? '').trim().slice(0, max);

app.post('/api/registro', limitar, async (req, res) => {
  const b = req.body || {};
  if (limpiar(b.sitio_web, 200)) return res.json({ ok: true }); // trampa para bots

  const d = {
    nombre: limpiar(b.nombre, 120),
    negocio: limpiar(b.negocio, 160),
    giro: limpiar(b.giro, 60),
    whatsapp: limpiar(b.whatsapp, 30),
    correo: limpiar(b.correo, 160).toLowerCase(),
    fecha: limpiar(b.fecha, 20),
    reto: limpiar(b.reto, 1500)
  };
  if (!d.nombre || !d.negocio) return res.status(400).json({ error: 'Escribe tu nombre y el nombre de tu negocio.' });
  if (!GIROS.includes(d.giro)) return res.status(400).json({ error: 'Selecciona el giro de tu negocio.' });
  if (d.whatsapp.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Escribe un número de WhatsApp de 10 dígitos.' });
  if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo)) return res.status(400).json({ error: 'Revisa el correo electrónico; parece incompleto.' });
  if (!FECHAS[d.fecha]) return res.status(400).json({ error: 'Elige la fecha que prefieres.' });

  try {
    await pool.query(
      'INSERT INTO registros (nombre, negocio, giro, whatsapp, correo, fecha, reto) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [d.nombre, d.negocio, d.giro, d.whatsapp, d.correo || null, FECHAS[d.fecha], d.reto || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar registro:', err.message);
    res.status(500).json({ error: 'No se pudo guardar tu registro. Inténtalo de nuevo en unos minutos.' });
  }
});

// ---------- Panel de consulta protegido ----------
function igual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function soloAdmin(req, res, next) {
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return res.status(503).send('Panel deshabilitado: define ADMIN_USER y ADMIN_PASSWORD en las variables del servicio.');
  }
  const [tipo, valor] = (req.headers.authorization || '').split(' ');
  if (tipo === 'Basic' && valor) {
    const [u, ...p] = Buffer.from(valor, 'base64').toString().split(':');
    if (igual(u, ADMIN_USER) && igual(p.join(':'), ADMIN_PASSWORD)) {
      res.set('Cache-Control', 'no-store');
      res.set('X-Robots-Tag', 'noindex');
      return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="Registros masterclass", charset="UTF-8"');
  res.status(401).send('Acceso restringido.');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaMx = t => new Date(t).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });

app.get('/admin', soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM registros ORDER BY creado_en DESC');
    const conteo = campo => Object.entries(rows.reduce((m, r) => (m[r[campo]] = (m[r[campo]] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li>${esc(k)}: <strong>${v}</strong></li>`).join('');
    const filas = rows.map(r => `<tr>
      <td>${esc(fechaMx(r.creado_en))}</td><td>${esc(r.nombre)}</td><td>${esc(r.negocio)}</td><td>${esc(r.giro)}</td>
      <td><a href="https://wa.me/52${esc(r.whatsapp.replace(/\D/g, '').slice(-10))}">${esc(r.whatsapp)}</a></td>
      <td>${esc(r.correo)}</td><td>${esc(r.fecha)}</td><td class="reto">${esc(r.reto)}</td></tr>`).join('');
    res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Registros · Masterclass CANACO Uruapan</title>
<style>
body{margin:0;font-family:Poppins,'Segoe UI',Helvetica,sans-serif;background:#F5F3EC;color:#1B1F36}
header{background:#071552;color:#fff;padding:1.5rem}
main{padding:1.5rem;max-width:1400px;margin:0 auto}
h1{margin:0;font-size:1.5rem}
.res{display:flex;flex-wrap:wrap;gap:2rem;margin-bottom:1.5rem}
.res ul{margin:.25rem 0 0;padding-left:1.1rem}
a.btn{display:inline-block;background:#4F6B22;color:#fff;padding:.7rem 1.2rem;border-radius:999px;text-decoration:none;font-weight:600;margin-bottom:1.5rem}
.tabla{overflow-x:auto;background:#fff;border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{padding:.6rem .8rem;border-bottom:1px solid #ECE8DC;text-align:left;vertical-align:top}
th{background:#EAE6D9;position:sticky;top:0}
td.reto{min-width:260px}
</style></head><body>
<header><h1>Registros de interesados: ${rows.length}</h1></header>
<main>
<div class="res">
<div><strong>Por fecha</strong><ul>${conteo('fecha') || '<li>Sin registros todavía</li>'}</ul></div>
<div><strong>Por giro</strong><ul>${conteo('giro') || '<li>Sin registros todavía</li>'}</ul></div>
</div>
<a class="btn" href="/admin/registros.csv">Descargar CSV para Excel</a>
<div class="tabla"><table>
<thead><tr><th>Fecha de registro</th><th>Nombre</th><th>Negocio</th><th>Giro</th><th>WhatsApp</th><th>Correo</th><th>Fecha preferida</th><th>Qué quiere resolver</th></tr></thead>
<tbody>${filas || '<tr><td colspan="8">Todavía no hay registros. Comparte la página para empezar a recibirlos.</td></tr>'}</tbody>
</table></div>
</main></body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('No se pudo leer la base de datos. Revisa la variable DATABASE_URL.');
  }
});

app.get('/admin/registros.csv', soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM registros ORDER BY creado_en ASC');
    const celda = v => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
      return `"${s.replace(/"/g, '""')}"`;
    };
    const enc = ['Fecha de registro', 'Nombre', 'Negocio', 'Giro', 'WhatsApp', 'Correo', 'Fecha preferida', 'Qué quiere resolver'];
    const lineas = [enc.map(celda).join(',')].concat(rows.map(r =>
      [fechaMx(r.creado_en), r.nombre, r.negocio, r.giro, r.whatsapp, r.correo, r.fecha, r.reto].map(celda).join(',')));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="registros-masterclass-canaco.csv"');
    res.send('\uFEFF' + lineas.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).send('No se pudo generar el archivo.');
  }
});

prepararBase()
  .then(() => console.log('Tabla de registros lista.'))
  .catch(err => console.error('No se pudo preparar la base de datos:', err.message))
  .finally(() => app.listen(PORT, () => console.log(`Sitio en ${PUBLIC_URL} (puerto ${PORT})`)));
