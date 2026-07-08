/**
 * rollback.mjs — Torna a una versione precedente.
 * Scarica i file da releases/{target}/ e li carica in root (sovrascrive).
 * La release target deve esistere già in releases/{target}/ sul server.
 *
 * Uso: node scripts/rollback.mjs v0-legacy
 *      node scripts/rollback.mjs v3.1.1
 */

import ftp from 'basic-ftp'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const target = process.argv[2]
if (!target) {
  console.error('❌ Specifica la versione target, es: node scripts/rollback.mjs v0-legacy')
  console.error('   Release disponibili: guarda in .deploy-cache/versions.json o sul server')
  process.exit(1)
}

const RELEASE_DIR = `releases/${target}`

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

console.log(`\n🔄 Rollback a ${target} → ${config.host}`)

const CACHE_DIR = resolve(ROOT, '.deploy-cache')
const ROLLBACK_CACHE = resolve(CACHE_DIR, `rollback-${target}`)

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

  // Verifica che la release target esista
  try {
    await client.ensureDir(`${config.remoteDir}/${RELEASE_DIR}`)
  } catch {
    console.error(`❌ Release ${target} non trovata sul server in ${config.remoteDir}/${RELEASE_DIR}/`)
    process.exit(1)
  }

  // 1. Scarica i file della release target in cache locale
  if (!existsSync(ROLLBACK_CACHE)) mkdirSync(ROLLBACK_CACHE, { recursive: true })
  console.log(`⬇️ Downloading ${RELEASE_DIR}/...`)
  await client.downloadToDir(ROLLBACK_CACHE, `${config.remoteDir}/${RELEASE_DIR}`)

  // 2. Upload in root (sovrascrive)
  console.log('⬆️ Uploading to root...')
  await client.uploadFromDir(ROLLBACK_CACHE, config.remoteDir)

  // 3. Salva stato
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(resolve(CACHE_DIR, 'last-version'), target)

  console.log(`\n✅ Rollback a ${target} completato!`)
  console.log(`   File copiati da ${RELEASE_DIR}/ a root`)
} catch (err) {
  console.error(`\n❌ Rollback fallito: ${err.message}`)
  process.exit(1)
} finally {
  client.close()
}
