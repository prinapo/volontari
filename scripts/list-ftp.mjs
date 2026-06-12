import ftp from 'basic-ftp'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const vars = {}
  for (const file of ['.env.local', '.env']) {
    const path = resolve(__dirname, '..', file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      vars[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
  return vars
}

const env = loadEnv()
const client = new ftp.Client()
client.ftp.verbose = false

try {
  await client.access({
    host: env.FTP_HOST,
    port: parseInt(env.FTP_PORT || '21'),
    user: env.FTP_USER,
    password: env.FTP_PASSWORD,
    secure: 'explicit',
    secureOptions: { rejectUnauthorized: false }
  })
  const pwd = await client.pwd()
  console.log('PWD:', pwd)
  console.log('\n=== FTP ROOT LISTING ===')
  const items = await client.list()
  items.forEach(f => {
    const type = f.isDirectory ? 'DIR ' : 'FILE'
    const date = f.modifiedAt ? f.modifiedAt.toISOString().slice(0, 19).replace('T', ' ') : ''
    console.log(type + '  ' + f.name.padEnd(50) + String(f.size).padStart(8) + '  ' + date)
  })
  console.log('\nTotal:', items.length, 'items')
  client.close()
} catch (e) {
  console.error('Error:', e.message)
  process.exit(1)
}
