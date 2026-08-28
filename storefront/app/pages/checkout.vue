<script setup lang="ts">
const medusa = useMedusa()
const { cart, refresh, reset } = useCart()
const { customer, fetchCustomer } = useCustomer()

const BODEGA = "Av. Fernández Salvador y L Vía Tesalia, Machachi"

const form = reactive({
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  cedula: "",
  // Dirección al detalle: es lo que la transportadora necesita en la guía
  calle_principal: "",
  numeracion: "",
  calle_secundaria: "",
  referencia: "",
  province: "Pichincha",
  canton: "Mejía",
  parroquia: "Machachi",
  retira_nombre: "",
  retira_cedula: "",
})

/** Cantones de la provincia elegida. */
const cantones = computed(() => PROVINCIAS[form.province] ?? [])

/** En Mejía la parroquia decide la tarifa, así que se elige de una lista. */
const parroquiaEsLista = computed(
  () => form.province === "Pichincha" && form.canton === "Mejía"
)

// Al cambiar de provincia o cantón, los campos dependientes se reajustan
watch(
  () => form.province,
  (p) => {
    if (!(PROVINCIAS[p] ?? []).includes(form.canton)) {
      form.canton = PROVINCIAS[p]?.[0] ?? ""
    }
  }
)
watch(
  () => form.canton,
  () => {
    form.parroquia = parroquiaEsLista.value ? PARROQUIAS_MEJIA[0]! : ""
  }
)

const shippingOptions = ref<any[]>([])
const selectedShipping = ref<string | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

/** Proveedor de tarjeta. Es el id que Medusa arma para el módulo de PayPhone. */
const PROVEEDOR_TARJETA = "pp_payphone_payphone"

const { bono: consultarBono } = useReferrals()
const bono = ref<{
  disponible: boolean
  codigo?: string
  monto: number
  minimo: number
} | null>(null)

/** Descuento ya aplicado por Medusa. Manda el carrito, no nuestra cuenta. */
const descuento = computed(() => cart.value?.discount_total ?? 0)

/** Lo que falta de compra para alcanzar el bono, si está a la vuelta. */
const faltaParaBono = computed(() => {
  if (!bono.value?.disponible || descuento.value > 0) return 0
  const falta = bono.value.minimo - (cart.value?.item_subtotal ?? 0)
  return falta > 0 ? falta : 0
})

/**
 * Aplica el bono de bienvenida al carrito. La promoción lleva dentro su
 * propio mínimo de compra, así que si el carrito no llega, Medusa la deja
 * puesta pero sin descontar: no hace falta vigilarla desde aquí.
 */
const aplicarBono = async () => {
  const codigo = bono.value?.codigo
  if (!cart.value || !bono.value?.disponible || !codigo) return

  const vigentes = (cart.value.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => !!c)
  if (vigentes.includes(codigo)) return

  try {
    const { cart: actualizado } = await medusa.store.cart.update(cart.value.id, {
      promo_codes: [...vigentes, codigo],
    })
    cart.value = actualizado
  } catch {
    /* Si Medusa lo rechaza, la compra sigue sin el bono */
  }
}

const proveedoresPago = ref<string[]>([])
const metodoPago = ref<"tarjeta" | "coordinar">("coordinar")
/** Se sale de la página hacia PayPhone: el botón no debe volver a habilitarse. */
const saliendo = ref(false)

// La tarjeta solo aparece si la región la tiene habilitada de verdad; así una
// tienda sin credenciales sigue vendiendo con el pago coordinado
const tarjetaDisponible = computed(() =>
  proveedoresPago.value.includes(PROVEEDOR_TARJETA)
)

