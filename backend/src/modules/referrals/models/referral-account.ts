import { model } from "@medusajs/framework/utils"

/**
 * La cuenta de referidos de una clienta: su código para invitar y el saldo
 * que ha ganado. El saldo tiene tope (ver TOPE_SALDO en las reglas): al
 * canjearlo vuelve a acumularse, así el programa nunca se acaba pero la
 * exposición por persona sí está acotada.
 */
const ReferralAccount = model.define("referral_account", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  code: model.text().unique(),
  /** Saldo disponible en dólares. */
  balance: model.number().default(0),
  /** Saldo ya canjeado, solo para historial. */
  redeemed: model.number().default(0),
  /** Amigos que ya calificaron (pagaron con tarjeta). */
  qualified_count: model.number().default(0),
  /** Datos con los que se detecta el auto-referido. */
  cedula: model.text().nullable(),
  phone: model.text().nullable(),
  /** Consentimiento explícito para promociones (LOPDP). */
  accepts_marketing: model.boolean().default(false),
})

export default ReferralAccount
