/**
 * Eventos de compra hacia el píxel de Meta.
 *
 * Envolver `fbq` en vez de llamarlo suelto evita dos cosas: que una página
 * reviente cuando el píxel no está configurado —que es el caso por defecto—
 * y tener el nombre de Facebook desperdigado por media tienda si algún día se
 * cambia de herramienta.
 */
type Datos = {
  value?: number
  currency?: string
  content_ids?: string[]
  content_name?: string
  content_type?: string
  num_items?: number
}

export const useSeguimiento = () => {
  const evento = (nombre: string, datos: Datos = {}) => {
    if (!import.meta.client) return
    const fbq = (window as any).fbq
    if (typeof fbq !== "function") return
    try {
      fbq("track", nombre, { currency: "USD", ...datos })
    } catch {
      /* Un fallo de medición nunca puede tumbar una venta */
    }
  }

  return {
    verProducto: (p: any, precio: number) =>
      evento("ViewContent", {
        content_ids: [p?.id],
        content_name: p?.title,
        content_type: "product",
        value: precio,
      }),

    agregarAlCarrito: (p: any, precio: number) =>
      evento("AddToCart", {
        content_ids: [p?.id],
        content_name: p?.title,
        content_type: "product",
        value: precio,
      }),

    iniciarCompra: (total: number, items: number) =>
      evento("InitiateCheckout", { value: total, num_items: items }),

    /** El que de verdad importa: con él Meta aprende a quién mostrar los anuncios. */
    compra: (pedido: any) =>
      evento("Purchase", {
        value: Number(pedido?.total ?? 0),
        content_type: "product",
        content_ids: (pedido?.items ?? []).map((i: any) => i.product_id ?? i.id),
        num_items: (pedido?.items ?? []).reduce(
          (n: number, i: any) => n + (i.quantity ?? 0),
          0
        ),
      }),
  }
}
