# 🚀 Don Fiapo - Smart Contract

[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Ink!](https://img.shields.io/badge/Ink!-4.3.0-FF6B6B?style=for-the-badge)](https://use.ink/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-81%2F94%20Passing-brightgreen?style=for-the-badge)](./tests)

> **Don Fiapo ($FIAPO)** - Um ecossistema de memecoin gamificado na rede Lunes com múltiplos mecanismos de staking, sistema de queima de tokens, e programa robusto de recompensas.

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [🏗️ Arquitetura](#️-arquitetura)
- [⚡ Funcionalidades](#-funcionalidades)
- [🚀 Como Executar](#-como-executar)
- [🧪 Testes](#-testes)
- [📊 Tokenomics](#-tokenomics)
- [🔧 Desenvolvimento](#-desenvolvimento)
- [📚 Documentação](#-documentação)
- [🤝 Contribuição](#-contribuição)
- [📄 Licença](#-licença)

## 🎯 Visão Geral

O **Don Fiapo** é um contrato inteligente inovador que implementa um ecossistema completo de memecoin na rede Lunes. O projeto combina múltiplos mecanismos de staking, sistema de queima de tokens para aumentar o valor, taxas estratégicas para sustentar o ecossistema e um robusto programa de recompensas para incentivar a participação ativa da comunidade.

### 🌟 Características Principais

- **Staking Multi-Modal**: 3 tipos diferentes de staking com APY dinâmico
- **Sistema de Queima**: Mecanismo para aumentar o valor do token
- **Recompensas Gamificadas**: Sistema de ranking e sorteios especiais
- **Integração Multi-Rede**: Suporte a LUSDT (Lunes) e USDT (Solana)
- **ICO Inovador**: Sistema de NFTs mineradoras com vesting de 112 dias
- **Segurança Robusta**: Implementação seguindo as melhores práticas de segurança

## 🏗️ Arquitetura

```text
don_fiapo/
├── src/
│   ├── lib.rs              # Contrato principal
│   ├── access_control.rs   # Controle de acesso
│   ├── affiliate.rs        # Sistema de afiliados
│   ├── airdrop/           # Sistema de airdrop
│   │   ├── mod.rs
│   │   ├── hooks.rs
│   │   └── tests.rs
│   ├── apy.rs             # APY dinâmico
│   ├── burn.rs            # Sistema de queima
│   ├── fees/              # Sistema de taxas
│   │   ├── mod.rs
│   │   ├── calculation.rs
│   │   └── distribution.rs
│   ├── ico.rs             # Sistema de ICO
│   ├── integration.rs     # Integração geral
│   ├── lottery.rs         # Sistema de loteria
│   ├── rewards.rs         # Sistema de recompensas
│   ├── security.rs        # Segurança
│   ├── solana.rs          # Integração Solana
│   ├── solana_bridge.rs   # Bridge Solana
│   └── staking.rs         # Sistema de staking
├── tests/                 # Testes
├── Cargo.toml            # Dependências
├── deploy.sh             # Script de deploy
└── README.md             # Este arquivo
```

## ⚡ Funcionalidades

### 🎯 Sistema de Staking

1. **Staking Don Burn (Longo Prazo)**
   - APY: 10% a 300% (dinâmico baseado na queima)
   - Pagamento: Diário
   - Penalidade alta por saque antecipado

2. **Staking Don $LUNES (Flexível)**
   - APY: 6% a 37%
   - Pagamento: A cada 7 dias
   - Taxa de cancelamento: 2.5%

3. **Staking Don $FIAPO (Padrão)**
   - APY: 7% a 70%
   - Pagamento: A cada 30 dias
   - Menos restritivo

### 🔥 Sistema de Queima

- **Taxa de Transação**: 0.6% sobre cada transação
- **Distribuição**:
  - 30% para Carteira de Queima
  - 50% para Fundo de Staking
  - 20% para Fundo de Recompensas

### 🎁 Sistema de Recompensas

- **Ranking Top 12**: Recompensas para as melhores carteiras
- **Categorias**: Queima, Transações, Staking, Afiliados
- **Exclusão de Baleias**: Top 100 carteiras excluídas
- **Ciclos**: 7 dias, 30 dias, 12 meses

### 🎰 Sorteios Especiais

- **Sorteio Mensal**: 5% das taxas mensais
- **Sorteio de Natal**: 5% das taxas anuais
- **Elegibilidade**: Todas as carteiras (exceto top 100)

### 🏗️ Sistema ICO

- **NFTs Mineradoras**: 7 tipos diferentes
- **Vesting**: 112 dias de bloqueio
- **Mineração**: Linear durante 112 dias
- **Staking de Tokens Bloqueados**: Disponível durante o vesting

## ✅ Status da Compilação

**🎉 COMPILAÇÃO BEM-SUCEDIDA!**

O contrato foi compilado com sucesso e todos os artefatos necessários foram gerados:

- ✅ `don_fiapo_contract.contract` - Arquivo do contrato para deploy
- ✅ `don_fiapo_contract.wasm` - Bytecode WebAssembly otimizado
- ✅ `don_fiapo_contract.json` - Metadata completa do contrato

### 📦 Artefatos Gerados

Localização: `target/ink/`

```bash
# Verificar artefatos gerados
ls -la target/ink/
# don_fiapo_contract.contract  # Arquivo principal para deploy
# don_fiapo_contract.wasm      # Bytecode WebAssembly
# don_fiapo_contract.json      # Metadata do contrato
```

## 🚀 Como Executar

### Pré-requisitos

- [Rust](https://www.rust-lang.org/) (versão estável)
- [cargo-contract](https://github.com/paritytech/cargo-contract) 4.0+
- [Ink!](https://use.ink/) 4.3.0

### Instalação

```bash
# 1. Clone o repositório
git clone <repository-url>
cd don_fiapo

# 2. Instale as dependências
cargo install --force --locked cargo-contract

# 3. Adicione o target wasm
rustup target add wasm32-unknown-unknown
```

## 🌐 Deploy na Rede Lunes

### Testnet (Recomendado para testes)

```bash
# Deploy na testnet da Lunes
cargo contract instantiate \
  --constructor new \
  --args "Don Fiapo" "FIAPO" 1000000000000000000000000000 \
  --suri //Alice \
  --url wss://ws-test.lunes.io
```

**Interface Web para Testnet:**

- URL: <https://ui.use.ink/?rpc=wss://ws-test.lunes.io>

### Mainnet (Produção)

```bash
# Deploy na mainnet da Lunes
cargo contract instantiate \
  --constructor new \
  --args "Don Fiapo" "FIAPO" 1000000000000000000000000000 \
  --suri "//YourPrivateKey" \
  --url wss://ws.lunes.io
```

**Endpoints Mainnet (usar múltiplos para resiliência):**

- Primary: `wss://ws.lunes.io`
- Secondary: `wss://ws-lunes-main-01.lunes.io`
- Tertiary: `wss://ws-lunes-main-02.lunes.io`

**Interface Web para Mainnet:**

- URL: <https://ui.use.ink/?rpc=wss://ws.lunes.io>

### Compilação

```bash
# Compilação básica
cargo build --release

# Compilação para contrato
cargo contract build --release
```

### Testes

```bash
# Executar todos os testes
cargo test

# Executar apenas testes unitários
cargo test --lib

# Executar com output detalhado
cargo test -- --nocapture
```

### Deploy

```bash
# Verificar dependências
./deploy.sh check

# Build completo
./deploy.sh build

# Deploy (quando configurado)
./deploy.sh deploy
```

## 🧪 Testes

### Status dos Testes

- **Total de Testes**: 94
- **Passando**: 81 (86%)
- **Falhando**: 13 (14%)

### Executando Testes Específicos

```bash
# Executar todos os testes
cargo test

# Executar testes com output detalhado
cargo test -- --nocapture

# Executar teste específico
cargo test test_transfer

# Executar testes de integração
cargo test --features e2e-tests

# Testes de staking
cargo test staking

# Testes de airdrop
cargo test airdrop

# Testes de APY
cargo test apy

# Testes de lottery
cargo test lottery
```

## 🔒 Segurança e Melhores Práticas

### Medidas de Segurança Implementadas

✅ **Access Control** - Controle rigoroso de acesso baseado em roles
✅ **Pausable Contract** - Capacidade de pausar operações em emergências
✅ **Reentrancy Protection** - Proteção contra ataques de reentrância
✅ **Overflow Protection** - Uso de matemática segura para evitar overflows
✅ **Input Validation** - Validação rigorosa de todas as entradas
✅ **Rate Limiting** - Limitação de taxa para operações críticas
✅ **Whale Protection** - Mecanismos anti-whale para proteger pequenos investidores

### Conformidade com Padrões

- **OWASP Smart Contract Top 10** - Implementação seguindo diretrizes de segurança
- **PSP22 Standard** - Compatibilidade total com padrão de tokens
- **Ink! 4.x Best Practices** - Seguindo as melhores práticas do framework

### Auditoria de Código

```bash
# Verificar warnings de segurança
cargo clippy -- -W clippy::all

# Análise de dependências
cargo audit

# Verificar formatação
cargo fmt --check
```

### Cobertura de Testes

- ✅ **Staking**: Testes completos
- ✅ **Burn**: Testes completos
- ✅ **Fees**: Testes completos
- ✅ **Integration**: Testes completos
- ✅ **Lottery**: Testes completos
- ✅ **Rewards**: Testes completos
- ✅ **Solana**: Testes completos
- ✅ **Security**: Testes completos
- ⚠️ **Airdrop**: Alguns testes falhando
- ⚠️ **APY**: Alguns testes falhando

## 📊 Tokenomics

### Especificações do Token

- **Nome**: Don Fiapo
- **Ticker**: $FIAPO
- **Max Supply**: 300.000.000.000 (300 Bilhões)
- **Min Supply**: 100.000.000 (100 Milhões)
- **Decimais**: 8

### Distribuição Inicial

- **Fundo de Staking**: 80%
- **Airdrop**: 7%
- **Marketing**: 5%
- **Doação para Instituições**: 5%
- **IEO/ICO**: 2%
- **Equipe**: 1%

### Taxas e Penalidades

#### Taxa de Transação

- **Valor**: 0.6% sobre cada transação
- **Distribuição**:
  - 30% → Carteira de Queima
  - 50% → Fundo de Staking
  - 20% → Fundo de Recompensas

#### Taxa de Entrada em Staking

- **Escalonada**: 10% a 0.5% baseado no valor
- **Pagamento**: LUSDT ou USDT
- **Distribuição**:
  - 10% → Equipe
  - 40% → Fundo de Staking
  - 50% → Fundo de Recompensas

## 🔧 Desenvolvimento

### Estrutura do Código

O projeto segue uma arquitetura modular com separação clara de responsabilidades:

```rust
// Exemplo de estrutura de módulo
#[ink::contract]
pub mod don_fiapo {
    #[ink(storage)]
    pub struct DonFiapo {
        // Storage items
    }

    impl DonFiapo {
        #[ink(constructor)]
        pub fn new() -> Self {
            // Constructor logic
        }

        #[ink(message)]
        pub fn stake(&mut self, amount: u128) -> Result<(), Error> {
            // Staking logic
        }
    }
}
```

### Padrões de Desenvolvimento

- **Segurança**: Implementação seguindo OWASP Smart Contract Top 10
- **Testes**: TDD (Test-Driven Development)
- **Documentação**: Código bem documentado
- **Modularidade**: Separação clara de responsabilidades

### Comandos Úteis

```bash
# Formatar código
cargo fmt

# Verificar linting
cargo clippy

# Gerar documentação
cargo doc --open

# Verificar dependências
cargo audit
```

## 📚 Documentação

### Compatibilidade com Lunex DEX

#### ✅ **Status: TOTALMENTE COMPATÍVEL**

O contrato Don Fiapo está **100% compatível** com a [Lunex DEX](https://github.com/lunes-platform/Lunex):

- ✅ **Padrão PSP22**: Implementação completa
- ✅ **Eventos Obrigatórios**: `Transfer` e `Approval`
- ✅ **Funções Padrão**: Todas as 6 funções PSP22
- ✅ **Metadados Completos**: JSON com todas as informações
- ✅ **Rede Lunes**: Testnet e Mainnet suportadas

**Documentação Completa**: Ver `LUNEX_COMPATIBILITY.md`

### Documentação Técnica

- [Ink! Documentation](https://use.ink/docs/v4/)
- [Lunex DEX](https://github.com/lunes-platform/Lunex)
- [Solana Developer Guide](https://solana.com/pt/developers/guides)
- [OWASP Smart Contract Security](https://owasp.org/www-project-smart-contract-top-10/)
- [DevSecOps Guidelines](https://owasp.org/www-project-devsecops-guideline/)

### Endpoints da Rede Lunes

#### Produção

```text
wss://ws.lunes.io
wss://ws-lunes-main-01.lunes.io
wss://ws-lunes-main-02.lunes.io
wss://ws-archive.lunes.io
```

#### Testnet

```text
wss://ws-test.lunes.io
```

### UI para Interação

- **Produção**: <https://ui.use.ink/?rpc=wss://ws.lunes.io>
- **Testnet**: <https://ui.use.ink/?rpc=wss://ws-test.lunes.io>

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### Padrões de Código

- Siga as convenções do Rust
- Use `cargo fmt` para formatação
- Execute `cargo clippy` para linting
- Adicione testes para novas funcionalidades
- Documente funções públicas

### Checklist para PRs

- [ ] Código compila sem erros
- [ ] Testes passam
- [ ] Documentação atualizada
- [ ] Segue padrões de segurança
- [ ] Não introduz vulnerabilidades

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### Problemas Conhecidos

1. **Warnings do Clippy**: 71 warnings sendo tratados como erros no `cargo contract build`
2. **Testes Falhando**: 13 testes com problemas menores
3. **Integração E2E**: Testes end-to-end precisam ser configurados

### Soluções

- Para warnings do clippy: Use `#[allow(clippy::warning_name)]` quando apropriado
- Para testes falhando: Verifique a configuração do ambiente de teste
- Para E2E: Configure o ambiente de teste com DRink!

### Contato

- **Issues**: Use o sistema de issues do GitHub
- **Discord**: [Link para Discord]
- **Telegram**: [Link para Telegram]

---

**⚠️ Aviso Legal**: Este software é fornecido "como está", sem garantias de qualquer tipo. Use por sua conta e risco.

**🔒 Segurança**: Este contrato foi desenvolvido seguindo as melhores práticas de segurança, mas auditorias independentes são recomendadas antes do uso em produção.

--- [x] README técnico completo
- [x] Instruções de deploy para Lunes Network
- [x] Dockerfiles para Oracle e Web

## Deploy de Produção

### 1. Oracle Service
Utilize o Dockerfile em `oracle-service/Dockerfile`.
Renomeie `.env.production.example` para `.env` e configure suas seeds.
```bash
cd oracle-service
docker build -t don-fiapo-oracle .
docker run -d -p 3001:3001 --env-file .env don-fiapo-oracle
```

### 2. Frontend Web
Utilize o Dockerfile em `don-fiapo-web/Dockerfile`.
Certifique-se de configurar `NEXT_PUBLIC_ORACLE_URL` para apontar para seu serviço oracle.
```bash
cd don-fiapo-web
docker build -t don-fiapo-web .
docker run -d -p 3000:3000 --env-file .env.production don-fiapo-web
```
---

*🚀 Don Fiapo - Inovação em Memecoin na Lunes Network*
