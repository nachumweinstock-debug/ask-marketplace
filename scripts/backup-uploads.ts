import { cpSync, existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

const dataDir = process.env.DATA_DIR || process.cwd()
const uploadsDir = process.env.UPLOADS_DIR || join(dataDir, 'uploads')
const backupDir = resolve(process.env.BACKUP_DIR || join(process.cwd(), 'backups'))

if (!existsSync(uploadsDir)) {
  console.error(`Uploads directory not found: ${uploadsDir}`)
  process.exit(1)
}

mkdirSync(backupDir, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = join(backupDir, `uploads-${stamp}`)
cpSync(uploadsDir, target, { recursive: true })

console.log(`Uploads backup written: ${target}`)