onMounted(async () => {
  await refresh()

  // Comprar requiere cuenta: así la logística de cada pedido queda bien atada
  await fetchCustomer()
  if (!customer.value) {
    await navigateTo("/cuenta?next=/checkout")
    return
  }

  {
    form.email = customer.value.email ?? ""
    form.first_name = customer.value.first_name ?? ""
    form.last_name = customer.value.last_name ?? ""
    form.phone = customer.value.phone ?? ""
    const addr = customer.value.addresses?.[0]
    if (addr) {
      form.calle_principal = addr.address_1 ?? ""
      form.referencia = addr.address_2 ?? ""
      // Una dirección guardada de antes puede traer una provincia que ya no ofrecemos
      if (addr.province && PROVINCIAS[addr.province]) {
        form.province = addr.province
        if ((PROVINCIAS[addr.province] ?? []).includes(addr.city ?? "")) {
          form.canton = addr.city!
        }
      }
    }
  }

  if (cart.value?.items?.length) {
    const [{ shipping_options }, { payment_providers }] = await Promise.all([
      medusa.store.fulfillment.listCartOptions({ cart_id: cart.value.id }),
      medusa.store.payment.listPaymentProviders({
        region_id: cart.value.region_id!,
      }),
    ])
    shippingOptions.value = shipping_options
    selectedShipping.value = shipping_options[0]?.id ?? null

    proveedoresPago.value = payment_providers.map((p) => p.id)
    // Pagar en el momento es lo que conviene a las dos partes: si está, va primero
    if (tarjetaDisponible.value) metodoPago.value = "tarjeta"

    // El bono se aplica solo: prometerlo y hacer que lo pidan sería mezquino
    try {
      bono.value = await consultarBono()
      if (bono.value?.disponible) await aplicarBono()
    } catch {
      /* Sin bono no se rompe nada: la compra sigue igual */
    }
  }
  loaded.value = true

  // Llegar al checkout es la señal intermedia que Meta necesita para
  // distinguir a quien va en serio de quien solo mira
  if (cart.value?.items?.length) {
    useSeguimiento().iniciarCompra(
      Number(cart.value.item_subtotal ?? 0),
      cart.value.items.reduce((n, i) => n + i.quantity, 0)
    )
  }
})

/** Mejía sin recargo (salvo Tandapí), resto de Pichincha $3, provincias $6. */
const zona = computed(() =>
  zonaDeEnvio(form.province, form.canton, form.parroquia)
)

/**
 * Solo se muestra la tarifa que corresponde a la dirección. El retiro en
 * bodega únicamente dentro de Pichincha: nadie viene de Guayas a recogerlo.
 */
const opcionesVisibles = computed(() =>
  shippingOptions.value.filter((o) => {
    const z = ZONA_POR_OPCION[o.name]
    if (z === "retiro") return permiteRetiro(form.province)
    return z === zona.value
  })
)

const opcionElegida = computed(() =>
  shippingOptions.value.find((o) => o.id === selectedShipping.value)
)

const esRetiro = computed(
  () => ZONA_POR_OPCION[opcionElegida.value?.name ?? ""] === "retiro"
)

// Si cambia la provincia o el cantón, la opción elegida puede dejar de aplicar
watch(
  opcionesVisibles,
  (opts) => {
    if (!opts.some((o) => o.id === selectedShipping.value)) {
      selectedShipping.value = opts[0]?.id ?? null
    }
  },
  { immediate: true }
)

/** Explica al cliente por qué su envío cuesta lo que cuesta. */
const avisoZona = computed(() => {
  if (esRetiro.value) {
    return { tono: "ok", texto: `Retiras sin costo en ${BODEGA}.` }
  }
  if (zona.value === "mejia") {
    return {
      tono: "ok",
      texto:
        "¡Tu envío es gratis! Repartimos nosotros dentro de Mejía, normalmente el mismo día.",
    }
  }
  if (zona.value === "pichincha") {
    return {
      tono: "info",
      texto:
        form.canton === "Mejía"
          ? "Tandapí queda fuera de nuestra ruta de reparto, así que va por transportadora: $3, de 1 a 2 días."
          : "Envío a Pichincha por $3, con entrega de 1 a 2 días hábiles.",
    }
  }
  return {
    tono: "info",
    texto:
      "Envío a provincia por $6 mediante transportadora, con entrega de 2 a 4 días hábiles.",
  }
})

/** Dígito verificador de la cédula ecuatoriana (10 dígitos). */
const cedulaValida = (valor: string) => {
  if (!/^\d{10}$/.test(valor)) return false
  const provincia = Number(valor.slice(0, 2))
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false
  if (Number(valor[2]) > 5) return false
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let n = Number(valor[i]) * (i % 2 === 0 ? 2 : 1)
    if (n > 9) n -= 9
    suma += n
  }
  return (10 - (suma % 10)) % 10 === Number(valor[9])
}

