import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { payphoneEnabled } from "../lib/payphone"

const PROVEEDOR = "pp_payphone_payphone"

/**
 * Habilita el pago con tarjeta en las regiones que ya existen.
 *
 * El seed solo corre en una tienda nueva, así que en la tienda que ya está
 * viva este es el paso que falta: sin el enlace región ↔ proveedor, PayPhone
 * queda registrado pero invisible en el checkout. Se puede correr las veces
 * que haga falta.
 *
 *   npx medusa exec ./src/scripts/payphone-activar.ts
 */
export default async function payphoneActivar({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!payphoneEnabled()) {
    logger.error("Falta PAYPHONE_TOKEN: el proveedor no está registrado.")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regiones } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })

  for (const region of regiones) {
    const actuales: string[] = (region.payment_providers ?? []).map(
      (p: any) => p.id
    )
    if (actuales.includes(PROVEEDOR)) {
      logger.info(`${region.name}: el pago con tarjeta ya estaba activo.`)
      continue
    }

    // La lista reemplaza a la anterior, así que hay que mandarla completa o
    // el pago manual desaparecería del checkout
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [...actuales, PROVEEDOR] },
      },
    })
    logger.info(`${region.name}: pago con tarjeta activado.`)
  }
}
