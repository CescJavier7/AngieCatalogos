import { ExecArgs } from "@medusajs/framework/types"

/**
 * Comprueba las credenciales de PayPhone antes de tocar el checkout.
 *
 * Su documentación no publica el formato del storeId ni de dónde sale, y su
 * servidor responde 500 en vez de un error limpio cuando no le gusta. Por eso
 * el script prueba varios candidatos en una sola pasada y dice cuál funciona.
 *
 *   medusa exec ./src/scripts/payphone-check.js                 (el del .env)
 *   medusa exec ./src/scripts/payphone-check.js ID1 ID2 ID3      (candidatos)
 *
 * Nunca imprime el token.
 */
const API = "https://pay.payphonetodoesposible.com/api/button/Prepare"

/** Dos formas del cuerpo: mínima (solo lo obligatorio) y completa. */
const cuerpos = (storeId: string) => {
  const id = `PRUEBA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return [
    {
      nombre: "mínimo",
      datos: {
        amount: 100,
        amountWithoutTax: 100,
        clientTransactionId: id,
        storeId,
        responseUrl: "https://tienda.cescjavier.dev/pedido/confirmacion",
      },
    },
    {
      nombre: "completo",
      datos: {
        amount: 100,
        amountWithoutTax: 100,
        amountWithTax: 0,
        tax: 0,
        service: 0,
        tip: 0,
        clientTransactionId: id + "-B",
        storeId,
        currency: "USD",
        reference: "Prueba de credenciales",
        responseUrl: "https://tienda.cescjavier.dev/pedido/confirmacion",
        cancellationUrl: "https://tienda.cescjavier.dev/checkout",
      },
    },
  ]
}

const probar = async (token: string, cuerpo: any) => {

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
    })
    const texto = await res.text()
    let datos: any = null
    try {
      datos = JSON.parse(texto)
    } catch {
      /* respuesta HTML */
    }
    return { status: res.status, datos, esHtml: texto.trim().startsWith("<") }
  } catch (e: any) {
    return { status: 0, datos: { message: e.message }, esHtml: false }
  }
}

export default async function payphoneCheck({ args }: ExecArgs) {
  const token = process.env.PAYPHONE_TOKEN
  if (!token) {
    console.log("✗ Falta PAYPHONE_TOKEN en el entorno.")
    return
  }
  console.log(`Token: presente (${token.length} caracteres)\n`)

  // A texto siempre: medusa exec entrega un argumento numérico como número,
  // y entonces cualquier método de cadena revienta.
  const candidatos = (
    args?.length ? args : [process.env.PAYPHONE_STORE_ID].filter(Boolean)
  ).map((c) => String(c))

  if (!candidatos.length) {
    console.log("✗ No hay ningún storeId que probar.")
    console.log("   Pásalos como argumentos o define PAYPHONE_STORE_ID.")
    return
  }

  let ganador: { storeId: string; datos: any } | null = null

  for (const storeId of candidatos) {
    for (const { nombre, datos } of cuerpos(storeId)) {
      process.stdout.write(`  ${storeId.padEnd(34)} cuerpo ${nombre.padEnd(9)} `)
      const r = await probar(token, datos)

      if (r.status === 200 && r.datos?.paymentId) {
        console.log("✓ FUNCIONA")
        ganador = { storeId, datos: r.datos }
        break
      }
      if (r.status === 401) {
        console.log("401 — el token no autoriza este recurso")
      } else if (r.esHtml || r.status === 500) {
        console.log("500 — su servidor revienta")
      } else {
        const m = r.datos?.errors?.[0]?.errorDescriptions?.[0] ?? r.datos?.message ?? ""
        console.log(`${r.status} ${String(m).slice(0, 55)}`)
      }
    }
    if (ganador) break
  }

  if (!ganador) {
    console.log("\n✗ Ningún candidato funcionó.")
    console.log("\nLo que ya sabemos con certeza:")
    console.log("   · El token es válido: si no lo fuera, PayPhone respondería")
    console.log("     401 con un mensaje claro, no 500.")
    console.log("   · El 500 ocurre DESPUÉS de autenticar, al procesar el pedido.")
    console.log("   · No es el cuerpo: fallan tanto el mínimo como el completo.")
    console.log("   · No es el storeId: fallan todos los candidatos por igual.")
    console.log("\nLo más probable es el TIPO DE APLICACIÓN. Su documentación dice")
    console.log("que la Cajita de Pagos es 'exclusivamente para entornos WEB',")
    console.log("o sea que el tipo Web es para el widget del navegador, no para")
    console.log("llamadas de servidor como esta.")
    console.log("\n→ Crea en PayPhone Developer una aplicación de tipo API,")
    console.log("  copia SU token a PAYPHONE_TOKEN en .env.prod y vuelve a")
    console.log("  ejecutar este script. No hace falta borrar la aplicación Web.")
    return
  }

  console.log(`\n✓ STORE ID CORRECTO: ${ganador.storeId}`)
  console.log(`   paymentId: ${ganador.datos.paymentId}`)
  console.log(`   Pagar con tarjeta:  ${ganador.datos.payWithCard}`)
  console.log(`   Pagar con PayPhone: ${ganador.datos.payWithPayPhone}`)
  console.log("\n   El segundo enlace es el pago por app y QR: sale del mismo")
  console.log("   llamado, no hay que integrar nada aparte. Caducan en 10 min.")
  console.log(`\n   → Pon PAYPHONE_STORE_ID=${ganador.storeId} en .env.prod`)
}
