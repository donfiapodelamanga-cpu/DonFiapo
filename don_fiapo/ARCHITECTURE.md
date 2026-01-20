# Don Fiapo - Arquitetura de Contratos Ink!

## Visão Geral

O ecossistema Don Fiapo utiliza uma arquitetura de contratos inteligentes modulares desenvolvidos em **Ink! 4.2.1** para a blockchain Lunes/Substrate.

## Estrutura do Projeto

```
don_fiapo/
├── Cargo.toml              # Workspace configuration
├── contracts/              # Smart Contracts Ink!
│   ├── traits/             # Interfaces compartilhadas
│   ├── core/               # Token FIAPO (PSP22)
│   ├── ico/                # ICO & NFTs Mineradores
│   ├── staking/            # Sistema de Staking
│   ├── governance/         # Governança & Votação
│   ├── lottery/            # Loteria Mensal/Anual
│   ├── airdrop/            # Distribuição de Tokens
│   ├── rewards/            # Rankings & Recompensas
│   ├── marketplace/        # NFT Marketplace
│   ├── affiliate/          # Sistema de Afiliados
│   ├── spin_game/          # Royal Wheel Game
│   ├── security/           # Módulo de Segurança
│   ├── timelock/           # Operações com Delay
│   ├── upgrade/            # Sistema de Upgrade
│   └── oracle_multisig/    # Oracle Multi-assinatura
└── archive/                # Implementação legada (referência)
```

## Contratos

### Core (`fiapo-core`)
Token principal FIAPO implementando PSP22 com:
- Supply total de 21 bilhões
- Mecanismo de queima
- Carteiras especiais (team, rewards, burn)

### ICO (`fiapo-ico`)
Sistema de ICO baseado em NFTs mineradores:
- 7 tiers de NFTs (Free a $500)
- Mineração de tokens por 112 dias
- Sistema de vesting
- Evolução de NFTs (burn + merge)
- Bônus de prestígio e raridade visual

### Staking (`fiapo-staking`)
Três pools de staking:
- **Don Burn**: APY 5-30%, pagamento diário
- **Don Lunes**: APY 6-37%, pagamento semanal
- **Don Fiapo**: APY 7-70%, pagamento mensal

### Governance (`fiapo-governance`)
Sistema de governança descentralizada:
- Propostas e votação
- Multi-signature para operações críticas
- Integração com Timelock
- Execução de ações via cross-contract

### Lottery (`fiapo-lottery`)
Sistema de loteria:
- Sorteios mensais e anuais
- Distribuição baseada em elegibilidade
- Exclusão de whales

### Marketplace (`fiapo-marketplace`)
Marketplace de NFTs:
- Listagem e compra
- Taxa de 5% (50% team + 50% staking)
- Cross-contract com ICO e Core

### Spin Game (`royal_wheel`)
Jogo de roleta:
- Pacotes de spins (1 a 200)
- Recompensas: FIAPO, USDT, Boost, Jackpot
- Limites diários anti-drain
- Oracle para pagamentos externos

### Outros Contratos
- **Affiliate**: Sistema de afiliados 2 níveis
- **Airdrop**: Distribuição baseada em pontos
- **Rewards**: Rankings e recompensas
- **Security**: Proteção contra reentrância
- **Timelock**: Delays para operações críticas
- **Upgrade**: Sistema de upgrade seguro
- **Oracle Multisig**: Consenso multi-oracle

## Cross-Contract Calls

Os contratos se comunicam via `ink::env::call::build_call`:

```rust
// Exemplo: Transferência via Core
ink::env::call::build_call::<Environment>()
    .call(self.core_contract)
    .gas_limit(5000000000)
    .exec_input(
        ink::env::call::ExecutionInput::new(
            ink::env::call::Selector::new(ink::selector_bytes!("transfer"))
        )
        .push_arg(to)
        .push_arg(amount)
    )
    .returns::<Result<(), PSP22Error>>()
    .invoke()
```

## Build & Test

```bash
# Verificar compilação
cargo check

# Compilar contratos
cargo build --release

# Executar testes
cargo test

# Build para deploy (requer cargo-contract)
cargo contract build --release
```

## Constantes Importantes

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `SCALE` | 100_000_000 | 10^8 para FIAPO |
| `LUSDT_SCALE` | 1_000_000 | 10^6 para LUSDT |
| `MINING_PERIOD_DAYS` | 112 | Período de mineração |
| `MARKETPLACE_FEE_BPS` | 500 | Taxa 5% (basis points) |

## Segurança

- Proteção contra reentrância
- Rate limiting por operação
- Timelock para mudanças críticas
- Multi-signature para operações sensíveis
- Validação de ownership em todas as funções admin

## Arquivos Legados

A implementação anterior (monólito Rust) foi arquivada em `archive/` para referência histórica. Não deve ser utilizada em produção.

---

*Última atualização: Janeiro 2026*
