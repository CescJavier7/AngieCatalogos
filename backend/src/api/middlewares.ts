import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

/**
 * Referidos y confirmación de pago exigen una clienta con sesión iniciada:
 * en los dos casos la ruta actúa sobre algo que le pertenece a ella.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/referrals*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/payphone*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
