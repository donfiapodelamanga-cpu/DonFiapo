#!/bin/bash
SERVER="root@75.119.155.116"
DIR="/root/don-fiapo-app"
KEY="/Users/lucas/.ssh/id_ed25519_donfiapo"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔌 Conectando a $SERVER usando a chave $KEY...${NC}"

# Criar script temporário para rodar DENTRO do servidor
cat > .remote_exec_script.sh << 'EOF'
set -e
cd /root/don-fiapo-app

echo "--> Revertendo schema.prisma (removendo url se existir)..."
docker compose exec -T -u root don-fiapo-web sh -c 'sed -i "/url *= *env/d" prisma/schema.prisma'
# Garante que provider é sqlite
docker compose exec -T -u root don-fiapo-web sh -c 'sed -i "s/provider *=.*/provider = \"sqlite\"/" prisma/schema.prisma'

echo "--> Criando prisma.config.ts..."
docker compose exec -T -u root don-fiapo-web sh -c 'cat > prisma.config.ts <<CONF
import { defineConfig } from "@prisma/config";
export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./dev.db"
    }
  }
});
CONF'

echo "--> Instalando dependências (ignoring scripts & legacy peer deps)..."
# Adiciona --no-audit e --no-fund para agilizar
docker compose exec -T -u root don-fiapo-web npm install -D tsx @prisma/config --ignore-scripts --legacy-peer-deps --no-audit --no-fund

echo "--> Gerando Prisma Client..."
docker compose exec -T -u root don-fiapo-web npx prisma generate

echo "--> Aplicando migrações..."
docker compose exec -T -u root don-fiapo-web npx prisma migrate deploy

echo "--> Rodando Seed 1: Missões..."
# Usamos o cross-env para garantir que o DATABASE_URL seja passado explicitamente se necessário,
# mas o prisma.config.ts deve lidar com isso.
docker compose exec -T -u root don-fiapo-web npx tsx prisma/seed-missions.ts

echo "--> Rodando Seed 2: Referral..."
docker compose exec -T -u root don-fiapo-web npx tsx prisma/seed-referral-missions.ts

echo "--> Rodando Seed 3: Conteúdo..."
docker compose exec -T -u root don-fiapo-web npx tsx prisma/seed-content-missions.ts
EOF

# Enviar script para o servidor
scp -i "$KEY" -o StrictHostKeyChecking=no .remote_exec_script.sh $SERVER:/tmp/seed_script.sh

# Executar script no servidor
ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=no -t $SERVER "bash /tmp/seed_script.sh"

# Limpeza local
rm .remote_exec_script.sh

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ SUCESSO! O banco foi populado.${NC}"
  echo "Acesse https://donfiapo.fun/en/airdrop para conferir."
else
  echo -e "${RED}❌ Ocorreu um erro. Verifique os logs.${NC}"
  exit 1
fi
