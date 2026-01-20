# 💼 **GUIA DE CONFIGURAÇÃO DE CARTEIRAS - REDE LUNES**

**Data:** 12 de janeiro de 2026  
**Versão:** 1.0  
**Status:** ✅ DOCUMENTAÇÃO ATIVA

---

## 🎯 **VISÃO GERAL**

Este guia apresenta tutoriais completos para configurar a rede Lunes em carteiras compatíveis com Substrate. A rede Lunes é uma blockchain baseada no framework Substrate, compatível com todas as carteiras do ecossistema Polkadot.

---

## 🔗 **INFORMAÇÕES DA REDE LUNES**

| Parâmetro | Valor |
|-----------|-------|
| **Nome da Rede** | Lunes |
| **RPC Principal** | `wss://ws.lunes.io` |
| **RPC Backup** | `wss://ws-lunes-main-02.lunes.io` |
| **SS58 Prefix** | 42 |
| **Token Nativo** | LUNES |
| **Decimais** | 8 |
| **Interface Web** | https://dev.lunes.io/?rpc=wss://ws.lunes.io |

---

## 💵 **ONDE COMPRAR LUNES**

### **BitStorage Exchange**
Você pode adquirir LUNES diretamente na BitStorage Exchange:

🔗 **Link:** [https://bitstorage.finance](https://bitstorage.finance)

> [!TIP]
> A BitStorage é uma exchange centralizada que oferece pares de negociação com LUNES. Verifique sempre os pares disponíveis antes de negociar.

---

## 🏆 **POLKADOT.JS APPS** (Recomendado)

A Polkadot.js Apps é a interface mais completa e recomendada para interagir com a rede Lunes, oferecendo acesso a todas as funcionalidades da blockchain.

### **📋 Passo a Passo**

#### **Passo 1: Acessar a Interface**

Acesse a interface Polkadot.js Apps já configurada para a rede Lunes:

🔗 **Link Direto:** [https://dev.lunes.io/?rpc=wss://ws.lunes.io](https://dev.lunes.io/?rpc=wss://ws.lunes.io)

Ou acesse a interface padrão e configure manualmente:

🔗 **Interface Padrão:** [https://polkadot.js.org/apps](https://polkadot.js.org/apps)

#### **Passo 2: Configurar RPC Personalizado (se necessário)**

Se você acessou a interface padrão, configure a rede Lunes:

1. Clique no **ícone de rede** no canto superior esquerdo
2. Role até encontrar **"Development"** → **"Custom"**
3. Digite o endpoint: `wss://ws.lunes.io`
4. Clique em **"Switch"**

#### **Passo 3: Atualizar Metadados (IMPORTANTE na Primeira Vez!)**

> [!WARNING]
> **Na primeira vez que você conectar uma carteira ao navegador, é OBRIGATÓRIO atualizar os metadados para que a carteira reconheça corretamente a rede Lunes.**

1. Com a rede Lunes conectada, vá em **Settings** → **Metadata**
2. Clique em **"Update metadata"**
3. Confirme a atualização na extensão da sua carteira
4. Aguarde a confirmação de que os metadados foram salvos

#### **Passo 4: Criar ou Importar Conta**

**Para criar uma nova conta:**
1. Vá em **Accounts** → **Add account**
2. Anote cuidadosamente as 12/24 palavras de recuperação (seed phrase)
3. Configure nome e senha
4. Clique em **"Save"**

**Para importar uma conta existente:**
1. Vá em **Accounts** → **Add account**
2. Selecione **"Mnemonic seed"**
3. Cole sua seed phrase
4. Configure a senha e salve

#### **Passo 5: Visualizar Saldo e Transações**

1. Acesse **Accounts** na barra lateral
2. Suas contas LUNES serão listadas com os saldos
3. Para ver transações: **Network** → **Explorer**

### **✅ Funcionalidades Disponíveis**

- ✅ Visualizar saldos LUNES
- ✅ Enviar e receber tokens
- ✅ Interagir com Smart Contracts (Ink!)
- ✅ Participar da Governança
- ✅ Staking
- ✅ Explorar blocos e transações

---

## 🦊 **TALISMAN WALLET**

Talisman é uma carteira moderna com interface intuitiva, suportando múltiplas redes Substrate e EVM.

### **📋 Passo a Passo**

#### **Passo 1: Instalar a Extensão**

1. Acesse [https://talisman.xyz](https://talisman.xyz)
2. Baixe a extensão para seu navegador (Chrome/Firefox/Brave)
3. Crie uma nova carteira ou importe uma existente

#### **Passo 2: Adicionar a Rede Lunes**

1. Abra a extensão Talisman
2. Vá em **Settings** (⚙️ ícone de engrenagem)
3. Selecione **"Networks & Tokens"**
4. Clique em **"Manage Networks"**
5. Selecione **"Polkadot"** no menu lateral
6. Clique em **"Add network"**
7. Configure os seguintes campos:
   - **RPC URL:** `wss://ws.lunes.io`
   - **Network Name:** Lunes (preenche automaticamente)
8. Clique em **"Add Network"**

#### **Passo 3: Atualizar Metadados**

1. Acesse [https://dev.lunes.io/?rpc=wss://ws.lunes.io](https://dev.lunes.io/?rpc=wss://ws.lunes.io)
2. O Talisman irá solicitar atualização de metadados
3. Clique em **"Update"** quando a notificação aparecer
4. Confirme na extensão

#### **Passo 4: Usar a Carteira**

1. Suas contas agora suportam a rede Lunes
2. O saldo LUNES aparecerá automaticamente no dashboard
3. Para enviar/receber, selecione a rede Lunes nas opções

### **✅ Funcionalidades**

- ✅ Interface multi-chain intuitiva
- ✅ Suporte NFT nativo
- ✅ Portfolio consolidado
- ✅ Navegador dApp integrado

---

## 📱 **SUBWALLET**

SubWallet é uma carteira popular para o ecossistema Polkadot/Kusama, disponível como extensão e aplicativo móvel.

### **📋 Passo a Passo**

#### **Passo 1: Instalar o SubWallet**

1. Acesse [https://subwallet.app](https://subwallet.app)
2. Baixe a versão para seu dispositivo:
   - **Extensão:** Chrome, Firefox, Brave, Edge
   - **Mobile:** iOS ou Android
3. Crie ou importe uma carteira

#### **Passo 2: Adicionar a Rede Lunes**

1. Abra o SubWallet
2. Toque no ícone de **menu** (☰) no canto superior esquerdo
3. Vá em **"Settings"** → **"Manage networks"**
4. Toque no botão **"+"** (canto superior direito)
5. Em **"Provider URL"**, digite: `wss://ws.lunes.io`
6. O SubWallet detectará automaticamente:
   - Nome da rede: Lunes
   - Símbolo do token: LUNES
   - Tipo de rede: Substrate
7. Clique em **"Save"**

#### **Passo 3: Ativar a Rede**

1. Após salvar, você será redirecionado para "Manage networks"
2. Procure por **"Lunes"** na lista
3. Ative o toggle para habilitar a rede
4. A rede Lunes agora estará disponível

#### **Passo 4: Atualizar Metadados**

1. Acesse qualquer dApp da Lunes (ex: [dev.lunes.io](https://dev.lunes.io/?rpc=wss://ws.lunes.io))
2. Conecte sua carteira SubWallet
3. Aceite a atualização de metadados quando solicitado

### **✅ Funcionalidades**

- ✅ Suporte móvel nativo
- ✅ QR Code para pagamentos
- ✅ Staking integrado
- ✅ Histórico de transações detalhado

---

## 🌟 **NOVA WALLET** (Mobile)

Nova Wallet é a carteira Polkadot mais completa para dispositivos móveis, com suporte a mais de 50 parachains.

### **📋 Passo a Passo**

#### **Passo 1: Instalar o Nova Wallet**

1. Baixe o Nova Wallet:
   - **iOS:** [App Store](https://apps.apple.com/app/nova-polkadot-kusama-wallet/id1597119355)
   - **Android:** [Google Play](https://play.google.com/store/apps/details?id=io.novafoundation.nova.market)
2. Crie uma nova carteira ou importe usando seed phrase

#### **Passo 2: Adicionar Rede Personalizada**

1. Abra o Nova Wallet
2. Vá em **Settings** (⚙️)
3. Selecione **"Manage networks"** ou **"Custom networks"**
4. Toque em **"Add network"**
5. Configure os campos:
   - **WebSocket URL:** `wss://ws.lunes.io`
   - **Network name:** Lunes
   - **Token symbol:** LUNES
   - **Decimals:** 8
6. Salve a configuração

> [!NOTE]
> O Nova Wallet requer URLs iniciando com `wss://` para redes Substrate.

#### **Passo 3: Sincronizar e Usar**

1. Aguarde a sincronização com a rede
2. Seus saldos LUNES aparecerão no dashboard
3. Use as funcionalidades normais de envio/recebimento

### **✅ Funcionalidades**

- ✅ Interface mobile premium
- ✅ Staking com APY calculado
- ✅ Crowdloans
- ✅ DApp browser

---

## 🔧 **FEARLESS WALLET** (Mobile)

Fearless Wallet é outra opção mobile popular para redes Substrate.

### **📋 Passo a Passo**

1. Baixe o Fearless Wallet na App Store ou Google Play
2. Configure sua carteira
3. Vá em **Networks** ou **Settings**
4. Adicione uma rede personalizada com: `wss://ws.lunes.io`
5. Atualize os metadados quando conectar a um dApp

---

## 💻 **POLKADOT.JS EXTENSION** (Navegador)

A extensão Polkadot.js é essencial para assinar transações em dApps web.

### **📋 Passo a Passo**

#### **Passo 1: Instalar a Extensão**

1. Acesse a [Chrome Web Store](https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd) ou [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/)
2. Instale a extensão Polkadot{.js}
3. Crie uma nova conta ou importe uma existente

#### **Passo 2: Conectar à Rede Lunes**

1. Acesse [https://dev.lunes.io/?rpc=wss://ws.lunes.io#/accounts](https://dev.lunes.io/?rpc=wss://ws.lunes.io#/accounts)
2. A extensão será detectada automaticamente
3. Autorize o acesso quando solicitado

#### **Passo 3: Atualizar Metadados (OBRIGATÓRIO)**

> [!CAUTION]
> **Sem a atualização de metadados, você não conseguirá assinar transações corretamente na rede Lunes!**

1. Na interface Polkadot.js Apps, vá em **Settings** → **Metadata**
2. Clique em **"Update metadata"**
3. Na extensão, clique em **"Yes, do this metadata update"**
4. Aguarde a confirmação

### **✅ Uso**

- Use a extensão para assinar transações em qualquer dApp Lunes
- Gerencie múltiplas contas
- Exporte/importe contas via JSON

---

## ❓ **SOLUÇÃO DE PROBLEMAS**

### **❌ "Unable to connect to the network"**

1. Verifique sua conexão com a internet
2. Tente o RPC de backup: `wss://ws-lunes-main-02.lunes.io`
3. Recarregue a página/aplicativo

### **❌ "Unknown types" ou erros de decodificação**

Este erro ocorre quando os metadados não foram atualizados:

1. Acesse [dev.lunes.io](https://dev.lunes.io/?rpc=wss://ws.lunes.io)
2. Vá em **Settings** → **Metadata**
3. Clique em **"Update metadata"**
4. Confirme na sua carteira

### **❌ Saldo não aparece**

1. Certifique-se de que a rede Lunes está ativa na carteira
2. Verifique se você está usando o endereço correto
3. Aguarde a sincronização completa

### **❌ Transações falhando**

1. Verifique se você tem LUNES suficiente para taxas
2. Atualize os metadados da carteira
3. Tente usar o RPC alternativo

---

## 📚 **RECURSOS ÚTEIS**

| Recurso | Link |
|---------|------|
| **Interface Web Lunes** | [dev.lunes.io](https://dev.lunes.io/?rpc=wss://ws.lunes.io) |
| **Contratos Ink!** | [ui.use.ink](https://ui.use.ink/?rpc=wss://ws.lunes.io) |
| **BitStorage (Comprar LUNES)** | [bitstorage.finance](https://bitstorage.finance) |
| **Documentação Polkadot.js** | [polkadot.js.org](https://polkadot.js.org/docs/) |
| **Talisman Wallet** | [talisman.xyz](https://talisman.xyz) |
| **SubWallet** | [subwallet.app](https://subwallet.app) |
| **Nova Wallet** | [novawallet.io](https://novawallet.io) |

---

## 🎯 **RESUMO RÁPIDO**

| Carteira | Plataforma | Dificuldade | Melhor Para |
|----------|------------|-------------|-------------|
| **Polkadot.js Apps** | Web | ⭐⭐ Médio | Funcionalidades completas |
| **Talisman** | Extensão | ⭐ Fácil | Multi-chain, NFTs |
| **SubWallet** | Extensão/Mobile | ⭐ Fácil | Uso diário |
| **Nova Wallet** | Mobile | ⭐ Fácil | Mobile premium |
| **Fearless** | Mobile | ⭐ Fácil | Staking |

---

**🚀 Pronto para usar a rede Lunes!**

Escolha sua carteira preferida e comece a interagir com o ecossistema Lunes hoje mesmo. Lembre-se sempre de atualizar os metadados na primeira conexão!

