# Actualización — Cotizador FerreExpress

**Fecha:** 1 de agosto de 2026
**Estado:** implementado y verificado.
**Objetivo:** que la app se sienta rápida y cómoda para los administradores que la usan a diario.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Conversión Comercial ↔ Obra | **Los precios NO se tocan.** El precio digitado es el precio, siempre con IVA incluido. Lo único que cambia es cómo se calcula el total. |
| Pestañas | Barra **global** (visible en Historial y Cotizador) con **autoguardado** al cambiar de pestaña. Sobreviven al cerrar el navegador. |
| Rendimiento | **Refactor completo**: estado compartido, guardado con debounce, memoización y paginación. |

---

## 1. Rendimiento — la raíz del problema

Hoy cada página (`HistorialPage` y `CotizadorPage`) llama a `useCotizaciones()`, y **cada llamada crea su propia copia del estado**: su propio parseo de `localStorage`, su propio intervalo de sincronización de 30 s y su propia descarga completa de la tabla de Supabase. Además se reescribe **todo** el JSON de cotizaciones en `localStorage` en cada cambio de estado.

### Qué se hace

**1.1 — Estado compartido (`CotizacionesProvider`)**
Nuevo archivo `src/context/CotizacionesProvider.jsx`. Toda la lógica de `useCotizaciones` se monta **una sola vez** en `App.jsx`.
`useCotizaciones()` pasa a ser un consumidor del contexto y **mantiene exactamente la misma API**, así que las páginas no cambian su forma de usarlo.
Efecto: una sola sincronización con la nube en vez de una por página, y el Historial se actualiza solo cuando guardas desde una pestaña.

**1.2 — Guardado con debounce**
`localStorage` se escribe 400 ms después del último cambio, no en cada tecla. Se fuerza el guardado al cerrar la pestaña (`beforeunload`) y al ocultarla (`visibilitychange`), así no se pierde nada.

**1.3 — Sincronización más liviana**
El intervalo pasa de 30 s a 60 s y **se salta cuando la pestaña está en segundo plano**. Se conserva la sincronización al volver el foco y el botón manual de la nube.

**1.4 — Índice de búsqueda incremental**
Hoy el índice de búsqueda se reconstruye entero cada vez que cambia cualquier cotización. Pasa a cachearse por `id + updatedAt`: solo se recalcula lo que realmente cambió.

**1.5 — Memoización de filas y tarjetas**
La fila de la tabla se extrae a un componente `FilaCotizacion` memoizado, y `CotizacionCard` se envuelve en `memo`. Cambiar el estado de una cotización deja de re-renderizar la lista completa. `stats` pasa a `useMemo`.

---

## 2. Paginación en el Historial

- Selector de tamaño: **5** (por defecto) · 10 · 20 · 50 · Todas.
- La preferencia se recuerda en `localStorage` (igual que la vista tabla/tarjetas).
- Navegación: `‹ 1 2 3 … ›` + salto directo a página, con el texto **"Mostrando 1–5 de 128"**.
- Funciona igual en vista tabla y en vista tarjetas.
- La página vuelve a 1 automáticamente al cambiar búsqueda, filtros u orden.
- Si el filtro reduce los resultados, la página se ajusta sola (nunca queda en una página vacía).

**Esto es lo que resuelve la lentitud principal:** hoy se pintan las N cotizaciones de golpe; con esto se pintan 5.

---

## 3. Pestañas de cotizaciones abiertas

Nuevo `src/components/TabsBar.jsx` + estado en el provider, persistido en `localStorage`.

**Comportamiento**

- Abrir una cotización (desde el historial o por URL) la añade como pestaña y la activa.
- Una cotización nueva sin guardar aparece como pestaña **"Nueva"**; al guardarse, la pestaña se convierte en `COT-XXX` **en el mismo sitio**, sin saltos.
- Etiqueta: `COT-045 · Nombre del cliente` (truncado) con un punto de color según Comercial / Obra.
- **Cerrar:** botón `×`, clic con la rueda del ratón, o menú contextual → *Cerrar* / *Cerrar las demás* / *Cerrar todas*.
- Al cerrar la pestaña activa salta a la vecina; si no queda ninguna, vuelve al Historial.
- **Autoguardado:** si al cambiar de pestaña hay cambios sin guardar, se guardan solos. Sin modales interrumpiendo.
- Máximo 12 pestañas con scroll horizontal, para que la barra nunca se coma la pantalla.
- Atajos: `Alt+1` … `Alt+9` para saltar de pestaña.

**Nota técnica:** hay que envolver las rutas en un layout común en `App.jsx` para que la barra sea global. Las barras superiores de cada página se bajan para no quedar tapadas.

