/**
 * guia.js — Contenido único de la ayuda de FerreExpress
 * ─────────────────────────────────────────────────────────────────
 * Este archivo es la ÚNICA fuente de la ayuda: lo usan la página
 * /ayuda, la ventana rápida del botón flotante, el asistente que
 * responde preguntas y el tour guiado. Si algo cambia en la app,
 * se corrige aquí una sola vez.
 *
 * Todo lo que dice esta guía fue comprobado ejecutando la aplicación,
 * no solo leyendo el código. Las advertencias marcadas "ojo" son
 * tropiezos reales que se midieron en pruebas de uso.
 *
 * dificultad: 1 = se entiende solo · 2 = hay que enseñarlo una vez
 *             3 = confunde de verdad, necesita explicación
 */

export const TEMAS = [
  /* ═══════════════ ARRANQUE ═══════════════ */
  {
    id: "entrar",
    grupo: "Arranque",
    icono: "FiLock",
    titulo: "Entrar a la app",
    dificultad: 1,
    resumen: "La clave de la empresa es ferreexpress. Se pide una sola vez por computador.",
    directa: "La clave es **ferreexpress**, todo junto y en minúsculas. Se pide una sola vez por computador.",
    pasos: [
      "Abre la dirección de la app en el navegador (Chrome, Edge o el que uses).",
      'Si aparece una ventana pidiendo la "Clave de la empresa", escribe: ferreexpress',
      'Toca el botón amarillo "Entrar".',
    ],
    ojo: [
      "La clave queda recordada en ese computador. No la vuelve a pedir a menos que se borren los datos del navegador o se entre desde otro equipo.",
      "Si te equivocas, sale en rojo «Clave incorrecta.» y el campo se borra. Vuelve a escribirla completa, en minúsculas y sin espacios.",
      "El ojito del lado derecho del campo sirve para ver lo que estás escribiendo.",
    ],
    claves: ["clave", "contraseña", "password", "entrar", "acceso", "login", "ferreexpress", "no me deja entrar", "abrir la app"],
  },
  {
    id: "listado",
    recorrido: "inicio",
    grupo: "Arranque",
    icono: "FiFileText",
    titulo: "La pantalla principal: el listado de cotizaciones",
    dificultad: 1,
    resumen: "Al entrar caes siempre aquí. Es el listado de todo lo cotizado y el punto de partida de todo.",
    directa: "Es la pantalla que ves al entrar: todas las cotizaciones, con buscador y filtros arriba.",
    ir: "/historial",
    pasos: [
      'Arriba a la izquierda: el recuadro "FE", la palabra Cotizaciones y un número gris — ese número es el TOTAL de cotizaciones que existen.',
      'Arriba a la derecha: el botón amarillo "Nueva cotización" y, al lado, un botón para cambiar entre vista de tabla y vista de tarjetas.',
      "Debajo: cuatro recuadros grandes (Total, Enviadas, Aceptadas, Valor total).",
      "Más abajo: la fila de filtros (buscador, tipo, estado, fecha, orden).",
      "Y al final: la lista, con una cotización por fila.",
    ],
    ojo: [
      'Los tres primeros recuadros (Total, Enviadas, Aceptadas) SON BOTONES aunque no lo parezcan: al tocarlos filtran la lista. El cuarto, "Valor total", no hace nada al tocarlo.',
      "Los cuatro números corresponden a lo que estás viendo: si filtras o buscas, cambian con la lista. Cuando hay un filtro puesto, el primer recuadro dice «En pantalla» y debajo aclara cuántas hay en total.",
      "Para volver aquí desde cualquier parte: el ícono de hoja en la barra de pestañas de arriba, o el botón de ayuda → «Ir al listado».",
    ],
    claves: ["listado", "historial", "pantalla principal", "inicio", "menu principal", "donde estan las cotizaciones", "ver todas"],
  },

  /* ═══════════════ HACER UNA COTIZACIÓN ═══════════════ */
  {
    id: "nueva",
    recorrido: "cotizacion",
    grupo: "Hacer una cotización",
    icono: "FiPlus",
    titulo: "Crear una cotización nueva",
    dificultad: 1,
    resumen: "Botón amarillo «Nueva cotización» y elegir si es Comercial o de Obra.",
    directa: "Botón amarillo **«Nueva cotización»**, arriba a la derecha del listado. Luego eliges Comercial u Obra.",
    ir: "/historial",
    pasos: [
      'En el listado, toca el botón amarillo "Nueva cotización" (arriba a la derecha).',
      'Se abre la ventana "Nueva cotización — ¿Qué tipo de cotización necesitas?".',
      'Elige "Cotización Comercial" si es una venta normal de productos al cliente.',
      'Elige "Cotización de Obra" si es un contrato de construcción o trabajo con AIU.',
      "Ya estás en el editor: se llena de izquierda a derecha (Empresa, Cliente, Productos).",
    ],
    ojo: [
      "Si no querías crear ninguna, esa misma ventana tiene abajo el botón «Ir al listado de cotizaciones» para salir sin dejar nada a medias.",
      "Si te equivocaste de tipo, no hay que empezar de nuevo: se puede convertir después (ver «Convertir Comercial ⇄ Obra»).",
      "Ante la duda: si es una venta de mostrador o un pedido de materiales, es COMERCIAL. La de Obra es para contratos donde se cobra administración, imprevistos y utilidad.",
    ],
    claves: ["nueva", "crear", "empezar", "hacer una cotizacion", "comercial o obra", "que tipo",
      "que elijo", "cual elijo", "cual escojo", "no se cual", "que diferencia hay",
      "desde cero", "desde 0", "en blanco", "empezar de cero", "primera cotizacion",
      "hago una cotizacion", "cotizacion nueva", "arrancar", "cotizar",
      /* Los verbos que cambian la raíz (e→ie) no los agarra el recortador
         de terminaciones: "empiezo" no se parece a "empezar". Se escriben
         a mano las formas que la gente teclea. */
      "empiezo", "empieza", "comienzo", "comenzar"],
  },
  {
    id: "cliente",
    recorrido: "cotizacion",
    grupo: "Hacer una cotización",
    icono: "FiUser",
    titulo: "Llenar los datos del cliente",
    dificultad: 1,
    resumen: "Nombre, dirección y celular son obligatorios. Si ya le cotizaste antes, el nombre se autocompleta con todo.",
    directa: "Nombre, dirección de entrega y celular son los tres obligatorios (llevan asterisco rojo). El resto es opcional.",
    ir: "/cotizador",
    pasos: [
      'En el panel de la izquierda, toca la pestaña "CLIENTE".',
      'Empieza a escribir el nombre en "Nombre / Razón social". Con una sola letra aparece una lista con los clientes que ya has atendido.',
      "Si tu cliente está en la lista, HAZ CLIC sobre él: se llenan de un golpe dirección, celular, empresa, NIT, contacto, correo y ciudad.",
      'Si es cliente nuevo, escribe a mano la "Dirección de entrega" y el "Celular".',
      'Los demás campos (Empresa, NIT, Ciudad, Contacto, Correo) son opcionales: solo se imprimen si los llenas.',
    ],
    ojo: [
      "Los tres campos con asterisco rojo (nombre, dirección, celular) son los que hacen falta para el PDF: el documento sirve también de remisión al entregar a domicilio.",
      "El directorio de clientes SOLO aprende cuando guardas con el botón Guardar (o Ctrl+S). Si sales sin guardar, ese cliente no queda registrado.",
      "Escribe el nombre siempre igual. «Ferretería Central» y «Ferreteria Central S.A.S.» quedan como dos clientes distintos, y luego su historial sale partido en dos.",
      "Si esta vez dejas un campo vacío, no se borra lo que ya estaba guardado de ese cliente: se conserva lo anterior.",
    ],
    claves: ["cliente", "nombre", "direccion", "celular", "telefono", "nit", "autocompletar cliente", "datos del cliente"],
  },
  {
    id: "productos",
    recorrido: "cotizacion",
    grupo: "Hacer una cotización",
    icono: "FiPackage",
    titulo: "Agregar productos a la cotización",
    dificultad: 2,
    resumen: "Se escribe directo en la tabla. Enter va pasando de casilla en casilla. Las sugerencias se aceptan CON CLIC.",
    directa: "Escribes el producto, la cantidad y el precio; con Enter vas pasando de casilla y la fila nueva sale sola.",
    ir: "/cotizador",
    pasos: [
      'Escribe el nombre en la columna "Nombre Producto" de la primera fila.',
      "Mientras escribes aparece una lista con los productos que ya has cotizado, con su último precio y su unidad.",
      "HAZ CLIC sobre el producto de la lista: llena solo la descripción, el precio y la unidad, y deja el cursor listo en Cantidad.",
      "Escribe la cantidad y pulsa Enter (pasa a Unidad), Enter otra vez (pasa a Precio).",
      "Escribe el precio con solo números: los puntos de miles se ponen solos (1500000 se ve 1.500.000).",
      "Pulsa Enter dos veces más y saltas a la fila siguiente, listo para el próximo producto.",
      'Para agregar más filas: el botón "+ Agregar fila" al pie de la tabla, o Ctrl+Enter.',
    ],
    ojo: [
      "Para aceptar una sugerencia con el teclado hay que RESALTARLA primero con la flecha ↓ y después pulsar Enter o Tab. Si pulsas Enter sin resaltar ninguna, se respeta lo que escribiste y el cursor pasa a Cantidad — así puedes escribir productos nuevos sin que te los cambie.",
      'En una cotización COMERCIAL, el precio que escribes YA INCLUYE EL IVA. Las columnas "P. s/IVA" e "IVA" se calculan solas: no se escriben.',
      "Si escribes 0 o un número negativo en la cantidad, el sistema lo corrige solo a 1.",
      'La columna "Ref." (el código del producto) no se alcanza con Tab ni con las flechas: hay que hacerle clic.',
      "Un producto mal escrito queda guardado así para siempre en las sugerencias y no se puede borrar. Vale la pena escribirlo bien la primera vez.",
    ],
    claves: ["producto", "productos", "agregar", "tabla", "precio", "cantidad", "sugerencias", "autocompletar producto", "escribir productos", "enter no funciona"],
  },
  {
    id: "vitrina",
    recorrido: "cotizacion",
    grupo: "Hacer una cotización",
    icono: "FiZap",
    titulo: "Tomar un pedido rápido en el celular o la tablet",
    dificultad: 1,
    resumen: "En celular y tablet todos los renglones están abiertos: se escribe de corrido, sin abrir ni cerrar nada.",
    directa: "En celular todos los renglones están abiertos: escribes de corrido y con «siguiente» del teclado encadenas producto → cantidad → precio → producto siguiente.",
    ir: "/cotizador",
    pasos: [
      'Entra al paso "PRODUCTOS".',
      "Toca la primera casilla y escribe el producto.",
      'Pulsa "siguiente" en el teclado del celular: pasa solo a la CANTIDAD.',
      'Escribe la cantidad y "siguiente" otra vez: pasa al PRECIO.',
      'Escribe el precio y "siguiente" de nuevo: baja al producto siguiente, listo para seguir.',
      "Repite. Un pedido de cinco productos se toma con un solo toque de pantalla: el del principio.",
    ],
    ojo: [
      "El renglón vacío del final aparece solo. No hay que buscar el botón + entre producto y producto.",
      "Si el producto ya lo has cotizado antes, sale en la lista de sugerencias: tócalo y llena descripción, precio y unidad de un golpe, dejando el cursor en la cantidad.",
      "La cantidad y el precio abren el teclado numérico del teléfono, no el de letras.",
      'Lo que se usa poco (código, descuento del renglón, transporte sin IVA, duplicar, eliminar) está en el botón "⋮" de cada renglón.',
      'Para cobrar el domicilio, el botón azul "Domicilio" al pie de la lista agrega la fila ya marcada sin IVA.',
      'En la tablet hay un interruptor "Rápido / Tabla" arriba de la lista: si prefieres la tabla de siempre, tócalo y queda recordado en ese equipo.',
      "El total se ve todo el tiempo en la barra de abajo, sin bajar la pantalla.",
    ],
    claves: ["rapido", "vitrina", "celular", "tablet", "ipad", "pedido", "mostrador", "atencion", "lento", "abrir cada producto", "modo rapido", "tomar pedido"],
  },
  {
    id: "transporte",
    recorrido: "domicilio",
    grupo: "Hacer una cotización",
    icono: "FiTruck",
    titulo: "Cobrar el domicilio o el transporte (sin IVA)",
    dificultad: 2,
    resumen: "El transporte no paga IVA. La app lo detecta sola por el nombre, y también hay un botón.",
    directa: "Botón azul **«+ Transporte»** al pie de la lista: agrega la fila ya marcada sin IVA. También se marca sola si escribes \"domicilio\", \"flete\", \"acarreo\" o \"envío\".",
    ir: "/cotizador",
    pasos: [
      'La forma recomendada: al pie de la tabla, toca el botón azul "+ Transporte". Agrega una fila lista, marcada sin IVA, con el cursor en el precio.',
      "Escribe el valor del domicilio y listo.",
      "La otra forma: escribe tú la fila y toca el botón del camioncito que está al final de esa fila.",
    ],
    ojo: [
      'Comprobado: si en la descripción escribes transporte, flete, acarreo, envío o domicilio, la app marca esa fila sin IVA SOLA, sin avisar. En la columna IVA verás "EXCL.".',
      "Si tocas el camioncito a mano, tu decisión manda y ya no se cambia sola.",
      "En las cotizaciones de OBRA no existe el camioncito ni el botón de transporte: allá el IVA funciona distinto (va solo sobre la utilidad).",
      'En el celular no hay camioncito: dentro de la tarjeta del producto hay un interruptor que dice "Transporte (sin IVA)".',
    ],
    claves: ["transporte", "domicilio", "flete", "acarreo", "envio", "sin iva", "excluido", "camion"],
  },
  {
    id: "descuentos",
    grupo: "Hacer una cotización",
    icono: "FiPercent",
    titulo: "Poner descuentos",
    dificultad: 2,
    resumen: "Hay dos: uno por producto (columna Desc.%) y uno para toda la cotización (Desc. global).",
    directa: "Hay dos: el de un producto suelto (columna Desc. de esa fila) y el de toda la cotización (casilla «Descuento general» en el resumen).",
    ir: "/cotizador",
    pasos: [
      'Para rebajar UN producto: escribe el porcentaje en la columna "Desc.%" de esa fila.',
      'Para rebajar TODA la cotización: pestaña "CONFIG" del panel izquierdo, campo "Desc. global (%)".',
      "Los dos aceptan de 0 a 100. Si escribes más, se recorta solo a 100.",
    ],
    ojo: [
      "El descuento global se ve en el documento como una línea aparte, así el cliente sabe cuánto se le rebajó.",
      "En COMERCIAL el descuento global se aplica al final, sobre el total que ya tiene IVA.",
      "En OBRA se aplica al principio, sobre el costo de la obra, antes de calcular administración, imprevistos y utilidad. El porcentaje que baja el total final es el mismo, pero en el papel se ve en otro sitio.",
    ],
    claves: ["descuento", "rebaja", "porcentaje", "desc global", "descontar"],
  },
  {
    id: "guardar",
    recorrido: "cotizacion",
    grupo: "Hacer una cotización",
    icono: "FiSave",
    titulo: "Guardar la cotización",
    dificultad: 1,
    resumen: "Botón amarillo Guardar (o Ctrl+S). Ahí es cuando le ponen el número COT-XXX.",
    directa: "**Ctrl+S**, o el botón «Guardar» del resumen. Además se guarda un borrador solo cada pocos segundos.",
    ir: "/cotizador",
    pasos: [
      'Toca el botón amarillo "Guardar" arriba a la derecha (dice "Actualizar" si la cotización ya existía).',
      'Sale el aviso "Cotización creada ✓" con el número asignado, por ejemplo "Número: COT-032".',
      "Desde ese momento la cotización aparece en el listado y ya se puede buscar.",
    ],
    ojo: [
      "El número se asigna UNA sola vez, al guardar por primera vez. Después ya no cambia aunque edites la cotización.",
      "Si no hay ningún producto escrito, no deja guardar: sale «Agrega al menos un producto».",
      "Al guardar es cuando la app APRENDE el cliente y los productos para las sugerencias futuras. Si sales sin guardar, no aprende nada.",
      'Mientras trabajas en una cotización nueva se va guardando un borrador solo. Si se cierra el navegador o se va la luz, al volver a "Nueva cotización" sale la ventana «Recuperar trabajo sin guardar» con el botón «Recuperar».',
      'El aviso naranja "Sin guardar" en la barra de arriba te dice que hay cambios pendientes.',
    ],
    claves: ["guardar", "actualizar", "numero", "cot-", "borrador", "recuperar", "se me cerro", "perdi el trabajo"],
  },
  {
    id: "pdf",
    recorrido: "pdf",
    grupo: "Hacer una cotización",
    icono: "FiDownload",
    titulo: "Ver el documento y descargar el PDF",
    dificultad: 1,
    resumen: "Vista previa muestra cómo va a salir impreso. El botón PDF lo descarga en tamaño carta.",
    directa: "Botón **«PDF»** arriba a la derecha del cotizador. Se descarga con el nombre del cliente y el número de la cotización.",
    ir: "/cotizador",
    pasos: [
      'Toca "Vista previa" (o "Ver" en el celular) para mirar el documento tal como se va a imprimir.',
      'Si te gusta, toca el botón oscuro "PDF" — arriba o al final de la vista previa.',
      "Espera unos segundos mientras se arma (el botón muestra un girito).",
      'El archivo se descarga con el nombre del cliente y el número, por ejemplo "Constructora_Andina_COT-032.pdf".',
    ],
    ojo: [
      "Descargar el PDF GUARDA la cotización primero. O sea que al pedir el PDF ya estás creando la cotización con su número definitivo.",
      'Si falta el nombre, la dirección o el celular del cliente, sale la ventana "Faltan datos de entrega" con dos botones: "Completar datos" y "Descargar así".',
      'El botón "Completar datos" te lleva directo a los datos del cliente en cualquier pantalla: en computador y tablet abre la pestaña CLIENTE, y en el celular salta al paso del cliente.',
      "El PDF sale como una imagen de la cotización: se ve idéntico e imprime bien, pero el texto no se puede seleccionar ni copiar desde el PDF.",
      "Si sale «Error generando PDF», vuelve a intentarlo sin cambiar de pestaña del navegador mientras se genera.",
    ],
    claves: ["pdf", "imprimir", "descargar", "vista previa", "documento", "enviar al cliente", "whatsapp",
      "mandar", "mandarla", "enviar", "compartir", "mandar la cotizacion", "enviar la cotizacion",
      "pasarle la cotizacion", "mandar al cliente", "como se la mando"],
  },

  /* ═══════════════ OBRA Y AIU ═══════════════ */
  {
    id: "obra",
    grupo: "Obra y AIU",
    icono: "FiTool",
    titulo: "Cotización de Obra y el AIU (lo más difícil)",
    dificultad: 3,
    resumen: "En obra el precio que escribes es el COSTO. Encima se suman Administración, Imprevistos y Utilidad, y el IVA va solo sobre la utilidad.",
    directa: "El AIU son tres porcentajes que se cobran encima del costo: **A**dministración, **I**mprevistos y **U**tilidad. El IVA de una obra va solo sobre la utilidad, no sobre todo.",
    ir: "/cotizador",
    pasos: [
      'Crea la cotización eligiendo "Cotización de Obra".',
      "Escribe las actividades y materiales como en cualquier cotización: descripción, cantidad, unidad y valor unitario.",
      'Ve a la pestaña "CONFIG" del panel izquierdo. Verás el recuadro azul "AIU — Indirectos de Obra".',
      'Escribe los porcentajes que aplique el trabajo: "Administración (%)", "Imprevistos (%)" y "Utilidad (%)".',
      '"Anticipo (%)" es solo informativo: dice cuánto se pide por adelantado y NO cambia el total.',
      "Mira el resumen: verás Costo Directo, la administración, los imprevistos, la utilidad y el IVA del 19% sobre la utilidad.",
    ],
    ojo: [
      "Si dejas el AIU en cero (como viene de fábrica), el total de la obra es simplemente la suma de los productos. No pasa nada malo: solo que no se cobran indirectos.",
      "El IVA del 19% NO se cobra sobre todo, sino SOLO sobre la utilidad. Esa es la razón de ser del régimen AIU y es lo que hace que una obra pague mucho menos IVA que una venta normal.",
      "En obra desaparecen la columna de IVA por producto y el botón de transporte: allí no aplican.",
      "Regla de oro para no equivocarse: COMERCIAL = lo que escribo es lo que el cliente paga. OBRA = lo que escribo es el costo, y encima va el AIU.",
    ],
    ejemplo: {
      titulo: "Ejemplo real (medido en la app)",
      lineas: [
        "Costo directo de la obra: $ 340.000",
        "Administración 10% → $ 34.000",
        "Imprevistos 5% → $ 17.000",
        "Utilidad 5% → $ 17.000",
        "IVA 19% SOLO sobre la utilidad ($17.000) → $ 3.230",
        "TOTAL A PAGAR: $ 411.230",
      ],
      nota: "Con IVA normal del 19% sobre los $340.000 el impuesto habría sido $64.600. Con AIU son $3.230.",
    },
    claves: ["obra", "aiu", "administracion", "imprevistos", "utilidad", "anticipo",
      "iva sobre utilidad", "construccion", "contrato", "cotizacion de obra", "de obra",
      "que es una obra", "cuando es de obra", "comercial o de obra"],
  },
  {
    id: "convertir",
    recorrido: "convertir",
    grupo: "Obra y AIU",
    icono: "FiRefreshCw",
    titulo: "Convertir de Comercial a Obra (o al revés)",
    dificultad: 3,
    resumen: "Se cambia el tipo sin volver a escribir nada. Los precios no se tocan; lo que cambia es cómo se calcula el total.",
    directa: "Desde el listado: menú **⋮** de la cotización → «Convertir a Obra» (o a Comercial). Los precios no se tocan.",
    ir: "/historial",
    pasos: [
      "Desde el listado: toca el menú de tres puntos ⋮ de esa cotización y elige «Convertir a Obra» o «Convertir a Comercial».",
      'Desde el editor: toca la etiqueta de color de la barra de arriba que dice "COMERCIAL ⇄" u "OBRA ⇄".',
      "Si vas hacia Obra, escribe los porcentajes de AIU (o déjalos en 0).",
      'Mira el recuadro "IMPACTO EN EL TOTAL": te muestra AHORA y DESPUÉS antes de decidir.',
      "Si el número de DESPUÉS es el que esperabas, confirma. Si no, cancela.",
    ],
    ojo: [
      "Ni un solo precio se modifica. Lo único que cambia es la máquina que calcula el total.",
      "La forma de pago cambia sola y sin avisar si la que tenías no existe en el otro tipo (por ejemplo Efectivo pasa a «Anticipo + Actas»). Revísala después en CONFIG.",
      "Las notas y condiciones que hayas escrito a mano se respetan. Solo se cambian si seguían siendo las de fábrica.",
      "Se puede devolver convirtiendo otra vez al revés, pero la forma de pago y las notas estándar no se restauran solas.",
      "Después de convertir desde el editor, acuérdate de GUARDAR para que quede aplicado.",
    ],
    claves: ["convertir", "cambiar tipo", "de comercial a obra", "de obra a comercial", "me equivoque de tipo"],
  },

  /* ═══════════════ EL LISTADO ═══════════════ */
  {
    id: "buscar",
    recorrido: "inicio",
    grupo: "Manejar el listado",
    icono: "FiSearch",
    titulo: "Buscar y filtrar cotizaciones",
    dificultad: 1,
    resumen: "El buscador encuentra por número, cliente y también por producto. Los filtros están al lado.",
    directa: "Escribe en el buscador de arriba: encuentra por número, por cliente y también por producto que esté dentro de la cotización.",
    ir: "/historial",
    pasos: [
      "Escribe en el campo del buscador. Los resultados se actualizan solos: no hay que dar Enter.",
      "Al lado están los filtros: Todo tipo (Comercial/Obra), Todos los estados, Cualquier fecha y el orden.",
      'Cuando hay algún filtro puesto aparece el botón "Limpiar" para quitarlos todos de una.',
    ],
    ojo: [
      "El buscador también encuentra por PRODUCTO: escribe «cemento» y salen todas las cotizaciones que lo tengan. También busca por NIT y por ciudad del cliente.",
      "No busca por código de referencia ni dentro de las notas.",
      "No distingue mayúsculas ni tildes: «martin» encuentra «MARTÍN».",
      "Truco: con el cursor fuera de cualquier casilla, la tecla / salta directo al buscador. Estando dentro, Esc borra lo escrito.",
      "El filtro de fecha usa la fecha de la última MODIFICACIÓN, no la de creación. Una cotización vieja a la que hoy le cambiaste el estado aparece en «Hoy».",
      "En la vista de tabla, los títulos N°, Cliente, Fecha y Total ordenan al hacerles clic; un segundo clic invierte el orden.",
    ],
    claves: ["buscar", "filtrar", "encontrar", "no encuentro", "buscador", "ordenar", "limpiar filtros"],
  },
  {
    id: "estado",
    recorrido: "estado",
    grupo: "Manejar el listado",
    icono: "FiCheckCircle",
    titulo: "Cambiar el estado (Borrador, Enviada, Aceptada, Rechazada)",
    dificultad: 2,
    resumen: "La etiqueta de color de cada cotización es un menú: se le hace clic y se elige el estado.",
    directa: "Toca la etiqueta de color de la cotización (BORRADOR ▾, ENVIADA ▾…) y elige el estado nuevo. Se guarda al instante.",
    ir: "/historial",
    pasos: [
      "En el listado, busca la etiqueta de color de esa cotización (dice Borrador, Enviada, Aceptada o Rechazada, con una flechita ▾).",
      "Haz clic sobre la etiqueta.",
      "Se abre un menú con los cuatro estados. Elige el que corresponde.",
      'Sale el aviso "Estado: Enviada" y el color cambia al momento.',
    ],
    ojo: [
      "Que la etiqueta sea un menú no se nota: la flechita ▾ es diminuta. Es de las cosas que hay que enseñar una vez.",
      "Toda cotización nace como Borrador. Al duplicar una, la copia también nace como Borrador.",
      "Solo hay esos cuatro estados. No existe «facturada», «anulada» ni «vencida».",
      "Se puede pasar de cualquier estado a cualquier otro; no hay un orden obligatorio.",
    ],
    claves: ["estado", "enviada", "aceptada", "rechazada", "borrador", "marcar", "cambiar estado"],
  },
  {
    id: "acciones",
    recorrido: "inicio",
    grupo: "Manejar el listado",
    icono: "FiMoreVertical",
    titulo: "Editar, duplicar, descargar y eliminar",
    dificultad: 2,
    resumen: "Todo eso vive en el menú de tres puntos ⋮ de cada cotización.",
    directa: "Todo está en el menú **⋮** de cada cotización: editar, nueva para ese cliente, duplicar, PDF, convertir y eliminar.",
    ir: "/historial",
    pasos: [
      "Para ABRIR una cotización: haz clic en cualquier parte de la fila (o en el ícono del lápiz).",
      "Para DESCARGAR el PDF sin abrirla: el ícono de flecha hacia abajo en la columna de acciones.",
      "Para lo demás: el menú ⋮ al final de la fila (en la vista de tarjetas está arriba a la derecha de cada tarjeta).",
      "Ahí están: Editar · Duplicar · Descargar PDF · Convertir a Obra/Comercial · Eliminar.",
    ],
    ojo: [
      "DUPLICAR es lo mejor cuando el mismo cliente vuelve a pedir algo parecido: copia todo con un número nuevo, en estado Borrador, y abre la copia de una vez. La original queda intacta.",
      "Ojo con duplicar: como abre la copia inmediatamente y se parecen mucho, conviene mirar el número de arriba para saber cuál estás editando.",
      "ELIMINAR pide confirmación mostrando el número y el cliente, pero después NO se puede deshacer. No hay papelera.",
      "Ctrl+Z no recupera una cotización eliminada; solo sirve dentro de la tabla de productos.",
    ],
    claves: ["editar", "duplicar", "copiar", "eliminar", "borrar", "menu", "tres puntos", "acciones"],
  },
  {
    id: "ficha-cliente",
    recorrido: "cliente",
    grupo: "Manejar el listado",
    icono: "FiUsers",
    titulo: "Ver todo lo de un cliente (y cuánto le has vendido)",
    dificultad: 2,
    resumen: "Haciendo clic en el NOMBRE del cliente se abre su ficha con todo su historial y un buscador de productos.",
    directa: "Toca el **nombre del cliente** en el listado: se abre su ficha con todo lo que le has cotizado y el total.",
    ir: "/historial",
    pasos: [
      "En el listado, haz clic exactamente sobre el NOMBRE del cliente (se pone dorado y subrayado al pasar el mouse).",
      "Se abre su ficha: datos de contacto, cuántas cotizaciones tiene, cuánto se le ha cotizado en total, desde cuándo es cliente y la fecha de la última.",
      'Más abajo hay un buscador que dice "BUSCAR UN PRODUCTO EN SUS COTIZACIONES".',
      "Escribe ahí el producto (mínimo 2 letras) y te dice cuántas unidades le has vendido, en cuántas cotizaciones y por cuánto dinero.",
      "Al final está la lista completa de sus cotizaciones; haciendo clic en cualquiera se abre.",
    ],
    ojo: [
      "Esta es la ÚNICA puerta de entrada a la ficha del cliente: no hay un menú de clientes en ninguna parte.",
      "Hay que acertarle al nombre. Un clic un poco más allá abre la cotización en vez de la ficha.",
      "Comprobado: con una sola letra el buscador de productos no muestra nada, ni siquiera un mensaje. Hacen falta 2 letras o más.",
      "Desde la ficha del cliente NO se puede descargar PDF, duplicar, eliminar ni cambiar el estado: eso se hace desde el listado.",
    ],
    claves: ["cliente", "ficha", "historial del cliente", "cuanto le he vendido", "cuantas escaleras", "que le he cotizado"],
  },
  {
    id: "pestanas",
    grupo: "Manejar el listado",
    icono: "FiLayers",
    titulo: "Trabajar con varias cotizaciones a la vez",
    dificultad: 2,
    resumen: "Cada cotización que abres queda como una pestaña en la barra gris de arriba.",
    directa: "Cada cotización que abres deja una pestaña arriba. Se salta entre ellas con **Alt+1, Alt+2…**",
    pasos: [
      "Abre una cotización: automáticamente aparece como pestaña en la barra gris de arriba.",
      "Para saltar de una a otra: haz clic en la pestaña. Lo que tenías sin guardar se guarda solo antes de cambiar.",
      'Para cerrar una: la "×" pequeña de la pestaña (o clic con la rueda del mouse encima).',
      'El "+" del extremo derecho abre una cotización nueva sin cerrar las que tienes.',
      "El ícono de hoja, al lado, vuelve al listado sin cerrar nada.",
      'El menú ⋮ del final trae "Cerrar las demás" y "Cerrar todas".',
    ],
    ojo: [
      "Las pestañas sobreviven al cerrar el navegador: al día siguiente siguen ahí.",
      "Caben hasta 12. Al abrir la 13 se cierra sola la más antigua.",
      "Atajo escondido: Alt+1, Alt+2… Alt+9 salta a esa pestaña.",
      "Si no hay ninguna cotización abierta, la barra gris no existe. No está dañado: es que no hay nada abierto.",
    ],
    claves: ["pestañas", "varias cotizaciones", "barra gris", "alt", "cerrar pestaña", "abrir varias"],
  },

  /* ═══════════════ HERRAMIENTAS ═══════════════ */
  {
    id: "importar",
    grupo: "Herramientas",
    icono: "FiUpload",
    titulo: "Importar desde un PDF, una foto o un Excel",
    dificultad: 3,
    resumen: "Lee una cotización que ya existe y llena la tabla sola. Hay que revisarla siempre antes de confirmar.",
    directa: "Botón **«Importar»** en el cotizador: acepta PDF, foto de una lista y Excel/CSV.",
    ir: "/cotizador",
    pasos: [
      'En el editor, toca el botón "Importar" (barra de arriba o encima de la tabla).',
      "Arrastra el archivo al recuadro punteado, o haz clic para buscarlo en el computador.",
      "Espera mientras lo procesa. Con una foto puede tardar entre 15 y 30 segundos.",
      "Aparece la pantalla de revisión: los datos del cliente arriba y los productos abajo, todo editable.",
      "REVISA producto por producto contra el papel original y corrige lo que haga falta.",
      'Toca el botón amarillo "Importar N productos".',
    ],
    ojo: [
      "MUY IMPORTANTE: importar REEMPLAZA los productos que ya tuviera la cotización. Si ya habías digitado cosas, se pierden. Importa primero, digita después.",
      "Lo que el sistema no logra leer, lo descarta EN SILENCIO. No hay una lista de «esto no lo entendí». De una foto borrosa pueden salir la mitad de los productos.",
      "Formatos que acepta: PDF, PNG, JPG, WEBP, BMP, TIFF, CSV y TXT. Excel (.xlsx) NO: hay que exportarlo a CSV primero desde el mismo Excel.",
      'Comprobado en el código: el botón "Cancelar extracción" solo cierra la ventana — el proceso sigue por dentro. Si vuelves a abrir Importar, puede aparecer el resultado del archivo que creías cancelado.',
      "Necesita internet para leer PDF y fotos.",
      "Si no reconoce nada, verás «0 productos encontrados» y el botón de confirmar apagado hasta que escribas algo a mano.",
    ],
    claves: ["importar", "pdf", "foto", "excel", "csv", "escanear", "ocr", "cargar cotizacion", "subir archivo"],
  },
  {
    id: "deshacer",
    grupo: "Herramientas",
    icono: "FiRotateCcw",
    titulo: "Deshacer un error",
    dificultad: 1,
    resumen: "Ctrl+Z devuelve la tabla de productos como estaba. Guarda hasta 60 pasos.",
    directa: "**Ctrl+Z**. En el celular, el aviso que sale al borrar trae su propio botón **«Deshacer»**.",
    ir: "/cotizador",
    pasos: [
      "Pulsa Ctrl+Z (o toca la flecha curva hacia la izquierda en la barra de arriba).",
      'Sale el aviso "Deshecho" abajo a la derecha.',
      "Para rehacer: Ctrl+Shift+Z, Ctrl+Y, o la flecha curva hacia la derecha.",
    ],
    ojo: [
      "Comprobado: Ctrl+Z SOLO cubre la tabla de productos (agregar, borrar, duplicar, reordenar filas y lo que escribes en ellas).",
      "NO deshace: los datos del cliente, los de la empresa, las notas, el descuento global, el AIU, ni el cambio de tipo.",
      "NO recupera una cotización eliminada. Eso es definitivo.",
      "Al abrir otra cotización, el historial de deshacer se borra: no se puede deshacer algo de una cotización desde otra.",
      "Al borrar una fila con nombre sale un aviso que ya te recuerda «Ctrl+Z para deshacer» durante 4 segundos.",
    ],
    claves: ["deshacer", "ctrl z", "me equivoque", "borre sin querer", "rehacer", "recuperar fila"],
  },
  {
    id: "atajos",
    grupo: "Herramientas",
    icono: "FiCommand",
    titulo: "Atajos de teclado (para ir más rápido)",
    dificultad: 2,
    resumen: "Con teclado se cotiza mucho más rápido. Estos son los que de verdad funcionan.",
    directa: "Los tres que más sirven: **Enter** pasa de casilla, **Ctrl+S** guarda, **Ctrl+Z** deshace.",
    ir: "/cotizador",
    pasos: [
      "Dentro de la tabla de productos: Enter pasa a la casilla siguiente; en la última crea una fila nueva.",
      "Tab avanza de casilla, Shift+Tab retrocede.",
      "Flechas ↑ ↓ suben y bajan de fila en la misma columna.",
      "Ctrl+Enter agrega una fila nueva al final.",
      "Ctrl+D duplica la fila donde está el cursor.",
      "Ctrl+S guarda (funciona en toda la pantalla).",
      "Ctrl+Z deshace, Ctrl+Shift+Z rehace.",
      "En el listado: la tecla / salta al buscador; Esc dentro del buscador borra lo escrito.",
      "En las pestañas: Alt+1 … Alt+9 salta a esa cotización.",
    ],
    ojo: [
      "La tecla Supr hace DOS cosas distintas: si la fila está vacía, la borra; si la fila tiene datos, borra solo la casilla donde estás.",
      "Para aceptar una sugerencia con el teclado: ↓ para resaltarla y después Enter o Tab. Enter a secas respeta lo que escribiste y pasa a Cantidad.",
      "La chuleta de atajos que aparece al pie de la tabla solo se ve en pantallas grandes.",
    ],
    claves: ["atajos", "teclado", "ctrl", "teclas", "mas rapido", "tab", "enter"],
  },

  /* ═══════════════ PROBLEMAS ═══════════════ */
  {
    id: "problemas",
    grupo: "Cuando algo sale mal",
    icono: "FiAlertTriangle",
    titulo: "Avisos y qué hacer con cada uno",
    dificultad: 2,
    resumen: "Casi todos los avisos son informativos. Solo la franja roja de arriba pide una acción urgente.",
    directa: "Ningún aviso de la app borra nada por su cuenta. Aquí está qué significa cada uno.",
    pasos: [
      'FRANJA ROJA ARRIBA: es el aviso serio. Descarga en PDF lo que estés haciendo ANTES de cerrar, y avísale al encargado.',
      '"Agrega al menos un producto": la cotización está vacía; escribe al menos un producto para poder guardar.',
      '"Faltan datos de entrega": falta el nombre, la dirección o el celular del cliente. Ve a la pestaña CLIENTE.',
      '"Error generando PDF": vuelve a intentarlo sin cambiar de pestaña del navegador mientras se genera.',
      '"Cambios sin guardar": elige "Guardar y salir" si quieres conservar el trabajo.',
    ],
    ojo: [
      'La franja roja puede decir tres cosas: que el almacenamiento del navegador está lleno, que no se pudo guardar en el equipo, o que se guardó aquí pero no se pudo subir a la nube. En los tres casos la instrucción es la misma: descarga el PDF y avisa.',
      "Sin internet la app SIGUE funcionando: se puede crear, editar, guardar y sacar PDF. Lo que no funciona sin internet es importar archivos.",
      'La etiqueta verde "Nube" arriba significa que se está compartiendo con los demás computadores. Al tocarla, sincroniza de inmediato.',
      "Si dos personas editan la MISMA cotización al tiempo, gana la última que guarde y la otra pierde su trabajo sin aviso. Regla práctica: una cotización, una persona a la vez.",
    ],
    claves: ["error", "problema", "no guarda", "franja roja", "aviso", "no funciona", "sin internet", "se perdio", "nube"],
  },
  {
    id: "celular",
    grupo: "Cuando algo sale mal",
    icono: "FiSmartphone",
    titulo: "Usar la app desde el celular",
    dificultad: 2,
    resumen: "Funciona igual, pero organizada en 4 pasos en vez de columnas.",
    directa: "En celular la lista sale en tarjetas, con los botones grandes: PDF, llamar al cliente, nueva para ese cliente y el menú ⋮.",
    ir: "/historial",
    pasos: [
      "Arriba verás cuatro pasos: EMPRESA · CLIENTE · PRODUCTOS · CONFIG. Toca el que necesites o usa los botones de avanzar y retroceder.",
      "En PRODUCTOS no hay tabla: cada producto es una tarjeta. Tócala para abrirla y llenarla.",
      "Abajo, siempre visible, está la barra con el Total, y los botones Ver, PDF y Guardar.",
    ],
    ojo: [
      'Para marcar el domicilio sin IVA, dentro de la tarjeta hay un interruptor que dice "Transporte (sin IVA)".',
      "El botón de Rehacer no aparece en el celular; el de Deshacer sí.",
      'Para cambiar entre Comercial y Obra en el celular hay que ir al paso CONFIG y tocar la ficha "Comercial ✎" / "Obra ✎".',
      "Para reordenar productos se arrastra desde los seis puntitos de la tarjeta.",
    ],
    claves: ["celular pantalla", "movil pantalla", "telefono pantalla", "pantalla pequeña"],
  },
  /* ═══════════════ LO QUE NADIE ENCUENTRA SOLO ═══════════════
     Estos temas salieron de mirar qué hace la aplicación que NO se ve.
     Son funciones que están ahí, que ahorran tiempo de verdad, y que
     nadie descubre por su cuenta porque viven detrás de un menú, de un
     nombre de campo o de un gesto. Si alguien pregunta por una de estas
     y la ayuda no la tuviera, se iría creyendo que la app no lo hace. */
  {
    id: "nueva-mismo-cliente",
    grupo: "Manejar el listado",
    icono: "FiFilePlus",
    titulo: "Cotizarle otra vez a un cliente que ya vino",
    dificultad: 1,
    resumen: "Una cotización en blanco pero con los datos del cliente ya puestos. No es lo mismo que duplicar.",
    directa: "Menú **⋮** de cualquier cotización de ese cliente → **«Nueva para este cliente»**. En el celular está el botón de la hoja con el **+** en la tarjeta.",
    ir: "/historial",
    pasos: [
      "En el listado, busca cualquier cotización vieja de ese cliente.",
      'Toca el menú "⋮" de esa cotización (en el celular, el botón de la hoja con un + en el pie de la tarjeta).',
      'Elige "Nueva para este cliente".',
      "Se abre una cotización nueva, vacía, con el nombre, la dirección, el celular y todo lo del cliente ya escrito.",
      "Solo te queda poner los productos.",
    ],
    ojo: [
      'NO es lo mismo que "Duplicar". Duplicar se trae también los productos, el descuento y las notas de la otra cotización. Esta llega en blanco: solo el cliente.',
      "Tampoco vuelve a preguntar si es Comercial o de Obra: usa el mismo tipo de la cotización de donde saliste. Se puede cambiar después en Configuración.",
      "El número de la cotización nueva es el que sigue, no el del cliente.",
      "Si el cliente cambió de dirección o de teléfono, corrígelo en el paso Cliente antes de guardar: el dato viejo es el que venía copiado.",
    ],
    claves: ["mismo cliente", "otra vez", "volvio", "nueva para este cliente", "cliente repetido", "en blanco", "cotizar de nuevo", "sin productos", "vuelve a pedir", "cliente frecuente"],
  },
  {
    id: "perfil",
    grupo: "Arranque",
    icono: "FiHome",
    titulo: "Cambiar los datos de la ferretería (Mi perfil)",
    dificultad: 1,
    resumen: "El nombre, el NIT, la dirección, el teléfono y el logo que salen en el encabezado de todas las cotizaciones.",
    directa: "Están en **Mi perfil**: el botón del engranaje arriba en el listado, o tocando el logo dentro del cotizador. Se guardan solos.",
    ir: "/perfil",
    pasos: [
      "En el listado, toca el botón del engranaje que está arriba a la derecha (al lado de «Nueva cotización»).",
      "Ahí están todos los datos de la ferretería: nombre, NIT, ciudad, dirección, teléfono y correo.",
      "Cámbialos y ya: se guardan solos con cada letra, no hay botón de guardar.",
      'Para el logo: "Cargar logo" y eliges la imagen del computador o del celular.',
      "A la derecha (o abajo en el celular) ves cómo va quedando el encabezado impreso.",
    ],
    ojo: [
      "Estos datos NO están dentro de la cotización: se llenan una sola vez y salen en todas.",
      "Antes estaban en la primera pestaña del cotizador. Se movieron aquí porque son siempre los mismos y estorbaban en el paso donde uno tiene el cliente al frente esperando.",
      "El logo pesa máximo 2 MB. Si tu imagen es más grande, redúcela antes.",
      "Si hay nube activa, el membrete se copia solo a las demás computadoras de la ferretería.",
      'El botón "Restaurar los originales" devuelve los datos de FerreExpress con los que vino la app.',
    ],
    claves: ["mi perfil", "perfil", "datos de la empresa", "empresa", "logo", "membrete", "nit", "encabezado", "cambiar el nombre", "razon social", "donde estan los datos de la empresa", "configuracion"],
  },
  {
    id: "borrar-producto",
    grupo: "Hacer una cotización",
    icono: "FiTrash2",
    titulo: "Borrar un producto de la cotización",
    dificultad: 1,
    resumen: "Un solo toque en el bote de basura del renglón. Si te equivocaste, el aviso trae «Deshacer».",
    directa: "En el celular: el **bote de basura rojo** al lado derecho del renglón, un solo toque. En el computador: la **X** al final de la fila, o Supr con la fila vacía.",
    ir: "/cotizador",
    pasos: [
      "Ubica el renglón del producto que sobra.",
      "En celular y tablet: toca el bote de basura rojo que está a la derecha del nombre del producto.",
      "En computador: la X al final de la fila.",
      'Abajo sale el aviso "… eliminado" con un botón "Deshacer" al lado.',
      'Si te equivocaste de renglón, toca "Deshacer" y vuelve tal como estaba.',
    ],
    ojo: [
      "El último renglón no se puede borrar: la cotización siempre deja uno para escribir.",
      'El aviso con "Deshacer" dura 5 segundos. Pasado ese tiempo todavía puedes usar Ctrl+Z en el computador.',
      "Borrar un producto NO borra la cotización. Para eliminar la cotización entera es desde el listado, en el menú ⋮.",
    ],
    claves: ["borrar producto", "eliminar producto", "quitar producto", "borrar item", "eliminar item", "borrar fila", "eliminar renglon", "borrar renglon", "me sobra", "quitar de la lista", "papelera", "basura", "borrar rapido", "quitar item", "borrar productos celular"],
  },
  {
    id: "reordenar",
    grupo: "Hacer una cotización",
    icono: "FiMove",
    titulo: "Cambiar el orden de los productos",
    dificultad: 2,
    resumen: "Se arrastran de la manija de puntitos que tiene cada renglón a la izquierda.",
    directa: "Arrastra el renglón desde la **manija de puntitos** que está a su izquierda. Funciona con el dedo y con el ratón.",
    ir: "/cotizador",
    pasos: [
      "Mira a la izquierda del renglón: hay una manija de seis puntitos grises.",
      "Mantén el dedo (o el botón del ratón) sobre esa manija.",
      "Arrastra el renglón hacia arriba o hacia abajo hasta donde lo quieras.",
      "Suelta. Los números se renumeran solos.",
    ],
    ojo: [
      "Hay que agarrar la manija de puntitos, no el nombre del producto: si arrastras desde el texto, lo que haces es seleccionar letras.",
      "El renglón que estás moviendo se levanta con sombra para que se vea cuál es.",
      "El orden que dejes es el orden en que salen impresos en el PDF.",
      "Ctrl+Z también deshace un reordenamiento.",
    ],
    claves: ["ordenar", "reordenar", "mover", "arrastrar", "cambiar de orden", "subir", "bajar",
      "acomodar", "manija", "primero", "mover un producto", "mover producto", "subir un producto",
      "bajar un producto", "cambiar el orden", "orden de los productos", "poner de primero"],
  },
  {
    id: "sugerencias",
    grupo: "Hacer una cotización",
    icono: "FiZap",
    titulo: "La app se acuerda de los productos y los clientes",
    dificultad: 1,
    resumen: "Lo que ya cotizaste antes sale solo al empezar a escribirlo, con su precio y su unidad.",
    directa: "Escribe las primeras letras y espera medio segundo: sale una lista con lo que ya cotizaste. Tócalo y llena **descripción, precio y unidad** de un golpe.",
    ir: "/cotizador",
    pasos: [
      "En la casilla del producto, escribe las primeras letras (por ejemplo «ceme»).",
      "Debajo aparece una lista con los productos que ya has cotizado antes.",
      "Tócalo (o con el teclado: flecha ↓ para resaltarlo y Enter).",
      "Se llenan solos la descripción, el precio y la unidad, y el cursor queda en la cantidad.",
      "Con el nombre del cliente pasa lo mismo: sale la lista de clientes anteriores con toda su ficha.",
    ],
    ojo: [
      "La lista sale de TUS cotizaciones anteriores, no de un catálogo. Mientras más cotices, mejor sugiere.",
      "El precio que trae es el de la última vez. Si subió, corrígelo: la app no lo actualiza sola.",
      'Enter a secas RESPETA lo que escribiste y pasa a la cantidad. Para aceptar la sugerencia hay que resaltarla primero con la flecha ↓.',
      "Si no quieres la sugerencia, sigue escribiendo o toca Esc y desaparece.",
    ],
    claves: ["sugerencias", "autocompletar", "se acuerda", "memoria", "productos frecuentes", "clientes frecuentes", "sale solo", "predice", "lista que aparece", "escribir menos"],
  },
  {
    id: "ver-mas-movil",
    grupo: "Manejar el listado",
    icono: "FiChevronDown",
    titulo: "Ver más cotizaciones en el celular",
    dificultad: 1,
    resumen: "El celular muestra las 8 más recientes y va agregando de a 10 con un botón.",
    directa: 'Baja hasta el final de la lista y toca **«Ver 10 más»**. Cada toque agrega diez sin perder las que ya estabas viendo.',
    ir: "/historial",
    pasos: [
      "Baja hasta el final de la lista de cotizaciones.",
      'Toca el botón "Ver 10 más".',
      "Se agregan diez cotizaciones debajo, sin que se te vayan las de arriba.",
      "Repite las veces que necesites.",
    ],
    ojo: [
      "En el celular no hay números de página a propósito: con 300 cotizaciones salían 60 botoncitos imposibles de acertar con el dedo.",
      "Si estás buscando una cotización vieja, es mucho más rápido escribir el nombre del cliente en el buscador que ir tocando «Ver más».",
      "Al cambiar un filtro o una búsqueda, la lista vuelve a empezar por las primeras.",
    ],
    claves: ["ver mas", "mas cotizaciones", "no salen todas", "solo veo 8", "paginas", "siguiente pagina", "cargar mas", "faltan cotizaciones"],
  },
  {
    id: "filtros-movil",
    grupo: "Manejar el listado",
    icono: "FiFilter",
    titulo: "Los filtros en el celular están plegados",
    dificultad: 1,
    resumen: "En el celular solo se ve el buscador; los cuatro filtros salen al tocar «Filtros».",
    directa: 'Toca el botón **«Filtros»** que está al lado derecho del buscador. Ahí están tipo, estado, fecha y orden.',
    ir: "/historial",
    pasos: [
      'Al lado del buscador hay un botón que dice "Filtros".',
      "Tócalo y se despliegan los cuatro: tipo (Comercial/Obra), estado, fecha y orden.",
      "Elige los que necesites.",
      'Vuelve a tocar "Filtros" para plegarlos y ver la lista completa otra vez.',
    ],
    ojo: [
      "Con los filtros plegados, lo que esté filtrando se ve en etiquetas amarillas debajo del buscador. Al lado hay un botón «Quitar» para limpiarlos todos.",
      'Cuando hay algún filtro puesto, el botón "Filtros" se pone amarillo.',
      "Están plegados a propósito: desplegados ocupaban media pantalla del teléfono y la primera cotización quedaba fuera de la vista.",
    ],
    claves: ["filtros", "filtrar", "no veo los filtros", "donde estan los filtros", "celular", "estado", "fecha", "orden", "plegado"],
  },
  {
    id: "llamar-cliente",
    grupo: "Manejar el listado",
    icono: "FiPhone",
    titulo: "Llamar al cliente desde la cotización",
    dificultad: 1,
    resumen: "En el celular, el teléfono verde de la tarjeta marca directo al número del cliente.",
    directa: "En el celular, el **teléfono verde** en el pie de la tarjeta llama al cliente sin tener que buscar el número.",
    ir: "/historial",
    pasos: [
      "En el listado del celular, ubica la cotización.",
      "En la fila de botones de abajo, toca el teléfono verde.",
      "El celular abre el marcador con el número del cliente puesto.",
    ],
    ojo: [
      "El botón solo aparece si esa cotización tiene celular guardado en los datos del cliente.",
      "En el computador no sale, porque el computador no llama.",
      "Es el número que quedó guardado en esa cotización. Si el cliente lo cambió, hay que corregirlo en su ficha.",
    ],
    claves: ["llamar", "telefono", "marcar", "celular del cliente", "contactar", "boton verde"],
  },
  {
    id: "codigo-descuento-renglon",
    grupo: "Hacer una cotización",
    icono: "FiTag",
    titulo: "Ponerle código o descuento a un solo producto",
    dificultad: 2,
    resumen: "Están en el menú ⋮ de cada renglón, no en la fila principal.",
    directa: "En el celular, menú **⋮** del renglón: ahí están «Código / referencia» y «Descuento de este producto». En el computador son columnas de la tabla.",
    ir: "/cotizador",
    pasos: [
      "En celular o tablet, toca el menú ⋮ que está a la derecha del renglón.",
      "Arriba del menú hay dos casillas: «Código / referencia» y «Descuento de este producto (%)».",
      "Escribe lo que necesites y toca fuera para cerrar.",
      "Lo que pusiste queda en una etiqueta pequeña debajo del renglón.",
      "En el computador son dos columnas normales de la tabla: Ref. y Desc.",
    ],
    ojo: [
      "Ese descuento es SOLO de ese producto. El que aplica a toda la cotización es el «Descuento general» del resumen.",
      "Se pueden usar los dos a la vez: primero se aplica el del producto, después el general sobre el subtotal.",
      "El código sale impreso en el PDF junto al producto. Sirve cuando el cliente pide por referencia.",
    ],
    claves: ["codigo", "referencia", "ref", "descuento del producto", "descuento de una fila", "descuento renglon", "menu de tres puntos", "opciones del producto"],
  },

];

