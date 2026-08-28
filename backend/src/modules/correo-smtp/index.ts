import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CorreoSmtpService from "./service"

/** Proveedor de correo por SMTP. Se registra en medusa-config.ts. */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [CorreoSmtpService],
})
