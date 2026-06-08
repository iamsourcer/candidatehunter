# candidatehunter — Landing page + repo público

## Qué es esto

Repo público en **github.com/iamsourcer/candidatehunter** que tiene dos propósitos:
1. **Landing page estática** hosteada en GitHub Pages (`index.html` → raíz del repo)
2. **Distribución de releases** — los `.zip` de Chrome y Firefox se suben como GitHub Releases y la página linkea directo a `releases/latest/download/`

## Stack / restricciones

- HTML + CSS + JS vanilla, sin frameworks, sin npm, sin build step
- Una sola página: `index.html` en la raíz (GitHub Pages sirve desde `main` / raíz)
- La vibe que buscamos: **divertida, con personalidad**, no solo corporate/clean — puede tener animaciones, micro-interacciones, humor, easter eggs
- Dark theme con la paleta ya definida (ver variables CSS en `index.html`)

## Paleta de colores actual

```css
--bg:      #0d0f14   /* fondo principal */
--surface: #151820   /* superficies elevadas */
--border:  #1e2330   /* bordes */
--advance: #057642   /* verde ADVANCE */
--archive: #c0392b   /* rojo ARCHIVE */
--blue:    #0073b1   /* azul LinkedIn */
--purple:  #7c3aed   /* acento principal */
--text:    #e8eaf0   /* texto */
--muted:   #8b92a5   /* texto secundario */
--card:    #181c27   /* fondo de cards */
```

## Estructura del repo

```
candidatehunter/
├── index.html      ← Landing page (GitHub Pages entry point)
├── chrome/         ← Vacío — para guardar source de Chrome extension
├── firefox/        ← Vacío — para guardar source de Firefox extension
├── README.md       ← README del repo (instalación, providers, etc.)
└── CLAUDE.md       ← Este archivo
```

## Estado actual del index.html

La página ya existe y tiene:
- Nav fijo con blur backdrop
- Hero con grid animado de fondo + glow radial
- Badge demo mostrando 87% ADVANCE / 41% ARCHIVE
- Botones de descarga Chrome + Firefox
- Sección Features (6 cards con hover)
- Sección "How it works" (4 pasos)
- Sección Download con tabs Chrome/Firefox para instrucciones de instalación
- Footer con links a GitHub

### Qué le falta / dirección "divertida"

Áreas donde agregar personalidad:
- Animaciones más llamativas en el hero (typewriter, partículas, contadores animados)
- Micro-interacciones en las cards
- Easter eggs (Konami code, click en el logo, etc.)
- Social proof o contador de usuarios/análisis
- Un "demo en vivo" simulado que muestre el popup analizando un perfil fake
- Testimonios con humor recruiter
- Más movimiento — la página actual es bonita pero estática

## Workflow de deploy

1. Editar `index.html` directamente (no hay build)
2. `git add index.html && git commit -m "..."` 
3. `git push origin main`
4. GitHub Pages actualiza automáticamente (configurar en repo Settings → Pages → Deploy from branch `main` / root)

## Releases

Los releases de la extensión se crean manualmente en GitHub:
- Tag: `v1.8`, `v1.9`, etc.
- Assets adjuntos: `candidatehunter-chrome.zip`, `candidatehunter-firefox.zip`
- Los botones de descarga en `index.html` apuntan a `releases/latest/download/` — se actualizan solos al subir un nuevo release

## Links clave

- Repo: https://github.com/iamsourcer/candidatehunter
- GitHub Pages: https://iamsourcer.github.io/candidatehunter (una vez activado)
- Releases: https://github.com/iamsourcer/candidatehunter/releases
