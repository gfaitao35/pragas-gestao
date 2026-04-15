#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const Database = require('better-sqlite3')

function usage() {
  console.log('Uso: node scripts/reset_user_password.js <email> <nova_senha>')
  process.exit(1)
}

if (process.argv.length < 4) usage()

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) usage()

const dbPath = path.join(process.cwd(), 'data', 'app.db')
if (!fs.existsSync(dbPath)) {
  console.error('Banco de dados não encontrado em', dbPath)
  process.exit(1)
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err)
      resolve(`${salt}:${derived.toString('hex')}`)
    })
  })
}

(async () => {
  try {
    const hash = await hashPassword(password)
    const db = new Database(dbPath)
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?')
    const result = stmt.run(hash, email)
    if (result.changes === 0) {
      console.error('Usuário não encontrado com email:', email)
      process.exit(2)
    }
    console.log('Senha atualizada com sucesso para', email)
    process.exit(0)
  } catch (err) {
    console.error('Erro ao atualizar senha:', err)
    process.exit(3)
  }
})()
