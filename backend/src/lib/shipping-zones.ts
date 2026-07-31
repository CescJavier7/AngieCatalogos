/**
 * Zonas de entrega de Angie Catálogos. El catálogo solo vende dentro de Ecuador,
 * así que la tarifa depende de qué tan lejos de la bodega de Machachi queda el
 * cliente. Galápagos queda fuera a propósito: se coordina por WhatsApp.
 */
export const ZONAS = [
  {
    zona: "mejia",
    name: "Envío gratis en Mejía",
    amount: 0,
    label: "Inmediato",
    description: "Entrega el mismo día dentro del cantón Mejía, sin costo.",
    code: "mejia",
  },
  {
    zona: "pichincha",
    name: "Envío en Pichincha",
    amount: 3,
    label: "Estándar",
    description: "Entrega en 1 a 2 días hábiles en el resto de la provincia.",
    code: "pichincha",
  },
  {
    zona: "provincias",
    name: "Envío a provincias",
    amount: 6,
    label: "Estándar",
    description: "Entrega en 2 a 4 días hábiles al resto del país.",
    code: "provincias",
  },
  {
    zona: "retiro",
    name: "Retiro en Machachi",
    amount: 0,
    label: "Retiro",
    description: "Retira tu pedido sin costo en la bodega de Machachi.",
    code: "pickup",
  },
] as const

/** Opciones antiguas que quedaron sin uso al pasar a tarifas por zona. */
export const ZONAS_OBSOLETAS = ["Envío Nacional"]
