import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const dashboardRoutes = new Hono<{ Bindings: Env }>()

dashboardRoutes.use('*', requireAuth)

dashboardRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)

  const [totalIncome, totalExpense, invoiceCount, personCount, pendingPayments] = await Promise.all([
    sql`SELECT COALESCE(SUM(income), 0) as total FROM transactions`,
    sql`SELECT COALESCE(SUM(expense), 0) as total FROM transactions`,
    sql`SELECT COUNT(*) as count FROM invoices`,
    sql`SELECT COUNT(*) as count FROM persons`,
    sql`SELECT COUNT(*) as count FROM invoice_payments WHERE status != 'Paid'`,
  ])

  return c.json({
    total_income: Number(totalIncome[0].total),
    total_expense: Number(totalExpense[0].total),
    net_balance: Number(totalIncome[0].total) - Number(totalExpense[0].total),
    invoice_count: Number(invoiceCount[0].count),
    person_count: Number(personCount[0].count),
    pending_payments: Number(pendingPayments[0].count),
  })
})
