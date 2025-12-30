Com base nos documentos fornecidos, incluindo o mapa mental, as regras de staking e as descrições do projeto, foi elaborado o seguinte documento de requisitos para o desenvolvimento do Mamecoin Don Fiapo na rede Lunes utilizando Ink! 4.3.0.

---

### **Documento de Requisitos de Desenvolvimento: Mamecoin Don Fiapo**

**Versão:** 1.0
**Data:** 23 de julho de 2025
**Projeto:** Don Fiapo ($FIAPO)
**Rede Alvo:** Lunes
**Linguagem do Contrato Inteligente:** Ink! 4.3.0

---

#### **1. Visão Geral e Arquitetura**

O objetivo é criar um ecossistema de memecoin gamificado, centrado no token **$FIAPO**. O sistema incluirá múltiplos mecanismos de staking, um sistema de queima de tokens para aumentar o valor, taxas estratégicas para sustentar o ecossistema e um robusto programa de recompensas para incentivar a participação ativa da comunidade.

A arquitetura deverá suportar o pagamento de taxas em **LUSDT (rede Lunes)** e **USDT (rede Solana)**, exigindo uma solução de ponte para verificar pagamentos na rede Solana e acionar funções no contrato da Lunes.

#### **2. Tokenomics do $FIAPO**

As seguintes especificações, baseadas no mapa mental, devem ser implementadas:

*   **Nome do Token:** Don Fiapo
*   **Ticker:** $FIAPO
*   **Fornecimento Máximo (Max Supply):** 300.000.000.000 (300 Bilhões) $FIAPO.
*   **Fornecimento Mínimo (Alvo de Queima):** 100.000.000 (100 Milhões) $FIAPO.
*   **Dígitos Decimais:** 8
*   **Carteira de Queima:** Uma carteira específica e publicamente visível ("Carteira de Queima") deve ser designada para receber todos os tokens a serem queimados.

**Distribuição Inicial (Tokenomics):**
*   **Fundo de Staking:** 80%
*   **Airdrop:** 7%
*   **Marketing:** 5%
*   **Doação para Instituições de Caridade:** 5%
*   **IEO/ICO:** 2%
*   **Equipe:** 1%

---

#### **3. Estrutura de Taxas e Penalidades**

As taxas são a principal fonte de receita para os fundos de staking e recompensas. Devem ser configuradas conforme o documento "Regras de Staking".

*   **Taxa de Transação em $FIAPO:**
    *   **Valor:** 0,6% sobre cada transação de $FIAPO.
    *   **Destino:**
        *   30% para a **Carteira de Queima**.
        *   50% para o **Fundo de Staking**.
        *   20% para o **Fundo de Recompensas e Ranking**.

*   **Taxa de Entrada em Staking (Aplicável a todos os tipos de staking):**
    *   **Pagamento:** Em LUSDT (Lunes) ou USDT (Solana).
    *   **Valor:** Taxa variável e escalonada, calculada sobre a quantidade de tokens $FIAPO depositados:
        *   Até 1.000 $FIAPO: **2%** (Ex: para 1.000 $FIAPO, a taxa é de 20 LUSDT/USDT).
        *   1.001 a 10.000 $FIAPO: **1%**.
        *   10.001 a 100.000 $FIAPO: **0,5%**.
        *   100.001 a 500.000 $FIAPO: **0,25%**.
        *   Acima de 500.000 $FIAPO: **0,1%**.
    *   **Destino:**
        *   10% para a **Equipe**.
        *   40% para o **Fundo de Staking**.
        *   50% para o **Fundo de Recompensas e Ranking**.

*   **Taxa de Saque de Juros:**
    *   **Valor:** 1% sobre o valor dos juros em $FIAPO sacados.
    *   **Destino:**
        *   20% para a **Carteira de Queima**.
        *   50% para o **Fundo de Staking**.
        *   30% para o **Fundo de Recompensas e Ranking**.

*   **Penalidade de Saque Antecipado (Apenas para Staking Don Burn):**
    *   **Valor:** 10 LUSDT/USDT + 50% do capital em $FIAPO + 80% dos juros acumulados em $FIAPO.
    *   **Destino (dos $FIAPO):**
        *   20% para a **Carteira de Queima**.
        *   50% para o **Fundo de Staking**.
        *   30% para o **Fundo de Recompensas e Ranking**.

*   **Taxa de Cancelamento (Apenas para Staking Don $LUNES):**
    *   **Valor:** 2,5% do capital em $FIAPO.
    *   **Destino:**
        *   10% para a **Equipe**.
        *   50% para o **Fundo de Staking**.
        *   40% para o **Fundo de Recompensas e Ranking**.

---

#### **4. Mecanismos de Staking**

Haverá três modalidades de staking distintas:

