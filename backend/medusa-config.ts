import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// El login con Google se activa solo cuando hay credenciales en el .env
const googleAuthEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

// Sin token no se registra PayPhone: así el checkout sigue en pie con el
// pago manual mientras las credenciales no estén listas
const payphoneEnabled = !!process.env.PAYPHONE_TOKEN

/**
 * Proveedor de correo, por orden de preferencia: SMTP, luego SendGrid, y si
 * no hay ninguno, el local —que escribe el correo en el log en vez de
 * enviarlo, útil para revisar el diseño sin contratar nada.
 *
 * SMTP va primero a propósito: es el que habla con cualquier servicio (Brevo,
 * Amazon SES, Mailgun, el correo del hosting) y el que permite cambiar de
 * proveedor sin tocar código. SendGrid se queda por debajo porque su plan
 * gratuito caduca a los 60 días.
 */
const smtpEnabled =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASSWORD &&
  !!process.env.SMTP_FROM

const sendgridEnabled =
  !smtpEnabled && !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM

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
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          smtpEnabled
            ? {
                resolve: "./src/modules/correo-smtp",
                id: "smtp",
                options: {
                  channels: ["email"],
                  host: process.env.SMTP_HOST,
                  port: Number(process.env.SMTP_PORT ?? 587),
                  user: process.env.SMTP_USER,
                  password: process.env.SMTP_PASSWORD,
                  from: process.env.SMTP_FROM,
                  secure: process.env.SMTP_SECURE === "true",
                },
              }
            : sendgridEnabled
              ? {
                  resolve: "@medusajs/medusa/notification-sendgrid",
                  id: "sendgrid",
                  options: {
                    channels: ["email"],
                    api_key: process.env.SENDGRID_API_KEY,
                    from: process.env.SENDGRID_FROM,
                  },
                }
              : {
                  resolve: "@medusajs/medusa/notification-local",
                  id: "local",
                  options: { channels: ["email"] },
                },
        ],
      },
    },
    {
      // El pago manual (pp_system_default) viene incluido siempre; PayPhone
      // se suma encima cuando hay token
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: payphoneEnabled
          ? [
              {
                resolve: "./src/modules/payphone",
                id: "payphone",
                options: {},
              },
            ]
          : [],
      },
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
