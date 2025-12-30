# 🚀 Deploy na Testnet Lunes Network

## 📋 Configuração do Ambiente

### 1. **Endpoint da Testnet**
```
WSS: wss://ws-test.lunes.io
RPC: https://rpc-test.lunes.io
```

### 2. **Configuração do Cargo.toml**
```toml
[package]
name = "don-fiapo-contract"
version = "1.0.0"
edition = "2021"

[dependencies]
ink = { version = "4.3.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2", default-features = false, features = ["derive"] }

[lib]
name = "don_fiapo_contract"
crate-type = ["cdylib"]

[features]
default = ["std"]
std = [
    "ink/std",
    "scale/std",
    "scale-info/std",
]
```

### 3. **Build para Produção**
```bash
# Build otimizado para produção
cargo contract build --release

# Verificar o arquivo .contract gerado
ls -la target/ink/don_fiapo_contract.contract
```

## 🔧 **Configuração do Polkadot.js Apps**

### 1. **Acessar Polkadot.js Apps**
- URL: https://polkadot.js.org/apps/
- Conectar à testnet Lunes: `wss://ws-test.lunes.io`

### 2. **Configurar Conta**
- Criar conta ou importar seed phrase
- Obter tokens de teste (se necessário)
- Verificar saldo da conta

## 📦 **Deploy do Contrato**

### 1. **Upload do Código**
1. Acessar: **Developer > Contracts > Upload**
2. Selecionar arquivo: `don_fiapo_contract.contract`
3. Definir valor de depósito (storage deposit)
4. Executar transação

### 2. **Instanciação do Contrato**
1. Acessar: **Developer > Contracts > Instantiate**
2. Selecionar o código uploadado
3. Configurar parâmetros de inicialização:

```json
{
  "initial_supply": "1000000000000000000000000000", // 1 bilhão de tokens
  "owner": "SEU_ACCOUNT_ID_AQUI",
  "rewards_fund": "100000000000000000000000000", // 100 milhões para recompensas
  "staking_fund": "50000000000000000000000000", // 50 milhões para staking
  "team_fund": "50000000000000000000000000" // 50 milhões para equipe
}
```

### 3. **Configuração Inicial**
Após instanciação, executar as seguintes chamadas:

1. **Configurar Sistema de Staking**
   - `update_staking_config`
   - `update_rewards_config`
   - `update_lottery_config`

2. **Configurar Sistema de Governança**
   - `add_governor` (adicionar governadores)
   - `update_governance_config`

3. **Configurar Sistema de APY**
   - `initialize_default_configs` (via APY manager)

## 🧪 **Testes na Testnet**

### 1. **Testes Básicos**
```javascript
// Teste de transferência
await contract.tx.transfer(recipient, amount, data);

// Teste de staking
await contract.tx.create_staking(stakingType, amount, duration);

// Teste de queima
await contract.tx.burn(amount);
```

### 2. **Testes de Governança**
```javascript
// Criar proposta
await contract.tx.create_proposal(proposalType, description, usdtAmount, fiapoAmount);

// Votar em proposta
await contract.tx.vote(proposalId, vote, usdtAmount, fiapoAmount);
```

### 3. **Testes de Integração**
```javascript
// Teste de distribuição de recompensas
await contract.tx.distribute_monthly_rewards(wallets, currentTime);

// Teste de loteria
await contract.tx.execute_monthly_lottery();
```

## 📊 **Monitoramento**

### 1. **Eventos Importantes**
- `Transfer` - Transferências de tokens
- `StakingCreated` - Novas posições de staking
- `RewardsDistributed` - Distribuição de recompensas
- `GovernanceProposalCreated` - Novas propostas
- `LotteryExecuted` - Execução de loterias

### 2. **Métricas a Monitorar**
- Total de tokens em staking
- Total de recompensas distribuídas
- Número de propostas de governança
- Volume de queima de tokens
- Participação em loterias

## 🔒 **Segurança na Testnet**

### 1. **Validações**
- ✅ Todos os testes unitários passando
- ✅ Validações de entrada implementadas
- ✅ Operações aritméticas seguras
- ✅ Controles de acesso funcionais

### 2. **Checklist de Deploy**
- [ ] Build otimizado gerado
- [ ] Conta com saldo suficiente
- [ ] Parâmetros de inicialização corretos
- [ ] Configurações pós-deploy definidas
- [ ] Testes de integração planejados

## 🚨 **Procedimentos de Emergência**

### 1. **Pausa do Contrato**
```javascript
// Apenas owner pode pausar
await contract.tx.pause_owner();
```

### 2. **Upgrade de Emergência**
```javascript
// Proposta de upgrade
await contract.tx.propose_upgrade(newCodeHash, description);

// Execução após aprovação
await contract.tx.execute_upgrade();
```

## 📞 **Suporte**

### 1. **Logs de Debug**
- Usar `ink::env::debug_println!` para debug
- Monitorar eventos via Polkadot.js Apps
- Verificar logs da testnet

### 2. **Contatos**
- Documentação: `Requisitos/requisitos.md`
- Código fonte: `src/`
- Testes: `tests/`

---

## 🎯 **Próximos Passos**

1. **Deploy na Testnet**
2. **Testes de Integração**
3. **Auditoria Externa**
4. **Deploy em Mainnet**
5. **Monitoramento Contínuo**

---

**✅ PROJETO PRONTO PARA DEPLOY!** 