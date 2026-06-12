import ftp from 'basic-ftp'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envFiles = ['.env.local', '.env']
  const vars = {}
  for (const file of envFiles) {
    const fullPath = resolve(__dirname, '..', file)
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
  localDir: resolve(__dirname, '..', 'dist', 'spa')
}

const missing = []
if (!config.host) missing.push('FTP_HOST')
if (!config.user) missing.push('FTP_USER')
if (!config.password) missing.push('FTP_PASSWORD')
if (missing.length > 0) {
  console.error(`❌ FTP configuration incomplete. Missing: ${missing.join(', ')}`)
  console.error('   Add them to .env or .env.local')
  process.exit(1)
}

if (!existsSync(config.localDir)) {
  console.error(`❌ Build directory not found: ${config.localDir}`)
  console.error('   Run "npm run build" first')
  process.exit(1)
}

console.log(`\n🚀 Deploying to ${config.host}:${config.port}`)
console.log(`   Local:  ${config.localDir}`)
console.log(`   Remote: ${config.remoteDir}`)
console.log('')

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

  console.log('📂 Uploading dist/spa/...')
  await client.ensureDir(config.remoteDir)
  await client.clearWorkingDir()
  await client.uploadFromDir(config.localDir)

  // Upload .htaccess per SPA routing
  const htaccessPath = resolve(__dirname, '..', '.htaccess')
  if (existsSync(htaccessPath)) {
    await client.uploadFrom(htaccessPath, '.htaccess')
    console.log('   .htaccess uploaded')
  }

  console.log(`\n✅ Deploy complete!`)
} catch (err) {
  console.error(`\n❌ Deploy failed: ${err.message}`)
  process.exit(1)
} finally {
  client.close()
}
