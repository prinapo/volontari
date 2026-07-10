/**
 * deploy-ftp.mjs — Deploy per nginx.
 * Carica la build in root (sito live) e in releases/{version}/ (backup).
 * Le release precedenti NON vengono cancellate.
 *
 * Uso: npm run release (build + deploy)
 *      node scripts/deploy-ftp.mjs (solo deploy, build già fatto)
 */

import ftp from 'basic-ftp'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isatty } from 'tty'
import { createInterface } from 'readline'

// Sicurezza: deploy solo da terminale interattivo (--yes bypassa per deploy remoti autorizzati)
const isRemoteDeploy = process.argv.includes('--yes')
if (!isatty(process.stdin.fd) && !isRemoteDeploy) {
  console.error('❌ Deploy annullato: eseguire direttamente da terminale, non via pipe/script.')
  console.error('   Usa: node scripts/deploy-ftp.mjs')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const VERSION = pkg.version
const RELEASE_DIR = `releases/v${VERSION}`

// Blocco: il tag esiste già su un commit diverso? Versione non bumpata.
try {
  const tagCommit = execSync(`git rev-list -n 1 'v${VERSION}' 2>/dev/null || true`, { encoding: 'utf-8', cwd: ROOT }).trim()
  const headCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8', cwd: ROOT }).trim()
  if (tagCommit && tagCommit !== headCommit) {
    console.error(`❌ Il tag v${VERSION} esiste già su un commit diverso. Bumpa la versione in package.json.`)
    process.exit(1)
  }
} catch {
  // git non disponibile — skip check
}

// Conferma interattiva
let answer = ''
if (isRemoteDeploy) {
  console.log(`\n⚠️  Per deployare v${VERSION} in PRODUZIONE, l'utente deve confermare.`)
  console.log('   Rispondi "y" qui nel terminale quando sei pronto.')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  answer = await new Promise(resolve => rl.question('   Confermi? (y/N) ', resolve))
  rl.close()
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  answer = await new Promise(resolve => rl.question(`⚠️  Sei sicuro di voler deployare v${VERSION} in PRODUZIONE? (y/N) `, resolve))
  rl.close()
}
if (answer.toLowerCase() !== 'y') {
  console.log('❌ Deploy annullato.')
  process.exit(0)
}

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
  remoteDir: env.FTP_REMOTE_DIR || process.env.FTP_REMOTE_DIR || '/public_html',
  localDir: resolve(ROOT, 'dist', 'spa')
}

const missing = []
if (!config.host) missing.push('FTP_HOST')
if (!config.user) missing.push('FTP_USER')
if (!config.password) missing.push('FTP_PASSWORD')
if (missing.length > 0) {
  console.error(`❌ FTP configuration incomplete. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

if (!existsSync(config.localDir)) {
  console.error(`❌ Build directory not found: ${config.localDir}`)
  console.error('   Run "npm run build" first')
  process.exit(1)
}

console.log(`\n🚀 Deploy v${VERSION} → ${config.host}`)
console.log(`   Local:  ${config.localDir}`)
console.log(`   Remote: ${config.remoteDir}/ (root) + ${config.remoteDir}/${RELEASE_DIR}/ (backup)`)

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

  // 1. Upload build in root (live)
  console.log('⬆️ Uploading build to root...')
  await client.uploadFromDir(config.localDir, config.remoteDir)

  // 2. Crea directory della release
  console.log(`📂 Creating ${RELEASE_DIR}/...`)
  await client.ensureDir(`${config.remoteDir}/${RELEASE_DIR}`)

  // 3. Upload build in releases/{version} (backup)
  console.log(`⬆️ Uploading build to ${RELEASE_DIR}/...`)
  await client.uploadFromDir(config.localDir, `${config.remoteDir}/${RELEASE_DIR}`)

  // 4. Salva stato localmente
  const stateDir = resolve(ROOT, '.deploy-cache')
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true })
  }
  writeFileSync(resolve(stateDir, 'last-version'), `v${VERSION}`)

  console.log(`\n✅ Deploy v${VERSION} completato!`)
  console.log(`   Build caricata in root (sito live)`)
  console.log(`   Backup salvato in ${config.remoteDir}/${RELEASE_DIR}/`)
  console.log(`   Releases precedenti non sono state cancellate.`)
  console.log(`   Per rollback: node scripts/rollback.mjs v{version}`)
} catch (err) {
  console.error(`\n❌ Deploy fallito: ${err.message}`)
  process.exit(1)
} finally {
  client.close()
}