*   **Staking Don Burn (Longo Prazo):**
    *   **APY:** 10% a 300%. O APY deve ser dinâmico e aumentar com base no volume de queima do usuário.
    *   **Pagamento de Juros:** Diariamente.
    *   **Regras:** Sujeito à alta penalidade por saque antecipado.

*   **Staking Don $LUNES (Flexível com Lunes):**
    *   **APY:** 6% a 37%.
    *   **Pagamento de Juros:** A cada 7 dias.
    *   **Regras:** Possui taxa de cancelamento de 2,5% sobre o capital.

*   **Staking Don $FIAPO (Flexível Padrão):**
    *   **APY:** 7% a 70%.
    *   **Pagamento de Juros:** A cada 30 dias.
    *   **Regras:** Menos restritivo que as outras modalidades.

---

#### **5. Sistema de Recompensas e Ranking (Top Wallets)**

Este sistema visa recompensar o engajamento, com uma regra crucial para evitar a centralização de prêmios.

*   **Categorias do Ranking:** As recompensas serão distribuídas para as carteiras mais bem classificadas em:
    1.  Maior volume de queima de tokens.
    2.  Maior volume de transações.
    3.  Maior número de stakings ativos.
    4.  Maior número de afiliados diretos com staking ativo.
*   **Regra de Premiação e Exclusão de Baleias:**
    *   As recompensas serão distribuídas para as **top 12 carteiras** em cada categoria.
    *   **Regra Fundamental:** Antes de determinar as carteiras vencedoras, o contrato deve **excluir as 100 maiores carteiras por saldo de $FIAPO**. A premiação será então calculada com base no universo de carteiras restante.
*   **Ciclos de Distribuição de Recompensas:**
    *   7 dias
    *   30 dias
    *   12 meses

---

#### **6. Sorteios Especiais ("God looked at you")**

*   **Sorteio Mensal:**
    *   **Prêmio:** 5% de todas as taxas (em meme e USDT/LUSDT) arrecadadas durante o mês.
    *   **Lógica:** Um sorteio com data e hora aleatórios será realizado uma vez por mês.
    *   **Elegibilidade:** Todas as carteiras são elegíveis, **exceto as consideradas "grandes carteiras"** (utilizar a mesma regra de exclusão das 100 maiores carteiras).

*   **Sorteio de Natal ("God looked at you de Natal"):**
    *   **Prêmio:** 5% de todas as taxas (em meme e USDT/LUSDT) acumuladas durante o ano inteiro.
    *   **Lógica:** Um sorteio realizado no Natal.
    *   **Elegibilidade:** Mesma regra de exclusão das grandes carteiras.

---

#### **7. Pontos para Clarificação antes do Desenvolvimento**


1.  **Definição de "Grandes Carteiras":** A regra de "excluir as 100 maiores carteiras" é clara.
3.  **Mecanismo de APY Dinâmico:** A lógica exata de como a "queima de tokens aumenta o APY" no Staking Don Burn precisa ser detalhada (ex: fórmula, tiers de queima, impacto percentual no APY).
4.  **Integração com Solana USDT:** Serviço de ponte que irá verificar os pagamentos de taxas em USDT na rede Solana e comunicar com o contrato na rede Lunes deve ser definida.
5.  *Burn* Não tem quem de USDT/LUSDT é redistrubiodos para os fundos de staking, recompensas e equipe.

### **8. Pontos para Clarificação antes do Desenvolvimento**


1.  **Definição de "Grandes Carteiras":** A regra de "excluir as 100 maiores carteiras" é clara.
3.  **Mecanismo de APY Dinâmico:** A lógica exata de como a "queima de tokens aumenta o APY" no Staking Don Burn precisa ser detalhada (ex: fórmula, tiers de queima, impacto percentual no APY).
4.  **Integração com Solana USDT:** Serviço de ponte que irá verificar os pagamentos de taxas em USDT na rede Solana e comunicar com o contrato na rede Lunes deve ser definida.
5.  *Burn* Não tem quem de USDT/LUSDT é redistrubiodos para os fundos de staking, recompensas e equipe.

7.  **Sistema de Governança:** Implementado com pagamento obrigatório e staking mínimo para criar propostas e votar.
8.  **Integração de Staking:** Sistema de governança integra com sistema de staking existente para verificação de elegibilidade.
9.  **Regras de Proteção:** Airdrop, sorteios e queima têm regras especiais de proteção implementadas.
10. **Valores de Pagamento:** Valores mínimos de USDT/LUSDT e FIAPO para participação na governança definidos.
11. **Regras Específicas por Tipo:** Cada tipo de proposta tem regras específicas de pagamento, verificação e proteção.
12. **Sistema de Upgrade:** Sistema de upgrade seguro com timelock e auditoria obrigatória.
13. **Proteções de Segurança:** Multi-signature, auditoria de pagamentos, validação de staking.
14. **Regras de Emergência:** Pausa e upgrade de emergência com quorum especial e timelock reduzido.
15. **Compliance e Regulamentação:** KYC/AML, transparência, auditoria e relatórios automáticos.