---

## 3 bis. Segunda ronda de rendimiento (tras probar la app)

Al probarla se seguía sintiendo lenta al escribir. Estas eran las causas:

- **Animación de posición en cada fila.** Cada fila de productos usaba la animación `layout` de framer-motion, que mide en el DOM dónde está cada fila en cada render — un recálculo forzado del navegador por cada tecla. Lo mismo ocurría en el panel de resumen y en las tarjetas de móvil. Medido en la copia de pruebas: **de 24 mediciones forzadas por cada 6 pulsaciones a 0**. Se pierde la transición al reordenar filas; en una tabla de captura de datos, teclear fluido vale más.
- **Los tres paneles se dibujaban siempre.** Empresa, Cliente y Config se renderizaban en cada tecla aunque solo se viera uno. Ahora la pestaña es perezosa (`isLazy`).
- **El atajo de teclado de la tabla dependía de `items`**, así que se recreaba en cada tecla y anulaba la memoización de toda la tabla. Ahora lee los ítems de una referencia.
- **`onChangeTipo` se recreaba en cada render** y tumbaba la memoización del panel de configuración.
- **La nube se descargaba entera** cada 60 s y en cada vuelta a la ventana. Ahora solo se piden las cotizaciones modificadas desde la última sincronización; la primera carga de cada sesión sigue siendo completa y sirve de red de seguridad.

## 4. Convertir Comercial ↔ Obra

**Regla acordada: los precios de los productos no se modifican, y el total tampoco.** El número que digitaste es el que queda.

Ejemplo real: *bulto cemento gris, 12 × 33.000*.

| | Comercial | Obra |
|---|---|---|
| Precio unitario | 33.000 | 33.000 (el mismo) |
| Desglose | P. s/IVA 27.731 + IVA 5.269 | sin discriminar |
| **Total** | **396.000** | **396.000** |

Lo que sí cambia al convertir: el desglose de IVA desaparece, la forma de pago pasa a las de obra (Anticipo + Actas) y las notas cambian a las de obra — estas últimas solo si no las habías editado a mano.

**El AIU queda en cero.** Una cotización de obra es, ante todo, los mismos precios sin discriminar IVA. Si un trabajo concreto necesita Administración, Imprevistos o Utilidad, se escriben los porcentajes en el modal (o en el panel Config) y el total los recoge al momento. Cuando están en cero, sus líneas **no se imprimen** ni en el resumen ni en el PDF, así que el cliente recibe un documento limpio: productos y total.

Las cotizaciones de obra ya guardadas conservan el AIU con el que se crearon, así que este cambio no altera su matemática.

**Modal de confirmación** — antes de aplicar muestra:

- **Total actual vs. total resultante**, calculado de verdad con los ítems reales. Así ves el impacto exacto antes de aceptar.
- Los **% de AIU editables ahí mismo**: si quieres que el total no se mueva, los pones en 0 sin salir del modal.
- Aviso claro de que los precios no se tocan.

**Detalles de seguridad**

- Las notas solo se cambian si siguen siendo las de por defecto. Si las editaste a mano, se respetan y el modal te avisa.
- La forma de pago solo cambia si la actual no existe en el tipo destino.
- Las marcas de "sin IVA" (transporte) se conservan, así que **convertir ida y vuelta devuelve la cotización a su estado original**.

**Dónde se puede convertir**

1. En el Cotizador: en el chip "Tipo" del panel Config y en la insignia OBRA/COMERCIAL de la barra superior.
2. En el Historial: nueva opción del menú de cada cotización → *Convertir a Obra* / *Convertir a Comercial* (convierte y guarda de una).

También corrige un fallo actual: hoy el chip "Tipo" reabre el modal inicial y **sobrescribe tus notas personalizadas sin avisar**.

---

## 4 bis. Documento nuevo — cotización y remisión

El PDF anterior ocupaba media hoja y tenía diez columnas. Se rehízo entero.

**Hoja carta completa.** El documento mide exactamente 216 × 279 mm y se arma en columna flexible: la tabla de productos ocupa el centro y se estira. Con 3 productos queda espacio dentro del recuadro; con 25 se llena. En ambos casos la hoja está completa y el pie queda anclado abajo. Antes el documento medía lo que midiera el contenido, y por eso quedaba media página en blanco. El PDF pasó de A4 a carta, que es lo que cargan las impresoras sin ajustes.

**Datos de entrega.** Se añadió el campo **dirección**, que no existía — sin él el documento no sirve como remisión de domicilio. Nombre, dirección y celular van arriba en el formulario, marcados como obligatorios y con un aviso si falta alguno. Empresa, NIT, contacto, correo y ciudad quedan abajo como opcionales y solo se imprimen si están diligenciados.

