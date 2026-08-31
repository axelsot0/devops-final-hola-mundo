/**
 * Detecta movimientos entre cuentas propias.
 *
 * Un Toke que te envías de Popular a Qik llega como "Has recibido RD$ X por
 * parte de <tu nombre>". Contarlo como ingreso infla tus finanzas: el dinero
 * no entró de fuera, solo cambió de cuenta. Y si además se detecta la salida
 * en el otro banco, quedarían inflados ingresos y gastos a la vez.
 *
 * La comparación es por nombre porque es lo único que traen los correos. El
 * banco escribe "AXEL MANUEL SOTO PEREZ" y el remitente puede figurar como
 * "Axel Soto Perez": mismo titular, distinto detalle. Por eso se exige que
 * los nombres de uno estén contenidos en los del otro, no una igualdad
 * exacta.
 */
function tokens(value: string) {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z]+/)
      // "de", "la", "y" no distinguen a nadie.
      .filter((token) => token.length > 2),
  );
}

/**
 * Dos nombres son de la misma persona si todos los del más corto aparecen en
 * el más largo. Se exigen al menos dos coincidencias: un solo nombre de pila
 * compartido es demasiado común para arriesgarse a ocultar un ingreso real.
 */
export function isSamePerson(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;

  const first = tokens(a);
  const second = tokens(b);
  if (first.size < 2 || second.size < 2) return false;

  const [shorter, longer] =
    first.size <= second.size ? [first, second] : [second, first];

  return [...shorter].every((token) => longer.has(token));
}
