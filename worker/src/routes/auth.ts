import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { SignJWT } from 'jose'
import { Env } from '../index'
import { getDb } from '../db'
import { requireAuth } from '../middleware'

export const authRoutes = new Hono<{ Bindings: Env }>()

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'Username and password required' }, 400)

  const sql = getDb(c.env.DATABASE_URL)
  const users = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`
  if (!users.length) return c.json({ error: 'Invalid credentials' }, 401)

  const user = users[0]

  // Verify bcrypt password (werkzeug pbkdf2 format: method$salt$hash)
  const isValid = await verifyWerkzeugHash(password, user.password_hash as string)
  if (!isValid) return c.json({ error: 'Invalid credentials' }, 401)

  const secret = new TextEncoder().encode(c.env.JWT_SECRET)
  const token = await new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      show_decimals: user.show_decimals,
      show_daily_totals: user.show_daily_totals,
    }
  })
})

// POST /api/auth/logout
authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' })
  return c.json({ ok: true })
})

// GET /api/auth/me
authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT id, username, show_decimals, show_daily_totals FROM users WHERE id = ${user.id}`
  if (!rows.length) return c.json({ error: 'User not found' }, 404)
  return c.json({ user: rows[0] })
})

// PUT /api/auth/password
authRoutes.put('/password', requireAuth, async (c) => {
  const user = c.get('user')
  const { current_password, new_password } = await c.req.json()

  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`
  if (!rows.length) return c.json({ error: 'User not found' }, 404)

  const valid = await verifyWerkzeugHash(current_password, rows[0].password_hash as string)
  if (!valid) return c.json({ error: 'Current password incorrect' }, 400)

  const newHash = await hashPassword(new_password)
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`
  return c.json({ ok: true })
})

// --- Werkzeug pbkdf2 hash compatibility ---
async function verifyWerkzeugHash(password: string, storedHash: string): Promise<boolean> {
  // Werkzeug format: pbkdf2:sha256:iterations$salt$hash
  const parts = storedHash.split('$')
  if (parts.length !== 3) return false
  const [methodPart, salt, hashHex] = parts
  const methodParts = methodPart.split(':')
  if (methodParts[0] !== 'pbkdf2') return false
  const hashAlgo = methodParts[1] || 'sha256'
  const iterations = parseInt(methodParts[2] || '260000', 10)

  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: hashAlgo.toUpperCase().replace('SHA', 'SHA-') },
    keyMaterial,
    256
  )
  const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('')
  return derivedHex === hashHex
}

async function hashPassword(password: string): Promise<string> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')
  const iterations = 260000
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:sha256:${iterations}$${salt}$${hashHex}`
}
