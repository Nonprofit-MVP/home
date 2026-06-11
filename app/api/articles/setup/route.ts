import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import pg from 'pg'
import { importConversationArticles } from '@/lib/articles'

const { Client } = pg

function getDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const password = process.env.SUPABASE_DB_PASSWORD
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]

  if (password && projectRef) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
  }

  return null
}

function isAuthorized(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.ARTICLES_IMPORT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!secret && auth === `Bearer ${secret}`
}

async function runMigration() {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    return {
      ok: false,
      message:
        'Set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in env, then run npm run articles:setup',
    }
  }

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260610000000_articles.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  await client.connect()
  try {
    await client.query(sql)
    return { ok: true, message: 'Articles table migrated' }
  } finally {
    await client.end()
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const migration = await runMigration()
    const importResults = await importConversationArticles()

    return NextResponse.json({
      migration,
      import: importResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
