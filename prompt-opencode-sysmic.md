
## PROMPT

Eres un ingeniero frontend construyendo el sitio web público de **Sysmic**, equipo
universitario de robótica (RoboCup Small Size League y VSSS). El sitio actual vive en
`https://sysmic.gitlab.io/` y se publica vía **GitLab Pages** (sitio estático, sin build
step). Vas a reemplazarlo por una versión nueva manteniendo esa misma filosofía: **HTML +
CSS + JS puro, sin bundler, sin framework, múltiples páginas**.

### 0. Restricciones técnicas obligatorias

- No uses Node/npm/Vite/React ni ningún paso de build. Todo debe abrirse directo en el
  navegador y desplegarse tal cual en GitLab Pages.
- Todas las páginas comparten un mismo `<nav>` y `<footer>` (cópialos manualmente en cada
  `.html`, no hay generador de sitios).
- Usa **anime.js** (https://animejs.com, la librería, no otra) para toda animación
  scroll-driven basada en JavaScript. Impórtalo vía CDN.
- El efecto del header de Inicio (sección 2) debe usar **CSS Scroll-driven Animations
  nativas** (`animation-timeline: scroll()`), igual que este demo de referencia:
  https://scroll-driven-animations.style/demos/cover-to-fixed-header/css/ — Nota:
  esta API solo funciona en Chrome/Edge 115+. Añade una clase de fallback (`prefers-reduced-motion`
  y `@supports not (animation-timeline: scroll())`) que muestre el header fijo desde el
  inicio sin animación, para que el sitio no se rompa en Firefox/Safari.
- Responsive obligatorio (mobile-first), `prefers-reduced-motion` respetado en TODAS las
  animaciones (anime.js y CSS), foco de teclado visible en todo elemento interactivo.

### 1. Estructura de archivos a crear

```
/
├── index.html            (Inicio)
├── quienes-somos.html    (Historia + Quiénes somos + Auspiciadores)
├── ssl.html              (RoboCup SSL — robot que se desarma con el scroll)
├── vsss.html             (RoboCup VSSS — foto + explicación simple)
├── tdp.html              (Team Description Papers — listado descargable)
├── contacto.html         (Contacto + redes sociales)
├── /css
│   ├── base.css          (variables de diseño, nav, footer, tipografía compartida)
│   ├── home.css          (solo estilos del efecto cover-to-fixed-header)
│   └── ssl.css           (solo estilos de la página SSL)
├── /js
│   ├── nav.js            (menú responsive / hamburguesa)
│   └── ssl-explode.js    (three.js + anime.js: carga y desarma el robot)
├── /assets
│   ├── /img              (copiar todo el contenido de la carpeta img/ que se te indica abajo)
│   ├── /models            (copiar aquí ssl_urdf/robot.urdf y ssl_urdf/assets/*.stl)
│   └── /papers            (copiar aquí los PDFs de la carpeta docs/ indicada abajo)
```

### 2. Assets de origen (rutas locales — AJUSTA a tu máquina)

- Fotos e imágenes (auspiciadores, robot, cancha, logo): carpeta
  `Sysmic_web/img/` — contiene `colaborador-caleuche.png`, `colaborador-logo-di.png`,
  `colaborador-logo-ire.png`, `colaborador-logo-usm-electronica.jpg`,
  `colaborador-utfsm.jpg`, `logo_sysmic.png`, `robocup.jpeg`, `robot ssl.JPG`,
  `robot+radio.JPG`, `ssl_cancha.JPG`. Cópialas completas a `/assets/img/`
  (renombra a minúsculas y sin espacios: `robot-ssl.jpg`, `robot-radio.jpg`, etc.,
  actualizando todas las referencias).
- Modelo del robot: carpeta `Sysmic_web/ssl_urdf/` — usa `robot.urdf` como archivo
  raíz. Este URDF referencia las piezas en `Sysmic_web/ssl_urdf/assets/*.stl`
  (`base_back.stl`, `base_cap.stl`, `base_case_body.stl`, `base_case_top.stl`,
  `base_corona.stl`, `base_dado.stl`, `base_front.stl`, `base_lateral.stl`,
  `base_link.stl`, `base_motor.stl`, `battery.stl`, `board.stl`, `dribbler_base.stl`,
  `dribbler_motor.stl`, `dribbler_tapa.stl`, y cualquier otro `.stl` presente en esa
  carpeta que no esté listado aquí — inspecciona la carpeta completa, esta lista puede
  estar incompleta). Ignora los archivos `.slx`, `.avi`, `.git`, `slprj`,
  `config.json` y `.code-workspace`: no son necesarios para la web.
- Papers/TDP: carpeta `Sysmic_web/docs/` — contiene `2014_TDP_IRSS_Deluxe.pdf`,
  `2018_TDP_AIS.pdf`, `2019_TDP_Sysmic_Robotics.pdf`, `AIS: Artificial Intelligent
  Soccer.pdf`, `Batch Reinforcement Learning on a RoboCup Small Size League keepaway
  strategy learning problem (2018).pdf`. Copia todos tal cual a `/assets/papers/`.

### 3. Especificación página por página

**`index.html` (Inicio)**
- Sección 1: full-height cover card con el nombre "Sysmic" y una foto del robot o de
  la cancha SSL de fondo (`ssl_cancha.jpg` o `robot-ssl.jpg`). Al hacer scroll, esta
  cover se contrae y se convierte en un header fijo delgado (igual que el demo CSS
  referenciado en la sección 0), no cambies ese comportamiento.
- Sección 2 en adelante (dirección visual: inspírate en el tono editorial y cinematográfico
  de https://www.tagheuer.com/fr/en/tag-heuer-connected-calibre-e5/collection-connected.html
  — tipografía grande y disciplinada, mucho espacio en blanco/negro, imágenes a pantalla
  completa, transiciones lentas y deliberadas. NO copies su paleta ni su contenido, solo
  la sensación de producto premium; adapta la identidad a robótica/tech, no a relojería):
  resumen breve de qué es Sysmic + qué es RoboCup, con link a `quienes-somos.html`.
- Sección de auspiciadores: logos de `colaborador-*` en grilla, cada uno con su nombre.
- CTA final a redes sociales (Facebook, Instagram, GitLab — usa las URLs reales del sitio
  actual: facebook.com/sysmicusm, instagram.com/sysmic_robotics_usm, gitlab.com/sysmic).

**`quienes-somos.html`**
- Historia del equipo (texto placeholder marcado claramente con `<!-- TODO: contenido real -->`
  si no tienes el texto real — NO inventes fechas ni datos específicos de Sysmic).
- Sección "Quiénes somos" con foto de `robocup.jpeg`.
- Reutiliza la sección de auspiciadores del home o enlázala.

**`ssl.html`**
- Recrea el efecto de "exploded view" del robot SSL sincronizado al scroll (chasis,
  ruedas, dribbler, kicker, PCB, patrón de visión van separándose a medida que el
  usuario baja, cada uno con su texto explicativo).
- Carga el modelo real: usa `three.js` + `URDFLoader` (paquete `urdf-loader` de
  gkjohnson, o si no está disponible por CDN, escribe un loader propio que lea
  `robot.urdf` y cargue cada `.stl` referenciado con `STLLoader` de three.js,
  posicionándolos según los `<origin>` del URDF).
- El *scroll-driven tweening* de las posiciones (armado → explotado) debe hacerse con
  **anime.js**, no con GSAP: anima valores numéricos (progreso 0→1 por pieza) usando la
  API de anime.js, y aplica esos valores a las posiciones de los objetos three.js en el
  loop de render.
- Si por peso/complejidad el URDF no carga bien en el navegador, dejar un fallback con
  geometría simple (cajas/cilindros) en el mismo layout, para que la página nunca quede
  rota, con un comentario indicando que es fallback.

**`vsss.html`**
- Página simple: foto + texto explicativo de qué es VSSS (Very Small Size Soccer).
  No hay foto real disponible todavía — usa un placeholder visual claro y un comentario
  `<!-- TODO: reemplazar por foto real del robot VSSS -->`.

**`tdp.html`**
- Lista los papers de `/assets/papers/` como tarjetas descargables: título, año (si el
  nombre del archivo lo indica), y botón "Descargar PDF" apuntando al archivo real.
  Usa estos títulos legibles:
  - 2014 — TDP IRSS Deluxe
  - 2018 — TDP AIS
  - 2019 — TDP Sysmic Robotics
  - AIS: Artificial Intelligent Soccer
  - Batch Reinforcement Learning on a RoboCup Small Size League keepaway strategy
    learning problem (2018)

**`contacto.html`**
- Formulario de contacto simple (sin backend — deja claro con un comentario que falta
  conectar a un servicio como Formspree o similar) + enlaces a redes sociales.

### 4. Entregable y checklist final

Al terminar, verifica y reporta explícitamente:
- [ ] Todas las páginas abren sin errores de consola en Chrome.
- [ ] El header cover-to-fixed funciona en Chrome/Edge y degrada correctamente en Firefox/Safari.
- [ ] El robot en `ssl.html` carga el modelo real (no el placeholder) al menos en Chrome.
- [ ] Los 5 PDFs están en `/assets/papers/` y son descargables desde `tdp.html`.
- [ ] Todas las imágenes de `/assets/img/` se usan al menos una vez en el sitio.
- [ ] `prefers-reduced-motion` desactiva las animaciones grandes en todas las páginas.
- [ ] El sitio es usable en un viewport de 375px de ancho.

No inventes contenido histórico ni cifras técnicas del equipo que no estén en los
archivos provistos — donde falte contenido real, deja un placeholder marcado con TODO.
