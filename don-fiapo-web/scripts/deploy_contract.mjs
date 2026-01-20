import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, BlueprintPromise } from '@polkadot/api-contract';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente manualmente simples
function loadEnv() {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

async function main() {
    console.log("🚀 Iniciando Deploy do Don Fiapo na Lunes Testnet...");

    // Lista de redudância para Mainnet
    const wsUrls = [
        'wss://ws.lunes.io',
        'wss://ws-lunes-main-01.lunes.io',
        'wss://ws-lunes-main-02.lunes.io',
        'wss://ws-archive.lunes.io'
    ];
    // Se definido no ENV, usa o do ENV (como array unitário ou split por vírgula se formos sofisticados, mas aqui vamos priorizar a lista hardcoded de fallback se não houver ENV específico ou usar o ENV como override)
    // Para simplificar e atender o pedido, vamos usar a lista direta se o ENV for o default antigo ou vazio.
    const envRpc = process.env.NEXT_PUBLIC_LUNES_RPC;
    const wsUrl = (envRpc && envRpc !== 'wss://ws.lunes.io') ? [envRpc] : wsUrls;
    const mnemonic = process.env.LUNES_MNEMONIC;

    if (!mnemonic) {
        console.error("❌ Erro: LUNES_MNEMONIC não definida no arquivo .env");
        console.log("ℹ️  Crie um arquivo .env na raiz de don-fiapo-web com: LUNES_MNEMONIC=\"suas doze palavras ...\"");
        process.exit(1);
    }

    // 1. Conectar ao Node
    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider, noInitWarn: true });

    // Await API ready
    await api.isReady;

    // Obter infos da cadeia
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);
    console.log(`🔗 Conectado a: ${chain} (${nodeName} v${nodeVersion})`);

    // 2. Preparar Conta
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(mnemonic);
    console.log(`👤 Conta de Deploy: ${deployer.address}`);

    let balance = await api.query.system.account(deployer.address);
    // @ts-ignore
    console.log(`💰 Saldo Atual: ${balance.data.free.toHuman()}`);

    if (balance.data.free.toBigInt() === 0n) {
        console.log("⚠️ Saldo zerado. Tentando fundear com Alice...");
        const alice = keyring.addFromUri('//Alice');
        try {
            // 5000 tokens * 10^8
            const amount = 5000n * 100000000n;
            const transfer = api.tx.balances.transferAllowDeath
                ? api.tx.balances.transferAllowDeath(deployer.address, amount)
                : api.tx.balances.transfer(deployer.address, amount);

            await new Promise((resolve, reject) => {
                transfer.signAndSend(alice, { nonce: -1 }, ({ status }) => {
                    if (status.isInBlock) {
                        console.log(`💸 Fundos recebidos no bloco ${status.asInBlock}`);
                        resolve();
                    }
                }).catch(reject);
            });
        } catch (e) {
            console.error("❌ Falha no funding, tentando continuar: ", e.message);
        }
    }

    // 3. Ler Arquivo do Contrato
    const contractPath = path.resolve(__dirname, '../../don_fiapo/target/ink/don_fiapo_contract.contract');

    if (!fs.existsSync(contractPath)) {
        console.error(`❌ Contrato não encontrado em: ${contractPath}`);
        console.error("⚠️  Certifique-se de ter rodado: cargo contract build --release");
        process.exit(1);
    }

    const contractJson = fs.readFileSync(contractPath, 'utf8');
    const contractAbi = JSON.parse(contractJson);

    // 4. Upload e Instanciação
    console.log(`📜 Carregando código do contrato...`);
    const code = new CodePromise(api, contractAbi, contractAbi.source.wasm);

    // Parâmetros do Construtor
    const decimals = 100_000_000n; // 8 decimals
    const initialSupply = 300_000_000_000n * decimals; // 300 Bilhões * 10^8
    const name = "Don Fiapo";
    const symbol = "FIAPO";

    // Carteiras do sistema
    const burnWallet = deployer.address;
    const teamWallet = deployer.address;
    const stakingWallet = deployer.address;
    const rewardsWallet = deployer.address;
    const initialOracles = [deployer.address];

    console.log(`🏗️  Instanciando contrato...`);
    console.log(`   - Supply: ${initialSupply}`);

    // Determinar limites de gas (aproximado)
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 3000n * 1000000n,
        proofSize: 20000n,
    });

    const unsubscribe = await code.tx.new(
        { gasLimit, storageDepositLimit: null },
        name,
        symbol,
        initialSupply,
        burnWallet,
        teamWallet,
        stakingWallet,
        rewardsWallet,
        initialOracles
    )
        .signAndSend(deployer, async ({ status, contract, dispatchError, events }) => {
            if (status.isInBlock || status.isFinalized) {
                console.log(`📦 Bloco incluído: ${status.asInBlock.toHex()}`);

                if (contract) {
                    console.log(`✅ DEPLOY SUCESSO!`);
                    console.log(`📍 Endereço do Contrato: ${contract.address.toString()}`);

                    // Salvar endereço no .env para o frontend usar
                    const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
                    const newEnvContent = envContent.replace(
                        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
                        `NEXT_PUBLIC_CONTRACT_ADDRESS=${contract.address.toString()}`
                    );
                    // Se não existir a linha, adicionar
                    const finalEnvContent = newEnvContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS')
                        ? newEnvContent
                        : newEnvContent + `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contract.address.toString()}`;

                    fs.writeFileSync(path.join(__dirname, '../.env'), finalEnvContent);
                    console.log(`📝 Atualizado .env com o novo endereço.`);

                    // Atualizar .env.local tambem
                    const envLocalPath = path.join(__dirname, '../.env.local');
                    if (fs.existsSync(envLocalPath)) {
                        const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
                        const newEnvLocalContent = envLocalContent.replace(
                            /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
                            `NEXT_PUBLIC_CONTRACT_ADDRESS=${contract.address.toString()}`
                        );
                        const finalEnvLocalContent = newEnvLocalContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS')
                            ? newEnvLocalContent
                            : newEnvLocalContent + `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contract.address.toString()}`;
                        fs.writeFileSync(envLocalPath, finalEnvLocalContent);
                        console.log(`📝 Atualizado .env.local com o novo endereço.`);
                    }

                    process.exit(0);
                }
            }

            if (dispatchError) {
                if (dispatchError.isModule) {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    const { docs, name, section } = decoded;
                    console.error(`❌ Erro de Deploy: ${section}.${name}: ${docs.join(' ')}`);
                } else {
                    console.error(`❌ Erro de Deploy: ${dispatchError.toString()}`);
                }
                process.exit(1);
            }
        });
}

main().catch(console.error);
