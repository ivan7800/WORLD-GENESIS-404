
# WORLD GENESIS 404 — Alpha 0.28

Simulador de civilizaciones local-first. Abre `index.html` en un navegador para comenzar.

**Fase 28: historia dinámica.** Cada civilización registra etapa histórica (`origen`, `expansión`, `apogeo`, `decadencia`, `extinción`), año de inicio, máximos históricos de ciudades y población y hasta 24 transiciones de etapa. La ficha de civilización muestra su evolución y los grandes cambios se reflejan en las crónicas.

**Persistencia:** esquema v17, migración compatible con v16 y anteriores. La nueva historia se inicializa al recuperar partidas antiguas, sin inventar hitos previos no registrados.

**QA:** `node --check app.js` y `node tests/historical-life.cjs`. Más suites en `tests/`. Véase `QA-REPORT-0.28.md`. Las pruebas de navegador real y la regresión larga están pendientes.

**Estado:** Alpha. No publicado en GitHub.

## Alpha 0.29 — Cronología visual

Nueva pestaña CRONOLOGÍA en el observatorio, con filtro de civilización, sucesos históricos y un gráfico de barras de población muestreada cada diez años. Las muestras se guardan en JSON (hasta 150) y el esquema de guardado pasa a v18. Se mantienen migraciones de versiones anteriores, sin inventar muestras históricas faltantes.

Las pruebas son principalmente con DOM simulado; queda pendiente validar visualmente en navegadores reales.

## Alpha 0.30 — Planificación estratégica plurianual

Cada civilización conserva un plan estratégico con acción, motivo, inicio y caducidad (8 o 12 años). La planificación mantiene una prioridad durante su vigencia en vez de cambiarla cada turno, salvo crisis urgentes de abastecimiento o estabilidad. El panel de civilización y la diplomacia indican la fecha del plan; las crónicas registran su adopción. Las acciones económicas existentes siguen consumiendo recursos reales; esto no representa todavía una IA táctica completa.

**Persistencia:** esquema v19; los guardados v18 y anteriores se migran conservando sus datos, sin inventar planes históricos previos.

**QA:** `node --check app.js`, `node tests/strategic-planning.cjs` y suites de `tests/`. Las comprobaciones automatizadas usan DOM simulado; faltan pruebas de Chrome/Edge reales.

## Alpha 0.31 — Modo dios diplomático

Elegir dos reinos en el panel izquierdo permite otorgar ayuda, pacificar, mejorar o empeorar relaciones, imponer treguas a guerras existentes y firmar acuerdos comerciales. Las acciones dejan registro histórico y los cambios se guardan con el esquema v19.


## Alpha 0.32 — diseño premium
Nueva jerarquía visual, marco cartográfico, seis indicadores en tarjetas, estados de controles más claros, refinamiento de paneles y animación ambiental respetuosa con `prefers-reduced-motion`. Las capas decorativas del mapa usan `pointer-events:none` y no bloquean el canvas. Sin dependencias nuevas ni cambios de esquema.

## Alpha 0.33 — Optimización de rutas
Se incorpora caché acotada y temporal durante el cálculo de rutas comerciales, así como menor creación de objetos en A*. El formato de guardado no cambia (v19). Ver `QA-REPORT-0.33.md` para pruebas y límites de verificación.


## 1.0 RC1 — Fase 35
Candidata no certificada como estable. 16 pruebas automatizadas individuales observadas como PASS, prueba larga de resistencia agotó 25 segundos, resto de pruebas largas pendiente, navegador Chromium bloqueado por el entorno (`ERR_BLOCKED_BY_ADMINISTRATOR`). Ver QA-REPORT-1.0-RC1.md. Guardados v19 sin cambios.


## 1.0 RC2 (fase 36)
Prueba funcional abreviada: `node tests/quick-smoke.cjs`. Pruebas completas con clasificación por tiempos: `node tools/run-qa.cjs` (opcional `WG_QA_TIMEOUT_MS=30000`). Detalles y limitaciones: `QA-REPORT-1.0-RC2.md`. La candidata no está certificada como Stable.
