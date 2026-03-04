# 🕵️ Relatório de Análise Crítica e Depara: Regras de Negócio vs Implementação

**Data**: 22 de Janeiro de 2026
**Autores**: "The Council of 5" (AI Agents: Security, Core Dev, Product, QA, Architecture)
**Contexto**: Análise solicitada da integridade entre `don_fiapo/archive/docs` e `don_fiapo/contracts`.

---

## 🚨 Resumo Executivo

Apesar da documentação afirmar "100% Implementado" e "Verificado", nossa análise profunda do código fonte revelou **discrepâncias críticas** entre as regras de negócio documentadas e a realidade on-chain, especificamente nos fluxos financeiros de Governança e Staking.

**Status Real**:
- **Tokenomics/Core**: ✅ Sólido (Taxas de transação implementadas).
- **Affiliate system**: ✅ Sólido (Correções recentes aplicadas).
- **Staking**: ⚠️ Parcial (Cálculo de taxa existe, mas **cobrança não é efetuada**).
- **Governance**: ❌ Crítico (Não implementa cobrança nem distribuição de taxas, apenas lógica de voto).

---

## 📊 Depara: Documentação vs Código

| Módulo | Regra de Negócio (Doc) | Estado no Código (`/contracts`) | Veredito |
| :--- | :--- | :--- | :--- |
| **Core** | Taxa de 0.6% em transferências: 30% Burn, 50% Staking, 20% Rewards. | `transfer_with_fee` implementa exatamente essa lógica, atualizando saldos das carteiras de destino. | ✅ **Conforme** |
| **Staking** | Taxa de entrada escalonada (10% a 0.5%) dependendo do volume. | O método `calculate_entry_fee` existe, mas no momento do `stake`, o valor integral é creditado ao usuário. **A taxa não é descontada.** | ❌ **Falha de Receita** |
| **Staking** | Integração com Afiliados (Boost de APY + Activity). | Implementada recentemente via `update_referral_activity` e `calculate_apy_boost`. | ✅ **Conforme** (Novo) |
| **Governance** | Taxas sobre Propostas e Votos distribuídas para Staking (70%), Rewards (20%), Team (10%). | O contrato `governance` **não possui lógica de pagamento** (`payable`) em `create_proposal` ou `vote`. Não há lógica de distribuição. | ❌ **Ausente** |
| **Governance** | Peso de voto 3x para Governadores. | Struct `WeightedVote` existe e define peso 1. Não há lógica dinâmica de 3x no código atual. | ⚠️ **Parcial** |
| **Rewards** | Ranking Mensal com distribuição automática. | Existe `execute_monthly_ranking` que distribui, mas depende de input off-chain (`eligible_wallets`) do owner. | ⚠️ **Semi-Centralizado** |

---

## 💬 Discussão do Conselho (Council of 5)

### 1. 🛡️ Security Expert (Cybersec)
> "O maior risco identificado não é um exploit de hacker, mas um **exploit econômico nativo**. Como o contrato de Governança não cobra taxas, ele permite spam infinito de propostas e votos, o que pode paralisar o DAO ou inflar artificialmente métricas de atividade sem custo. Além disso, o Staking não cobrar a taxa de entrada significa que o protocolo perde ~5-10% de receita prevista em cada depósito."

### 2. 🏗️ Blockchain Architect (Core Dev)
> "A decisão de fazer o `Core` distribuir taxas via atualização de saldo (`balance`) é eficiente em gas, mas cria um estado de 'cegueira' nos contratos receptores (`Staking`, `Rewards`). Eles recebem o dinheiro mas não são notificados. Para o Staking isso é 'ok' (aumenta o backing do yield), mas para Rewards, se quisermos distribuir automaticamente, precisaríamos de um gatilho. O modelo atual exige um 'poke' manual ou script off-chain para reconhecer esses fundos."

### 3. 👔 Product Owner (Business)
> "A discrepância no Staking Entry Fee é inaceitável para o lançamento. Estamos prometendo um mecanismo deflacionário/sustentável que na prática não está ligado. O Governança gratuito muda completamente a dinâmica de poder. Se não corrigirmos, os documentos são propaganda enganosa."

### 4. ⚡ Performance Engineer
> "A integração Staking-Affiliate que fizemos hoje é otimizada (view call para boost). No entanto, o Ranking de Rewards depender de input off-chain (`eligible_wallets`) é a única solução viável para não estourar o Gas Limit do Polkadot processando 1000 carteiras on-chain. Mantenham assim."

### 5. 🧪 QA Lead
> "Os testes unitários existentes provavelmente testam `calculate_entry_fee` isoladamente, dando falso positivo de que a feature funciona. Precisamos de testes de integração (`stake` -> verificação de saldo da posição) para pegar esses erros lógicos."

---

## 🛠️ Plano de Ação Recomendado

### Imediato (P0 - Antes de Produção)
1.  **Corrigir Staking**: Alterar `stake_internal` para deduzir a `fee_result.fiapo_amount` (se aplicável) ou calcular a taxa em FIAPO e deduzir do `amount` antes de criar a `Position`.
2.  **Enviar Taxa de Staking**: A taxa deduzida deve ser enviada para o contrato `Rewards` ou `BurnWallet`.

### Médio Prazo (P1)
1.  **Refatorar Governança**:
    *   Tornar mensagens `payable` (aceitar token nativo ou PSP22 transfer).
    *   Implementar `distribute_fees`.
    *   Este é um trabalho maior e requer migração de contrato.

### Aceite de Risco
*   Se o lançamento for iminente, pode-se lançar o Governance "Grátis" como uma feature promocional ("Governança sem taxas no início!"), mas o **Staking Entry Fee** deve ser corrigido para evitar prejuízo econômico.

---

**Assinado**,
*Antigravity Agentic Team*
