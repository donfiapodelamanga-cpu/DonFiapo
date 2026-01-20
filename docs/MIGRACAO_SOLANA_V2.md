# Plano de Migração: Solana Web3.js 1.x → 2.0 (@solana/kit)

## Contexto
A vulnerabilidade `bigint-buffer` (CVE-2025-3194) não tem correção disponível. A única solução definitiva é migrar para `@solana/kit` (web3.js 2.0), que não depende dessa biblioteca.

## Escopo de Mudanças

### Arquivos Afetados

#### Frontend (`don-fiapo-web`)
1. `src/lib/web3/solana.ts` - Utilitários Solana
2. `src/hooks/useSolana.ts` - Hook de integração wallet
3. `src/components/providers/wallet-provider.tsx` - Provider de wallet
4. `package.json` - Dependências

#### Backend (`oracle-service`)
1. `src/solana-verifier.ts` - Verificador de transações USDT
2. `package.json` - Dependências

## Mudanças de API

### Principais Diferenças

| Conceito | v1.x | v2.0 (@solana/kit) |
|:---------|:-----|:-------------------|
| **Conexão** | `new Connection(url)` | `createSolanaRpc(url)` |
| **Chaves públicas** | `new PublicKey(addr)` | `address(addr)` |
| **Transações** | `new Transaction()` | `pipe()` + builders |
| **Assinatura** | `signTransaction()` | `signTransaction()` (diferente API) |
| **Tokens SPL** | `@solana/spl-token` | `@solana-program/token` |

## Novas Dependências

```json
{
  "@solana/kit": "^2.1.0",
  "@solana-program/token": "^0.5.0",
  "@solana/wallet-standard-wallet-adapter-react": "^1.1.0"
}
```

## Dependências a Remover

```json
{
  "@solana/web3.js": "remove",
  "@solana/spl-token": "remove",
  "@solana/wallet-adapter-*": "avaliar compatibilidade"
}
```

## Implementação

### Fase 1: Oracle Service (Backend)
O backend é mais simples pois não usa wallet adapter.

1. [ ] Instalar `@solana/kit` e `@solana-program/token`
2. [ ] Reescrever `solana-verifier.ts`
3. [ ] Testar verificação de transações
4. [ ] Remover dependências antigas

### Fase 2: Frontend (don-fiapo-web)
Mais complexo devido ao wallet adapter.

1. [ ] Verificar compatibilidade do wallet adapter com v2.0
2. [ ] Atualizar providers
3. [ ] Reescrever `useSolana.ts`
4. [ ] Reescrever `solana.ts`
5. [ ] Testar pagamentos USDT
6. [ ] Remover dependências antigas

## Riscos

- **Wallet Adapter**: O `@solana/wallet-adapter-react` pode não ser totalmente compatível ainda
- **Breaking Changes**: API completamente diferente, requer atenção em cada linha de código
- **Testes**: Necessário testar todos os fluxos de pagamento

## Alternativa Temporária

Se a migração completa for muito arriscada agora, podemos:
1. Aceitar o risco documentado (bigint-buffer é DoS, não RCE)
2. Monitorar atualizações do ecossistema Solana
3. Migrar quando o wallet adapter tiver suporte oficial

---

**Decisão necessária:** Prosseguir com migração completa ou aceitar risco documentado?
