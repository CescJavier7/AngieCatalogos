import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { Container, Heading, Text, Select, Badge, Table } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

type Producto = {
  id: string
  titulo: string
  sku: string
  marca: string
  precio: number
  costo: number | null
  margen: number | null
  margenPct: number | null
  unidades: number
  ingresos: number
  utilidad: number | null
  stock: number
  capital: number | null
  cobertura: number | null
  visitas: number
  conversion: number | null
}

type Datos = {
  dias: number
  hayVisitas: boolean
  resumen: Record<string, number>
  productos: Producto[]
  semanas: { semana: string; ingresos: number; unidades: number }[]
}

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toFixed(2)}`
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toFixed(1)}%`

/* ── Ficha de titular ── */
const Ficha = ({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string
  valor: string
  nota?: string
}) => (
  <div className="pnl-ficha">
    <span className="pnl-ficha__lbl">{etiqueta}</span>
    <strong className="pnl-ficha__val">{valor}</strong>
    {nota && <span className="pnl-ficha__nota">{nota}</span>}
  </div>
)

/* ── Barras horizontales: magnitud, un solo hue ── */
const Barras = ({
  filas,
  formato,
  vacio,
}: {
  filas: { etiqueta: string; valor: number; detalle: string }[]
  formato: (n: number) => string
  vacio: string
}) => {
  const [activa, setActiva] = useState<number | null>(null)
  if (!filas.length) return <p className="pnl-vacio">{vacio}</p>
  const max = Math.max(...filas.map((f) => f.valor), 1)

  return (
    <div className="pnl-barras">
      {filas.map((f, i) => (
        <div
          key={f.etiqueta}
          className="pnl-barra"
          onMouseEnter={() => setActiva(i)}
          onMouseLeave={() => setActiva(null)}
        >
          <span className="pnl-barra__lbl" title={f.etiqueta}>
            {f.etiqueta}
          </span>
          <div className="pnl-barra__pista">
            <div
              className="pnl-barra__fill"
              style={{ width: `${Math.max((f.valor / max) * 100, 1.5)}%` }}
            />
          </div>
          <span className="pnl-barra__val">{formato(f.valor)}</span>
          {activa === i && <span className="pnl-barra__tip">{f.detalle}</span>}
        </div>
      ))}
    </div>
  )
}

