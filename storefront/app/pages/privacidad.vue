<script setup lang="ts">
useSeo({
  title: "Política de Privacidad",
  description:
    "Cómo Angie Catálogos trata tus datos personales conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador.",
})

const actualizado = "1 de agosto de 2026"
</script>

<template>
  <div class="container legal">
    <span class="eyebrow">Datos personales</span>
    <h1>Política de Privacidad</h1>
    <p class="legal__fecha">Última actualización: {{ actualizado }}</p>

    <h2>Quién trata tus datos</h2>
    <p>
      Angie Catálogos, con domicilio en Av. Fernández Salvador y L Vía Tesalia,
      Machachi, cantón Mejía, provincia de Pichincha, es la responsable del
      tratamiento de los datos personales que nos entregas a través de
      <strong>tienda.cescjavier.dev</strong>. Puedes contactarnos en
      <a href="mailto:javier@cescjavier.dev">javier@cescjavier.dev</a> o por
      WhatsApp al <a href="https://wa.me/593980441321">+593 98 044 1321</a>.
    </p>

    <h2>Qué datos recogemos y para qué</h2>
    <table class="legal__tabla">
      <thead>
        <tr><th>Datos</th><th>Para qué</th><th>Base legal</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Nombre, correo y contraseña</td>
          <td>Crear y mantener tu cuenta</td>
          <td>Ejecución del contrato</td>
        </tr>
        <tr>
          <td>Cédula, teléfono y dirección</td>
          <td>Emitir la guía de envío y entregarte el pedido</td>
          <td>Ejecución del contrato</td>
        </tr>
        <tr>
          <td>Historial de pedidos</td>
          <td>Atender tu compra, devoluciones y garantías</td>
          <td>Ejecución del contrato y obligación legal</td>
        </tr>
        <tr>
          <td>Correo, si lo autorizas</td>
          <td>Enviarte promociones y novedades</td>
          <td>Tu consentimiento, revocable cuando quieras</td>
        </tr>
        <tr>
          <td>Cédula y teléfono en el plan de referidos</td>
          <td>Evitar que se dupliquen premios con cuentas falsas</td>
          <td>Interés legítimo en prevenir el fraude</td>
        </tr>
      </tbody>
    </table>

    <h2>Con quién los compartimos</h2>
    <p>
      Solo con quienes hacen falta para que recibas tu pedido: la empresa de
      transporte que lleva el paquete y, cuando esté disponible, la pasarela que
      procese tu pago con tarjeta. No vendemos ni cedemos tus datos a terceros
      con fines publicitarios. Nuestros servidores están alojados en
      infraestructura de DigitalOcean.
    </p>

    <h2>Cuánto tiempo los guardamos</h2>
    <p>
      Mientras tengas cuenta activa. Los datos de facturación y pedidos se
      conservan el tiempo que exige la normativa tributaria ecuatoriana. Si
      cierras tu cuenta, eliminamos o anonimizamos el resto.
    </p>

    <h2>Tus derechos</h2>
    <p>
      La Ley Orgánica de Protección de Datos Personales te reconoce los derechos
      de <strong>acceso, rectificación, eliminación, oposición, portabilidad</strong>
      y a no ser objeto de decisiones automatizadas. Para ejercerlos, escríbenos a
      <a href="mailto:javier@cescjavier.dev">javier@cescjavier.dev</a>: te
      responderemos en un plazo máximo de quince días. Si consideras que no
      atendimos tu solicitud, puedes reclamar ante la Superintendencia de
      Protección de Datos Personales.
    </p>

    <h2>Publicidad</h2>
    <p>
      Solo te escribimos con promociones si lo autorizaste expresamente. Ese
      permiso es independiente de tu cuenta: puedes quitarlo cuando quieras desde
      <NuxtLink to="/cuenta/amigas">tu cuenta</NuxtLink> o con el enlace de baja
      que incluye cada correo, sin que eso afecte tus compras.
    </p>

    <h2>Cookies</h2>
    <p>
      Usamos únicamente las cookies necesarias para mantener tu sesión iniciada y
      recordar tu carrito. No utilizamos cookies de publicidad ni de seguimiento
      de terceros.
    </p>

    <h2>Menores de edad</h2>
    <p>
      La tienda está dirigida a mayores de 18 años. No recogemos conscientemente
      datos de menores sin autorización de su representante legal.
    </p>

    <p class="legal__nota">
      ¿Alguna duda sobre tus datos? Escríbenos y te la resolvemos sin rodeos.
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

.legal__tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  margin: 1rem 0 0.5rem;
  display: block;
  overflow-x: auto;
}

.legal__tabla th,
.legal__tabla td {
  border: 1px solid var(--line);
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.legal__tabla th {
  background: var(--blush);
  color: var(--ink);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.legal__tabla td {
  color: var(--muted);
}

.legal__nota {
  margin-top: 2.5rem;
  padding: 1rem 1.2rem;
  background: var(--blush);
  border-radius: 0.8rem;
  color: var(--ink);
}
</style>