Implemente o sistema de ICO nosso que será inovador
---
NFT: Distribuindo Don Fiapo à Comunidade sob um Modelo de Vesting de 112 Dias*

**AVISO LEGAL:** Este documento é apenas para fins informativos e não constitui uma oferta de valores mobiliários ou um convite para investimento. A participação no ecossistema de NFTs envolve riscos, incluindo a perda total do capital. Os tokens minerados estarão sujeitos a um período de bloqueio de 112 dias. Faça sua própria pesquisa (DYOR).

---

#### **1. Introdução e Visão Geral**
*(Esta seção permanece a mesma da versão anterior, introduzindo o projeto e a alocação de 13% do supply para a mineração.)*

#### **2. A Coleção de NFTs Mineradoras**
*(A tabela de NFTs, preços e unidades permanece a mesma, pois a captação não foi alterada.)*

---
**Tabela de NFTs:**

| NFT | Tipo      | Preço (USDT-SPL) | Unidades    | Tokens Mineráveis (Total da Categoria) |
| --- | --------- | ---------------- | ----------- | -------------------------------------- |
| 1   | Gratuita  | \$0              | 10.000      | 117.000.000                            |
| 2   | Paga      | \$10             | 50.000      | 585.000.000                            |
| 3   | Paga      | \$30             | 40.000      | 1.170.000.000                          |
| 4   | Paga      | \$55             | 30.000      | 1.560.000.000                          |
| 5   | Paga      | \$100            | 20.000      | 780.000.000                            |
| 6   | Paga      | \$250            | 5.000       | 585.000.000                            |
| 7   | Paga      | \$500            | 2.000       | 273.000.000                            |

Gratuito só pode ser mintado 5 nft por carteira valida (acima de 1 nft na carteira precisa ter pelomenos 10 Lunes para mintar outras).

#### **3. Mecânica de Mineração e Distribuição (REVISADO)**

**3.1. Período de Mineração Unificado:**
A mineração para **todos os tipos de NFTs** ocorrerá durante um período fixo e sincronizado de **112 dias**, a contar do início da ativação do contrato na mainnet da Solana. Cada NFT irá minerar sua cota total de tokens de forma linear ao longo desses 112 dias.

**Tabela de Mineração Diária (Período de 112 Dias):**

| NFT | Tokens Mineráveis (por NFT) | Período de Mineração | Mineração Diária Aprox. (por NFT) |
| --- | --------------------------- | -------------------- | --------------------------------- |
| 1   | 11.700                      | 112 dias             | **~104,5 tokens/dia**             |
| 2   | 11.700                      | 112 dias             | **~104,5 tokens/dia**             |
| 3   | 29.250                      | 112 dias             | **~261,2 tokens/dia**             |
| 4   | 52.000                      | 112 dias             | **~464,3 tokens/dia**             |
| 5   | 39.000                      | 112 dias             | **~348,2 tokens/dia**             |
| 6   | 117.000                     | 112 dias             | **~1.044,6 tokens/dia**           |
| 7   | 136.500                     | 112 dias             | **~1.218,8 tokens/dia**           |

**3.2. Distribuição e Bloqueio de Tokens (Vesting de 112 dias):**
Os tokens minerados serão distribuídos diariamente para as carteiras dos detentores de NFTs. No entanto, esses tokens estarão **bloqueados (não transferíveis)**. Eles serão visíveis na carteira e no nosso painel de controle, mas não poderão ser vendidos, transferidos ou trocados até o final do período de 112 dias.

Ao final exato do período de 112 dias, todos os tokens minerados e acumulados serão desbloqueados simultaneamente para todos os participantes.

**3.3. Staking de Tokens Bloqueados:**
Para recompensar nossos apoiadores iniciais e agregar utilidade durante o período de bloqueio, os tokens minerados (mesmo estando bloqueados) **poderão ser colocados em staking**.

*   **Como Funciona:** Através do nosso painel de controle, os usuários poderão alocar seus tokens bloqueados em um contrato de staking.
*   **Recompensas:** O staking gerará recompensas adicionais em Don Fiapo, provenientes de um pool de recompensas do ecossistema. As recompensas do staking também seguirão as regras de bloqueio e serão liberadas ao final dos 112 dias.
*   **Incentivo:** Esta mecânica incentiva a participação de longo prazo e permite que os usuários aumentem seu patrimônio total antes mesmo do token se tornar líquido no mercado.

