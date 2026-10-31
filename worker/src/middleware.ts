import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { jwtVerify } from 'jose'
import { Env } from './index'

export type AuthUser = {
  id: number
  username: string
}

// Extend Hono variables
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    c.set('user', { id: Number(payload.sub), username: String(payload.username) })
    return await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}
