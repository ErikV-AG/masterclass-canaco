# IA potenciada por humanos · Masterclass Academia Global

Landing page con registro de interesados. Cada registro se guarda en una base de datos Postgres y puede consultarse en un panel protegido con contraseña, con opción de descarga en CSV para Excel.

## Estructura

- `server.js`: servidor Express; recibe los registros y sirve el panel.
- `public/index.html`: la página.
- `public/registro.js`: envío del formulario.
- `public/aviso-de-privacidad.html`: aviso simplificado (completar los campos entre corchetes).
- `public/img/`: imágenes optimizadas.

## Despliegue en Railway

1. Sube esta carpeta a un repositorio de GitHub.
2. En Railway: **New Project → Deploy from GitHub repo** y elige el repositorio.
3. En el mismo proyecto: **New → Database → PostgreSQL**.
4. En el servicio web, pestaña **Variables**, agrega:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `ADMIN_USER` = el usuario para el panel
   - `ADMIN_PASSWORD` = una contraseña segura
5. En **Settings → Networking**, usa **Generate Domain** para obtener la dirección pública.

La tabla se crea sola en el primer arranque.

Alternativa por terminal, con la CLI de Railway instalada: `railway login`, `railway init`, `railway up`.

## Consulta de registros

- Panel: `https://<tu-dominio>/admin`
- Descarga directa: `https://<tu-dominio>/admin/registros.csv`

El navegador pedirá el usuario y la contraseña definidos en las variables.

## Pendientes de contenido

En `public/index.html`, busca y reemplaza `[Horario]` y `[Sede o modalidad]` (aparecen tres veces cada uno). Completa los datos entre corchetes del aviso de privacidad.

## Prueba local

```
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/base ADMIN_USER=admin ADMIN_PASSWORD=prueba npm start
```
