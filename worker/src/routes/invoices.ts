import { Hono } from 'hono'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export const invoiceRoutes = new Hono<{ Bindings: Env }>()

invoiceRoutes.use('*', requireAuth)

const COMPANY_NAME = 'Votre Société'
const COMPANY_ADDRESS = 'Rue Tange Center Al hirafiyin N 25 Imzouren Al Hoceima'
const GOLD = rgb(201/255, 168/255, 76/255)
const DARK = rgb(51/255, 51/255, 51/255)

invoiceRoutes.get('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT * FROM invoices ORDER BY created_at DESC`
  return c.json({ invoices: rows })
})

invoiceRoutes.post('/', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const body = await c.req.json()
  const {
    invoice_num = '', date = '', client_name = '', client_address = '',
    total = 0, remise = 0, payer = 0, net_total = 0,
    items = [], show_facture_num = false,
  } = body

  const rows = await sql`
    INSERT INTO invoices (invoice_num, date, client_name, client_address, total, remise, payer, net_total, items, show_facture_num)
    VALUES (${invoice_num}, ${date}, ${client_name}, ${client_address}, ${total}, ${remise}, ${payer}, ${net_total}, ${JSON.stringify(items)}, ${show_facture_num})
    RETURNING *
  `
  return c.json({ invoice: rows[0] }, 201)
})

invoiceRoutes.get('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const rows = await sql`SELECT * FROM invoices WHERE id = ${id}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ invoice: rows[0] })
})

invoiceRoutes.put('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const body = await c.req.json()
  const { invoice_num, date, client_name, client_address, total, remise, payer, net_total, items, show_facture_num } = body

  const rows = await sql`
    UPDATE invoices SET
      invoice_num = COALESCE(${invoice_num}, invoice_num),
      date = COALESCE(${date}, date),
      client_name = COALESCE(${client_name}, client_name),
      client_address = COALESCE(${client_address}, client_address),
      total = COALESCE(${total}, total),
      remise = COALESCE(${remise}, remise),
      payer = COALESCE(${payer}, payer),
      net_total = COALESCE(${net_total}, net_total),
      items = COALESCE(${items ? JSON.stringify(items) : null}, items),
      show_facture_num = COALESCE(${show_facture_num ?? null}, show_facture_num)
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json({ invoice: rows[0] })
})

invoiceRoutes.delete('/:id', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  await sql`DELETE FROM invoices WHERE id = ${id}`
  return c.json({ ok: true })
})

// GET /api/invoices/:id/pdf — generate PDF
invoiceRoutes.get('/:id/pdf', async (c) => {
  const sql = getDb(c.env.DATABASE_URL)
  const id = c.req.param('id')
  const rows = await sql`SELECT * FROM invoices WHERE id = ${id}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)

  const inv = rows[0] as any
  const items: any[] = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items || []

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: DARK })
  page.drawText(COMPANY_NAME, { x: 40, y: height - 40, size: 20, font: fontBold, color: rgb(1,1,1) })
  page.drawText(COMPANY_ADDRESS, { x: 40, y: height - 60, size: 9, font, color: rgb(0.8, 0.8, 0.8) })

  // Invoice title
  page.drawText('FACTURE', { x: width - 150, y: height - 45, size: 24, font: fontBold, color: GOLD })

  // Client info
  let y = height - 120
  page.drawText(`Client: ${inv.client_name}`, { x: 40, y, size: 11, font: fontBold, color: DARK })
  y -= 16
  if (inv.client_address) {
    page.drawText(inv.client_address, { x: 40, y, size: 10, font, color: DARK })
    y -= 16
  }

  // Invoice meta
  const metaX = width - 200
  let metaY = height - 120
  if (inv.show_facture_num && inv.invoice_num) {
    page.drawText(`N°: ${inv.invoice_num}`, { x: metaX, y: metaY, size: 10, font, color: DARK })
    metaY -= 16
  }
  page.drawText(`Date: ${inv.date}`, { x: metaX, y: metaY, size: 10, font, color: DARK })

  // Table header
  y -= 30
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: GOLD })
  page.drawText('Description', { x: 50, y: y + 4, size: 10, font: fontBold, color: rgb(1,1,1) })
  page.drawText('Qté', { x: 340, y: y + 4, size: 10, font: fontBold, color: rgb(1,1,1) })
  page.drawText('Prix U.', { x: 390, y: y + 4, size: 10, font: fontBold, color: rgb(1,1,1) })
  page.drawText('Total', { x: 490, y: y + 4, size: 10, font: fontBold, color: rgb(1,1,1) })
  y -= 22

  // Table rows
  for (const item of items) {
    if (y < 100) break
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
    page.drawText(String(item.description || ''), { x: 50, y: y + 4, size: 9, font, color: DARK })
    page.drawText(String(item.quantity || 0), { x: 340, y: y + 4, size: 9, font, color: DARK })
    page.drawText(String(item.unit_price || 0), { x: 390, y: y + 4, size: 9, font, color: DARK })
    page.drawText(String(lineTotal.toFixed(2)), { x: 490, y: y + 4, size: 9, font, color: DARK })
    y -= 18
  }

  // Totals
  y -= 10
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: GOLD })
  y -= 18
  page.drawText(`Total: ${Number(inv.total).toFixed(2)}`, { x: 400, y, size: 10, font, color: DARK })
  if (Number(inv.remise) > 0) {
    y -= 16
    page.drawText(`Remise: -${Number(inv.remise).toFixed(2)}`, { x: 400, y, size: 10, font, color: DARK })
  }
  y -= 16
  page.drawText(`Net à payer: ${Number(inv.net_total).toFixed(2)}`, { x: 400, y, size: 12, font: fontBold, color: GOLD })
  if (Number(inv.payer) > 0) {
    y -= 16
    page.drawText(`Payé: ${Number(inv.payer).toFixed(2)}`, { x: 400, y, size: 10, font, color: DARK })
    y -= 16
    const rest = Number(inv.net_total) - Number(inv.payer)
    page.drawText(`Reste: ${rest.toFixed(2)}`, { x: 400, y, size: 10, font, color: DARK })
  }

  const pdfBytes = await pdfDoc.save()
  const filename = `${inv.client_name || 'facture'}.pdf`.replace(/[<>:"/\\|?*]/g, '_')

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
})
