import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REFERRALS_MODULE } from "../../../../modules/referrals"
import type ReferralsModuleService from "../../../../modules/referrals/service"
import { BONO_INVITADO, MINIMO_BONO } from "../../../../modules/referrals/rules"
import { asegurarBono } from "../../../../lib/bono-bienvenida"

/**
 * ¿Esta clienta tiene los $2 de bienvenida esperándola?
 *
 * Devuelve el código de su promoción para que el checkout lo aplique al
 * carrito. La promoción se crea aquí la primera vez que se pregunta, así
 * nadie acumula promociones que nunca se van a usar.
 *
 * El mínimo de compra viaja de vuelta solo para poder decírselo a la clienta:
 * quien lo hace cumplir es la regla dentro de la promoción.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Inicia sesión para ver tu bono." })
    return
  }

  const referrals: ReferralsModuleService = req.scope.resolve(REFERRALS_MODULE)
  const [invitacion] = await referrals.listReferrals(
    { referred_customer_id: customerId },
    {}
  )

  // "pending" es exactamente la ventana del bono: la invitación existe y su
  // primera compra todavía no ocurrió
  const disponible = invitacion?.status === "pending"

  if (!disponible) {
    res.json({
      disponible: false,
      monto: BONO_INVITADO,
      minimo: MINIMO_BONO,
    })
    return
  }

  res.json({
    disponible: true,
    codigo: await asegurarBono(req.scope, customerId),
    monto: BONO_INVITADO,
    minimo: MINIMO_BONO,
  })
}
