import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const personRoutes = new Hono<{ Bindings: Env }>()

personRoutes.use('*', requireAuth)

personRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT p.*,
      COALESCE(SUM(t.income), 0) as total_income,
      COALESCE(SUM(t.expense), 0) as total_expense,
      COUNT(t.id) as transaction_count
    FROM persons p
    LEFT JOIN transactions t ON t.person_id = p.id
    GROUP BY p.id
    ORDER BY p.name
  `
  return c.json({ persons: rows })
})

personRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { name, phone, email, notes } = await c.req.json()
  if (!name) return c.json({ error: 'Name required' }, 400)
  const rows = await sql`
    INSERT INTO persons (name, phone, email, notes)
    VALUES (${name}, ${phone || null}, ${email || null}, ${notes || null})
    RETURNING *
  `
  return c.json({ person: rows[0] }, 201)
})

personRoutes.get('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const rows = await sql`SELECT * FROM persons WHERE id = ${id}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ person: rows[0] })
})

personRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const { name, phone, email, notes } = await c.req.json()
  const rows = await sql`
    UPDATE persons SET
      name = COALESCE(${name}, name),
      phone = COALESCE(${phone}, phone),
      email = COALESCE(${email}, email),
      notes = COALESCE(${notes}, notes)
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ person: rows[0] })
})

personRoutes.delete('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await sql`DELETE FROM persons WHERE id = ${id}`
  return c.json({ ok: true })
})
