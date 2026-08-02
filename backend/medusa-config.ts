import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// El login con Google se activa solo cuando hay credenciales en el .env
const googleAuthEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        user: ["emailpass"],
        customer: googleAuthEnabled ? ["emailpass", "google"] : ["emailpass"],
      },
    },
  },
  modules: [
    {
      resolve: "./src/modules/referrals",
    },
    {
      resolve: "./src/modules/analytics",
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
            options: {},
          },
          ...(googleAuthEnabled
            ? [
                {
                  resolve: "@medusajs/medusa/auth-google",
                  id: "google",
                  options: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackUrl:
                      process.env.GOOGLE_CALLBACK_URL ||
                      "http://localhost:3000/cuenta/callback",
                  },
                },
              ]
            : []),
        ],
      },
    },
  ],
})
