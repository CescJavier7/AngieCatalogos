<script setup lang="ts">
useSeo({
  title: "Términos y Condiciones",
  description:
    "Condiciones de compra, envío, devoluciones y del plan de referidos de Angie Catálogos.",
})

const actualizado = "22 de agosto de 2026"
</script>

<template>
  <div class="container legal">
    <span class="eyebrow">Condiciones de uso</span>
    <h1>Términos y Condiciones</h1>
    <p class="legal__fecha">Última actualización: {{ actualizado }}</p>

    <h2>Quiénes somos</h2>
    <p>
      Angie Catálogos vende productos originales de marcas de catálogo en el
      Ecuador, desde Machachi, cantón Mejía. Al comprar o crear una cuenta en
      <strong>tienda.cescjavier.dev</strong> aceptas estas condiciones.
    </p>

    <h2>Dónde vendemos</h2>
    <p>
      Únicamente dentro del territorio ecuatoriano y en dólares estadounidenses.
      Todavía no hacemos envíos regulares a Galápagos; si vives allí, escríbenos
      por WhatsApp y lo coordinamos caso por caso.
    </p>

    <h2>Precios y disponibilidad</h2>
    <p>
      Los precios se muestran en dólares e incluyen los impuestos aplicables.
      Trabajamos con inventario real: si un producto se agota entre que lo
      añades al carrito y confirmas, te avisamos y te devolvemos lo pagado o lo
      cambiamos por otro, como prefieras.
    </p>

    <h2>Envíos</h2>
    <p>
      El costo depende de la zona: sin recargo dentro del cantón Mejía —salvo la
      parroquia Manuel Cornejo Astorga (Tandapí)—, $3 en el resto de Pichincha y
      $6 al resto del país. También puedes retirar sin costo en nuestra bodega de
      Machachi presentando tu cédula. Los plazos son estimados y dependen de la
      transportadora.
    </p>

    <h2>Pagos</h2>
    <p>
      Puedes pagar con <strong>tarjeta de crédito o débito</strong> a través de
      PayPhone, una pasarela autorizada para operar en Ecuador. El cobro se
      realiza en su plataforma: <strong>nosotros no vemos ni almacenamos en
      ningún momento los datos de tu tarjeta</strong>. También puedes coordinar
      el pago con nosotros por WhatsApp, mediante transferencia bancaria o
      contra entrega.
    </p>
    <p>
      <strong>El precio es el mismo pagues como pagues.</strong> No cobramos
      ningún recargo, comisión ni "costo por servicio" por usar tarjeta: la
      comisión de la pasarela la asume íntegramente la tienda, tal como exige la
      normativa ecuatoriana. Si alguna vez ves un cobro adicional por pagar con
      tarjeta, avísanos, porque sería un error nuestro.
    </p>
    <p>
      Al confirmar tu pedido serás llevado a la plataforma de PayPhone y, una vez
      completado el pago, regresarás automáticamente a la tienda con el
      comprobante de tu compra. Si el pago no se completa, el pedido queda sin
      confirmar y no se te cobra nada.
    </p>
    <p>
      Por cada compra emitimos el comprobante de venta que corresponde conforme a
      la normativa del Servicio de Rentas Internas, a nombre de los datos que nos
      proporciones en el checkout. Por eso te pedimos tu cédula: es un requisito
      tanto de la transportadora como de la emisión del comprobante.
    </p>

    <h2>Cambios y devoluciones</h2>
    <p>
      Conforme a la Ley Orgánica de Defensa del Consumidor, dispones de tres días
      para desistir de la compra desde que recibes el producto, siempre que esté
      sin usar y en su empaque original. Si llega defectuoso o equivocado, nos
      hacemos cargo del cambio y del costo de envío. Por higiene, los perfumes y
      cosméticos abiertos solo se aceptan si presentan defecto de fábrica.
    </p>
    <p>
      Cuando corresponda una devolución de dinero y hayas pagado con tarjeta, el
      reembolso se realiza <strong>a la misma tarjeta</strong> con la que
      pagaste; no se entrega en efectivo ni por transferencia. El tiempo en que
      se refleje depende de tu banco emisor, no de nosotros, y suele tardar entre
      unos días y un ciclo de facturación.
    </p>

    <h2>Plan "Invita y gana"</h2>
    <p>
      Cada clienta recibe un código para invitar a otras personas. Quien se
      registra con un código obtiene un descuento de bienvenida de <strong>$2</strong>,
      válido en su primera compra de <strong>$20 o más</strong>. Quien invita acumula
      saldo cuando su invitada paga su primera compra con tarjeta, hasta un
      máximo de $20 acumulables a la vez; al usar ese saldo puede volver a
      acumular.
    </p>
    <p>
      Para que el plan sea justo con todas: no se puede usar el código propio,
      cada cuenta canjea un solo código, una misma cédula genera premio una única
      vez, y las invitaciones que superen las diez al mes se revisan antes de
      acreditarse. Nos reservamos el derecho de anular premios obtenidos con
      cuentas falsas o datos suplantados, y de modificar o terminar el plan
      avisando con antelación razonable; los saldos ya ganados se respetan.
    </p>

    <h2>Tu cuenta</h2>
    <p>
      Eres responsable de la veracidad de los datos que registras y de cuidar tu
      contraseña. Necesitas ser mayor de edad para comprar. Puedes cerrar tu
      cuenta cuando quieras escribiéndonos.
    </p>

    <h2>Tus datos</h2>
    <p>
      El tratamiento de tus datos personales se rige por nuestra
      <NuxtLink to="/privacidad">Política de Privacidad</NuxtLink>, conforme a la
      Ley Orgánica de Protección de Datos Personales del Ecuador.
    </p>

    <h2>Contacto</h2>
    <p>
      Escríbenos a <a href="mailto:javier@cescjavier.dev">javier@cescjavier.dev</a>
      o por WhatsApp al
      <a href="https://wa.me/593980441321">+593 98 044 1321</a>. Cualquier
      controversia se somete a la legislación ecuatoriana.
    </p>
  </div>
</template>

<style scoped>
.legal {
  max-width: 760px;
  padding-block: 2.5rem 3rem;
}

h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin: 0.3rem 0 0.4rem;
}

.legal__fecha {
  color: var(--muted);
  font-size: 0.88rem;
  margin-bottom: 2rem;
}

h2 {
  font-size: 1.35rem;
  margin: 2rem 0 0.7rem;
}

p {
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 0.9rem;
}

a {
  color: var(--primary);
  font-weight: 600;
}
</style>