---
#### **4. Potencial de Captação e Uso dos Fundos**
*(Esta seção permanece a mesma, com a meta de captação de US$ 7,25 milhões e sua alocação.)*

#### **5. Gamificação e Incentivos Futuros**
*(Esta seção permanece a mesma, com as ideias de rankings, raridade visual e evolução de NFTs.)*

#### **6. Segurança e Transparência**
*(Esta seção é reforçada pela nova regra, garantindo que o contrato de vesting será auditado juntamente com os de mineração e cunhagem.)*

---

#### **10. Sistema de Governança com Pagamento e Staking Obrigatório**

O Don Fiapo implementa um sistema de governança descentralizada que exige **pagamento obrigatório** e **staking mínimo** para participar, garantindo que apenas usuários **comprometidos** com o projeto possam criar propostas e votar.

**10.1. Regras de Pagamento Obrigatório:**

*   **Para CRIAR PROPOSTA:**
    *   **USDT/LUSDT:** 1.000 USDT mínimo
    *   **FIAPO:** 1.000 FIAPO mínimo
    *   **Moedas Aceitas:** USDT, LUSDT, LUNES

*   **Para VOTAR:**
    *   **USDT/LUSDT:** 100 USDT mínimo
    *   **FIAPO:** 100 FIAPO mínimo
    *   **Moedas Aceitas:** USDT, LUSDT, LUNES

**10.2. Regras de Staking Obrigatório:**

*   **Para CRIAR PROPOSTA:**
    *   **Staking Mínimo:** 1.000 FIAPO em staking ativo
    *   **Tipos Válidos:** Don Burn, Don LUNES, Don FIAPO

*   **Para VOTAR:**
    *   **Staking Mínimo:** 100 FIAPO em staking ativo
    *   **Tipos Válidos:** Don Burn, Don LUNES, Don FIAPO

**10.3. Tipos de Propostas Disponíveis:**

*   **ConfigChange:** Mudanças de configuração (taxas, APY, limites)
*   **Emergency:** Operações de emergência (pausa, despausa)
*   **Upgrade:** Upgrades do contrato
*   **SystemWalletChange:** Mudança de carteiras do sistema
*   **PauseSystem:** Pausa/despausa do sistema
*   **ExchangeListing:** Proposta de listagem em exchange
*   **InfluencerMarketing:** Proposta de marketing com influenciadores
*   **AcceleratedBurn:** Proposta de queima acelerada (apenas aumentar)
*   **ListingDonation:** Proposta de doação para listagem
*   **MarketingDonation:** Proposta de doação para marketing

**10.4. Regras Especiais de Proteção:**

*   **Airdrop e Sorteios INALTERÁVEIS:**
    *   Sistema de Airdrop - Pontuação, elegibilidade, rounds
    *   Sorteios Mensais - "God looked at you"
    *   Sorteios de Natal - "God looked at you de Natal"
    *   Prêmios dos Sorteios - 5% das taxas
    *   Regras de Exclusão - Top 100 carteiras
    *   Distribuição de Recompensas - Top 12 carteiras

*   **Queima Deflacionária - APENAS AUMENTAR:**
    *   Nunca diminuir a queima
    *   Limite Total - 200B FIAPO (não pode ser reduzido)
    *   Queima Acelerada - Medidas temporárias para queimar mais rápido
    *   Duração Limitada - 1-30 dias de queima adicional
    *   Valor Controlado - 1K-1M FIAPO por medida

**10.4.1. Regras Específicas por Tipo de Proposta:**

*   **ExchangeListing (Listagem em Exchange):**
    *   **Doação Mínima:** 1.000 USDT + 1.000 FIAPO
    *   **Doação Máxima:** 100.000 USDT + 100.000 FIAPO
    *   **Período de Verificação:** 30 dias após aprovação
    *   **Exchanges Aprovadas:** Binance, Coinbase, Kraken, KuCoin, Bybit
    *   **Proteção de Conteúdo:** Material não pode ser excluído após pagamento
    *   **Verificação Obrigatória:** Prova de publicação requerida

*   **InfluencerMarketing (Marketing com Influenciadores):**
    *   **Pagamento Mínimo:** 500 USDT + 500 FIAPO
    *   **Pagamento Máximo:** 50.000 USDT + 50.000 FIAPO
    *   **Período de Verificação:** 14 dias após aprovação
    *   **Plataformas Aprovadas:** YouTube, Instagram, TikTok, Twitter, Telegram
    *   **Proteção de Conteúdo:** Material não pode ser excluído após pagamento
    *   **Verificação Obrigatória:** Prova de publicação requerida

