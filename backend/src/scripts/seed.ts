import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

// URL pública del backend: las imágenes de producto se sirven desde /static
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || "http://localhost:9000";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

// ── Catálogo real de Angie Catálogos (migrado del sitio estático) ──
type SeedProduct = {
  title: string;
  price: number; // USD
  image: string; // archivo en backend/static/
  category: "Perfumes" | "Protección Solar";
  presentation: string;
  description: string;
};

const PRODUCTS: SeedProduct[] = [
  { title: "Perfume Ohm Black", price: 28.0, image: "ohmblack.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia masculina intensa y elegante, ideal para la noche." },
  { title: "Perfume Osadía Dama", price: 29.0, image: "osadiadama.webp", category: "Perfumes", presentation: "Único", description: "Fragancia femenina audaz y sofisticada para el día a día." },
  { title: "Perfume Ohm Soul", price: 29.0, image: "ohmsoul.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia masculina fresca con carácter, para quienes marcan su propio camino." },
  { title: "Perfume Gaia Dama", price: 25.0, image: "gaia.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia femenina floral, ligera y natural." },
  { title: "Perfume Ohm", price: 27.0, image: "ohm.webp", category: "Perfumes", presentation: "Único", description: "El clásico Ohm: fragancia masculina versátil para toda ocasión." },
  { title: "Perfume Ccori Dorado", price: 27.0, image: "ccoridorado.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia femenina cálida con notas doradas y envolventes." },
  { title: "Perfume Jaque", price: 29.99, image: "jaque.webp", category: "Perfumes", presentation: "Único", description: "Fragancia masculina moderna: jugada maestra para conquistar el día." },
  { title: "Perfume Dulce Vanidad", price: 27.99, image: "dulcevanidad.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia femenina dulce y coqueta, irresistible." },
  { title: "Perfume Osadía", price: 29.0, image: "osadia.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia con actitud para quienes se atreven a más." },
  { title: "Perfume Temptation Mystic", price: 26.0, image: "temptationdama.jpg", category: "Perfumes", presentation: "Único", description: "Fragancia femenina misteriosa y seductora." },
  { title: "Perfume Zentro", price: 28.0, image: "zentro.jpeg", category: "Perfumes", presentation: "Único", description: "Fragancia masculina urbana con energía contemporánea." },
  { title: "Protector Dermafusion", price: 19.99, image: "protectordermafusion.jpg", category: "Protección Solar", presentation: "50 ml", description: "Protector solar facial Dermafusion de alta protección, textura ligera." },
  { title: "Protector Solar Jumbo", price: 16.0, image: "protectorsolarjumbo.jpg", category: "Protección Solar", presentation: "140 g", description: "Protector solar corporal en presentación jumbo, rinde más." },
  { title: "Protector Solar Sport", price: 16.0, image: "protectorsport.jpg", category: "Protección Solar", presentation: "140 g", description: "Protector solar resistente al agua y al sudor, ideal para deporte." },
  { title: "Protector Solar Kids", price: 16.0, image: "protectorkid.jpg", category: "Protección Solar", presentation: "140 g", description: "Protección solar suave, formulada para la piel de los niños." },
  { title: "Protector Matificante", price: 13.0, image: "protectormatificante.webp", category: "Protección Solar", presentation: "80 g", description: "Protector solar facial con efecto matificante, controla el brillo." },
  { title: "Protector Solar", price: 12.0, image: "protectorsolar50.jpg", category: "Protección Solar", presentation: "80 g", description: "Protector solar de uso diario para toda la familia." },
  { title: "Protector Solar Mineral", price: 13.0, image: "protectormineral.jpg", category: "Protección Solar", presentation: "80 g", description: "Protector solar con filtros minerales, apto para piel sensible." },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default async function seedAngieCatalogos({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  logger.info("Sembrando datos de la tienda Angie Catálogos...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Tienda Online",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Tienda Online",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  // Ecuador usa dólares estadounidenses
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "usd",
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Sembrando región Ecuador...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Ecuador",
          currency_code: "usd",
          countries: ["ec"],
          payment_providers: ["pp_system_default"], // Kushki y PayPhone se agregan en la Fase 2
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "ec",
        provider_id: "tp_system",
      },
    ],
  });

  logger.info("Sembrando bodega y logística...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Bodega Machachi",
          address: {
            city: "Machachi",
            country_code: "EC",
            address_1: "Av. Fernández Salvador y L Vía Tesalia",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Perfil de envío estándar",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Envíos desde Bodega Machachi",
    type: "shipping",
    service_zones: [
      {
        name: "Ecuador",
        geo_zones: [
          {
            country_code: "ec",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Envío Nacional",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Estándar",
          description: "Entrega en 1 a 3 días hábiles en todo el Ecuador.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 3.5,
          },
          {
            region_id: region.id,
            amount: 3.5,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Retiro en Machachi",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Retiro",
          description: "Retira tu pedido sin costo en Machachi.",
          code: "pickup",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 0,
          },
          {
            region_id: region.id,
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Sembrando API key publicable...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Tienda Web",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Sembrando categorías y productos reales...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        { name: "Perfumes", is_active: true },
        { name: "Protección Solar", is_active: true },
        { name: "Cuidado de la Piel", is_active: true },
        { name: "Ropa", is_active: true },
        { name: "Pijamas", is_active: true },
      ],
    },
  });

  const categoryId = (name: string) =>
    categoryResult.find((cat) => cat.name === name)!.id;

  await createProductsWorkflow(container).run({
    input: {
      products: PRODUCTS.map((p) => {
        const handle = slugify(p.title);
        return {
          title: p.title,
          category_ids: [categoryId(p.category)],
          description: p.description,
          handle,
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile!.id,
          images: [{ url: `${BACKEND_URL}/static/${p.image}` }],
          options: [
            {
              title: "Presentación",
              values: [p.presentation],
            },
          ],
          variants: [
            {
              title: p.presentation,
              sku: handle.toUpperCase().replace(/-/g, "_"),
              options: {
                Presentación: p.presentation,
              },
              prices: [
                {
                  amount: p.price,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        };
      }),
    },
  });
  logger.info(`Sembrados ${PRODUCTS.length} productos reales.`);

  logger.info("Sembrando niveles de inventario...");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 100,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("✔ Seed de Angie Catálogos completado.");
}
