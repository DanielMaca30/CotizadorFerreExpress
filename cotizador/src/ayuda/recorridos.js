/**
 * recorridos.js — guías que se hacen EN LA PANTALLA, no en un texto
 * ─────────────────────────────────────────────────────────────────
 * Cada recorrido es una lista de pasos. En cada paso la app resalta el
 * botón o la casilla de verdad, explica qué hace, y —cuando el paso pide
 * una acción— espera a que la persona la haga ella misma antes de seguir.
 * No se toca nada por debajo: quien aprende es quien hace.
 *
 * Campos de un paso:
 *   ruta      navega a esa pantalla antes de empezar el paso
 *   sel       qué resaltar (selector CSS; se usa el primero VISIBLE)
 *   titulo    encabezado corto
 *   texto     la explicación
 *   accion    'clic'    → avanza cuando la persona toca lo resaltado
 *             'escribir'→ avanza cuando escribe algo ahí
 *             null      → avanza con el botón "Siguiente"
 *   pista     la instrucción concreta ("Toca el botón amarillo")
 *   espera    selector que debe aparecer antes de dar el paso por hecho
 *   opcional  si el elemento no existe, el paso se salta sin ruido
 *
 * Los selectores se apoyan en los atributos data-tour="…" puestos en
 * HistorialPage y CotizadorPage. Si se renombra uno, el paso se salta
 * solo — el recorrido nunca deja a nadie trabado.
 */

/* Campos de la tabla / lista de productos: sirven en las tres pantallas
   porque solo se monta una disposición a la vez. */
const CAMPO_PRODUCTO = 'input[data-field="desc"]';
const CAMPO_CANTIDAD = '[data-field="qty"]';
const CAMPO_PRECIO = '[data-field="price"]';

