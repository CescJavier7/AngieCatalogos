import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { BigNumberInput } from "@medusajs/framework/types"

type Body = {
  cart_id?: string
  /** Id numérico de la transacción, tal como vuelve en la query de PayPhone. */
  id?: string | number
  clientTransactionId?: string
}

const PROVEEDOR = "pp_payphone_payphone"

/**
 * Recoge el regreso de PayPhone y deja la sesión de pago lista para cobrar.
 *
 * Aquí NO se cobra: solo se guarda el id de la transacción dentro de la sesión.
 * El cobro (el Confirm de PayPhone) ocurre al completar el carrito, que es el
 * paso siguiente de la tienda, y así el stock se valida antes que el dinero.
 *
 * Se separa en dos llamadas a propósito: completar el carrito ya tiene su
 * propia ruta probada, con sus bloqueos y su idempotencia, y no vale la pena
 * duplicarla aquí.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const clienteId = req.auth_context?.actor_id
  const { cart_id: carritoId, clientTransactionId } = req.body ?? {}
  const transaccionId = Number(req.body?.id)

  if (
    !carritoId ||
    !clientTransactionId ||
    !Number.isInteger(transaccionId) ||
    transaccionId <= 0
  ) {
    res.status(400).json({ message: "Faltan datos del pago." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carritos } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "completed_at",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.amount",
      "payment_collection.payment_sessions.raw_amount",
      "payment_collection.payment_sessions.currency_code",
      "payment_collection.payment_sessions.data",
    ],
    filters: { id: carritoId },
  })

  const carrito = carritos?.[0]
  // El carrito es de quien lo compró: nadie confirma pagos ajenos
  if (!carrito || carrito.customer_id !== clienteId) {
    res.status(404).json({ message: "No encontramos ese carrito." })
    return
  }

  // Recargar la página de regreso no debe volver a tocar nada
  if (carrito.completed_at) {
    res.json({ ok: true, ya_completado: true })
    return
  }

  const sesion = carrito.payment_collection?.payment_sessions?.find(
    (s: any) => s.provider_id === PROVEEDOR
  )
  if (!sesion) {
    res.status(409).json({
      message: "Ese carrito no tiene un pago con tarjeta en curso.",
    })
    return
  }

  // La referencia la generamos nosotros al preparar: si no coincide, el
  // regreso no corresponde a esta sesión y no se toca
  if (sesion.data?.referencia !== clientTransactionId) {
    res.status(409).json({ message: "El pago no corresponde a este carrito." })
    return
  }

  const pagos = req.scope.resolve(Modules.PAYMENT)
  await pagos.updatePaymentSession({
    id: sesion.id,
    // El raw conserva la precisión del monto; el serializado la redondea
    amount: (sesion.raw_amount ?? sesion.amount) as BigNumberInput,
    currency_code: sesion.currency_code,
    data: { ...sesion.data, transaccionId },
  })

  res.json({ ok: true })
}
