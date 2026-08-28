/**
 * El pedido recién hecho, sobreviviendo a una recarga.
 *
 * Vivía solo en memoria (`useState`), así que recargar la confirmación —o
 * volver a ella desde el correo— mostraba "No hay un pedido reciente" justo
 * después de haber pagado. Además el evento de compra hacia Meta se perdía,
 * que es el que hace que la publicidad aprenda.
 *
 * Ahora el id queda en una cookie de una semana y el pedido se vuelve a pedir
 * a la API si hace falta. La cookie guarda un identificador, nada más: los
 * datos siempre vienen del servidor y con la sesión de la clienta.
 */
export const useUltimoPedido = () => {
  const pedido = useState<any>("last_order", () => null)
  const id = useCookie<string | null>("angie_ultimo_pedido", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  })

  const guardar = (nuevo: any) => {
    pedido.value = nuevo
    id.value = nuevo?.id ?? null
  }

  const cargar = async () => {
    if (pedido.value) return pedido.value
    if (!id.value) return null
    try {
      const { order } = await useMedusa().store.order.retrieve(id.value)
      pedido.value = order
      return order
    } catch {
      // Sesión caducada o pedido de otra cuenta: no se insiste
      return null
    }
  }

  return { pedido, guardar, cargar }
}
