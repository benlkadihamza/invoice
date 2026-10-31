import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { transactionRoutes } from './routes/transactions'
import { personRoutes } from './routes/persons'
import { invoiceRoutes } from './routes/invoices'
import { paymentRoutes } from './routes/payments'
import { productRoutes } from './routes/products'
import { reportRoutes } from './routes/reports'
import { settingsRoutes } from './routes/settings'
import { categoryRoutes } from './routes/categories'
import { dashboardRoutes } from './routes/dashboard'
import { exportRoutes } from './routes/exports'

export type Env = {
  DATABASE_URL: string
  JWT_SECRET: string
  UPLOADS: R2Bucket
  ENVIRONMENT: string
  ASSETS?: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

// CORS (allows local dev vite server + production domain)
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    return origin
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/api/health', (c) => c.json({ ok: true, service: 'invoiceapp-worker' }))

// Mount all API route groups
app.route('/api/auth', authRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/transactions', transactionRoutes)
app.route('/api/persons', personRoutes)
app.route('/api/invoices', invoiceRoutes)
app.route('/api/payments', paymentRoutes)
app.route('/api/products', productRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/exports', exportRoutes)

// Fallback to static assets (Cloudflare Workers Assets) for SPA frontend
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
