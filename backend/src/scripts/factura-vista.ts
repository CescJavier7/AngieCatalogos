import { ExecArgs } from "@medusajs/framework/types"
import fs from "node:fs"
import path from "node:path"
import { construirFactura } from "../lib/factura"

/**
 * Escribe un comprobante de ejemplo en un archivo para verlo en el navegador.
 *
 * El diseño de un correo solo se juzga viéndolo, y esperar a que caiga una
 * venta real para revisar un margen es mal negocio. Los datos son inventados;
 * el HTML es exactamente el que recibirá la clienta.
 *
 *   npx medusa exec ./src/scripts/factura-vista.ts
 */
export default async function facturaVista(_: ExecArgs) {
  const { html } = construirFactura({
    display_id: 128,
    created_at: new Date(),
    email: "clienta@ejemplo.com",
    item_subtotal: 47,
    discount_total: 2,
    shipping_total: 3,
    total: 48,
    metadata: { entrega: "transportadora" },
    items: [
      {
        product_title: "Perfume Gaia Dama",
        variant_title: "50 ml",
        quantity: 1,
        unit_price: 25,
        total: 25,
      },
      {
        product_title: "Crema humectante corporal",
        quantity: 2,
        unit_price: 11,
        total: 22,
      },
    ],
    shipping_address: {
      first_name: "María",
      last_name: "Chiluisa",
      address_1: "Av. Amazonas N34-12 y Río Coca",
      address_2: "Casa de portón verde",
      city: "Machachi",
      province: "Pichincha",
      phone: "0987654321",
    },
    payment_collections: [
      {
        payments: [
          {
            provider_id: "pp_payphone_payphone",
            captured_at: new Date(),
            data: {
              confirmacion: { cardBrand: "Visa", lastDigits: "4242" },
            },
          },
        ],
      },
    ],
  })

  const destino = path.join(process.cwd(), "factura-ejemplo.html")
  fs.writeFileSync(destino, html, "utf8")
  console.log(`\n✓ Comprobante de ejemplo escrito en:\n  ${destino}\n`)
  console.log("Ábrelo en el navegador para ver cómo le llega a la clienta.")
}
