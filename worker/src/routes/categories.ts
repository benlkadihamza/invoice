import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const categoryRoutes = new Hono<{ Bindings: Env }>()

categoryRoutes.use('*', requireAuth)

categoryRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT * FROM transaction_descriptions ORDER BY sort_order, name`
  return c.json({ categories: rows })
})

categoryRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { name, sort_order = 0, position = 0 } = await c.req.json()
  if (!name) return c.json({ error: 'Name required' }, 400)
  const rows = await sql`
    INSERT INTO transaction_descriptions (name, sort_order, position)
    VALUES (${name}, ${sort_order}, ${position})
    RETURNING *
  `
  return c.json({ category: rows[0] }, 201)
})

categoryRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const { name, sort_order, position } = await c.req.json()
  const rows = await sql`
    UPDATE transaction_descriptions SET
      name = COALESCE(${name}, name),
      sort_order = COALESCE(${sort_order}, sort_order),
      position = COALESCE(${position}, position)
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ category: rows[0] })
})

categoryRoutes.delete('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await sql`DELETE FROM transaction_descriptions WHERE id = ${id}`
  return c.json({ ok: true })
})
