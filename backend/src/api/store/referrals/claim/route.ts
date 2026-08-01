import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRALS_MODULE } from "../../../../modules/referrals"
import type ReferralsModuleService from "../../../../modules/referrals/service"

type Body = { code?: string }

/** Vincula a la clienta con el código de quien la invitó. */
export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Inicia sesión para usar un código." })
    return
  }

  const referrals: ReferralsModuleService = req.scope.resolve(REFERRALS_MODULE)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const [cliente] = await customerModule.listCustomers({ id: customerId }, {})

  // Su propia cuenta debe existir antes de vincularla a otra
  await referrals.ensureAccount(customerId, cliente?.first_name ?? undefined)

  const resultado = await referrals.registerReferral({
    code: req.body?.code ?? "",
    referredCustomerId: customerId,
    phone: cliente?.phone ?? null,
    ip:
      (req.headers["cf-connecting-ip"] as string) ??
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.ip ??
      null,
  })

  if (!resultado.ok) {
    res.status(400).json({ message: resultado.reason })
    return
  }

  res.json({
    ok: true,
    bono: resultado.bono,
    message: `¡Listo! Tienes $${resultado.bono} de descuento en tu primera compra.`,
  })
}
