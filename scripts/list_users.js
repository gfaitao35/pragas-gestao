const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'app.db')
try {
  const db = new Database(dbPath, { readonly: true })
  const users = db.prepare('SELECT id, email, nome_completo FROM users').all()
  console.log('USERS:', users)
} catch (err) {
  console.error('Error opening DB:', err.message)
  process.exit(1)
}
