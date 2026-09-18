/**
 * Quiénes reciben el correo interno de la tienda.
 *
 * `TIENDA_EMAIL` admite varias direcciones separadas por coma —la de quien
 * despacha y la de quien lleva las cuentas no tienen por qué ser la misma— y
 * se limpia aquí una vez para que cada subscriber no tenga que volver a
 * partir, recortar y dudar del formato.
 *
 *   TIENDA_EMAIL=pi.larcaizac@hotmail.com, javiercaiza220158@gmail.com
 */
export const destinatariosTienda = (): string[] => {
  const crudo = process.env.TIENDA_EMAIL ?? ""
  const vistos = new Set<string>()
  const lista: string[] = []

  for (const trozo of crudo.split(/[,;\s]+/)) {
    const correo = trozo.trim().toLowerCase()
    // Lo mínimo para no mandar a una dirección que va a rebotar
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) continue
    if (vistos.has(correo)) continue
    vistos.add(correo)
    lista.push(correo)
  }
  return lista
}

/**
 * Copia oculta a la tienda, dicha en los dos dialectos que hablan nuestros
 * proveedores: `bcc` para el SMTP propio, `personalizations` para SendGrid.
 * Cada uno lee lo suyo e ignora el resto.
 */
export const copiaOcultaTienda = (para: string) => {
  const bcc = destinatariosTienda().filter((c) => c !== para.toLowerCase())
  if (!bcc.length) return undefined
  return {
    bcc,
    personalizations: [
      {
        to: [{ email: para }],
        bcc: bcc.map((email) => ({ email })),
      },
    ],
  }
}
