import ftp from 'basic-ftp'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

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
  host: env.FTP_HOST,
  port: parseInt(env.FTP_PORT || '21', 10),
  user: env.FTP_USER,
  password: env.FTP_PASSWORD
}

async function main() {
  const client = new ftp.Client()
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: 'explicit',
      secureOptions: { rejectUnauthorized: false }
    })

    // Upload .htaccess with cache-control to force no-cache
    const htaccessContent = '<IfModule mod_headers.c>\n  Header set Cache-Control "no-cache, must-revalidate"\n  Header set Pragma "no-cache"\n</IfModule>\n<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresDefault "access"\n</IfModule>\n'
    await client.uploadFrom(Readable.from([htaccessContent]), '.htaccess')
    console.log('.htaccess uploaded — cache bypass enabled')

    // Re-upload index.html to update mtime
    const indexPath = resolve(__dirname, '..', 'dist', 'spa', 'index.html')
    await client.uploadFrom(indexPath, 'index.html')
    console.log('index.html re-uploaded')

    console.log('\nCache purged. Try Ctrl+F5 on the site now.')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    client.close()
  }
}

main()
