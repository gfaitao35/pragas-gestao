const crypto = require('crypto')
// Use global fetch (Node 18+)
const base64url = (s) => Buffer.from(s, 'utf-8').toString('base64url')

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production'

function sign(encoded) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex')
}

function createSessionCookie(payload) {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 60 * 60 * 24 * 7 * 1000 })
  const encoded = base64url(data)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

async function main() {
  const userId = process.argv[2]
  const contractId = process.argv[3]
  if (!userId || !contractId) {
    console.error('Usage: node call_api_with_session.js <userId> <contractId>')
    process.exit(2)
  }

  const cookie = createSessionCookie({ userId, email: 'gfaitao35@gmail.com', nome_completo: 'Guilherme Faitão', role: 'operador' })
  console.log('Cookie:', cookie)

  const res = await fetch(`http://localhost:3000/api/contratos/${contractId}`, {
    headers: { Cookie: `session=${cookie}` },
  })
  console.log('status', res.status)
  const text = await res.text()
  console.log('body', text)
}

main().catch(err => { console.error(err); process.exit(1) })