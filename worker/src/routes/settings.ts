import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const settingsRoutes = new Hono<{ Bindings: Env }>()

settingsRoutes.use('*', requireAuth)

settingsRoutes.get('/', async (c) => {
  const user = c.get('user')
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT show_decimals, show_daily_totals FROM users WHERE id = ${user.id}`
  if (!rows.length) return c.json({ error: 'User not found' }, 404)
  return c.json({ settings: rows[0] })
})

settingsRoutes.put('/', async (c) => {
  const user = c.get('user')
  const sql = getDb(c.env.DATABASE_URL)
  const { show_decimals, show_daily_totals } = await c.req.json()
  await sql`
    UPDATE users SET
      show_decimals = COALESCE(${show_decimals ?? null}, show_decimals),
      show_daily_totals = COALESCE(${show_daily_totals ?? null}, show_daily_totals)
    WHERE id = ${user.id}
  `
  return c.json({ ok: true })
})
