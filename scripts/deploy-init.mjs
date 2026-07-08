/**
 * deploy-init.mjs — PRIMA VOLTA SOLO.
 * Scarica la build corrente dal server FTP e la salva in releases/v0-legacy/.
 * Non modifica i file in root (il sito continua a funzionare).
 *
 * Uso: node scripts/deploy-init.mjs
 */

import ftp from 'basic-ftp'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CACHE_DIR = resolve(ROOT, '.deploy-cache')
const LEGACY_DIR = resolve(CACHE_DIR, 'v0-legacy')

function loadEnv() {
  const envFiles = ['.env.local', '.env']
  const vars = {}
  for (const file of envFiles) {
    const fullPath = resolve(ROOT, file)
    if (!existsSync(fullPath)) continue
    const content = readFileSync(fullPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  }
  return vars
}

const env = loadEnv()

const config = {
  host: env.FTP_HOST || process.env.FTP_HOST,
  port: parseInt(env.FTP_PORT || process.env.FTP_PORT || '21', 10),
  user: env.FTP_USER || process.env.FTP_USER,
  password: env.FTP_PASSWORD || process.env.FTP_PASSWORD,
  remoteDir: env.FTP_REMOTE_DIR || process.env.FTP_REMOTE_DIR || '/public_html'
}

const missing = []
if (!config.host) missing.push('FTP_HOST')
if (!config.user) missing.push('FTP_USER')
if (!config.password) missing.push('FTP_PASSWORD')
if (missing.length > 0) {
  console.error(`❌ FTP configuration incomplete. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
if (!existsSync(LEGACY_DIR)) mkdirSync(LEGACY_DIR, { recursive: true })

console.log(`\n🚀 deploy-init — salva release corrente come v0-legacy`)
console.log(`   Server: ${config.host}`)

const client = new ftp.Client()
client.ftp.verbose = true

try {
  console.log('🔌 Connecting...')
  await client.access({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    secure: 'explicit',
    secureOptions: { rejectUnauthorized: false }
  })

  // 1. Scarica la build corrente in cache locale
  console.log('⬇️ Downloading current build from server root...')
  await client.downloadToDir(LEGACY_DIR, config.remoteDir)

  // 2. Crea releases/ sul server
  console.log('📂 Creating releases/v0-legacy/ on server...')
  await client.ensureDir(`${config.remoteDir}/releases/v0-legacy`)

  // 3. Upload la build corrente come backup v0-legacy
  console.log('⬆️ Uploading backup to releases/v0-legacy/...')
  await client.uploadFromDir(LEGACY_DIR, `${config.remoteDir}/releases/v0-legacy`)

  // 4. Salva stato
  writeFileSync(resolve(CACHE_DIR, '.last-version'), 'v0-legacy')
  writeFileSync(resolve(CACHE_DIR, '.versions.json'), JSON.stringify({ releases: ['v0-legacy'], current: 'v0-legacy' }, null, 2))

  console.log(`\n✅ deploy-init completato!`)
  console.log(`   - Build corrente salvata in releases/v0-legacy/ (backup)`)
  console.log(`   - Il sito in root NON è stato modificato`)
  console.log(`   - Ora puoi eseguire "npm run release" per deployare la nuova versione`)
  console.log(`   - Per tornare a v0-legacy: node scripts/rollback.mjs v0-legacy`)
} catch (err) {
  console.error(`\n❌ deploy-init fallito: ${err.message}`)
  process.exit(1)
} finally {
  client.close()
}
