import { copyFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'

const dataDir = process.env.DATA_DIR || process.cwd()
const dbPath = process.env.DB_PATH || join(dataDir, 'ask.sqlite')
const backupDir = resolve(process.env.BACKUP_DIR || join(process.cwd(), 'backups'))

if (!existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`)
  process.exit(1)
}

mkdirSync(backupDir, { recursive: true })
mkdirSync(dirname(join(backupDir, 'x')), { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = join(backupDir, `ask-${stamp}.sqlite`)
copyFileSync(dbPath, target)

const sizeMb = (statSync(target).size / 1024 / 1024).toFixed(2)
console.log(`Database backup written: ${target} (${sizeMb} MB)`)