/**
 * Celular ecuatoriano normalizado a 09XXXXXXXX, o null si no se reconoce.
 *
 * La gente lo escribe de todas las formas —con +593, con espacios, con
 * guiones— y quien lo recibe es la transportadora, que no puede llamar a un
 * número mal copiado. A PayPhone ya no se le manda ninguno.
 */
const normalizarTelefono = (valor: string) => {
  let d = valor.replace(/\D/g, "")
  // Quita el código de país escrito de cualquier manera: +593, 00593, 593
  if (d.startsWith("00593")) d = d.slice(5)
  else if (d.startsWith("593")) d = d.slice(3)
  // Con el país delante, el 0 inicial suele desaparecer: 98... en vez de 098...
  if (/^9\d{8}$/.test(d)) d = `0${d}`
  return /^09\d{8}$/.test(d) ? d : null
}

const telefonoLimpio = computed(() => normalizarTelefono(form.phone))

const errorTelefono = computed(() => {
  if (!form.phone.trim()) return null
  return telefonoLimpio.value
    ? null
    : "Escribe tu celular a 10 dígitos, empezando por 09."
})

const errorCedula = computed(() => {
  if (!esRetiro.value || !form.retira_cedula) return null
  return cedulaValida(form.retira_cedula) ? null : "Esa cédula no es válida."
})

const errorCedulaCliente = computed(() => {
  if (esRetiro.value || !form.cedula) return null
  return cedulaValida(form.cedula) ? null : "Esa cédula no es válida."
})

/** Calle principal, numeración y calle secundaria en una sola línea. */
const direccionLinea = computed(() =>
  [
    form.calle_principal.trim(),
    form.numeracion.trim() && `N° ${form.numeracion.trim()}`,
    form.calle_secundaria.trim() && `y ${form.calle_secundaria.trim()}`,
  ]
    .filter(Boolean)
    .join(" ")
)

/** Vista previa de cómo saldrá rotulada la guía de la transportadora. */
const guiaPreview = computed(() => {
  const lugar = [form.parroquia, form.canton, form.province]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ")
  return [
    `${form.first_name} ${form.last_name}`.trim(),
    form.cedula && `C.I. ${form.cedula}`,
    direccionLinea.value,
    lugar,
    form.referencia && `Ref: ${form.referencia}`,
    form.phone,
  ].filter(Boolean)
})

const shippingAmount = computed(() => opcionElegida.value?.amount ?? 0)

const total = computed(() =>
  Math.max(
    0,
    (cart.value?.item_subtotal ?? 0) - descuento.value + shippingAmount.value
  )
)

const pagaConTarjeta = computed(
  () => tarjetaDisponible.value && metodoPago.value === "tarjeta"
)

const textoBoton = computed(() => {
  if (submitting.value) {
    return pagaConTarjeta.value ? "Llevándote al pago seguro…" : "Procesando…"
  }
  return pagaConTarjeta.value
    ? `Pagar ${formatMoney(total.value)} con tarjeta`
    : "Confirmar pedido"
})

/**
 * Etiqueta el paso que falló.
 *
 * Confirmar un pedido son cuatro llamadas seguidas y un solo `try` las
 * envolvía a todas: cuando algo se rompía, el mensaje no decía dónde. Con la
 * etiqueta delante, quien reporta el problema ya nos dice en qué paso fue,
 * que es la mitad del diagnóstico cuando no puedes ver su pantalla.
 */
const paso = async <T>(que: string, accion: () => Promise<T>): Promise<T> => {
  try {
    return await accion()
  } catch (e: any) {
    throw new Error(`${que}: ${e?.message ?? "error desconocido"}`)
  }
}