*   **AcceleratedBurn (Queima Acelerada):**
    *   **Valor Mínimo:** 1.000 FIAPO por medida
    *   **Valor Máximo:** 1.000.000 FIAPO por medida
    *   **Duração Mínima:** 1 dia
    *   **Duração Máxima:** 30 dias
    *   **Limite Total:** 200B FIAPO (não pode ser reduzido)
    *   **Restrição:** Apenas aumentar queima, nunca diminuir

*   **ListingDonation (Doação para Listagem):**
    *   **Doação Mínima:** 100 USDT + 100 FIAPO
    *   **Doação Máxima:** 10.000 USDT + 10.000 FIAPO
    *   **Período de Verificação:** 7 dias após aprovação
    *   **Destino:** Fundo de listagem em exchanges
    *   **Transparência:** Todas as doações são públicas

*   **MarketingDonation (Doação para Marketing):**
    *   **Doação Mínima:** 50 USDT + 50 FIAPO
    *   **Doação Máxima:** 5.000 USDT + 5.000 FIAPO
    *   **Período de Verificação:** 7 dias após aprovação
    *   **Destino:** Fundo de marketing e divulgação
    *   **Transparência:** Todas as doações são públicas

**10.4.2. Regras de Proteção Específicas:**

*   **Proteção de Airdrop:**
    *   **Pontuação:** Sistema de pontuação baseado em holding, staking, burning, affiliate
    *   **Elegibilidade:** Critérios de elegibilidade não podem ser alterados
    *   **Rounds:** Gerenciamento de rounds de airdrop
    *   **Distribuição:** Regras de distribuição de tokens
    *   **Hooks:** Sistema de hooks para comunicação entre módulos

*   **Proteção de Sorteios:**
    *   **Sorteio Mensal:** "God looked at you" - 5% das taxas mensais
    *   **Sorteio de Natal:** "God looked at you de Natal" - 5% das taxas anuais
    *   **Exclusão:** Top 100 carteiras sempre excluídas
    *   **Distribuição:** Top 12 carteiras recebem prêmios
    *   **Aleatoriedade:** Sistema de aleatoriedade baseado em blockchain

*   **Proteção de Queima:**
    *   **Limite Total:** 200B FIAPO - NUNCA pode ser reduzido
    *   **Queima Acelerada:** Apenas medidas temporárias para aumentar velocidade
    *   **Duração Limitada:** Máximo 30 dias por medida
    *   **Valor Controlado:** Entre 1K e 1M FIAPO por medida
    *   **Transparência:** Todas as queimas são públicas e verificáveis

**10.4.3. Regras de Segurança e Auditoria:**

*   **Multi-Signature:**
    *   **Governadores Mínimos:** 3 governadores
    *   **Quorum:** 60% dos governadores devem votar
    *   **Timelock:** 2 dias de espera após aprovação
    *   **Execução:** Apenas após timelock e quorum atingidos

*   **Auditoria de Pagamentos:**
    *   **Registro:** Todos os pagamentos são registrados
    *   **Rastreabilidade:** Hash de transação para cada pagamento
    *   **Verificação:** Sistema de verificação de pagamentos
    *   **Transparência:** Pagamentos públicos e auditáveis

*   **Validação de Staking:**
    *   **Verificação em Tempo Real:** Staking verificado antes de cada ação
    *   **Tipos Válidos:** Don Burn, Don LUNES, Don FIAPO
    *   **Status Ativo:** Apenas posições ativas são consideradas
    *   **Valor Mínimo:** Verificação de valor mínimo por ação

**10.4.4. Regras de Execução e Compliance:**

*   **Execução de Propostas:**
    *   **Aprovação:** Proposta deve ser aprovada por maioria
    *   **Timelock:** 2 dias de espera obrigatório
    *   **Execução:** Apenas após timelock e aprovação
    *   **Reversão:** Propostas podem ser canceladas durante timelock

*   **Compliance e Regulamentação:**
    *   **KYC/AML:** Conformidade com regulamentações locais
    *   **Transparência:** Todas as ações são públicas
    *   **Auditoria:** Sistema auditável por terceiros
    *   **Relatórios:** Relatórios automáticos de atividades

**10.4.5. Regras de Emergência:**

*   **Pausa de Emergência:**
    *   **Quorum Especial:** 80% dos governadores para pausa
    *   **Timelock Reduzido:** 6 horas para emergências
    *   **Execução Imediata:** Pausa pode ser executada imediatamente
    *   **Reversão:** Despausa requer aprovação normal

*   **Upgrade de Emergência:**
    *   **Quorum Especial:** 90% dos governadores para upgrade
    *   **Timelock Reduzido:** 12 horas para upgrades
    *   **Auditoria:** Upgrade deve ser auditado antes da execução
    *   **Rollback:** Sistema de rollback em caso de problemas

**10.5. Fluxo de Participação na Governança:**

