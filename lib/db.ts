import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export { sql }

// Helper: query que retorna múltiplas linhas
export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  const rows = await sql(strings, ...values)
  return rows as T[]
}

// Helper: query que retorna uma linha ou undefined
export async function queryOne<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T | undefined> {
  const rows = await sql(strings, ...values)
  return rows[0] as T | undefined
}

// Helper: query de escrita (INSERT/UPDATE/DELETE)
export async function execute(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<void> {
  await sql(strings, ...values)
}
