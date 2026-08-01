/**
 * División política del Ecuador para el checkout.
 *
 * Se llega hasta cantón porque es el nivel que las transportadoras usan para
 * cotizar y rotular la guía. Las parroquias solo se detallan en Mejía, donde
 * sí cambian la tarifa: el envío es gratis en el cantón salvo en Tandapí,
 * que queda demasiado lejos de la bodega de Machachi.
 *
 * Galápagos queda fuera a propósito: se coordina por WhatsApp.
 */

export const PROVINCIAS: Record<string, string[]> = {
  Azuay: ["Cuenca", "Camilo Ponce Enríquez", "Chordeleg", "El Pan", "Girón", "Guachapala", "Gualaceo", "Nabón", "Oña", "Paute", "Pucará", "San Fernando", "Santa Isabel", "Sevilla de Oro", "Sígsig"],
  Bolívar: ["Guaranda", "Caluma", "Chillanes", "Chimbo", "Echeandía", "Las Naves", "San Miguel"],
  Cañar: ["Azogues", "Biblián", "Cañar", "Déleg", "El Tambo", "La Troncal", "Suscal"],
  Carchi: ["Tulcán", "Bolívar", "Espejo", "Mira", "Montúfar", "San Pedro de Huaca"],
  Chimborazo: ["Riobamba", "Alausí", "Chambo", "Chunchi", "Colta", "Cumandá", "Guamote", "Guano", "Pallatanga", "Penipe"],
  Cotopaxi: ["Latacunga", "La Maná", "Pangua", "Pujilí", "Salcedo", "Saquisilí", "Sigchos"],
  "El Oro": ["Machala", "Arenillas", "Atahualpa", "Balsas", "Chilla", "El Guabo", "Huaquillas", "Las Lajas", "Marcabelí", "Pasaje", "Piñas", "Portovelo", "Santa Rosa", "Zaruma"],
  Esmeraldas: ["Esmeraldas", "Atacames", "Eloy Alfaro", "Muisne", "Quinindé", "Rioverde", "San Lorenzo"],
  Guayas: ["Guayaquil", "Alfredo Baquerizo Moreno", "Balao", "Balzar", "Colimes", "Coronel Marcelino Maridueña", "Daule", "Durán", "El Empalme", "El Triunfo", "General Antonio Elizalde", "Isidro Ayora", "Lomas de Sargentillo", "Milagro", "Naranjal", "Naranjito", "Nobol", "Palestina", "Pedro Carbo", "Playas", "Salitre", "Samborondón", "Santa Lucía", "Simón Bolívar", "Yaguachi"],
  Imbabura: ["Ibarra", "Antonio Ante", "Cotacachi", "Otavalo", "Pimampiro", "San Miguel de Urcuquí"],
  Loja: ["Loja", "Calvas", "Catamayo", "Celica", "Chaguarpamba", "Espíndola", "Gonzanamá", "Macará", "Olmedo", "Paltas", "Pindal", "Puyango", "Quilanga", "Saraguro", "Sozoranga", "Zapotillo"],
  "Los Ríos": ["Babahoyo", "Baba", "Buena Fe", "Mocache", "Montalvo", "Palenque", "Puebloviejo", "Quevedo", "Quinsaloma", "Urdaneta", "Valencia", "Ventanas", "Vinces"],
  Manabí: ["Portoviejo", "24 de Mayo", "Bolívar", "Chone", "El Carmen", "Flavio Alfaro", "Jama", "Jaramijó", "Jipijapa", "Junín", "Manta", "Montecristi", "Olmedo", "Paján", "Pedernales", "Pichincha", "Puerto López", "Rocafuerte", "San Vicente", "Santa Ana", "Sucre", "Tosagua"],
  "Morona Santiago": ["Morona", "Gualaquiza", "Huamboya", "Limón Indanza", "Logroño", "Pablo Sexto", "Palora", "San Juan Bosco", "Santiago", "Sucúa", "Taisha", "Tiwintza"],
  Napo: ["Tena", "Archidona", "Carlos Julio Arosemena Tola", "El Chaco", "Quijos"],
  Orellana: ["Orellana", "Aguarico", "La Joya de los Sachas", "Loreto"],
  Pastaza: ["Pastaza", "Arajuno", "Mera", "Santa Clara"],
  Pichincha: ["Mejía", "Quito", "Cayambe", "Pedro Moncayo", "Pedro Vicente Maldonado", "Puerto Quito", "Rumiñahui", "San Miguel de los Bancos"],
  "Santa Elena": ["Santa Elena", "La Libertad", "Salinas"],
  "Santo Domingo de los Tsáchilas": ["Santo Domingo", "La Concordia"],
  Sucumbíos: ["Lago Agrio", "Cascales", "Cuyabeno", "Gonzalo Pizarro", "Putumayo", "Shushufindi", "Sucumbíos"],
  Tungurahua: ["Ambato", "Baños de Agua Santa", "Cevallos", "Mocha", "Patate", "Quero", "San Pedro de Pelileo", "Santiago de Píllaro", "Tisaleo"],
  "Zamora Chinchipe": ["Zamora", "Centinela del Cóndor", "Chinchipe", "El Pangui", "Nangaritza", "Palanda", "Paquisha", "Yacuambi", "Yantzaza"],
}

export const NOMBRES_PROVINCIAS = Object.keys(PROVINCIAS).sort((a, b) =>
  a.localeCompare(b, "es")
)

/** Parroquias del cantón Mejía, la zona de reparto propio. */
export const PARROQUIAS_MEJIA = [
  "Machachi",
  "Alóag",
  "Aloasí",
  "Cutuglagua",
  "El Chaupi",
  "Tambillo",
  "Uyumbicho",
  "Manuel Cornejo Astorga (Tandapí)",
]

/** Tandapí queda al otro lado de la cordillera: ahí no llega el reparto gratis. */
export const PARROQUIAS_SIN_REPARTO = ["Manuel Cornejo Astorga (Tandapí)"]

export type Zona = "mejia" | "pichincha" | "provincias"

/** Tarifa que corresponde a una dirección. */
export const zonaDeEnvio = (
  provincia: string,
  canton: string,
  parroquia: string
): Zona => {
  if (provincia !== "Pichincha") return "provincias"
  if (canton !== "Mejía") return "pichincha"
  return PARROQUIAS_SIN_REPARTO.includes(parroquia) ? "pichincha" : "mejia"
}

/**
 * El retiro en bodega solo se ofrece dentro de Pichincha: nadie viaja desde
 * otra provincia a recoger un perfume.
 */
export const permiteRetiro = (provincia: string) => provincia === "Pichincha"

/** Nombre de cada opción de envío en Medusa, mapeado a su zona. */
export const ZONA_POR_OPCION: Record<string, string> = {
  "Envío gratis en Mejía": "mejia",
  "Envío en Pichincha": "pichincha",
  "Envío a provincias": "provincias",
  "Retiro en Machachi": "retiro",
}