/* ─── Grupos en orden de aparición ─── */
export const GRUPOS = [
  "Arranque",
  "Hacer una cotización",
  "Obra y AIU",
  "Manejar el listado",
  "Herramientas",
  "Cuando algo sale mal",
];

/* ─── Etiqueta de dificultad ─── */
export const DIFICULTAD = {
  1: { texto: "Fácil", color: "green" },
  2: { texto: "Se enseña una vez", color: "yellow" },
  3: { texto: "Necesita explicación", color: "red" },
};

/* ═══════════════════════════════════════════════════════════
   BUSCADOR / ASISTENTE — funciona sin internet
   Puntúa cada tema contra lo que escribió la persona.
═══════════════════════════════════════════════════════════ */
const norm = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Palabras que no aportan al buscar */
const VACIAS = new Set([
  "como", "hago", "hace", "hacer", "para", "que", "cual", "cuales", "donde", "cuando",
  "por", "con", "sin", "una", "uno", "unas", "unos", "del", "las", "los", "the",
  "puedo", "poder", "quiero", "necesito", "ayuda", "app", "aplicacion", "sistema",
  "esta", "este", "esto", "eso", "esa", "ese", "aqui", "alli", "muy", "mas", "pero",
  "y", "o", "a", "de", "en", "el", "la", "un", "es", "se", "me", "le", "lo", "al",
]);

