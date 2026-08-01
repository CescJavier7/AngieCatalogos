import { MedusaService } from "@medusajs/framework/utils"
import ReferralAccount from "./models/referral-account"
import Referral from "./models/referral"
import {
  BONO_INVITADO,
  MINIMO_BONO,
  TOPE_MENSUAL,
  TOPE_SALDO,
  generarCodigo,
  progreso,
  saldoPara,
} from "./rules"

class ReferralsModuleService extends MedusaService({
  ReferralAccount,
  Referral,
}) {
  /** Cuenta de referidos de una clienta; se crea al vuelo la primera vez. */
  async ensureAccount(customerId: string, nombre?: string) {
    const [existente] = await this.listReferralAccounts(
      { customer_id: customerId },
      {}
    )
    if (existente) return existente

    // Reintenta si el código sorteado ya estaba tomado
    for (let intento = 0; intento < 5; intento++) {
      const code = generarCodigo(nombre)
      const [chocado] = await this.listReferralAccounts({ code }, {})
      if (chocado) continue
      const [creada] = await this.createReferralAccounts([
        { customer_id: customerId, code },
      ])
      return creada
    }
    throw new Error("No se pudo generar un código de referido único.")
  }

  /**
   * Vincula a un invitado con el código de quien lo trajo. Aquí se descartan
   * los casos obvios de auto-referido; el premio todavía no se acredita.
   */
  async registerReferral(input: {
    code: string
    referredCustomerId: string
    cedula?: string | null
    phone?: string | null
    ip?: string | null
  }) {
    const code = (input.code ?? "").trim().toUpperCase()
    if (!code) return { ok: false as const, reason: "Falta el código." }

    const [host] = await this.listReferralAccounts({ code }, {})
    if (!host) return { ok: false as const, reason: "Ese código no existe." }

    if (host.customer_id === input.referredCustomerId) {
      return { ok: false as const, reason: "No puedes usar tu propio código." }
    }

    const [yaVinculado] = await this.listReferrals(
      { referred_customer_id: input.referredCustomerId },
      {}
    )
    if (yaVinculado) {
      return { ok: false as const, reason: "Esta cuenta ya usó un código." }
    }

    // Auto-referido con otro correo: misma cédula o mismo teléfono que el anfitrión
    const sospechoso =
      (input.cedula && host.cedula && input.cedula === host.cedula) ||
      (input.phone && host.phone && input.phone === host.phone)

    const [creado] = await this.createReferrals([
      {
        code,
        host_customer_id: host.customer_id,
        referred_customer_id: input.referredCustomerId,
        status: sospechoso ? "rejected" : "pending",
        reason: sospechoso ? "Coincide la cédula o el teléfono del anfitrión." : null,
        cedula: input.cedula ?? null,
        phone: input.phone ?? null,
        signup_ip: input.ip ?? null,
      },
    ])

    return {
      ok: !sospechoso,
      referral: creado,
      bono: sospechoso ? 0 : BONO_INVITADO,
      reason: sospechoso ? "No se pudo validar la invitación." : undefined,
    }
  }

  /**
   * Acredita el premio cuando el invitado paga su primer pedido con tarjeta.
   * Devuelve null si no había nada que acreditar.
   */
  async qualifyReferral(input: {
    referredCustomerId: string
    orderId: string
    cedula?: string | null
    phone?: string | null
  }) {
    const [ref] = await this.listReferrals(
      { referred_customer_id: input.referredCustomerId },
      {}
    )
    if (!ref || ref.status !== "pending") return null

    const [host] = await this.listReferralAccounts(
      { customer_id: ref.host_customer_id },
      {}
    )
    if (!host) return null

    // Una misma cédula solo premia una vez, aunque abra varias cuentas
    if (input.cedula) {
      const previos = await this.listReferrals(
        { cedula: input.cedula, status: "qualified" },
        {}
      )
      if (previos.length) {
        await this.updateReferrals([
          {
            id: ref.id,
            status: "rejected",
            reason: "Esa cédula ya fue premiada en otra invitación.",
          },
        ])
        return null
      }
    }

    // Tope mensual: por encima de eso se revisa a mano
    const desde = new Date()
    desde.setDate(1)
    desde.setHours(0, 0, 0, 0)
    const delMes = await this.listReferrals(
      {
        host_customer_id: ref.host_customer_id,
        status: "qualified",
        created_at: { $gte: desde },
      } as any,
      {}
    )
    if (delMes.length >= TOPE_MENSUAL) {
      await this.updateReferrals([
        {
          id: ref.id,
          status: "review",
          order_id: input.orderId,
          reason: `Supera los ${TOPE_MENSUAL} amigos premiados este mes.`,
        },
      ])
      return null
    }

    const amigos = host.qualified_count + 1
    const saldoObjetivo = saldoPara(amigos)
    const premio = Math.max(0, saldoObjetivo - host.balance - host.redeemed)

    await this.updateReferrals([
      {
        id: ref.id,
        status: "qualified",
        order_id: input.orderId,
        reward: premio,
        cedula: input.cedula ?? ref.cedula,
        phone: input.phone ?? ref.phone,
      },
    ])
    await this.updateReferralAccounts([
      {
        id: host.id,
        qualified_count: amigos,
        balance: Math.min(host.balance + premio, TOPE_SALDO),
      },
    ])

    return { host_customer_id: host.customer_id, amigos, premio }
  }

  /** Resumen que ve la clienta en su panel. */
  async getSummary(customerId: string, nombre?: string) {
    const cuenta = await this.ensureAccount(customerId, nombre)
    const amigos = await this.listReferrals(
      { host_customer_id: customerId },
      { order: { created_at: "DESC" } }
    )
    return {
      code: cuenta.code,
      balance: cuenta.balance,
      redeemed: cuenta.redeemed,
      qualified_count: cuenta.qualified_count,
      accepts_marketing: cuenta.accepts_marketing,
      tope: TOPE_SALDO,
      bono_invitado: BONO_INVITADO,
      minimo_bono: MINIMO_BONO,
      progreso: progreso(cuenta.qualified_count),
      amigos: amigos.map((a) => ({
        status: a.status,
        reward: a.reward,
        created_at: a.created_at,
      })),
    }
  }
}

export default ReferralsModuleService
