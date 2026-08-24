/** Quita la cabecera que anuncia el framework: no aporta y orienta a quien busca fallos conocidos. */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("render:response", (response) => {
    delete (response.headers as Record<string, unknown>)["x-powered-by"]
  })
})
