import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Cambia la contraseña de un usuario admin (emailpass).
 * Uso: npx medusa exec ./src/scripts/set-admin-password.ts <email> <nueva_password>
 */
export default async function setAdminPassword({ container, args }: ExecArgs) {
  const [email, password] = args ?? []
  if (!email || !password) {
    throw new Error("Uso: set-admin-password.ts <email> <nueva_password>")
  }

  const auth = container.resolve(Modules.AUTH)
  const result = await auth.updateProvider("emailpass", {
    entity_id: email,
    password,
  })

  if (!result.success) {
    throw new Error(`No se pudo actualizar: ${result.error}`)
  }
  console.log(`✔ Contraseña actualizada para ${email}`)
}
