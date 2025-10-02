# webbayern
# ⚽️ BayernLive — Retransmisión de Partidos + Marcador en Vivo

**BayernLive** es una página web lista para emitir tus partidos en **Twitch** con **marcador en tiempo real**, **cronómetro**, **alineaciones con cartas**, **banquillo**, y una **tabla de estadísticas** que se alimenta automáticamente desde un **CSV de Google Sheets**.  
Todo corre en **HTML + CSS + JS** y se sincroniza con **Firebase Realtime Database**. ¡Simple, rápido y gratuito!

---

## ✨ Funcionalidades

- 🎥 **Player de Twitch embebido** (elige tu canal y listo).
- 🧮 **Marcador en vivo** (nombres y goles de Local/Visitante).
- ⏱️ **Cronómetro** con iniciar/pausar/reset y minuto de inicio.
- 🧩 **Alineación en el campo** (slots GK/DF/M/ST) + **Suplentes**.
- 📊 **Estadísticas automáticas** desde un **CSV (Google Sheets)**.
- 🔐 **Acceso con PIN**:
  - **Admin** (`4321`): ve y usa los paneles de control.
  - **Espectador** (`1234`): solo visualiza el directo y el marcador.
- 🖥️ **Pantalla completa** para usar como overlay en stream o proyector.
- 📱 **Responsive** para móvil/tablet/PC.

---

## 🧱 Stack

- Front: **HTML / CSS / JavaScript (vanilla)**
- Datos en vivo: **Firebase Realtime Database**
- Vídeo: **Twitch Embed Player**
- Hosting recomendado: **Firebase Hosting**

---

## 📂 Estructura del proyecto

```
public/
├─ index.html          # Estructura de la página
├─ visual.css          # Estilos (responsive + UI)
├─ app.js              # Lógica (marcador, timer, lineup, stats, Twitch)
└─ assets/ ...         # (opcional) imágenes, iconos, etc.
firebase.json
.firebaserc
```

**Rutas en Firebase Realtime DB** que usa la app:
```
matches/current       # { nameA, nameB, scoreA, scoreB, seconds, running, ... }
lineup                # { GK:{name,img}, DF1:{...}, DF2:{...}, M1:{...}, M2:{...}, M3:{...}, ST:{...} }
subs                  # { S1:{name,img}, S2:{...}, ..., S6:{...} }
ui                    # { formation: "1-2-3-1", statsCsvUrl: "https://..." }
```

---

## 🚀 Puesta en marcha (local)

1. Abre `index.html` en tu navegador… **o** sirve la carpeta `public/` con un servidor estático (opcional).
2. En `app.js`, revisa estas dos cosas:
   - **Canal de Twitch** (por defecto: `Bayerndeloscaidos2020`).
   - **PINs**: `ADMIN_PIN = "4321"` y `VIEWER_PIN = "1234"` (cámbialos si quieres).
3. Configura tu **Firebase** (usa las claves públicas de tu proyecto en `firebaseConfig`).

> _Nota:_ La configuración de Firebase expuesta en el front (`apiKey`, etc.) es normal para apps web. Aun así, limita los **permisos** de tu **Realtime Database** con reglas.

---

## 🌐 Despliegue en Firebase Hosting

> Necesitas **Node/npm** y **Firebase CLI**.

```bash
npm i -g firebase-tools
firebase login
firebase init hosting      # selecciona tu proyecto y carpeta 'public'
firebase deploy --only hosting
```

### Cache recomendado (opcional)
En `firebase.json` puedes controlar el caché:
```json
{
  "hosting": {
    "public": "public",
    "headers": [
      { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/**/*.@(js|css|png|jpg|svg)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
    ]
  }
}
```

---

## 📊 Conectar Google Sheets (CSV)

1. En tu hoja, deja una **fila de cabeceras** y luego datos.  
   La app reconoce alias comunes (con o sin acentos/mayúsculas/espacios):
   - `slot`, `id`, `posicion`
   - `nombre`, `name`
   - `goles` / `goals`
   - `asistencias` / `assists` / `asists`
   - **`partidos jugados`** / `pj` / `partidos` / `matches played` / `matches` / `apps` / `appearances`
   - `ta` / `amarillas` / `yellow`
   - `tr` / `rojas` / `red`
   - `valoracion` / `rating`

2. Publica la hoja como **CSV** (o consigue un enlace CSV directo).
3. En la web (panel Admin) pega el **URL del CSV** y pulsa **Guardar**.

> Tip: si cambias nombres o slots en la DB (`lineup`/`subs`), refresca la tabla con **“Actualizar”**.

---

## 🛠️ Personalización rápida

- **Canal de Twitch**: edita `mountTwitch()` en `app.js`.
- **Formaciones**: ajusta las coordenadas en el objeto `FORMATIONS`.
- **Cartas de jugador**: clic en una carta (modo admin) para editar `name`/`img`.
- **Estilos**: modifica `visual.css` (tema, tamaños, sombras, etc.).
- **PINs**: cambia `ADMIN_PIN` y `VIEWER_PIN`.

---

## 🔒 Seguridad (importante)

- Los **PINs** son una **capa de UI**, no un sistema de autenticación real.
- Protege tu **Realtime Database** con **Rules** para evitar escrituras no autorizadas.
- Para un control de acceso serio, añade **Auth** (por ejemplo, correo/contraseña) y escribe Rules que lo exijan.

---

## 🧩 Roadmap

- Drag & drop real de cartas en el campo.
- Editor visual de formaciones.
- Historial de eventos del partido (goles, TA/TR) con timeline.
- Exportación de estadísticas a CSV/Sheets.
- Modo multi-partido.

---

## ❓ FAQ / Problemas comunes

- **El player de Twitch no carga**  
  Asegúrate de que el **hostname** está en el parámetro `parent` del iframe. La app usa `window.location.hostname` automáticamente, pero en entornos raros puede requerir revisar la URL final del iframe.

- **La columna “Partidos Jugados” no aparece**  
  Verifica que el encabezado coincide con alguno de los alias aceptados o corrige espacios “rariños” (NBSP). La app ya normaliza acentos/espacios/bom.

- **No veo los cambios de código tras deploy**  
  Revisa el caché (`firebase.json` arriba) y recarga dura (Ctrl+F5). Los datos en DB sí se actualizan en vivo.

---

## 🤝 Contribuir

1. Haz un fork, crea una rama: `feat/lo-que-sea`.
2. `npm run lint` (si añades linter) y pruebas manuales.
3. Pull Request con descripción clara y captura/s.

---

## 📜 Licencia

Pendiente de definir por el autor.

---

Hecho con 💙 para el **Bayern de los Caídos**.