/* ── Dispersión visitas vs ventas: énfasis en lo que pide atención ── */
const Dispersion = ({ productos }: { productos: Producto[] }) => {
  const [hover, setHover] = useState<Producto | null>(null)
  const datos = productos.filter((p) => p.visitas > 0)
  if (!datos.length) {
    return (
      <p className="pnl-vacio">
        Todavía no hay visitas registradas. En cuanto la tienda reciba tráfico,
        aquí verás qué productos se miran mucho y se compran poco.
      </p>
    )
  }

  const W = 640
  const H = 280
  const M = { t: 12, r: 16, b: 38, l: 46 }
  const maxV = Math.max(...datos.map((d) => d.visitas), 1)
  const maxU = Math.max(...datos.map((d) => d.unidades), 1)
  const x = (v: number) => M.l + (v / maxV) * (W - M.l - M.r)
  const y = (u: number) => H - M.b - (u / maxU) * (H - M.t - M.b)
  // Muy visto y poco vendido: el cuadrante que hay que arreglar
  const atencion = (p: Producto) =>
    p.visitas >= maxV * 0.35 && p.unidades <= maxU * 0.15

  return (
    <div className="pnl-disp">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitas frente a unidades vendidas">
        <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} className="pnl-eje" />
        <line x1={M.l} y1={M.t} x2={M.l} y2={H - M.b} className="pnl-eje" />
        <text x={W - M.r} y={H - 10} textAnchor="end" className="pnl-eje-lbl">
          Visitas →
        </text>
        <text x={M.l} y={M.t + 2} textAnchor="start" className="pnl-eje-lbl">
          ↑ Unidades vendidas
        </text>
        {datos.map((p) => (
          <circle
            key={p.id}
            cx={x(p.visitas)}
            cy={y(p.unidades)}
            r={hover?.id === p.id ? 8 : 6}
            className={atencion(p) ? "pnl-punto pnl-punto--ojo" : "pnl-punto"}
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${p.titulo}: ${p.visitas} visitas, ${p.unidades} vendidas`}</title>
          </circle>
        ))}
      </svg>
      <p className="pnl-pie">
        {hover ? (
          <strong>
            {hover.titulo} — {hover.visitas} visitas, {hover.unidades} vendidas
            {hover.conversion != null && ` (${pct(hover.conversion)} de conversión)`}
          </strong>
        ) : (
          <>
            Los puntos <span className="pnl-clave" /> marcados piden atención: mucha
            gente los mira y casi nadie los compra. Suele ser la foto, el precio o
            la descripción.
          </>
        )}
      </p>
    </div>
  )
}

const Panel = () => {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [dias, setDias] = useState("30")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDatos(null)
    fetch(`/admin/panel?dias=${dias}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDatos)
      .catch((e) => setError(e.message))
  }, [dias])

  const topUtilidad = useMemo(() => {
    if (!datos) return []
    return datos.productos
      .filter((p) => (p.utilidad ?? 0) > 0)
      .sort((a, b) => (b.utilidad ?? 0) - (a.utilidad ?? 0))
      .slice(0, 10)
      .map((p) => ({
        etiqueta: p.titulo,
        valor: p.utilidad ?? 0,
        detalle: `${p.unidades} vendidas · margen ${money(p.margen)} · ${pct(p.margenPct)}`,
      }))
  }, [datos])

  const dormido = useMemo(() => {
    if (!datos) return []
    return datos.productos
      .filter((p) => p.capital != null && p.capital > 0 && p.unidades === 0)
      .sort((a, b) => (b.capital ?? 0) - (a.capital ?? 0))
      .slice(0, 8)
      .map((p) => ({
        etiqueta: p.titulo,
        valor: p.capital ?? 0,
        detalle: `${p.stock} en bodega · ninguna venta en el periodo`,
      }))
  }, [datos])

  const tabla = useMemo(() => {
    if (!datos) return []
    return [...datos.productos].sort(
      (a, b) => (b.utilidad ?? -1) - (a.utilidad ?? -1)
    )
  }, [datos])

  return (
    <Container className="divide-y p-0">
      <style>{ESTILOS}</style>

      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Panel de rentabilidad</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Qué deja dinero, qué está parado y qué se mira pero no se compra.
          </Text>
        </div>
        <Select value={dias} onValueChange={setDias}>
          <Select.Trigger className="w-44">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="7">Últimos 7 días</Select.Item>
            <Select.Item value="30">Últimos 30 días</Select.Item>
            <Select.Item value="90">Últimos 90 días</Select.Item>
            <Select.Item value="365">Último año</Select.Item>
          </Select.Content>
        </Select>
      </div>

      {error && (
        <div className="px-6 py-6">
          <Text className="text-ui-fg-error">No se pudo cargar el panel: {error}</Text>
        </div>
      )}

      {!datos && !error && (
        <div className="px-6 py-10">
          <Text className="text-ui-fg-subtle">Calculando…</Text>
        </div>
      )}

      {datos && (
        <>
          {datos.resumen.sinCosto > 0 && (
            <div className="px-6 py-3">
              <Badge color="orange">
                {datos.resumen.sinCosto} de {datos.resumen.productos} productos sin
                costo cargado — su margen no se puede calcular. Complétalo en la
                columna Costo de la hoja.
              </Badge>
            </div>
          )}

          <div className="pnl-fichas px-6 py-5">
            <Ficha
              etiqueta="Utilidad del periodo"
              valor={money(datos.resumen.utilidad)}
              nota="Lo que realmente ganaste, ya descontado el costo"
            />
            <Ficha
              etiqueta="Ventas"
              valor={money(datos.resumen.ingresos)}
              nota={`${datos.resumen.pedidos} pedidos · ${datos.resumen.unidades} unidades`}
            />
            <Ficha
              etiqueta="Ticket promedio"
              valor={money(datos.resumen.ticket)}
              nota="Cuánto gasta cada clienta por pedido"
            />
            <Ficha
              etiqueta="Capital en bodega"
              valor={money(datos.resumen.capital)}
              nota="Dinero tuyo parado en stock sin vender"
            />
          </div>

          <div className="px-6 py-5">
            <Heading level="h2">Lo que más te deja</Heading>
            <Text className="text-ui-fg-subtle mb-4" size="small">
              Utilidad total, no ventas: un producto barato que rota mucho puede
              ganarle a uno caro que casi no se mueve. Aquí está tu prioridad.
            </Text>
            <Barras
              filas={topUtilidad}
              formato={money}
              vacio="Aún no hay ventas con costo cargado en este periodo."
            />
          </div>

          <div className="px-6 py-5">
            <Heading level="h2">Se mira mucho, se compra poco</Heading>
            <Text className="text-ui-fg-subtle mb-4" size="small">
              Cada punto es un producto. Los de la derecha reciben visitas; los de
              abajo no se venden. Los de abajo a la derecha son oportunidades
              perdidas y suelen arreglarse con una foto o un precio.
            </Text>
            <Dispersion productos={datos.productos} />
          </div>

          <div className="px-6 py-5">
            <Heading level="h2">Dinero dormido</Heading>
            <Text className="text-ui-fg-subtle mb-4" size="small">
              Stock que no se vendió en el periodo, valorado a lo que te costó. Es
              plata inmovilizada: conviene rebajarlo o dejar de reponerlo.
            </Text>
            <Barras
              filas={dormido}
              formato={money}
              vacio="Nada parado: todo el inventario con costo tuvo movimiento."
            />
          </div>

          <div className="px-6 py-5">
            <Heading level="h2">Detalle por producto</Heading>
            <Text className="text-ui-fg-subtle mb-4" size="small">
              La cobertura dice cuántas semanas te dura el stock al ritmo actual.
              Por debajo de 2 conviene reponer; por encima de 20, sobra.
            </Text>
            <div className="pnl-tabla">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Producto</Table.HeaderCell>
                    <Table.HeaderCell>Precio</Table.HeaderCell>
                    <Table.HeaderCell>Costo</Table.HeaderCell>
                    <Table.HeaderCell>Margen</Table.HeaderCell>
                    <Table.HeaderCell>Vendidas</Table.HeaderCell>
                    <Table.HeaderCell>Utilidad</Table.HeaderCell>
                    <Table.HeaderCell>Stock</Table.HeaderCell>
                    <Table.HeaderCell>Cobertura</Table.HeaderCell>
                    <Table.HeaderCell>Visitas</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tabla.map((p) => (
                    <Table.Row key={p.sku}>
                      <Table.Cell>
                        <span className="pnl-td-titulo">{p.titulo}</span>
                        <span className="pnl-td-sub">{p.marca}</span>
                      </Table.Cell>
                      <Table.Cell>{money(p.precio)}</Table.Cell>
                      <Table.Cell>
                        {p.costo == null ? (
                          <Badge size="2xsmall">sin costo</Badge>
                        ) : (
                          money(p.costo)
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {p.margen == null ? "—" : `${money(p.margen)} · ${pct(p.margenPct)}`}
                      </Table.Cell>
                      <Table.Cell>{p.unidades}</Table.Cell>
                      <Table.Cell>{money(p.utilidad)}</Table.Cell>
                      <Table.Cell>{p.stock}</Table.Cell>
                      <Table.Cell>
                        {p.cobertura == null
                          ? "—"
                          : `${p.cobertura.toFixed(1)} sem`}
                      </Table.Cell>
                      <Table.Cell>{p.visitas || "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Panel",
  icon: ChartBar,
})

export default Panel

/* Los colores se declaran por rol para que light y dark salgan de un mismo sitio */
const ESTILOS = `
.pnl-fichas{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem}
.pnl-ficha{display:grid;gap:.2rem;padding:.9rem 1rem;border:1px solid var(--border-base);border-radius:.6rem}
.pnl-ficha__lbl{font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-muted);font-weight:700}
.pnl-ficha__val{font-size:1.7rem;font-weight:700;line-height:1.15;color:var(--fg-base)}
.pnl-ficha__nota{font-size:.74rem;color:var(--fg-muted);line-height:1.35}
.pnl-barras{display:grid;gap:.55rem}
.pnl-barra{position:relative;display:grid;grid-template-columns:minmax(120px,1.1fr) 3fr auto;align-items:center;gap:.75rem}
.pnl-barra__lbl{font-size:.82rem;color:var(--fg-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pnl-barra__pista{background:var(--bg-subtle);border-radius:999px;height:14px;overflow:hidden}
.pnl-barra__fill{height:100%;background:#9b1b60;border-radius:0 4px 4px 0;transition:width .5s cubic-bezier(.2,.8,.3,1)}
.pnl-barra__val{font-size:.82rem;font-weight:700;color:var(--fg-base);min-width:64px;text-align:right}
.pnl-barra__tip{position:absolute;left:0;top:100%;z-index:5;margin-top:2px;background:var(--fg-base);color:var(--bg-base);font-size:.72rem;padding:.3rem .55rem;border-radius:.35rem;white-space:nowrap}
.pnl-disp svg{width:100%;height:auto;max-height:300px}
.pnl-eje{stroke:var(--border-base);stroke-width:1}
.pnl-eje-lbl{font-size:10px;fill:var(--fg-muted)}
.pnl-punto{fill:#8d7f88;fill-opacity:.55;stroke:var(--bg-base);stroke-width:2;cursor:pointer;transition:r .15s ease}
.pnl-punto--ojo{fill:#9b1b60;fill-opacity:.95}
.pnl-clave{display:inline-block;width:10px;height:10px;border-radius:50%;background:#9b1b60;vertical-align:middle;margin-inline:2px}
.pnl-pie{margin-top:.5rem;font-size:.78rem;color:var(--fg-muted);line-height:1.45}
.pnl-vacio{font-size:.85rem;color:var(--fg-muted);padding:1rem 0}
.pnl-tabla{overflow-x:auto}
.pnl-td-titulo{display:block;font-weight:600}
.pnl-td-sub{display:block;font-size:.72rem;color:var(--fg-muted)}
/* Un solo hue en todo el panel: en oscuro se re-escalona, no se invierte */
@media (prefers-color-scheme:dark){
  .pnl-barra__fill{background:#c43d84}
  .pnl-punto--ojo{fill:#c43d84}
  .pnl-clave{background:#c43d84}
}
`