export const RECORRIDOS = {
  /* ═══════════════ 1. Orientación de bienvenida ═══════════════ */
  inicio: {
    id: "inicio",
    titulo: "Conocer la pantalla principal",
    descripcion: "Dónde está cada cosa en el listado de cotizaciones.",
    siguiente: "cotizacion",          // al terminar, ofrece este
    siguienteTexto: "Ahora hagamos una cotización",
    pasos: [
      {
        ruta: "/historial",
        titulo: "Bienvenido al cotizador",
        texto:
          "Te muestro dónde está lo importante y después hacemos una cotización juntos. Puedes salirte cuando quieras y repetirlo desde el botón de ayuda.",
      },
      {
        sel: '[data-tour="nueva"]',
        titulo: "Aquí se empieza todo",
        texto:
          "Este botón crea una cotización nueva. Te va a preguntar si es Comercial (una venta normal) o de Obra (un contrato con AIU).",
      },
      {
        sel: '[data-tour="kpis"]',
        titulo: "Estos recuadros son botones",
        texto:
          "Total, Enviadas y Aceptadas filtran la lista al tocarlos, aunque no parezcan botones. Sus números siempre corresponden a lo que estás viendo.",
      },
      {
        sel: '[data-tour="buscador"]',
        titulo: "El buscador encuentra hasta por producto",
        texto:
          'Escribe un número, un cliente o un producto ("cemento") y filtra solo. Truco: la tecla / te trae aquí desde cualquier parte de esta pantalla.',
      },
      {
        sel: '[data-tour="estado"]',
        titulo: "La etiqueta de color es un menú",
        texto:
          "Esa etiqueta (Borrador, Enviada, Aceptada, Rechazada) se toca para cambiar el estado. Es de las cosas que nadie descubre solo.",
        opcional: true,
      },
      {
        sel: '[data-tour="acciones"]',
        titulo: "Los tres puntos guardan lo demás",
        texto:
          "Ahí están Editar, Duplicar, Descargar PDF, Convertir a Obra y Eliminar. Duplicar es lo más útil cuando un cliente vuelve a pedir algo parecido.",
        opcional: true,
      },
      {
        sel: '[data-tour="ayuda"]',
        titulo: "Y este botón es tu salvavidas",
        texto:
          "Está en todas las pantallas. Ahí puedes preguntar con tus palabras cómo se hace cualquier cosa. La clave para entrar siempre es ferreexpress.",
      },
    ],
  },

  /* ═══════════════ 2. Hacer una cotización, de principio a fin ═══════════════ */
  cotizacion: {
    id: "cotizacion",
    titulo: "Hacer una cotización desde cero",
    descripcion: "De la lista vacía al PDF listo para enviar, paso por paso.",
    pasos: [
      {
        ruta: "/historial",
        titulo: "Vamos a cotizar de verdad",
        texto:
          "Haremos una cotización real, contigo escribiendo. Yo solo te voy señalando dónde. Si al final no la quieres, se puede borrar desde el listado.",
      },
      {
        sel: '[data-tour="nueva"]',
        titulo: "Paso 1 — Abrir una cotización nueva",
        texto: "Empieza por aquí, arriba a la derecha.",
        pista: 'Toca "Nueva cotización"',
        accion: "clic",
        espera: '[data-tour="tipo-comercial"]',
      },
      {
        sel: '[data-tour="tipo-comercial"]',
        titulo: "Paso 2 — ¿Comercial o de Obra?",
        texto:
          "Comercial es una venta normal de productos: el precio que escribes ya lleva el IVA. De Obra es para contratos donde se cobra administración, imprevistos y utilidad. Para este ejercicio usemos Comercial.",
        pista: 'Toca "Cotización Comercial"',
        accion: "clic",
        espera: CAMPO_PRODUCTO,
      },
      {
        sel: '[data-tour="tab-cliente"], [data-tour="paso-cliente"]',
        titulo: "Paso 3 — Abre los datos del cliente",
        texto:
          "Antes de los productos, decimos para quién es. Los datos del cliente están en esta pestaña.",
        pista: 'Toca "CLIENTE"',
        accion: "clic",
        espera: '[data-tour="cliente-nombre"]',
      },
      {
        sel: '[data-tour="cliente-nombre"]',
        titulo: "Paso 4 — El nombre del cliente",
        texto:
          "Escribe aquí a quién le vas a cotizar. Si ya le vendiste antes, aparece una lista: tócalo y se llenan solos la dirección, el celular y lo demás.",
        pista: "Escribe el nombre del cliente",
        accion: "escribir",
      },
      {
        /* Señala el bloque del cliente: además de guiar, deja claro que se
           puede escribir ahí mismo sin salir del recorrido. */
        sel: '[data-tour="cliente-obligatorios"]',
        titulo: "Los tres datos obligatorios",
        texto:
          "Nombre, dirección de entrega y celular llevan asterisco rojo. Son los que necesita el documento, porque también sirve de remisión cuando entregas a domicilio. Llénalos aquí mismo y seguimos.",
        pista: "Escríbelos y toca Siguiente",
      },
      {
        sel: '[data-tour="tab-productos"], [data-tour="paso-productos"]',
        titulo: "Paso 5 — Pasa a los productos",
        texto: "Ya con el cliente listo, vamos a lo que se va a vender.",
        pista: "Toca PRODUCTOS",
        accion: "clic",
        opcional: true,   // en computador la tabla ya está a la vista
      },
      {
        sel: CAMPO_PRODUCTO,
        titulo: "Paso 6 — El primer producto",
        texto:
          "Escribe aquí el nombre. Con la primera letra aparecen los productos que ya has cotizado, con su último precio: tócalo con el mouse, o resáltalo con la flecha ↓ y pulsa Enter.",
        pista: "Escribe un producto",
        accion: "escribir",
      },
      {
        sel: CAMPO_CANTIDAD,
        titulo: "Paso 7 — Cuántos",
        texto:
          "La cantidad. Desde la casilla del producto, la tecla Enter (o «siguiente» en el celular) te trae directo hasta aquí.",
        pista: "Escribe la cantidad",
        accion: "escribir",
      },
      {
        sel: CAMPO_PRECIO,
        titulo: "Paso 8 — A cómo",
        texto:
          "El precio, solo números: los puntos de miles se ponen solos. En una cotización Comercial, este precio YA INCLUYE el IVA — la app lo separa sola en el documento.",
        pista: "Escribe el precio",
        accion: "escribir",
      },
      {
        titulo: "Paso 9 — Los demás productos",
        texto:
          "Pulsa Enter otra vez y bajas al siguiente renglón, listo para seguir. Así se encadena todo el pedido sin soltar el teclado. ¿Cobras domicilio? Al pie hay un botón azul que agrega esa fila ya marcada sin IVA.",
      },
      {
        sel: '[data-tour="guardar"]',
        titulo: "Paso 10 — Guardar",
        texto:
          "Este botón guarda la cotización y le pone su número (COT-XXX). De aquí en adelante ya aparece en el listado y se puede buscar.",
        pista: 'Toca "Guardar"',
        accion: "clic",
      },
      {
        sel: '[data-tour="pdf"]',
        titulo: "Paso 11 — El PDF para el cliente",
        texto:
          "Y este descarga el documento en tamaño carta, con el nombre del cliente y el número. Ese es el archivo que le mandas por WhatsApp o le imprimes.",
      },
      {
        titulo: "Eso es todo",
        texto:
          "Ya sabes hacer una cotización completa. Si esta era de práctica, ve al listado, toca los tres puntos ⋮ de esa cotización y elige Eliminar. Cualquier duda, el botón de ayuda está en todas las pantallas.",
      },
    ],
  },

  /* ═══════════════ 3. Cobrar el domicilio ═══════════════ */
  domicilio: {
    id: "domicilio",
    titulo: "Cobrar el domicilio sin IVA",
    descripcion: "Agregar el transporte como una línea aparte, exenta de IVA.",
    pasos: [
      {
        titulo: "El transporte no paga IVA",
        texto:
          "Por eso va en su propia línea, marcada como exenta. Vamos a agregarla en la cotización que tengas abierta.",
      },
      {
        sel: '[data-tour="btn-transporte"]',
        titulo: "El botón del domicilio",
        texto:
          'Al pie de la lista de productos está el botón azul del camioncito ("+ Transporte" en computador, "Domicilio" en celular). Agrega la fila ya marcada sin IVA y con el cursor en el precio.',
        opcional: true,
      },
      {
        sel: CAMPO_PRECIO,
        titulo: "Solo falta el valor",
        texto:
          "Escribe cuánto cobras por el envío. En la columna del IVA vas a ver «EXCL.», y en el resumen aparece como «Transporte (sin IVA)».",
      },
      {
        titulo: "Un atajo que ya trae la app",
        texto:
          "Si en la descripción escribes transporte, flete, acarreo, envío o domicilio, la fila se marca sin IVA sola. Y si tocas el camioncito a mano, tu decisión manda.",
      },
    ],
  },

  /* ═══════════════ 4. Marcar el estado ═══════════════ */
  estado: {
    id: "estado",
    titulo: "Marcar una cotización como enviada o aceptada",
    descripcion: "Mantener el listado al día para saber en qué va cada una.",
    pasos: [
      {
        ruta: "/historial",
        titulo: "El estado vive en el listado",
        texto: "Aquí, en la lista, cada cotización tiene su etiqueta de color.",
      },
      {
        sel: '[data-tour="estado"]',
        titulo: "Esa etiqueta es un menú",
        texto:
          "No lo parece, pero se toca. La flechita ▾ del lado es la única pista. Tócala y elige el estado que corresponde.",
        pista: "Toca la etiqueta de color",
        accion: "clic",
        opcional: true,
      },
      {
        titulo: "Los cuatro estados",
        texto:
          "Borrador (recién hecha), Enviada (ya se la mandaste), Aceptada (te la aprobaron) y Rechazada. Puedes pasar de cualquiera a cualquiera. Mantenerlo al día es lo que hace que los recuadros de arriba sirvan.",
      },
    ],
  },

  /* ═══════════════ 5. Ver todo lo de un cliente ═══════════════ */
  cliente: {
    id: "cliente",
    titulo: "Ver todo lo de un cliente",
    descripcion: "Su historial completo y cuánto le has vendido de cada producto.",
    pasos: [
      {
        ruta: "/historial",
        titulo: "Se llega por el nombre",
        texto: "No hay un menú de clientes: la puerta de entrada es el nombre en la lista.",
      },
      {
        sel: 'table tbody tr td:nth-child(2)',
        titulo: "Toca el nombre del cliente",
        texto:
          "Haz clic exactamente sobre el nombre (se pone dorado y subrayado al pasar el mouse). Un clic un poco más allá abre la cotización en vez de la ficha.",
        pista: "Toca el nombre de un cliente",
        accion: "clic",
        opcional: true,
      },
      {
        titulo: "Lo que vas a encontrar",
        texto:
          "Sus datos, cuántas cotizaciones tiene, cuánto se le ha cotizado en total y desde cuándo es cliente. Más abajo, un buscador donde escribes un producto (mínimo 2 letras) y te dice cuántas unidades le has vendido y por cuánto dinero.",
      },
    ],
  },

  /* ═══════════════ 6. Convertir a obra ═══════════════ */
  convertir: {
    id: "convertir",
    titulo: "Convertir una cotización a Obra",
    descripcion: "Cambiar el tipo sin volver a escribir nada.",
    pasos: [
      {
        ruta: "/historial",
        titulo: "Te equivocaste de tipo, no pasa nada",
        texto: "No hay que empezar de nuevo: se convierte y los precios no se tocan.",
      },
      {
        sel: '[data-tour="acciones"]',
        titulo: "Desde el menú de tres puntos",
        texto:
          'Ábrelo en la cotización que quieras y elige "Convertir a Obra" (o "a Comercial" si va al revés).',
        pista: "Abre el menú ⋮",
        accion: "clic",
        opcional: true,
      },
      {
        titulo: "Mira el impacto antes de aceptar",
        texto:
          'La ventana muestra los porcentajes de AIU y un recuadro "AHORA / DESPUÉS" con el total antes y después. Si el número de DESPUÉS es el que esperabas, confirma. Si no, cancela: nada se cambió todavía.',
      },
      {
        titulo: "Dos cosas que conviene revisar",
        texto:
          "La forma de pago cambia sola si la que tenías no existe en el otro tipo — revísala en CONFIG. Y si convertiste desde el editor, acuérdate de Guardar para que quede aplicado.",
      },
    ],
  },

  /* ═══════════════ 7. Sacar el PDF ═══════════════ */
  pdf: {
    id: "pdf",
    titulo: "Sacar el PDF para el cliente",
    descripcion: "Revisar cómo va a salir impreso y descargarlo.",
    pasos: [
      {
        titulo: "Primero míralo, después descárgalo",
        texto: "Vamos a ver el documento tal como le va a llegar al cliente.",
      },
      {
        sel: '[data-tour="vista-previa"]',
        titulo: "Vista previa",
        texto:
          'Este botón (dice "Ver" en el celular) muestra la hoja completa como se va a imprimir.',
        opcional: true,
      },
      {
        sel: '[data-tour="pdf"]',
        titulo: "Descargar el PDF",
        texto:
          'Se descarga en tamaño carta con el nombre del cliente y el número: "Constructora_Andina_COT-032.pdf". Ojo: pedir el PDF GUARDA la cotización primero.',
        opcional: true,
      },
      {
        titulo: "Si te falta algo del cliente",
        texto:
          'Sale el aviso "Faltan datos de entrega" con dos botones. "Completar datos" te lleva directo a llenarlos; "Descargar así" lo genera igual, con guiones donde falte.',
      },
    ],
  },
};

export const listaRecorridos = () => Object.values(RECORRIDOS);
export const getRecorrido = (id) => RECORRIDOS[id] || null;