/* ── RAÍZ DE UNA PALABRA ──
   "borro", "borra", "borrar" y "borré" son la misma idea, pero como
   cadenas de texto no se parecen lo suficiente. Sin esto, preguntar
   "cómo BORRO un producto" no encontraba el tema cuya palabra clave es
   "BORRAR producto", y devolvía cualquier otro tema que tuviera la
   palabra "celular". Se recortan las terminaciones más comunes del
   español hasta dejar la raíz. No es un analizador de verdad — no hace
   falta: solo tiene que emparejar lo que la gente escribe con lo que
   dice la guía. */
const raiz = (w) => {
  let x = w;
  for (const fin of [
    "andolo", "iendolo", "ando", "iendo", "aciones", "ciones",
    "amos", "emos", "imos", "aron", "eron", "aste", "iste",
    "arlo", "erlo", "irlo", "arla", "erla", "irla",
    "ar", "er", "ir", "as", "es", "os", "an", "en", "on", "aba", "ia",
    "o", "a", "e", "s",
  ]) {
    if (x.length - fin.length >= 4 && x.endsWith(fin)) { x = x.slice(0, -fin.length); break; }
  }
  return x;
};

/* Dos palabras "coinciden" si una empieza por la raíz de la otra */
const casan = (a, b) => {
  if (a === b) return true;
  const ra = raiz(a), rb = raiz(b);
  return ra.length >= 3 && rb.length >= 3 && (a.startsWith(rb) || b.startsWith(ra) || ra === rb);
};

