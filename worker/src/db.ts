import { neon } from '@neondatabase/serverless'

export function getDb(databaseUrl: string) {
  const sql = neon(databaseUrl)
  return sql
}

export type NeonSql = ReturnType<typeof neon>
