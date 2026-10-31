import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const transactionRoutes = new Hono<{ Bindings: Env }>()

transactionRoutes.use('*', requireAuth)

// GET /api/transactions
transactionRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { person_id, start_date, end_date, limit = '100', offset = '0' } = c.req.query()

  let rows
  if (person_id) {
    rows = await sql`
      SELECT t.*, p.name as person_name, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN persons p ON t.person_id = p.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.person_id = ${person_id}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else if (start_date && end_date) {
    rows = await sql`
      SELECT t.*, p.name as person_name, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN persons p ON t.person_id = p.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      WHERE t.date BETWEEN ${start_date} AND ${end_date}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  } else {
    rows = await sql`
      SELECT t.*, p.name as person_name, pm.name as payment_method_name
      FROM transactions t
      LEFT JOIN persons p ON t.person_id = p.id
      LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  }
  return c.json({ transactions: rows })
})

// POST /api/transactions
transactionRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const body = await c.req.json()
  const { date, description, income = 0, expense = 0, notes, person_id, payment_method_id } = body

  if (!date || !description || !person_id) {
    return c.json({ error: 'date, description and person_id are required' }, 400)
  }

  const rows = await sql`
    INSERT INTO transactions (date, description, income, expense, notes, person_id, payment_method_id)
    VALUES (${date}, ${description}, ${income}, ${expense}, ${notes || null}, ${person_id}, ${payment_method_id || null})
    RETURNING *
  `
  return c.json({ transaction: rows[0] }, 201)
})

// GET /api/transactions/:id
transactionRoutes.get('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const rows = await sql`SELECT * FROM transactions WHERE id = ${id}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ transaction: rows[0] })
})

// PUT /api/transactions/:id
transactionRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const { date, description, income, expense, notes, person_id, payment_method_id } = await c.req.json()

  const rows = await sql`
    UPDATE transactions SET
      date = COALESCE(${date}, date),
      description = COALESCE(${description}, description),
      income = COALESCE(${income}, income),
      expense = COALESCE(${expense}, expense),
      notes = COALESCE(${notes}, notes),
      person_id = COALESCE(${person_id}, person_id),
      payment_method_id = COALESCE(${payment_method_id}, payment_method_id)
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ transaction: rows[0] })
})

// DELETE /api/transactions/:id
transactionRoutes.delete('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await sql`DELETE FROM transactions WHERE id = ${id}`
  return c.json({ ok: true })
})

// POST /api/transactions/:id/receipt — upload receipt to R2
transactionRoutes.post('/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const key = `receipts/${id}-${Date.now()}-${file.name}`
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const sql = getDb(c.env.DATABASE_URL)
  await sql`UPDATE transactions SET receipt_image = ${key} WHERE id = ${id}`

  return c.json({ key })
})
