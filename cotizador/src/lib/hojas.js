/**
 * hojas.js — reparto de productos en hojas del documento
 * ─────────────────────────────────────────────────────────────────
 * Vive aparte del componente para que el archivo del documento exporte
 * solo componentes (requisito de Fast Refresh en desarrollo).
 */

/* Hoja carta a 96 ppp: 216 × 279 mm */
export const PAGE_W = 816;
export const PAGE_H = 1054;

/* Cuántos productos caben por hoja según lo que la acompañe.
   Son topes conservadores: es preferible que sobre un renglón a que el
   contenido se salga de la hoja y el PDF corte una fila por la mitad. */
const CAP_UNICA   = 16;   // única hoja: lleva cliente, resumen, notas y firma
const CAP_PRIMERA = 22;   // primera de varias: lleva cliente, no lleva cierre
const CAP_MEDIA   = 26;   // hojas intermedias: solo tabla
const CAP_ULTIMA  = 18;   // última: lleva resumen, notas y firma

/**
 * Reparte los productos en hojas. Devuelve un array de arrays.
 * La última hoja siempre deja sitio para el resumen y la firma.
 */
export function repartirEnHojas(items) {
  if (items.length <= CAP_UNICA) return [items];

  const hojas = [items.slice(0, CAP_PRIMERA)];
  let resto = items.slice(CAP_PRIMERA);

  while (resto.length > CAP_ULTIMA) {
    const corte = Math.min(CAP_MEDIA, resto.length - CAP_ULTIMA);
    hojas.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }
  hojas.push(resto);
  return hojas;
}
