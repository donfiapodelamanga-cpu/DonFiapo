#!/bin/bash

# ==============================================================================
# Wallet Generation Script for Don Fiapo
# ==============================================================================
# Gera carteiras seguras para Team, Marketing, Charity e Treasury
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Don Fiapo - Gerador de Carteiras de Distribuição   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se subkey está instalado
if ! command -v subkey &> /dev/null; then
    echo -e "${RED}❌ 'subkey' não encontrado!${NC}"
    echo -e "   Instale com: cargo install --force subkey"
    exit 1
fi

# Arquivo de output
OUTPUT_FILE="wallets_$(date +%Y%m%d_%H%M%S).txt"
echo -e "${YELLOW}📄 Salvando carteiras em: $OUTPUT_FILE${NC}\n"

# Função para gerar carteira
generate_wallet() {
    local WALLET_NAME=$1
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🔑 Gerando: $WALLET_NAME${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Gerar carteira
    WALLET_OUTPUT=$(subkey generate --scheme Sr25519 --network substrate)
    
    # Extrair informações
    SECRET_PHRASE=$(echo "$WALLET_OUTPUT" | grep "Secret phrase" | sed 's/.*`\(.*\)`.*/\1/')
    PUBLIC_KEY=$(echo "$WALLET_OUTPUT" | grep "Public key" | awk '{print $4}')
    ACCOUNT_ID=$(echo "$WALLET_OUTPUT" | grep "Account ID" | awk '{print $4}')
    SS58_ADDRESS=$(echo "$WALLET_OUTPUT" | grep "SS58 Address" | awk '{print $4}')
    
    # Salvar no arquivo
    {
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "  $WALLET_NAME"
        echo "═══════════════════════════════════════════════════════════"
        echo "Secret Phrase: $SECRET_PHRASE"
        echo "Public Key:    $PUBLIC_KEY"
        echo "Account ID:    $ACCOUNT_ID"
        echo "SS58 Address:  $SS58_ADDRESS"
        echo "═══════════════════════════════════════════════════════════"
    } >> "$OUTPUT_FILE"
    
    # Mostrar no terminal (sem mostrar a seed completa por segurança)
    echo -e "Secret Phrase: ${YELLOW}$(echo $SECRET_PHRASE | cut -d' ' -f1-3)...${NC} ${RED}(ver arquivo)${NC}"
    echo -e "SS58 Address:  ${GREEN}$SS58_ADDRESS${NC}"
    echo ""
}

# Header do arquivo
{
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║        Don Fiapo - Carteiras de Distribuição         ║"
    echo "║                  $(date +'%Y-%m-%d %H:%M:%S')                  ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "⚠️  ATENÇÃO: Este arquivo contém informações EXTREMAMENTE SENSÍVEIS!"
    echo "    - NUNCA compartilhe este arquivo"
    echo "    - Salve em local SEGURO (hardware wallet, cofre, etc)"
    echo "    - Faça BACKUP em local SEPARADO"
    echo "    - Considere DELETAR após salvar as seeds offline"
    echo ""
} > "$OUTPUT_FILE"

# Gerar carteiras
generate_wallet "TEAM WALLET"
generate_wallet "MARKETING WALLET"
generate_wallet "CHARITY WALLET"
generate_wallet "TREASURY WALLET"

# Footer do arquivo
{
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  Próximos Passos"
    echo "═══════════════════════════════════════════════════════════"
    echo "1. SALVE este arquivo em local SEGURO (offline)"
    echo "2. Copie os ENDEREÇOS para o .env (NÃO as seeds!)"
    echo "3. TESTE as carteiras no testnet primeiro"
    echo "4. VERIFIQUE os endereços antes de transferir fundos"
    echo "5. Considere usar HARDWARE WALLET para produção"
    echo "═══════════════════════════════════════════════════════════"
} >> "$OUTPUT_FILE"

echo -e "${GREEN}✅ Carteiras geradas com sucesso!${NC}"
echo -e "${YELLOW}📄 Arquivo salvo: $OUTPUT_FILE${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo -e "   1. Salve este arquivo em local SEGURO"
echo -e "   2. Copie apenas os ENDEREÇOS para o .env"
echo -e "   3. NUNCA commite o arquivo de wallets no git"
echo -e "   4. Considere deletar após salvar offline"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Próximo passo: bash scripts/update_env_addresses.sh${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
