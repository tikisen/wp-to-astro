# Formbricks Restore Runbook

## When to use
- Primary instance (forms.goodbusiness.us on OVH VPS) is down and Cloudflare failover to backup is active
- OR both instances are down and you need to restore from backup

## Backup location
Daily Postgres dumps: Cloudflare R2 bucket `formbricks-backups/`
Filename format: `formbricks-YYYY-MM-DD.sql.gz`

## Restore steps

### 1. Download latest backup
```bash
# Using wrangler R2
wrangler r2 object get formbricks-backups/formbricks-$(date +%Y-%m-%d).sql.gz --file backup.sql.gz
gunzip backup.sql.gz
```

### 2. Restore to Postgres
```bash
# On OVH VPS (or new server)
psql $DATABASE_URL < backup.sql
```

### 3. Restart Formbricks
```bash
docker compose -f /opt/formbricks/docker-compose.yml restart
```

### 4. Verify
- Open https://forms.goodbusiness.us/auth/sign-in
- Check that forms and submissions are present

### 5. Update Cloudflare failover
If restoring to a new server, update Cloudflare Load Balancer origin IP.

## Backup schedule
Cron on OVH VPS: `0 3 * * * pg_dump $DATABASE_URL | gzip | wrangler r2 object put formbricks-backups/formbricks-$(date +\%Y-\%m-\%d).sql.gz --pipe`
