import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRALS_MODULE } from "../../../../modules/referrals"
import type ReferralsModuleService from "../../../../modules/referrals/service"

/** Código, saldo y progreso de la clienta que consulta. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Inicia sesión para ver tu plan de amigas." })
    return
  }

  const referrals: ReferralsModuleService = req.scope.resolve(REFERRALS_MODULE)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const [cliente] = await customerModule.listCustomers({ id: customerId }, {})

  res.json(await referrals.getSummary(customerId, cliente?.first_name ?? undefined))
}
