/**
 * Reglas del plan "Invita y gana".
 *
 * La escalera da una primera victoria muy rápida —un solo amigo ya paga— y
 * después sube en escalones cada vez más golosos. El saldo se topa en $20:
 * al canjearlo vuelve a acumularse, así siempre hay una meta siguiente sin
 * que la exposición por persona crezca sin control.
 */

/** Tope de saldo acumulable a la vez, en dólares. */
export const TOPE_SALDO = 20

/** Descuento de bienvenida para quien se registra con un código. */
export const BONO_INVITADO = 2

/**
 * Compra mínima para usar el bono de bienvenida. Sin este mínimo, dos dólares
 * sobre un desodorante de tres se comen el margen entero.
 */
export const MINIMO_BONO = 20

/** Saldo total al que llega el anfitrión según amigos que calificaron. */
export const ESCALERA: { amigos: number; saldo: number }[] = [
  { amigos: 1, saldo: 3 },
  { amigos: 3, saldo: 8 },
  { amigos: 5, saldo: 14 },
  { amigos: 7, saldo: TOPE_SALDO },
]

/** Máximo de amigos que pueden calificar en un mes por anfitrión. */
export const TOPE_MENSUAL = 10

/** Saldo que corresponde a N amigos calificados. */
export const saldoPara = (amigos: number) => {
  let saldo = 0
  for (const paso of ESCALERA) {
    if (amigos >= paso.amigos) saldo = paso.saldo
  }
  return Math.min(saldo, TOPE_SALDO)
}

/** Próxima meta y porcentaje real de avance hacia ella. */
export const progreso = (amigos: number) => {
  const siguiente = ESCALERA.find((p) => amigos < p.amigos)
  if (!siguiente) {
    return {
      meta: null,
      faltan: 0,
      porcentaje: 100,
      premio: TOPE_SALDO,
    }
  }
  const anterior = [...ESCALERA].reverse().find((p) => amigos >= p.amigos)
  const desde = anterior?.amigos ?? 0
  const tramo = siguiente.amigos - desde
  return {
    meta: siguiente.amigos,
    faltan: siguiente.amigos - amigos,
    porcentaje: Math.round(((amigos - desde) / tramo) * 100),
    premio: siguiente.saldo,
  }
}

/** Genera un código legible: sin caracteres que se confundan al dictarlo. */
export const generarCodigo = (nombre?: string) => {
  const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const base = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
  let sufijo = ""
  for (let i = 0; i < 4; i++) {
    sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return `${base || "ANGIE"}${sufijo}`
}
