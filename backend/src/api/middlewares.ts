import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

/** Todo lo del plan de referidos exige una clienta con sesión iniciada. */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/referrals*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
