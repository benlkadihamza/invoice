import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const paymentRoutes = new Hono<{ Bindings: Env }>()

paymentRoutes.use('*', requireAuth)

paymentRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT ip.*, i.client_name, i.net_total as invoice_net_total
    FROM invoice_payments ip
    LEFT JOIN invoices i ON ip.invoice_id = i.id
    ORDER BY ip.created_at DESC
  `
  return c.json({ payments: rows })
})

paymentRoutes.get('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const rows = await sql`
    SELECT ip.*, i.client_name, i.net_total as invoice_net_total
    FROM invoice_payments ip
    LEFT JOIN invoices i ON ip.invoice_id = i.id
    WHERE ip.id = ${id}
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ payment: rows[0] })
})

paymentRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const body = await c.req.json()
  const {
    invoice_id, customer_name = '', invoice_number = '', invoice_total = 0,
    payment1_amount = 0, payment1_date = '', payment1_notes = '',
    payment2_amount = 0, payment2_date = '', payment2_notes = '',
    payment3_amount = 0, payment3_date = '', payment3_notes = '',
    payment4_amount = 0, payment4_date = '', payment4_notes = '',
  } = body

  const total_paid = payment1_amount + payment2_amount + payment3_amount + payment4_amount
  const remaining = Math.max(0, invoice_total - total_paid)
  const status = total_paid === 0 ? 'Pending' : remaining <= 0 ? 'Paid' : 'Partial'

  const rows = await sql`
    INSERT INTO invoice_payments (
      invoice_id, customer_name, invoice_number, invoice_total,
      payment1_amount, payment1_date, payment1_notes,
      payment2_amount, payment2_date, payment2_notes,
      payment3_amount, payment3_date, payment3_notes,
      payment4_amount, payment4_date, payment4_notes,
      remaining_amount, status
    ) VALUES (
      ${invoice_id}, ${customer_name}, ${invoice_number}, ${invoice_total},
      ${payment1_amount}, ${payment1_date}, ${payment1_notes},
      ${payment2_amount}, ${payment2_date}, ${payment2_notes},
      ${payment3_amount}, ${payment3_date}, ${payment3_notes},
      ${payment4_amount}, ${payment4_date}, ${payment4_notes},
      ${remaining}, ${status}
    )
    RETURNING *
  `
  return c.json({ payment: rows[0] }, 201)
})

paymentRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const body = await c.req.json()
  const {
    payment1_amount = 0, payment1_date, payment1_notes,
    payment2_amount = 0, payment2_date, payment2_notes,
    payment3_amount = 0, payment3_date, payment3_notes,
    payment4_amount = 0, payment4_date, payment4_notes,
    invoice_total,
  } = body

  // Fetch existing if invoice_total not provided
  const existing = await sql`SELECT invoice_total FROM invoice_payments WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)
  const tot = invoice_total ?? Number(existing[0].invoice_total)
  const total_paid = payment1_amount + payment2_amount + payment3_amount + payment4_amount
  const remaining = Math.max(0, tot - total_paid)
  const status = total_paid === 0 ? 'Pending' : remaining <= 0 ? 'Paid' : 'Partial'
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const rows = await sql`
    UPDATE invoice_payments SET
      payment1_amount = ${payment1_amount},
      payment1_date = COALESCE(${payment1_date}, payment1_date),
      payment1_notes = COALESCE(${payment1_notes}, payment1_notes),
      payment2_amount = ${payment2_amount},
      payment2_date = COALESCE(${payment2_date}, payment2_date),
      payment2_notes = COALESCE(${payment2_notes}, payment2_notes),
      payment3_amount = ${payment3_amount},
      payment3_date = COALESCE(${payment3_date}, payment3_date),
      payment3_notes = COALESCE(${payment3_notes}, payment3_notes),
      payment4_amount = ${payment4_amount},
      payment4_date = COALESCE(${payment4_date}, payment4_date),
      payment4_notes = COALESCE(${payment4_notes}, payment4_notes),
      remaining_amount = ${remaining},
      status = ${status},
      updated_at = ${now}
    WHERE id = ${id}
    RETURNING *
  `
  return c.json({ payment: rows[0] })
})
