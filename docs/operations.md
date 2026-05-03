# Ask Marketplace Operations

## Backups

Run `node scripts/backup-db.ts` with `DATA_DIR` pointing at the Railway volume to copy the SQLite database into `BACKUP_DIR`.

Run `node scripts/backup-uploads.ts` with `DATA_DIR` pointing at the Railway volume to copy uploaded profile, listing, and portfolio media.

## Health Check

The API health endpoint is `/api/health`. It checks database access, upload storage read/write access, required environment variables, optional integrations, and API uptime.

## Rollback Notes

Vercel frontend rollbacks should use the Vercel deployment history. Railway backend rollbacks should use Railway deployment history after confirming `/api/health` on the target deployment.
