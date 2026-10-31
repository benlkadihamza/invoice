import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const exportRoutes = new Hono<{ Bindings: Env }>()

exportRoutes.use('*', requireAuth)

// GET /api/exports/monthly-backup?year=YYYY&month=MM
exportRoutes.get('/monthly-backup', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const { year, month } = c.req.query()
  if (!year || !month) return c.json({ error: 'year and month required' }, 400)

  const transactions = await sql`
    SELECT t.date, t.description, t.income, t.expense, t.notes,
           p.name as person_name, pm.name as payment_method
    FROM transactions t
    LEFT JOIN persons p ON t.person_id = p.id
    LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
    WHERE EXTRACT(YEAR FROM t.date) = ${year} AND EXTRACT(MONTH FROM t.date) = ${month}
    ORDER BY t.date, t.created_at
  `

  // Build simple CSV (ExcelJS adds too much bundle weight for a Worker)
  const rows = [
    ['Date', 'Description', 'Revenu', 'Dépense', 'Notes', 'Personne', 'Méthode de paiement'],
    ...transactions.map((t: any) => [
      t.date, t.description, t.income, t.expense, t.notes || '', t.person_name || '', t.payment_method || ''
    ])
  ]
  const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  const filename = `backup-${year}-${String(month).padStart(2, '0')}.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
})