const placeOrder = async () => {
  if (!cart.value) return
  error.value = null

  if (esRetiro.value && !cedulaValida(form.retira_cedula)) {
    error.value = "Revisa la cédula de quien va a retirar el pedido."
    return
  }
  if (!esRetiro.value && !cedulaValida(form.cedula)) {
    error.value = "Revisa tu número de cédula: la transportadora lo exige en la guía."
    return
  }
  if (!telefonoLimpio.value) {
    error.value =
      "Revisa tu celular: debe tener 10 dígitos y empezar por 09. Es el número al que te escribimos para coordinar la entrega."
    return
  }

  submitting.value = true
  try {
    // 1. Datos del cliente y dirección
    await paso("Al guardar tus datos", () =>
      medusa.store.cart.update(cart.value!.id, {
        email: form.email,
        metadata: esRetiro.value
          ? {
              // Quien retira en Machachi queda registrado en el pedido
              entrega: "retiro_bodega",
              retira_nombre: form.retira_nombre.trim(),
              retira_cedula: form.retira_cedula.trim(),
            }
          : {
              // Datos sueltos para llenar la guía sin tener que parsear la dirección
              entrega: zona.value === "mejia" ? "reparto_propio" : "transportadora",
              zona: zona.value,
              cedula: form.cedula.trim(),
              provincia: form.province,
              canton: form.canton,
              parroquia: form.parroquia.trim(),
              calle_principal: form.calle_principal.trim(),
              numeracion: form.numeracion.trim(),
              calle_secundaria: form.calle_secundaria.trim(),
              referencia: form.referencia.trim(),
            },
        shipping_address: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: telefonoLimpio.value,
          address_1: esRetiro.value ? BODEGA : direccionLinea.value,
          address_2: esRetiro.value ? "" : form.referencia.trim(),
          city: esRetiro.value ? "Machachi" : form.parroquia.trim() || form.canton,
          province: esRetiro.value ? "Pichincha" : form.province,
          country_code: "ec",
        },
      })
    )

    // 2. Método de envío
    if (selectedShipping.value) {
      await paso("Al elegir el envío", () =>
        medusa.store.cart.addShippingMethod(cart.value!.id, {
          option_id: selectedShipping.value!,
        })
      )
    }

    // 3. Sesión de pago
    const { cart: freshCart } = await paso("Al revisar tu carrito", () =>
      medusa.store.cart.retrieve(cart.value!.id)
    )

    if (metodoPago.value === "tarjeta") {
      // PayPhone cobra en su propio sitio: aquí solo se abre la transacción y
      // se sale hacia el enlace. El pedido se crea al volver, en /pedido/pagando
      const { payment_collection } = await paso(
        "Al abrir el pago con tarjeta",
        () =>
          medusa.store.payment.initiatePaymentSession(freshCart, {
            provider_id: PROVEEDOR_TARJETA,
            data: {
              cart_id: freshCart.id,
              // Su normativa pide el documento del titular cuando se tiene
              documento: (esRetiro.value ? form.retira_cedula : form.cedula).trim(),
            },
          })
      )

      const sesion = payment_collection.payment_sessions?.find(
        (s) => s.provider_id === PROVEEDOR_TARJETA
      )
      const enlace = sesion?.data?.payWithCard as string | undefined
      if (!enlace) {
        error.value =
          "No pudimos abrir el pago con tarjeta. Intenta de nuevo o elige coordinar por WhatsApp."
        return
      }

      // El carrito NO se limpia: al volver de PayPhone se necesita para
      // convertirlo en pedido
      saliendo.value = true
      window.location.href = enlace
      return
    }

    await paso("Al preparar el pago", () =>
      medusa.store.payment.initiatePaymentSession(freshCart, {
        provider_id: "pp_system_default",
      })
    )

    // 4. Completar pedido
    const result = await paso("Al cerrar el pedido", () =>
      medusa.store.cart.complete(cart.value!.id)
    )
    if (result.type === "order") {
      useUltimoPedido().guardar(result.order)
      reset()
      await navigateTo("/pedido/confirmacion")
    } else {
      error.value =
        (result as any).error?.message ??
        "No se pudo completar el pedido. Intenta de nuevo."
    }
  } catch (e: any) {
    error.value = e?.message ?? "Ocurrió un error inesperado."
  } finally {
    if (!saliendo.value) submitting.value = false
  }
}

// Las páginas de compra no deben salir en buscadores
useSeo({
  title: "Finalizar compra",
  description: "Completa tu pedido en Angie Catálogos.",
  noindex: true,
})
</script>

