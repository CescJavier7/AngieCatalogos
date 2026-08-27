import {
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  ApplicationMethodType,
  CampaignBudgetType,
  ContainerRegistrationKeys,
  Modules,
  PromotionRuleOperator,
  PromotionStatus,
  PromotionType,
} from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { BONO_INVITADO, MINIMO_BONO } from "../modules/referrals/rules"

/**
 * Bono de bienvenida: los $2 que la tienda promete a quien llega con el
 * código de una amiga.
 *
 * Hasta ahora eso era solo una frase en la página. Aquí se vuelve una
 * promoción de verdad de Medusa, que es lo único que sabe descontar del
 * carrito, aparecer en el pedido y quedar registrada en el admin.
 *
 * Se crea UNA promoción por clienta invitada, no una compartida, porque el
 * bono no es para cualquiera: solo para quien fue invitada. Medusa no tiene
 * una regla de "clienta X" en su lista oficial, pero las reglas se evalúan
 * contra el carrito por ruta de atributo, y el carrito trae `customer.*`.
 *
 * Tres candados, cada uno tapa un agujero distinto:
 *  · regla `customer.id`     → nadie más puede usar ese código
 *  · regla `item_subtotal`   → no aplica por debajo del mínimo, ni aunque
 *                              saquen productos del carrito después
 *  · campaña con tope de 1   → un solo uso, aunque la clienta vuelva a pedir
 */

/**
 * Código derivado de la clienta: no hace falta guardarlo en la base y
 * siempre se puede volver a calcular. No es secreto —la regla de arriba lo
 * protege— pero tampoco se adivina de un vistazo.
 */
export const codigoBono = (customerId: string) =>
  `BIENVENIDA-${customerId.replace(/^cus_/, "").slice(-10).toUpperCase()}`

/**
 * Devuelve el código del bono de esa clienta, creando la promoción la
 * primera vez. Es idempotente: si ya existe, no la toca.
 */
export const asegurarBono = async (container: any, customerId: string) => {
  const code = codigoBono(customerId)
  const promociones = container.resolve(Modules.PROMOTION)

  const [existente] = await promociones.listPromotions({ code }, { take: 1 })
  if (existente) return code

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code,
          type: PromotionType.STANDARD,
          status: PromotionStatus.ACTIVE,
          // No es automática: la tienda la aplica cuando corresponde
          is_automatic: false,
          campaign: {
            name: `Bono de bienvenida · ${customerId}`,
            campaign_identifier: code,
            // Un solo uso en la vida de esa cuenta
            budget: { type: CampaignBudgetType.USAGE, limit: 1 },
          },
          application_method: {
            type: ApplicationMethodType.FIXED,
            target_type: ApplicationMethodTargetType.ITEMS,
            // "across" reparte el descuento entre los productos del carrito
            allocation: ApplicationMethodAllocation.ACROSS,
            value: BONO_INVITADO,
            currency_code: "usd",
          },
          rules: [
            {
              attribute: "customer.id",
              operator: PromotionRuleOperator.EQ,
              values: [customerId],
            },
            {
              // El mínimo vive en la promoción, no en la tienda: así sigue
              // vigente aunque vacíen el carrito después de aplicarla
              attribute: "item_subtotal",
              operator: PromotionRuleOperator.GTE,
              values: [String(MINIMO_BONO)],
            },
          ],
        },
      ],
    },
  })

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`[referidos] Bono de bienvenida creado para ${customerId}: ${code}`)
  return code
}
