import { model } from "@medusajs/framework/utils"

/**
 * Un amigo invitado. Nace en "pending" al registrarse con un código y solo
 * pasa a "qualified" cuando paga su primer pedido con tarjeta; si algo huele
 * mal queda en "review" para que Angie lo mire antes de acreditar.
 */
const Referral = model.define("referral", {
  id: model.id().primaryKey(),
  /** Código con el que se registró. */
  code: model.text().index(),
  /** Cuenta de quien invitó. */
  host_customer_id: model.text().index(),
  /** Cliente invitado. */
  referred_customer_id: model.text().unique(),
  status: model
    .enum(["pending", "qualified", "review", "rejected"])
    .default("pending"),
  /** Pedido que lo hizo calificar. */
  order_id: model.text().nullable(),
  /** Premio acreditado por este amigo, en dólares. */
  reward: model.number().default(0),
  /** Por qué quedó en revisión o fue rechazado. */
  reason: model.text().nullable(),
  /** Huellas para el antifraude. */
  cedula: model.text().nullable(),
  phone: model.text().nullable(),
  signup_ip: model.text().nullable(),
})

export default Referral