*   **Para CRIAR PROPOSTA:**
    1. ✅ Ser governador
    2. ✅ Ter staking ativo (mínimo 1.000 FIAPO)
    3. ✅ Pagar 1.000 USDT + 1.000 FIAPO
    4. ✅ Proposta aprovada pela comunidade

*   **Para VOTAR:**
    1. ✅ Ser governador
    2. ✅ Ter staking ativo (mínimo 100 FIAPO)
    3. ✅ Pagar 100 USDT + 100 FIAPO
    4. ✅ Votar dentro do período permitido

**10.6. Configuração do Sistema:**

*   **Quorum:** 60% dos governadores devem votar
*   **Timelock:** 2 dias de espera após aprovação
*   **Período de Votação:** 7 dias
*   **Governadores Mínimos:** 3
*   **Pagamentos Obrigatórios:** Sim
*   **Staking Obrigatório:** Sim

**10.7. Benefícios do Sistema:**

*   **Para o Projeto:**
    *   Compromisso Real - Apenas usuários comprometidos participam
    *   Receita Adicional - Pagamentos geram receita para o projeto
    *   Qualidade das Propostas - Propostas mais bem pensadas
    *   Participação Ativa - Incentiva staking e participação

*   **Para a Comunidade:**
    *   Governança Justa - Sistema democrático com barreiras adequadas
    *   Transparência - Todos os pagamentos são registrados
    *   Proteção - Evita spam e propostas de baixa qualidade
    *   Incentivo - Recompensa usuários ativos

*   **Para a Segurança:**
    *   Prevenção de Spam - Evita propostas desnecessárias
    *   Barreira de Entrada - Filtra participantes sérios
    *   Auditoria - Todos os pagamentos são rastreáveis
    *   Controle de Qualidade - Melhora a qualidade das propostas

---

### **9. Documentações de referencias** 

1. Guia-Solana https://solana.com/pt/developers/guides 
2. Ink https://use.ink/docs/v4/ 
3. Guia-OWASP Smart https://owasp.org/www-project-smart-contract-top-10/ 
4. Guia-DevSecOps https://owasp.org/www-project-devsecops-guideline/ 
5. Guia-TDD https://github.com/PauloGoncalvesBH/aprenda-tdd-na-pratica
 

Subir contrato na rede Lunes:

PRODUÇÃO (múltiplos endpoints):
https://ui.use.ink/?rpc=wss://ws.lunes.io
https://ui.use.ink/?rpc=wss://ws-lunes-main-01.lunes.io
https://ui.use.ink/?rpc=wss://ws-lunes-main-02.lunes.io
https://ui.use.ink/?rpc=wss://ws-archive.lunes.io

TESTNET:
https://ui.use.ink/?rpc=wss://ws-test.lunes.io

Teste:
wss://ws-test.lunes.io

PRD: 
wss://ws.lunes.com
wss://ws-lunes-main-01.lunes.io
wss://ws-lunes-main-02.lunes.io
wss://ws-archive.lunes.io
---

#### **11. Integração com Sistema de Staking Existente**

O sistema de governança se integra com o sistema de staking existente para verificar:

*   **Staking Ativo:** Verifica se o usuário tem posições de staking ativas
*   **Valor Mínimo:** Confirma se o valor em staking atende aos mínimos
*   **Tipos Válidos:** Aceita todos os tipos de staking (Don Burn, Don LUNES, Don FIAPO)
*   **Posições Ativas:** Considera apenas posições não canceladas ou sacadas

**11.1. Verificação de Staking:**

*   **Para CRIAR PROPOSTA:** Mínimo 1.000 FIAPO em staking ativo
*   **Para VOTAR:** Mínimo 100 FIAPO em staking ativo
*   **Tipos Aceitos:** Don Burn, Don LUNES, Don FIAPO
*   **Status Válido:** Apenas posições ativas (não canceladas/sacadas)

**11.2. Integração Técnica:**

*   **Contrato de Staking:** Referência para verificação de posições
*   **Validação Automática:** Verificação em tempo real de staking
*   **Cache de Dados:** Otimização para consultas frequentes
*   **Fallback:** Sistema de backup para verificações offline

**11.3. Regras de Validação Avançadas:**

*   **Verificação de Elegibilidade:**
    *   **Staking Ativo:** Posições não canceladas ou sacadas
    *   **Valor Mínimo:** Verificação de valor total em staking
    *   **Tipos Válidos:** Apenas Don Burn, Don LUNES, Don FIAPO
    *   **Tempo Mínimo:** Staking deve estar ativo há pelo menos 1 dia

*   **Cache e Performance:**
    *   **Cache de Dados:** Otimização para consultas frequentes
    *   **Validação em Tempo Real:** Verificação antes de cada ação
    *   **Fallback:** Sistema de backup para verificações offline
    *   **Auditoria:** Logs de todas as verificações