<template>
  <div class="container checkout">
    <span class="eyebrow">Finalizar compra</span>
    <h1>Ya casi es tuyo</h1>


    <div v-if="loaded && !cart?.items?.length" class="checkout__empty">
      <p>Tu carrito está vacío.</p>
      <NuxtLink to="/#catalogo" class="btn">Ir al catálogo</NuxtLink>
    </div>

    <form v-else-if="loaded" class="checkout__layout" @submit.prevent="placeOrder">
      <section class="panel">
        <h2>1 · Tus datos</h2>
        <div class="fields">
          <label>
            Correo electrónico
            <input v-model="form.email" type="email" required autocomplete="email" />
          </label>
          <div class="fields__row">
            <label>
              Nombre
              <input v-model="form.first_name" required autocomplete="given-name" />
            </label>
            <label>
              Apellido
              <input v-model="form.last_name" required autocomplete="family-name" />
            </label>
          </div>
          <label>
            Teléfono (WhatsApp)
            <input
              v-model="form.phone"
              type="tel"
              required
              inputmode="tel"
              placeholder="09XXXXXXXX"
              autocomplete="tel"
            />
            <small v-if="errorTelefono" class="pickup__error">{{ errorTelefono }}</small>
          </label>
        </div>

        <h2>2 · Entrega</h2>
        <div class="fields">
          <div class="fields__row">
            <label>
              Provincia
              <select v-model="form.province">
                <option v-for="p in NOMBRES_PROVINCIAS" :key="p" :value="p">{{ p }}</option>
              </select>
            </label>
            <label>
              Cantón
              <select v-model="form.canton">
                <option v-for="c in cantones" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
          </div>

          <label>
            Parroquia
            <select v-if="parroquiaEsLista" v-model="form.parroquia">
              <option v-for="p in PARROQUIAS_MEJIA" :key="p" :value="p">{{ p }}</option>
            </select>
            <input
              v-else
              v-model="form.parroquia"
              placeholder="Parroquia, barrio o sector"
              autocomplete="address-level3"
            />
          </label>

          <p class="galapagos-note">
            ¿Estás en Galápagos? Todavía no llegamos con envío regular, pero
            <a href="https://wa.me/593980441321" target="_blank" rel="noopener">
              escríbenos por WhatsApp
            </a>
            y lo coordinamos contigo.
          </p>

          <fieldset class="shipping">
            <legend>Método de entrega</legend>
            <label
              v-for="opt in opcionesVisibles"
              :key="opt.id"
              class="shipping__option"
              :class="{ 'shipping__option--active': selectedShipping === opt.id }"
            >
              <input
                v-model="selectedShipping"
                type="radio"
                name="shipping"
                :value="opt.id"
              />
              <span class="shipping__name">{{ opt.name }}</span>
              <span class="shipping__price">
                {{ opt.amount ? formatMoney(opt.amount) : "Gratis" }}
              </span>
            </label>
            <p class="zona-note" :class="`zona-note--${avisoZona.tono}`">
              {{ avisoZona.texto }}
            </p>
          </fieldset>

          <!-- Dirección al detalle: es lo que se rotula en la guía -->
          <fieldset v-if="!esRetiro" class="direccion">
            <legend>¿A dónde lo enviamos?</legend>
            <div class="fields">
              <div class="fields__row fields__row--3">
                <label class="span-2">
                  Calle principal
                  <input
                    v-model="form.calle_principal"
                    required
                    placeholder="Av. Amazonas"
                    autocomplete="address-line1"
                  />
                </label>
                <label>
                  Numeración
                  <input v-model="form.numeracion" placeholder="N34-12" />
                </label>
              </div>
              <label>
                Calle secundaria
                <input
                  v-model="form.calle_secundaria"
                  placeholder="Intersección más cercana"
                  autocomplete="address-line2"
                />
              </label>
              <label>
                Referencia para encontrarte
                <input
                  v-model="form.referencia"
                  required
                  placeholder="Casa de portón verde, junto a la farmacia"
                />
              </label>
              <label>
                Tu cédula
                <input
                  v-model="form.cedula"
                  required
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="10 dígitos"
                />
                <small class="hint">
                  La transportadora la exige para entregarte el paquete.
                </small>
                <small v-if="errorCedulaCliente" class="pickup__error">
                  {{ errorCedulaCliente }}
                </small>
              </label>
            </div>

            <div v-if="direccionLinea" class="guia">
              <strong>Así saldrá tu guía</strong>
              <p v-for="(l, i) in guiaPreview" :key="i">{{ l }}</p>
            </div>
          </fieldset>

          <!-- Quien retira debe identificarse al llegar a la bodega -->
          <fieldset v-if="esRetiro" class="pickup">
            <legend>¿Quién retira el pedido?</legend>
            <p class="pickup__note">Presenta la cédula al retirar en {{ BODEGA }}.</p>
            <div class="fields">
              <label>
                Nombre completo de quien retira
                <input
                  v-model="form.retira_nombre"
                  required
                  placeholder="Tal como aparece en la cédula"
                />
              </label>
              <label>
                Cédula
                <input
                  v-model="form.retira_cedula"
                  required
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="10 dígitos"
                />
                <small v-if="errorCedula" class="pickup__error">{{ errorCedula }}</small>
              </label>
            </div>
          </fieldset>
        </div>

        <h2>3 · Pago</h2>

        <fieldset v-if="tarjetaDisponible" class="shipping pago">
          <legend>¿Cómo prefieres pagar?</legend>
          <label
            class="shipping__option"
            :class="{ 'shipping__option--active': metodoPago === 'tarjeta' }"
          >
            <input v-model="metodoPago" type="radio" name="pago" value="tarjeta" />
            <span class="shipping__name">
              Tarjeta de crédito o débito
              <small>Al instante, con PayPhone</small>
            </span>
            <span class="pago__marcas">Visa · Mastercard · Diners</span>
          </label>
          <label
            class="shipping__option"
            :class="{ 'shipping__option--active': metodoPago === 'coordinar' }"
          >
            <input v-model="metodoPago" type="radio" name="pago" value="coordinar" />
            <span class="shipping__name">
              Coordinar por WhatsApp
              <small>Transferencia o contra entrega</small>
            </span>
          </label>
          <p class="zona-note zona-note--info">
            {{
              metodoPago === "tarjeta"
                ? "Al confirmar te llevamos al sitio seguro de PayPhone para que ingreses tu tarjeta. Nosotros nunca vemos esos datos."
                : "Te escribimos por WhatsApp apenas recibamos tu pedido para acordar el pago y la entrega."
            }}
          </p>
        </fieldset>

        <p v-else class="payment-note">
          Coordinamos el pago contigo por WhatsApp al confirmar tu pedido
          (transferencia o contra entrega).
        </p>
      </section>

      <aside class="panel summary">
        <h2>Tu pedido</h2>
        <ul class="summary__items">
          <li v-for="item in cart?.items" :key="item.id">
            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title ?? ''" />
            <span class="summary__title">
              {{ item.product_title || item.title }}
              <small>× {{ item.quantity }}</small>
            </span>
            <span>{{ formatMoney(item.total) }}</span>
          </li>
        </ul>
        <div class="summary__row">
          <span>Subtotal</span>
          <span>{{ formatMoney(cart?.item_subtotal) }}</span>
        </div>
        <div v-if="descuento" class="summary__row summary__row--bono">
          <span>Bono de bienvenida</span>
          <span>−{{ formatMoney(descuento) }}</span>
        </div>
        <div class="summary__row">
          <span>Envío</span>
          <span>{{ shippingAmount ? formatMoney(shippingAmount) : "Gratis" }}</span>
        </div>
        <div class="summary__row summary__row--total">
          <span>Total</span>
          <span>{{ formatMoney(total) }}</span>
        </div>

        <p v-if="faltaParaBono" class="summary__nudge">
          Te falta {{ formatMoney(faltaParaBono) }} para activar tu bono de
          bienvenida de {{ formatMoney(bono?.monto) }}.
        </p>

        <p v-if="error" class="summary__error">{{ error }}</p>

        <button class="btn summary__submit" type="submit" :disabled="submitting">
          {{ textoBoton }}
        </button>
        <p class="summary__safe">
          {{
            pagaConTarjeta
              ? "Pago protegido · PayPhone"
              : "Compra respaldada · Angie Catálogos"
          }}
        </p>
      </aside>
    </form>

    <p v-else class="checkout__loading">Cargando tu carrito…</p>
  </div>
