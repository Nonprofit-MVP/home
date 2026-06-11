import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import pg from 'pg'
import { importConversationArticles } from '@/lib/articles'

const { Client } = pg

async function ensureArticlesTable() {
  const password = process.env.SUPABASE_DB_PASSWORD
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]
  const databaseUrl =
    process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || (password && projectRef
      ? `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
      : null)

  if (!databaseUrl) return

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260610000000_articles.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

function isAuthorized(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.ARTICLES_IMPORT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!secret && auth === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureArticlesTable()
    const results = await importConversationArticles()
    return NextResponse.json(results)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