**11.4. Eventos e Notificações:**

*   **Eventos de Staking:**
    *   **Staking Criado:** Notificação quando novo staking é criado
    *   **Staking Cancelado:** Notificação quando staking é cancelado
    *   **Staking Sacado:** Notificação quando staking é sacado
    *   **Valor Alterado:** Notificação quando valor de staking muda

*   **Eventos de Governança:**
    *   **Proposta Criada:** Notificação de nova proposta
    *   **Voto Registrado:** Notificação de novo voto
    *   **Proposta Aprovada:** Notificação de proposta aprovada
    *   **Proposta Executada:** Notificação de proposta executada

**11.5. Relatórios e Analytics:**

*   **Relatórios de Participação:**
    *   **Governadores Ativos:** Número de governadores ativos
    *   **Propostas Criadas:** Número de propostas por período
    *   **Votos Registrados:** Número de votos por período
    *   **Taxa de Aprovação:** Percentual de propostas aprovadas

*   **Relatórios de Staking:**
    *   **Total em Staking:** Valor total em staking ativo
    *   **Distribuição por Tipo:** Distribuição por tipo de staking
    *   **Novos Stakings:** Novos stakings por período
    *   **Stakings Cancelados:** Stakings cancelados por período

**11.6. Segurança e Auditoria:**

*   **Auditoria de Staking:**
    *   **Verificação de Integridade:** Verificação de integridade dos dados
    *   **Logs de Auditoria:** Logs de todas as operações
    *   **Relatórios de Segurança:** Relatórios de segurança regulares
    *   **Testes de Penetração:** Testes de penetração regulares

*   **Proteção contra Ataques:**
    *   **Sybil Attack:** Proteção contra ataques Sybil
    *   **Flash Loan Attack:** Proteção contra ataques de flash loan
    *   **Reentrancy Attack:** Proteção contra ataques de reentrancy
    *   **Front-Running Attack:** Proteção contra ataques de front-running

**11.7. Distribuição de Taxas de Governança:**

*   **Distribuição Automática:** As taxas de governança são distribuídas automaticamente para os fundos apropriados
*   **Pagamentos de Propostas:** 20% para Governadores, 30% para Comunidade, 50% para Sistema (Staking/Recompensas/Equipe)
*   **Pagamentos de Votos:** 20% para Governadores, 30% para Comunidade, 50% para Sistema (Staking/Recompensas/Equipe)
*   **Rastreabilidade:** Todas as distribuições são rastreadas e auditáveis
*   **Eventos:** Eventos emitidos para cada distribuição de taxas

**11.8. Benefícios da Distribuição de Taxas:**

*   **Para o Staking:**
    *   **Incentivo Direto:** 60-70% das taxas vão para o fundo de staking
    *   **Recompensa Ativa:** Usuários ativos em staking se beneficiam
    *   **Sustentabilidade:** Fundo de staking cresce com a participação na governança

*   **Para as Recompensas:**
    *   **Recompensa Participação:** 20-40% das taxas vão para recompensas
    *   **Incentivo Governança:** Recompensa governadores ativos
    *   **Distribuição Justa:** Recompensas para participantes ativos

*   **Para a Equipe:**
    *   **Manutenção:** 10% das taxas para manutenção do sistema
    *   **Desenvolvimento:** Recursos para melhorias e desenvolvimento
    *   **Operação:** Custos operacionais do sistema de governança

**11.9. Transparência e Auditoria:**

*   **Relatórios Automáticos:**
    *   **Total Coletado:** Valor total de taxas coletadas
    *   **Total Distribuído:** Valores distribuídos para cada fundo
    *   **Distribuições por Tipo:** Relatórios por tipo de pagamento
    *   **Histórico Completo:** Histórico de todas as distribuições

*   **Eventos de Blockchain:**
    *   **GovernancePaymentRegistered:** Evento quando pagamento é registrado
    *   **GovernanceFeeDistributed:** Evento quando taxas são distribuídas
    *   **Rastreabilidade Total:** Todos os eventos são públicos e verificáveis

*   **Consultas Públicas:**
    *   **Estatísticas de Distribuição:** Consultas públicas de estatísticas
    *   **Distribuições por Pagamento:** Consultas por pagamento específico
    *   **Distribuições por Tipo:** Consultas por tipo de pagamento
    *   **Histórico Completo:** Consultas de histórico completo

---

#### **12. Sistema de Remuneração e Distribuição Comunitária**

O Don Fiapo implementa um sistema de remuneração para governadores e distribuição automática de taxas para a comunidade, criando um ecossistema sustentável e incentivado.

**12.1. Remuneração de Governadores:**

