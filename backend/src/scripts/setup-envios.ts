import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  deleteShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ZONAS, ZONAS_OBSOLETAS } from "../lib/shipping-zones"

/**
 * Deja las opciones de envío alineadas con las tarifas por zona.
 * Es idempotente: crea las que falten, corrige el precio de las que existan
 * y retira las que quedaron obsoletas.
 * Uso: npx medusa exec ./src/scripts/setup-envios.ts
 */
export default async function setupEnvios({ container }: ExecArgs) {
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const region = container.resolve(Modules.REGION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const [ecuador] = await region.listRegions({ name: "Ecuador" }, {})
  if (!ecuador) throw new Error("No existe la región Ecuador. Corre primero el seed.")

  const [profile] = await fulfillment.listShippingProfiles({ type: "default" }, {})
  if (!profile) throw new Error("No existe el perfil de envío por defecto.")

  const [fulfillmentSet] = await fulfillment.listFulfillmentSets(
    {},
    { relations: ["service_zones"] }
  )
  const serviceZone = fulfillmentSet?.service_zones?.[0]
  if (!serviceZone) throw new Error("No existe la zona de servicio de Ecuador.")

  const { data: existing } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  })
  const porNombre = new Map(existing.map((o: any) => [o.name, o.id]))

  for (const z of ZONAS) {
    const prices = [
      { currency_code: "usd", amount: z.amount },
      { region_id: ecuador.id, amount: z.amount },
    ]
    const id = porNombre.get(z.name)

    if (id) {
      await updateShippingOptionsWorkflow(container).run({
        input: [{ id, name: z.name, prices }],
      })
      console.log(`✔ actualizada  ${z.name.padEnd(24)} $${z.amount}`)
      continue
    }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: z.name,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZone.id,
          shipping_profile_id: profile.id,
          type: { label: z.label, description: z.description, code: z.code },
          prices,
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    console.log(`✔ creada       ${z.name.padEnd(24)} $${z.amount}`)
  }

  const obsoletas = ZONAS_OBSOLETAS.map((n) => porNombre.get(n)).filter(Boolean) as string[]
  if (obsoletas.length) {
    await deleteShippingOptionsWorkflow(container).run({ input: { ids: obsoletas } })
    console.log(`✔ retiradas    ${ZONAS_OBSOLETAS.join(", ")}`)
  }
}