**Tabla de seis columnas.** Se quitaron código, precio sin IVA, IVA unitario y la columna de descuento (esta última aparece sola si alguna línea la usa). El valor unitario impreso es el precio real del producto, con IVA incluido; el IVA sigue discriminado en el resumen del pie.

**Observaciones y firma.** Campo de observaciones nuevo, independiente de las notas legales: lo que escribas en la app sale impreso en el recuadro del pie, y debajo quedan renglones para escribir a mano sobre la hoja. El bloque de «Recibí conforme» con firma, nombre y cédula, y fecha de entrega va siempre: en una cotización simplemente queda en blanco.

---

## 5. Ajustes hechos sobre el plan original

Tres cosas que aparecieron al implementar:

- **Fila de la tabla:** *Editar* y *PDF* siguen como botones directos; *Duplicar*, *Convertir* y *Eliminar* pasaron al menú `⋮` para que quepa la nueva opción sin amontonar iconos. Si prefieres *Eliminar* de vuelta a un clic, se cambia en un momento.
- **Autoguardado inteligente:** al saltar entre pestañas se compara una firma del contenido. Si no cambiaste nada, no se reguarda — así navegar entre pestañas no reordena el historial por "más reciente" ni genera escrituras inútiles en la nube.
- **Corrección de fondo:** al pasar el estado a un provider compartido, la búsqueda de una cotización por ID pasó a leer del estado y no de una referencia interna. Con la referencia, el editor podía no encontrar una cotización recién guardada (y mandarte al historial) y la pestaña recién creada se quedaba sin número.

---

## 6. Verificación realizada

- `vite build` y `eslint` sin errores ni advertencias (el proyecto partía de 0 errores y sigue en 0).
- **Aritmética de la conversión**, comprobada con datos reales: 10 × 35.000 = 350.000 en comercial → 423.325 en obra con el AIU por defecto (10/5/5) → con el AIU en 0 se queda en 350.000 exactos → de vuelta a comercial regresa a 350.000 con los precios y la marca de transporte intactos.
- **27 pruebas automatizadas de interfaz** sobre la app real (render headless), todas en verde:
  - documento: mide una hoja carta exacta con 3 productos y sigue midiendo lo mismo con 25; imprime nombre, dirección y celular; omite los opcionales vacíos; lleva el bloque de firma; imprime las observaciones; muestra el precio con IVA sin columnas de IVA por línea; la columna de descuento solo aparece si se usa;
  - paginación: 5 de 37 por defecto, cambio a 20, navegación a la página 2, filtrar devuelve a la página 1, y sin controles cuando hay menos de una página;
  - pestañas: se restauran de localStorage con número y cliente, se ocultan si no hay ninguna, se cierran, descartan cotizaciones inexistentes y se crean al abrir una cotización;
  - conversión: el modal muestra 350.000 → 350.000 (el total no se mueve), subir la utilidad al 10 % lo mueve en vivo a 391.650, al confirmar cambia el tipo respetando los precios, e ida y vuelta devuelve el total exacto;
  - PDF de obra: sin AIU no imprime Administración, Imprevistos, Utilidad, IVA ni el sello AIU, y el total es la suma simple (12 × 33.000 = 396.000); con AIU sí imprime todo el desglose; la comercial sigue discriminando IVA.
- **Coste de escribir**, medido con 20 filas: de 24 mediciones de posición forzadas por cada 6 pulsaciones, a 0. El entorno de pruebas no reproduce el coste real de un navegador, donde cada una de esas mediciones obliga a recalcular el diseño de la página, así que la mejora que se siente al teclear debería ser mayor que lo que sugiere el número.
- Comprobado que la numeración `COT-XXX` y la sincronización con Supabase no cambian de comportamiento.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/App.jsx` | Provider + layout con barra de pestañas |
| `src/context/CotizacionesProvider.jsx` | **Nuevo** — estado compartido y pestañas |
| `src/hooks/useCotizaciones.js` | Pasa a consumir el contexto (misma API) |
| `src/components/TabsBar.jsx` | **Nuevo** — barra de pestañas |
| `src/components/ModalConvertirTipo.jsx` | **Nuevo** — conversión con vista previa de totales |
| `src/components/Paginacion.jsx` | **Nuevo** — controles de página |
| `src/pages/HistorialPage.jsx` | Paginación, memoización, acción de convertir |
| `src/pages/CotizadorPage.jsx` | Conversión, registro de autoguardado para pestañas |
| `src/utils/index.js` | Helper `convertirTipo` |

Nada de esto toca el formato de los datos guardados: las cotizaciones existentes y la sincronización con Supabase siguen funcionando igual.