</template>

<style scoped>
.checkout {
  padding-top: 2.5rem;
}

h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin: 0.4rem 0 1.75rem;
}

.checkout__empty {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding-block: 2rem;
  color: var(--muted);
}

.checkout__hint {
  background: var(--blush);
  border-radius: 0.75rem;
  padding: 0.8rem 1.1rem;
  margin-bottom: 1.5rem;
  color: var(--muted);
}

.checkout__hint a {
  color: var(--primary);
  font-weight: 700;
}

.checkout__loading {
  color: var(--muted);
  padding-block: 2rem;
}

.checkout__layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;
  align-items: start;
}

.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 1.1rem;
  padding: 1.75rem;
}

.panel h2 {
  font-size: 1.45rem;
  margin-bottom: 1rem;
}

.panel h2:not(:first-child) {
  margin-top: 1.9rem;
}

.fields {
  display: grid;
  gap: 1rem;
}

.fields label {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.fields__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.shipping {
  border: none;
  display: grid;
  gap: 0.6rem;
}

.shipping legend {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.shipping__option {
  display: flex !important;
  grid-template-columns: none;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.shipping__option--active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.shipping__option input {
  width: auto;
  accent-color: var(--primary);
}

.shipping__name {
  flex: 1;
}

.shipping__price {
  font-weight: 800;
  color: var(--gold);
}

.summary__row--bono {
  color: var(--success);
  font-weight: 700;
}

.summary__nudge {
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--gold);
  background: #fdf6e8;
  border: 1px solid var(--gold-light);
  border-radius: 0.7rem;
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.75rem;
}

.pago .shipping__name {
  display: grid;
  gap: 0.15rem;
}

.pago .shipping__name small {
  color: var(--muted);
  font-size: 0.8rem;
}

.pago__marcas {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-transform: uppercase;
  white-space: nowrap;
}

.zona-note {
  font-size: 0.85rem;
  border-radius: 0.7rem;
  padding: 0.65rem 0.9rem;
  margin-top: 0.25rem;
}

.zona-note--ok {
  background: rgba(31, 138, 91, 0.1);
  color: var(--success);
  font-weight: 600;
}

.zona-note--info {
  background: var(--blush);
  color: var(--muted);
}

.direccion {
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  padding: 1.1rem;
  display: grid;
  gap: 0.9rem;
}

.direccion legend {
  font-weight: 700;
  font-size: 0.95rem;
  padding-inline: 0.4rem;
}

.fields__row--3 {
  grid-template-columns: 1fr 1fr 0.8fr;
}

.span-2 {
  grid-column: span 2;
}

.hint {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.guia {
  background: var(--bg);
  border: 1px dashed var(--line);
  border-radius: 0.7rem;
  padding: 0.85rem 1rem;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.5;
}

.guia strong {
  display: block;
  color: var(--ink);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
}

.galapagos-note {
  font-size: 0.85rem;
  color: var(--muted);
  background: var(--blush);
  border-radius: 0.75rem;
  padding: 0.7rem 1rem;
}

.galapagos-note a {
  color: var(--primary);
  font-weight: 700;
}

.pickup {
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  padding: 1.1rem;
  display: grid;
  gap: 0.85rem;
}

.pickup legend {
  font-weight: 700;
  font-size: 0.95rem;
  padding-inline: 0.4rem;
}

.pickup__note {
  font-size: 0.85rem;
  color: var(--muted);
}

.pickup__error {
  color: var(--primary);
  font-weight: 600;
  font-size: 0.8rem;
}

.payment-note {
  color: var(--muted);
  background: var(--blush);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}

.summary {
  position: sticky;
  top: 90px;
}

.summary__items {
  list-style: none;
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1.25rem;
}

.summary__items li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary__items img {
  width: 44px;
  height: 56px;
  object-fit: cover;
  border-radius: 0.4rem;
  background: var(--blush);
}

.summary__title {
  flex: 1;
  font-weight: 600;
  line-height: 1.3;
}

.summary__title small {
  color: var(--muted);
  font-weight: 400;
}

.summary__row {
  display: flex;
  justify-content: space-between;
  padding-block: 0.3rem;
  color: var(--muted);
}

.summary__row--total {
  color: var(--ink);
  font-weight: 800;
  font-size: 1.25rem;
  border-top: 1px solid var(--line);
  margin-top: 0.5rem;
  padding-top: 0.75rem;
}

.summary__error {
  color: #b3261e;
  background: #fdecea;
  border-radius: 0.6rem;
  padding: 0.75rem 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.summary__submit {
  width: 100%;
  margin-top: 1.25rem;
}

.summary__safe {
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
  margin-top: 0.75rem;
  letter-spacing: 0.06em;
}

@media (max-width: 860px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }

  .summary {
    position: static;
  }
}

@media (max-width: 560px) {
  .fields__row,
  .fields__row--3 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }

  /* En pantalla angosta las marcas apretarían el nombre del método */
  .pago__marcas {
    display: none;
  }
}
</style>
