import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

dotenv.config({ path: path.join(root, '.env') })
dotenv.config({ path: path.join(root, '.env.local') })

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

async function runMigration() {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error(
      'Missing database connection. Add one of these to .env:\n' +
        '  SUPABASE_DB_PASSWORD=...   (your Supabase database password — Dashboard → Settings → Database)\n' +
        '  SUPABASE_DB_URL=postgresql://...\n' +
        '  DATABASE_URL=postgresql://...'
    )
  }

  const sqlPath = path.join(root, 'supabase/migrations/20260712000000_agent.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  await client.connect()
  try {
    await client.query(sql)
    console.log('Migration applied: agent_conversations + agent_messages ready')
  } finally {
    await client.end()
  }
}

runMigration().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
