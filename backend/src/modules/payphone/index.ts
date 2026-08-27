import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PayphoneProviderService from "./service"

/**
 * PayPhone como proveedor del módulo de pagos. Se registra en
 * medusa-config.ts y queda identificado como `pp_payphone_payphone`.
 */
export default ModuleProvider(Modules.PAYMENT, {
  services: [PayphoneProviderService],
})
