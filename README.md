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

En `public/index.html`, Completa los datos entre corchetes del aviso de privacidad.

## Prueba local

```
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/base ADMIN_USER=admin ADMIN_PASSWORD=prueba npm start
```

## Rediseño de la landing (octubre 2026)

Solo cambian los archivos de `public/`; `server.js`, la base de datos, `/api/registro`, `/admin` y el CSV quedan igual.

- `public/index.html` y `public/registro.js`: nuevo diseño y formulario (mismos campos y valores que valida el servidor).
- Imágenes nuevas en `public/img/`: `portada-video.jpg`, `hero-loop.mp4`, `hero-loop.webm`, `restaurante-comal.jpg`, `hotel-patio.jpg`.
- Ya no se usan y se pueden borrar del repo: `hotel.jpg`, `huerta.jpg`, `restaurante.jpg`, `tienda.jpg`, `portada-huerta.jpg`.
- Pendientes de contenido en `index.html`: `[Correo de contacto]` y `[Teléfono o WhatsApp]`.

## Seguimiento por canal

Agrega `?origen=<canal>` al enlace que compartes (por ejemplo `?origen=facebook` o `?origen=whatsapp`; también se acepta `utm_source`). El canal se guarda con cada registro y el panel muestra el conteo por canal. Sin parámetro, el registro aparece como `directo`; quien llega desde el botón «Invitar por WhatsApp» de la confirmación aparece como `invitacion`.
