# Plano de Ação: Finalização da Refatoração de Segurança dos Contratos

Este documento detalha o progresso da refatoração de segurança dos contratos `ink!` e os passos restantes para concluir a tarefa.

## O que foi feito

1. **Contrato `oracle_multisig`:**
   - O contrato foi completamente restaurado a partir do código legado.
   - As chamadas cross-contract foram adaptadas para a API do `ink! 4.x`.
   - O erro de compilação relacionado à redefinição do tipo `Balance` foi corrigido.
   - O contrato foi compilado com sucesso e os artefatos foram gerados.

2. **Contrato `ico`:**
   - Todas as operações aritméticas inseguras (`+`, `*`, `/`, `+=`) foram substituídas por suas versões seguras (`saturating_add`, `saturating_mul`, etc.).
   - Problemas de compilação relacionados à herança de workspace no `Cargo.toml` foram resolvidos.
   - O contrato foi compilado com sucesso e os artefatos foram gerados.

## O que falta fazer

O foco principal agora é finalizar a refatoração do contrato `staking`.

### 1. Contrato `staking` (`contracts/staking/src/lib.rs`)

As seguintes correções de segurança aritmética ainda precisam ser aplicadas e validadas:

- **Função `unstake`:**
  - A linha `let lusdt_penalty = 10 * LUSDT_SCALE;` precisa ser alterada para `let lusdt_penalty = 10_u128.saturating_mul(LUSDT_SCALE);`.
- **Função `calculate_rewards`:**
  - O corpo inteiro da função precisa ser substituído para usar operações `saturating_*` e para incluir o atributo `#[allow(clippy::arithmetic_side_effects)]` para lidar com os avisos rigorosos do compilador.

## Próximos Passos

Para continuar de onde paramos, siga estes passos:

1. **Aplicar as correções restantes no contrato `staking`:**
   - Use a ferramenta de edição de código para aplicar as duas correções detalhadas acima no arquivo `contracts/staking/src/lib.rs`.

2. **Compilar o contrato `staking`:**
   - Execute o comando `cargo contract build` no diretório `contracts/staking` para garantir que ele compile sem erros e que os artefatos (`.contract`, `.wasm`, `.json`) sejam gerados.

3. **Recompilar todos os contratos do projeto:**
   - Execute `cargo contract build` em cada um dos diretórios dos contratos (`core`, `ico`, `oracle_multisig`, `staking`, etc.) para garantir que todo o ecossistema está consistente e pronto para deploy.

Depois de seguir estes passos, a tarefa de refatoração de segurança estará concluída.