export function buscarTemas(consulta, limite = 4) {
  const q = norm(consulta).trim();
  if (!q) return [];
  const palabras = q.split(/\s+/).filter((p) => p.length > 2 && !VACIAS.has(p));
  if (!palabras.length) return [];

  const puntuados = TEMAS.map((t) => {
    const enTitulo  = norm(t.titulo).split(/\s+/);
    const enDirecta = norm(t.directa || t.resumen);
    const enResumen = norm(t.resumen);
    const enClaves  = t.claves.map(norm);
    const enCuerpo  = norm(
      [...(t.pasos || []), ...(t.ojo || []), ...(t.ejemplo?.lineas || [])].join(" ")
    );

    let p = 0;
    let pCuerpo = 0;
    for (const w of palabras) {
      /* Una palabra clave que ES la palabra: lo que más pesa */
      if (enClaves.some((c) => c === w)) p += 12;
      else if (enClaves.some((c) => c.split(/\s+/).some((cw) => casan(cw, w)))) p += 7;
      if (enTitulo.some((tw) => casan(tw, w))) p += 6;
      if (enDirecta.includes(w)) p += 4;
      else if (enResumen.includes(w)) p += 3;
      if (enCuerpo.includes(w)) pCuerpo += 1;
    }
    /* Un tema largo no puede ganar por ser largo: "La pantalla principal"
       describe la aplicación entera, así que su cuerpo contiene casi
       cualquier palabra que uno escriba, y le ganaba a los temas que
       responden la pregunta exacta. El cuerpo desempata; no decide. */
    p += Math.min(pCuerpo, 2);

    /* ── LO QUE ARREGLA "CÓMO BORRO UN PRODUCTO EN EL CELULAR" ──
       Una clave de varias palabras que casa ENTERA con la pregunta vale
       más que dos claves sueltas. Así "borrar producto" (dos palabras,
       las dos presentes) le gana a "celular" (una palabra, presente
       también en otros cinco temas). Antes ganaba el que tuviera la
       palabra más genérica, que es justo el que no sirve. */
    for (const c of enClaves) {
      const cw = c.split(/\s+/);
      if (cw.length < 2) continue;
      const casadas = cw.filter((x) => palabras.some((w) => casan(x, w))).length;
      if (casadas === cw.length) p += 9 * cw.length;   // la clave completa
      else if (casadas >= 2) p += 5;                   // buena parte de ella
    }

    /* Una clave que ES la pregunta manda sobre una que solo la contiene:
       "me equivoque" es la clave literal de Deshacer, mientras que
       "me equivoque de tipo" es la de Convertir. Sin separarlas, quien
       escribía "me equivoqué" a secas terminaba en Convertir. */
    if (enClaves.some((c) => c === q)) p += 25;
    else if (enClaves.some((c) => c.includes(q))) p += 10;
    return { tema: t, puntos: p };
  })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);

  return puntuados.slice(0, limite).map((x) => x.tema);
}

/** Preguntas de ejemplo que se ofrecen en el asistente */
/* Se eligieron a propósito las que la gente NO adivina sola. "¿Cómo
   saco el PDF?" se descubre mirando la pantalla; "cotizarle otra vez al
   mismo cliente" no, y era justo la que la gente hacía a mano. */
export const PREGUNTAS_SUGERIDAS = [
  "¿Cuál es la clave para entrar?",
  "¿Cómo hago una cotización desde cero?",
  "Cotizarle otra vez a un cliente que ya vino",
  "¿Dónde cambio el logo y los datos de la empresa?",
  "¿Cómo borro un producto en el celular?",
  "¿Cómo cobro el domicilio sin IVA?",
  "¿Qué es el AIU de una obra?",
  "¿Cómo cambio el orden de los productos?",
  "Me equivoqué y borré una fila",
  "¿Cuánto le he vendido a un cliente?",
];

export function temaPorId(id) {
  return TEMAS.find((t) => t.id === id) || null;
}
