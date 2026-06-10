# Production Deployment Guide

## 1. Transfer Files to Server
Copy the `deploy` folder to your server:
```bash
scp -r deploy root@75.119.155.116:/root/don-fiapo-deploy
```

## 2. Connect to Server
```bash
ssh root@75.119.155.116
cd /root/don-fiapo-deploy
```

## 3. Run Setup Script
This script installs Docker and creates template .env files.
```bash
chmod +x setup.sh
./setup.sh
```

## 4. Configure Environment Variables
Edit the generated files with your real keys and addresses:
```bash
nano .env.web
nano .env.admin
nano .env.oracle
```
**CRITICAL**: ensure `CONTRACT_ADDRESS`, `ORACLE_SEED`, `ORACLE_API_KEY` and `ADMIN_API_KEY` are correct. The same `ORACLE_API_KEY` must be present in `.env.web` and `.env.oracle`; the same `ADMIN_API_KEY` must be present in `.env.web` and `.env.admin`.

## 5. Start Services
```bash
docker compose up -d
```

## 6. Setup SSL (First Time Only)
Issue certificate for `donfiapo.fun`, `www.donfiapo.fun` and `admin.donfiapo.fun`:
```bash
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d donfiapo.fun -d www.donfiapo.fun -d admin.donfiapo.fun
```
Then restart Nginx:
```bash
docker compose restart nginx
```

## 7. Initialize Databases
The web app uses Prisma migrations. The admin app currently uses Prisma `db push` because no admin migration files exist yet:
```bash
docker compose exec -T don-fiapo-web npx prisma migrate deploy
docker compose exec -T don-fiapo-admin npx prisma db push
```
