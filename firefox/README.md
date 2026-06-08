# LinkedIn Profile to JSON — Chrome Extension

Extensión de Chrome que extrae el perfil completo de LinkedIn y lo copia al clipboard como JSON.

---

## Cómo instalar

1. Abrí Chrome y andá a `chrome://extensions/`
2. Activá **Developer mode** (esquina superior derecha)
3. Click en **Load unpacked** y seleccioná esta carpeta
4. La extensión aparece en la barra de herramientas

## Cómo usar

1. Abrí un perfil de LinkedIn (`linkedin.com/in/...`)
2. Esperá que cargue completamente
3. Clickeá el ícono de la extensión
4. El botón muestra **"Extrayendo..."** por ~4-5 segundos — **no cierres el popup**
5. Cuando aparece **"¡Copiado!"**, el JSON está en tu clipboard
6. Pegalo donde quieras (Notion, editor, terminal, etc.)

---

## Estructura del JSON generado

```json
{
  "profile": {
    "name": "Jon Tarrico",
    "title": "Sr. Technical Recruiter I Sourcing Expert | ...",
    "location": "Mountain View, California, United States"
  },
  "about": "...",
  "experience": [
    {
      "title": "Recruiter & Sourcing Extraordinaire",
      "company": "128 Technology",
      "employment_type": "Contract",
      "period": "Jan 2021 - Oct 2021",
      "location": "Burlington, Massachusetts, United States",
      "description": "Part of Juniper Networks after its acquisition..."
    }
  ],
  "education": [
    { "school": "IFTS N° 18", "degree": "Associate of Science - AS, Computer Software Engineering", "period": "" }
  ],
  "certifications": [
    { "name": "LinkedIn Recruiter...", "issuer": "LinkedIn", "date": "Issued Nov 2024" }
  ],
  "skills": ["Recruiting", "Talent Acquisition", "Python", "Docker", "..."],
  "extractedAt": "2026-06-01T16:31:25.853Z"
}
```

---

## Arquitectura

```
manifest.json   — Permisos: activeTab, scripting, tabs + host_permissions para *.linkedin.com
popup.html      — UI mínima: un botón
popup.js        — Orquesta la extracción en tres pasos
content.js      — Extrae datos de la página de perfil principal
```

### Flujo de extracción (popup.js)

El proceso requiere tres páginas porque LinkedIn no expone la experiencia completa ni las skills en la página principal del perfil:

1. **Paso 1 — Perfil principal** (`/in/username/`)
   Inyecta `content.js` en la pestaña activa. Extrae: nombre, title, location, about, education, certifications, y las primeras ~5 experiencias visibles como fallback.

2. **Paso 2 y 3 — Tabs de fondo** (en paralelo)
   Abre `/details/experience/` y `/details/skills/` como tabs de fondo (`active: false`). El usuario no los ve. Espera 3 segundos para que React renderice, corre funciones de extracción auto-contenidas, cierra los tabs, y reemplaza los datos del paso 1 con los datos completos.

Si los tabs de fondo fallan (red, error de LinkedIn), el JSON igual se genera con los datos parciales del paso 1.

---

## Decisiones técnicas importantes

### Por qué se necesitan tabs de fondo
LinkedIn renderiza la experiencia completa y las skills en sub-páginas separadas (`/details/experience/`, `/details/skills/`). La página de perfil principal solo muestra las primeras ~5 experiencias. `fetch()` no funciona para estas sub-páginas porque son SPAs que requieren que JavaScript ejecute para cargar el contenido — `DOMParser` no ejecuta scripts. La única solución confiable es abrir las páginas en tabs reales.

### Por qué no se hace scroll para cargar más experiencias
LinkedIn usa `IntersectionObserver` para lazy-loading, pero las entradas adicionales de experiencia no están en el DOM inicial de la página principal — se cargan desde el servidor al navegar a `/details/experience/`. El scroll programático no las carga.

### Por qué no se usa `fetch()` desde content.js
Las sub-páginas de detalles son SPAs. El HTML que devuelve `fetch()` es el shell de la app sin datos — React no ejecuta. Para obtener el contenido renderizado se necesita un tab real.

### Cómo se extrae el title y location del perfil
Los selectores CSS de LinkedIn cambian frecuentemente. En vez de depender de clases como `.text-body-medium`, el código recorre todos los `span[aria-hidden="true"]` en orden DOM. El primer span significativo después del `h1` es el title; el segundo es la location.

### Cómo se agrupa la experiencia (date-anchor)
LinkedIn renderiza cada campo de texto (título, empresa, fechas) como un `<li>` separado. En vez de intentar parsear la estructura DOM, el código recolecta todos los spans en orden y usa las líneas de fecha como ancla: cuando encuentra una fecha, las dos líneas anteriores son el título del puesto y la empresa. Todo lo que viene después de la fecha hasta el próximo título es la descripción.

### Por qué certifications usa anchor "Issued"
LinkedIn muestra cada certificación como: nombre → emisor → "Issued Month Year" → "Show credential". El código usa la línea "Issued" como ancla para agrupar los tres campos correctamente.

---

## Limitaciones conocidas

- **El popup debe permanecer abierto** durante los ~4-5 segundos de extracción. Si se cierra, la operación se interrumpe.
- **Skills y experiencia completa** dependen de que LinkedIn cargue `/details/experience/` y `/details/skills/`. Si LinkedIn cambia esas URLs o bloquea la navegación, se usa el fallback de la página principal.
- **Descripciones truncadas**: si el usuario no expandió los "ver más" en la página antes de exportar, algunas descripciones pueden estar incompletas.
- **Profile title/location**: si LinkedIn cambia su estructura DOM, el fallback a selectores CSS puede no matchear. El nombre siempre se obtiene desde `document.title`.

---

## Archivos

| Archivo | Descripción |
|---|---|
| `manifest.json` | Configuración de la extensión (MV3) |
| `popup.html` | Interfaz: un botón |
| `popup.js` | Orquestación, tabs de fondo, copia al clipboard |
| `content.js` | Extracción desde la página de perfil principal |
