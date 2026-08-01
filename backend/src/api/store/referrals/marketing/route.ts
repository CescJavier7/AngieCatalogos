import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REFERRALS_MODULE } from "../../../../modules/referrals"
import type ReferralsModuleService from "../../../../modules/referrals/service"

type Body = { accepts?: boolean }

/**
 * Consentimiento para recibir promociones. La LOPDP exige que sea explícito
 * y revocable, así que este mismo endpoint sirve para activarlo y quitarlo.
 */
export async function POST(req: AuthenticatedMedusaRequest<Body>, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Inicia sesión." })
    return
  }

  const referrals: ReferralsModuleService = req.scope.resolve(REFERRALS_MODULE)
  const cuenta = await referrals.ensureAccount(customerId)
  const accepts = req.body?.accepts === true

  await referrals.updateReferralAccounts([
    { id: cuenta.id, accepts_marketing: accepts },
  ])

  res.json({ accepts_marketing: accepts })
}
