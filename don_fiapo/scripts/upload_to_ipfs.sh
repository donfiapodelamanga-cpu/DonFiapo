#!/bin/bash

# Script para upload das imagens e metadados dos NFTs para IPFS
# Requer IPFS CLI instalado e configurado

echo "🚀 Iniciando upload dos NFTs Don Fiapo para IPFS..."

# Verificar se IPFS está instalado
if ! command -v ipfs &> /dev/null; then
    echo "❌ IPFS CLI não encontrado. Instale primeiro: https://docs.ipfs.io/install/"
    exit 1
fi

# Verificar se o daemon IPFS está rodando
if ! ipfs swarm peers &> /dev/null; then
    echo "❌ IPFS daemon não está rodando. Execute: ipfs daemon"
    exit 1
fi

echo "✅ IPFS está configurado e rodando"

# Diretórios
NFT_DIR="../NFTs"
METADATA_DIR="../metadata"
OUTPUT_FILE="ipfs_hashes.txt"

# Limpar arquivo de output anterior
> $OUTPUT_FILE

echo "📁 Fazendo upload das imagens..."

# Upload das imagens dos NFTs
echo "=== HASHES DAS IMAGENS ===" >> $OUTPUT_FILE

# Array com os nomes dos arquivos de imagem
declare -a images=(
    "The Shovel of the Commoner Miner-01.png"
    "The Pickaxe of the Royal Guard-02.png"
    "The Candelabrum of the Explorer-03.png"
    "The power to unlock the kingdom's wealth-04.png"
    "The Royal Treasure Map-05.png"
    "The Golden Mango Eye-06.png"
    "The Royal Scepter of Don Himself-07.png"
)

# Array com os tipos correspondentes
declare -a types=(
    "Free"
    "Tier2"
    "Tier3"
    "Tier4"
    "Tier5"
    "Tier6"
    "Tier7"
)

# Upload de cada imagem
for i in "${!images[@]}"; do
    image="${images[$i]}"
    type="${types[$i]}"
    
    if [ -f "$NFT_DIR/$image" ]; then
        echo "📸 Uploading $image..."
        hash=$(ipfs add -Q "$NFT_DIR/$image")
        echo "$type: $hash" >> $OUTPUT_FILE
        echo "✅ $type: $hash"
    else
        echo "❌ Arquivo não encontrado: $NFT_DIR/$image"
    fi
done

echo "" >> $OUTPUT_FILE
echo "=== HASHES DOS METADADOS ===" >> $OUTPUT_FILE

echo "📄 Fazendo upload dos metadados..."

# Upload dos metadados
declare -a metadata_files=(
    "nft_metadata_free.json"
    "nft_metadata_tier2.json"
    "nft_metadata_tier3.json"
    "nft_metadata_tier4.json"
    "nft_metadata_tier5.json"
    "nft_metadata_tier6.json"
    "nft_metadata_tier7.json"
)

for i in "${!metadata_files[@]}"; do
    metadata="${metadata_files[$i]}"
    type="${types[$i]}"
    
    if [ -f "$METADATA_DIR/$metadata" ]; then
        echo "📋 Uploading $metadata..."
        hash=$(ipfs add -Q "$METADATA_DIR/$metadata")
        echo "$type: $hash" >> $OUTPUT_FILE
        echo "✅ $type: $hash"
    else
        echo "❌ Arquivo não encontrado: $METADATA_DIR/$metadata"
    fi
done

echo "" >> $OUTPUT_FILE
echo "=== HASH DA COLEÇÃO ===" >> $OUTPUT_FILE

# Upload dos metadados da coleção
if [ -f "$METADATA_DIR/collection_metadata.json" ]; then
    echo "📚 Uploading collection metadata..."
    collection_hash=$(ipfs add -Q "$METADATA_DIR/collection_metadata.json")
    echo "Collection: $collection_hash" >> $OUTPUT_FILE
    echo "✅ Collection: $collection_hash"
fi

echo "" >> $OUTPUT_FILE
echo "=== INSTRUÇÕES DE ATUALIZAÇÃO ===" >> $OUTPUT_FILE
echo "1. Copie os hashes acima" >> $OUTPUT_FILE
echo "2. Atualize o arquivo src/ico.rs na função initialize_ipfs_configs()" >> $OUTPUT_FILE
echo "3. Substitua os placeholders pelos hashes reais" >> $OUTPUT_FILE
echo "4. Teste as URLs: https://ipfs.io/ipfs/[HASH]" >> $OUTPUT_FILE

echo "" 
echo "🎉 Upload concluído! Verifique o arquivo $OUTPUT_FILE para os hashes."
echo "📝 Não esqueça de atualizar os hashes no código Rust!"
echo "🔗 Teste as URLs: https://ipfs.io/ipfs/[HASH]"