import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const productRoutes = new Hono<{ Bindings: Env }>()

productRoutes.use('*', requireAuth)

productRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT * FROM products ORDER BY title`
  return c.json({ products: rows })
})

productRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const formData = await c.req.formData()
  const title = formData.get('title') as string
  const stock_quantity = parseInt(formData.get('stock_quantity') as string || '0')
  const file = formData.get('photo') as File | null

  if (!title) return c.json({ error: 'Title required' }, 400)

  let photo = ''
  if (file && file.size > 0) {
    const key = `products/${Date.now()}-${file.name}`
    await c.env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
    photo = key
  }

  const rows = await sql`
    INSERT INTO products (title, photo, stock_quantity)
    VALUES (${title}, ${photo}, ${stock_quantity})
    RETURNING *
  `
  return c.json({ product: rows[0] }, 201)
})

productRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const { title, stock_quantity } = await c.req.json()
  const rows = await sql`
    UPDATE products SET
      title = COALESCE(${title}, title),
      stock_quantity = COALESCE(${stock_quantity}, stock_quantity),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ product: rows[0] })
})

productRoutes.delete('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await sql`DELETE FROM products WHERE id = ${id}`
  return c.json({ ok: true })
})

// POST /api/products/:id/stock — adjust stock
productRoutes.post('/:id/stock', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const { change_type, quantity } = await c.req.json()

  if (!['add', 'remove'].includes(change_type) || !quantity) {
    return c.json({ error: 'change_type (add|remove) and quantity required' }, 400)
  }

  const existing = await sql`SELECT * FROM products WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const product = existing[0] as any
  const stock_before = Number(product.stock_quantity)
  const stock_after = change_type === 'add' ? stock_before + quantity : Math.max(0, stock_before - quantity)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await sql`UPDATE products SET stock_quantity = ${stock_after}, updated_at = ${now} WHERE id = ${id}`
  await sql`
    INSERT INTO stock_history (product_id, change_type, quantity, stock_before, stock_after, created_at)
    VALUES (${id}, ${change_type}, ${quantity}, ${stock_before}, ${stock_after}, ${now})
  `

  return c.json({ stock_after })
})

// GET /api/products/stock-report
productRoutes.get('/stock-report', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT p.*, sh.change_type, sh.quantity, sh.stock_before, sh.stock_after, sh.created_at as change_date
    FROM products p
    LEFT JOIN stock_history sh ON sh.product_id = p.id
    ORDER BY p.title, sh.created_at DESC
  `
  return c.json({ report: rows })
})
