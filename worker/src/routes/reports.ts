import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const reportRoutes = new Hono<{ Bindings: Env }>()

reportRoutes.use('*', requireAuth)

// GET /api/reports/daily?date=YYYY-MM-DD
reportRoutes.get('/daily', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10)
  const rows = await sql`
    SELECT t.*, p.name as person_name, pm.name as payment_method_name
    FROM transactions t
    LEFT JOIN persons p ON t.person_id = p.id
    LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
    WHERE t.date = ${date}
    ORDER BY t.created_at DESC
  `
  const totals = await sql`
    SELECT COALESCE(SUM(income),0) as total_income, COALESCE(SUM(expense),0) as total_expense
    FROM transactions WHERE date = ${date}
  `
  return c.json({ date, transactions: rows, ...totals[0] })
})

// GET /api/reports/weekly?start=YYYY-MM-DD&end=YYYY-MM-DD
reportRoutes.get('/weekly', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { start, end } = c.req.query()
  if (!start || !end) return c.json({ error: 'start and end dates required' }, 400)
  const rows = await sql`
    SELECT date, COALESCE(SUM(income),0) as income, COALESCE(SUM(expense),0) as expense
    FROM transactions WHERE date BETWEEN ${start} AND ${end}
    GROUP BY date ORDER BY date
  `
  const totals = await sql`
    SELECT COALESCE(SUM(income),0) as total_income, COALESCE(SUM(expense),0) as total_expense
    FROM transactions WHERE date BETWEEN ${start} AND ${end}
  `
  return c.json({ start, end, daily: rows, ...totals[0] })
})

// GET /api/reports/monthly?year=YYYY&month=MM
reportRoutes.get('/monthly', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { year, month } = c.req.query()
  if (!year || !month) return c.json({ error: 'year and month required' }, 400)
  const rows = await sql`
    SELECT date, COALESCE(SUM(income),0) as income, COALESCE(SUM(expense),0) as expense
    FROM transactions
    WHERE EXTRACT(YEAR FROM date) = ${year} AND EXTRACT(MONTH FROM date) = ${month}
    GROUP BY date ORDER BY date
  `
  const totals = await sql`
    SELECT COALESCE(SUM(income),0) as total_income, COALESCE(SUM(expense),0) as total_expense
    FROM transactions
    WHERE EXTRACT(YEAR FROM date) = ${year} AND EXTRACT(MONTH FROM date) = ${month}
  `
  return c.json({ year, month, daily: rows, ...totals[0] })
})

// GET /api/reports/yearly?year=YYYY
reportRoutes.get('/yearly', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const year = c.req.query('year') || new Date().getFullYear().toString()
  const rows = await sql`
    SELECT EXTRACT(MONTH FROM date) as month,
      COALESCE(SUM(income),0) as income, COALESCE(SUM(expense),0) as expense
    FROM transactions WHERE EXTRACT(YEAR FROM date) = ${year}
    GROUP BY EXTRACT(MONTH FROM date) ORDER BY month
  `
  return c.json({ year, monthly: rows })
})

// GET /api/reports/person/:id
reportRoutes.get('/person/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const person = await sql`SELECT * FROM persons WHERE id = ${id}`
  if (!person.length) return c.json({ error: 'Person not found' }, 404)
  const transactions = await sql`
    SELECT t.*, pm.name as payment_method_name
    FROM transactions t
    LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
    WHERE t.person_id = ${id}
    ORDER BY t.date DESC
  `
  const totals = await sql`
    SELECT COALESCE(SUM(income),0) as total_income, COALESCE(SUM(expense),0) as total_expense
    FROM transactions WHERE person_id = ${id}
  `
  return c.json({ person: person[0], transactions, ...totals[0] })
})