*   **Distribuição Automática:**
    *   **20% das taxas** de governança são distribuídas entre governadores ativos
    *   **Pagamento automático** a cada nova proposta/voto
    *   **Saque sob demanda** pelos governadores
    *   **Rastreamento completo** de remunerações acumuladas

*   **Sistema de Peso de Votos:**
    *   **Governadores**: 3x mais peso nas votações
    *   **Comunidade**: Peso normal (1x)
    *   **Votos ponderados** para decisões mais democráticas

*   **Controles de Segurança:**
    *   **Governador deve estar ativo** para receber remuneração
    *   **Valor mínimo** para distribuição
    *   **Controle de saques** com rastreamento
    *   **Proteção contra manipulação**

**12.2. Distribuição Comunitária:**

*   **Distribuição Automática:**
    *   **30% das taxas** são distribuídas para a comunidade a cada 30 dias
    *   **Beneficiários**: Stakers ativos do sistema
    *   **Distribuição proporcional** baseada no staking
    *   **Mínimo de 1 token** para distribuição

*   **Elegibilidade:**
    *   **Stakers ativos** são elegíveis para distribuição
    *   **Verificação automática** de staking ativo
    *   **Distribuição proporcional** ao valor em staking
    *   **Proteção contra manipulação**

*   **Controles de Segurança:**
    *   **Intervalo mínimo** de 30 dias entre distribuições
    *   **Valor mínimo** para distribuição
    *   **Verificação de stakers** ativos
    *   **Proteção contra ataques**

**12.3. Benefícios do Sistema:**

*   **Para Governadores:**
    *   **Remuneração automática** por participação
    *   **Peso maior** nas decisões importantes
    *   **Saque flexível** de remunerações
    *   **Transparência total** de pagamentos

*   **Para Comunidade:**
    *   **Participação democrática** em governança
    *   **Distribuição automática** de taxas
    *   **Incentivo ao staking** ativo
    *   **Benefícios diretos** da governança

*   **Para o Projeto:**
    *   **Governança sustentável** e incentivada
    *   **Distribuição justa** de recursos
    *   **Engajamento comunitário** aumentado
    *   **Transparência total** de fundos

**12.4. Configuração Padrão:**

*   **RemunerationConfig:**
    *   **governor_share_bps**: 2000 (20% para governadores)
    *   **community_share_bps**: 3000 (30% para comunidade)
    *   **community_distribution_interval_days**: 30 (30 dias)
    *   **governor_vote_weight**: 3 (3x peso para governadores)
    *   **community_vote_weight**: 1 (1x peso para comunidade)
    *   **min_community_distribution**: 1 token mínimo

---

#### **13. Sistema de Upgrade Seguro**

O Don Fiapo implementa um sistema de upgrade seguro com timelock para garantir que upgrades sejam seguros e transparentes.

**12.1. Regras de Upgrade:**

*   **Proposta de Upgrade:**
    *   **Quorum:** 90% dos governadores para proposta de upgrade
    *   **Timelock:** 12 horas de espera após aprovação
    *   **Auditoria:** Upgrade deve ser auditado antes da execução
    *   **Rollback:** Sistema de rollback em caso de problemas

*   **Execução de Upgrade:**
    *   **Aprovação:** Upgrade deve ser aprovado por supermaioria
    *   **Timelock:** 12 horas de espera obrigatório
    *   **Execução:** Apenas após timelock e aprovação
    *   **Reversão:** Upgrade pode ser cancelado durante timelock

**12.2. Proteções de Segurança:**

*   **Auditoria Obrigatória:**
    *   **Auditoria Externa:** Upgrade deve ser auditado por terceiros
    *   **Testes Abrangentes:** Testes em testnet antes da execução
    *   **Análise de Segurança:** Análise de segurança completa
    *   **Relatório de Auditoria:** Relatório público de auditoria

*   **Sistema de Rollback:**
    *   **Rollback Automático:** Sistema de rollback automático
    *   **Rollback Manual:** Rollback manual em caso de problemas
    *   **Estado de Backup:** Backup do estado antes do upgrade
    *   **Recuperação:** Sistema de recuperação em caso de falha

**12.3. Transparência e Comunicação:**

*   **Comunicação com Comunidade:**
    *   **Anúncio de Upgrade:** Anúncio público do upgrade
    *   **Documentação:** Documentação completa do upgrade
    *   **FAQ:** FAQ sobre o upgrade
    *   **Suporte:** Suporte para dúvidas sobre o upgrade

*   **Relatórios de Upgrade:**
    *   **Relatório de Execução:** Relatório de execução do upgrade
    *   **Relatório de Auditoria:** Relatório de auditoria do upgrade
    *   **Relatório de Testes:** Relatório de testes do upgrade
    *   **Relatório de Segurança:** Relatório de segurança do upgrade

---

