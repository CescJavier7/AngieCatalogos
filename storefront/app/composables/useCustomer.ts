import type { HttpTypes } from "@medusajs/types"

/** Sesión del cliente: login/registro (email o Google), perfil y pedidos. */
export const useCustomer = () => {
  const medusa = useMedusa()
  const customer = useState<HttpTypes.StoreCustomer | null>(
    "customer",
    () => null
  )
  const loading = useState<boolean>("customer-loading", () => false)

  const fetchCustomer = async () => {
    try {
      const { customer: me } = await medusa.store.customer.retrieve()
      customer.value = me
    } catch {
      customer.value = null
    }
  }

  /** Si hay carrito de invitado, pasa a ser del cliente logueado. */
  const claimCart = async () => {
    const cartId = useCookie<string | null>("angie_cart_id").value
    if (!cartId) return
    try {
      await medusa.store.cart.transferCart(cartId)
    } catch {
      /* carrito ya transferido o inexistente */
    }
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      await medusa.auth.login("customer", "emailpass", { email, password })
      await fetchCustomer()
      await claimCart()
    } finally {
      loading.value = false
    }
  }

  const register = async (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) => {
    loading.value = true
    try {
      await medusa.auth.register("customer", "emailpass", {
        email: data.email,
        password: data.password,
      })
      await medusa.store.customer.create({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      })
      // El token de registro ya autentica; refrescamos la sesión completa
      await medusa.auth.login("customer", "emailpass", {
        email: data.email,
        password: data.password,
      })
      await fetchCustomer()
      await claimCart()
    } finally {
      loading.value = false
    }
  }

  /** Redirige a Google. El regreso lo maneja /cuenta/callback. */
  const loginWithGoogle = async (next?: string) => {
    // Google no conserva la query: guardamos el destino en una cookie corta
    if (next) {
      useCookie("angie_next", { maxAge: 600 }).value = next
    }
    const result = await medusa.auth.login("customer", "google", {})
    if (typeof result === "object" && result.location) {
      window.location.href = result.location
    }
  }

  const logout = async () => {
    await medusa.auth.logout()
    customer.value = null
  }

  const listOrders = async () => {
    const { orders } = await medusa.store.order.list({
      limit: 50,
      order: "-created_at",
      fields:
        "id,display_id,created_at,total,status,payment_status,fulfillment_status,*items",
    } as any)
    return orders
  }

  return {
    customer,
    loading,
    fetchCustomer,
    login,
    register,
    loginWithGoogle,
    logout,
    listOrders,
    claimCart,
  }
}
