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
nano .env.oracle
```
**CRITICAL**: ensure `CONTRACT_ADDRESS` and `ORACLE_SEED` are correct.

## 5. Start Services
```bash
docker compose up -d
```

## 6. Setup SSL (First Time Only)
Issue certificate for `donfiapo.com`:
```bash
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d donfiapo.com -d www.donfiapo.com
```
Then restart Nginx:
```bash
docker compose restart nginx
```
