import type { HttpTypes } from "@medusajs/types"

/**
 * Carrito global: persiste el id en cookie (90 días) y expone acciones.
 * Todas las mutaciones ocurren en el cliente.
 */
export const useCart = () => {
  const medusa = useMedusa()
  const cart = useState<HttpTypes.StoreCart | null>("cart", () => null)
  const cartOpen = useState<boolean>("cart-open", () => false)
  const busy = useState<boolean>("cart-busy", () => false)
  const cartId = useCookie<string | null>("angie_cart_id", {
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
  })

  const itemCount = computed(
    () => cart.value?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  )

  const refresh = async () => {
    if (!cartId.value) return
    try {
      const { cart: fresh } = await medusa.store.cart.retrieve(cartId.value)
      // Un carrito ya completado (convertido en pedido) no se reutiliza
      cart.value = fresh.completed_at ? null : fresh
      if (fresh.completed_at) cartId.value = null
    } catch {
      cartId.value = null
      cart.value = null
    }
  }

  const ensureCart = async () => {
    if (cart.value) return cart.value
    if (cartId.value) {
      await refresh()
      if (cart.value) return cart.value
    }
    const { regions } = await medusa.store.region.list()
    const { cart: created } = await medusa.store.cart.create({
      region_id: regions[0]!.id,
    })
    cartId.value = created.id
    cart.value = created
    return created
  }

  const addItem = async (variantId: string, quantity = 1) => {
    busy.value = true
    try {
      const current = await ensureCart()
      const { cart: updated } = await medusa.store.cart.createLineItem(
        current.id,
        { variant_id: variantId, quantity }
      )
      cart.value = updated
      cartOpen.value = true

      // Lo que se acaba de añadir, para medir el anuncio que lo trajo
      const linea = updated.items?.find((i) => i.variant_id === variantId)
      if (linea) {
        useSeguimiento().agregarAlCarrito(
          { id: linea.product_id, title: linea.product_title || linea.title },
          Number(linea.unit_price ?? 0)
        )
      }
    } finally {
      busy.value = false
    }
  }

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart.value) return
    busy.value = true
    try {
      if (quantity <= 0) {
        await medusa.store.cart.deleteLineItem(cart.value.id, lineId)
        await refresh()
      } else {
        const { cart: updated } = await medusa.store.cart.updateLineItem(
          cart.value.id,
          lineId,
          { quantity }
        )
        cart.value = updated
      }
    } finally {
      busy.value = false
    }
  }

  const removeItem = (lineId: string) => updateQuantity(lineId, 0)

  const reset = () => {
    cart.value = null
    cartId.value = null
  }

  return {
    cart,
    cartOpen,
    busy,
    itemCount,
    refresh,
    ensureCart,
    addItem,
    updateQuantity,
    removeItem,
    reset,
  }
}

export const formatMoney = (amount?: number | null) =>
  amount != null ? `$${Number(amount).toFixed(2)}` : ""
