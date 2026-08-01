import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REFERRALS_MODULE } from "../modules/referrals"
import type ReferralsModuleService from "../modules/referrals/service"

/**
 * Acredita el premio del plan "Invita y gana" cuando la invitada paga su
 * PRIMER pedido CON TARJETA.
 *
 * Solo cuentan las tarjetas a propósito: un pago por transferencia o contra
 * entrega se acuerda por WhatsApp y no hay forma automática de saber que
 * entró el dinero, así que premiarlo abriría la puerta al fraude. Mientras
 * no exista una pasarela configurada, este suscriptor no acredita nada.
 *
 * Proveedores considerados "tarjeta": REFERRAL_CARD_PROVIDERS, separados por
 * coma. Por defecto los de Kushki y PayPhone.
 */
const proveedoresTarjeta = () =>
  (process.env.REFERRAL_CARD_PROVIDERS || "kushki,payphone")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

export default async function referralQualifyHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const referrals: ReferralsModuleService = container.resolve(REFERRALS_MODULE)

  try {
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
      ],
      filters: { id: data.id },
    })

    if (!order?.customer_id) return

    const pagos = (order.payment_collections ?? []).flatMap(
      (pc: any) => pc.payments ?? []
    )
    const conTarjeta = pagos.some((p: any) =>
      proveedoresTarjeta().some((prov) =>
        (p.provider_id ?? "").toLowerCase().includes(prov)
      )
    )

    if (!conTarjeta) {
      logger.info(
        `[referidos] Pedido ${order.id} sin pago con tarjeta: no acredita premio.`
      )
      return
    }

    const resultado = await referrals.qualifyReferral({
      referredCustomerId: order.customer_id,
      orderId: order.id,
    })

    if (resultado) {
      logger.info(
        `[referidos] ${resultado.host_customer_id} suma su amiga n.º ${resultado.amigos} y gana $${resultado.premio}.`
      )
    }
  } catch (e: any) {
    logger.error(`[referidos] Error acreditando premio: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
