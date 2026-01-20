# Relatório De-Para: Documentação vs. Execução Real

## 1. Visão Geral
Este documento compara as instruções presentes no `README.md` original com os passos reais necessários para executar o projeto localmente, destacando discrepâncias, correções de segurança aplicadas e melhorias implementadas (redundância).

## 2. Redundância na Rede Lunes
**Status:** Implementado 🟢
- **Requisito:** O cliente questionou sobre a falta de redundância na conexão com a rede Lunes.
- **Análise:**
    - **Frontend:** Já possuía redundância (array de endpoints com rotação).
    - **Backend (Oracle):** Não possuía redundância (conectava a apenas um nó).
- **Ação Tomada:** O serviço `oracle-service` foi atualizado para aceitar múltiplas URLs de RPC separadas por vírgula na variável de ambiente `LUNES_RPC_URL`.
- **Configuração Atualizada:** `LUNES_RPC_URL=wss://ws.lunes.io,wss://ws-backup.lunes.io`

## 3. Vulnerabilidades e Segurança
**Status:** Corrigido 🟢
- **Problema:** Múltiplas vulnerabilidades críticas e de alta severidade foram detectadas durante a instalação (`npm install`).
- **Ações Tomadas:**
    - Atualização do `next` para versão 16.1.1 (correção de RCE).
    - Atualização de `@solana/web3.js` e `@solana/spl-token` para versões mais recentes.
    - Correção de conflitos de dependência (`peerDependencies`) com React 19.

## 4. Comparativo de Execução (De-Para)

| Passo | Instrução no README | Execução Real / Necessária | Status |
| :--- | :--- | :--- | :--- |
| **1. Instalação Oracle** | `cd oracle-service && npm install` | `cd oracle-service && npm install` (necessitou ajustes de `peerDependencies` e vulnerabilidades) | ⚠️ Ajustado |
| **2. Configuração Oracle** | `cp .env.example .env` | `cp .env.example .env` (Adicionado suporte a múltiplas URLs em `LUNES_RPC_URL`) | 🟢 Atualizado |
| **3. Execução Oracle (Dev)** | `npm run dev` | `npm run dev` (Porta 3000 estava em conflito, recomendado checar portas ou usar `.env` para alterar para 3001 se necessário) | ⚠️ Observação |
| **4. Instalação Web** | `cd don-fiapo-web && npm install` | `cd don-fiapo-web && npm install` (Vulnerabilidades críticas corrigidas, requer Node > 20) | ⚠️ Ajustado |
| **5. Execução Web** | `npm run dev` | `npm run dev` (Funciona, mas atentar para conflito de porta se Oracle já estiver na 3000. Web geralmente roda na 3000 por padrão do Next.js) | ⚠️ Atenção |
| **6. Deploy Contrato** | `sh scripts/deploy.sh` | O script requer `cargo-contract` instalado e Rust atualizado. Executado com sucesso na verificação. | 🟢 OK |

## 5. Arquivos Modificados
As seguintes alterações foram feitas no código para suportar as melhorias e correções:

1.  `oracle-service/src/index.ts`: Atualizado para processar `LUNES_RPC_URL` como lista e passar array para o cliente.
2.  `oracle-service/src/lunes-contract.ts`: Atualizado para aceitar `string[]` no construtor e usar redundância nativa do Polkadot JS.
3.  `oracle-service/src/verify-watcher.ts`: Correção de tipagem nos testes unitários.
4.  `oracle-service/README.md`: Documentação atualizada sobre a nova configuração de redundância.
5.  `package.json` (Web e Oracle): Atualização de dependências para correção de vulnerabilidades.

## 6. Recomendações
- **Portas:** O `README` sugere que o Oracle rode na porta 3000, mas o Next.js (Web) também usa a 3000 por padrão. Recomenda-se alterar a porta padrão do Oracle para **3001** no `.env.example` para evitar conflitos ao rodar ambos localmente.
- **Node Version:** Assegurar que o ambiente de desenvolvimento utilize Node.js v20+ devido às atualizações do Next.js.
