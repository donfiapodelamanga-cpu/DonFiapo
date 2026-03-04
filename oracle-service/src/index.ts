/**
 * Don Fiapo Oracle Service
 * 
 * Serviço que monitora pagamentos USDT na Solana e confirma no contrato Lunes.
 * 
 * Fluxo:
 * 1. Frontend solicita pagamento → Backend cria registro pendente
 * 2. Usuário paga USDT na Solana
 * 3. Oracle detecta transação → Verifica → Confirma no contrato Lunes
 * 4. Contrato libera funcionalidade (staking, ICO, etc.)
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { SolanaVerifier } from './solana-verifier';
import { LunesContractClient, ConfirmPaymentResult } from './lunes-contract';
import { PaymentRepository, PendingPayment } from './db';
import { OracleWatcher } from './watcher';
import { NobleWatcher } from './noble-watcher'; // NEW IMPORT

// Load environment - priority: process.env > .env local > .env root
// Only load from files if not already set in environment
dotenv.config(); // Load from oracle-service/.env first
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Then from root .env

// Configuração
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  usdtTokenAddress: process.env.USDT_TOKEN_ADDRESS || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  usdtReceiverAddress: process.env.USDT_RECEIVER_ADDRESS || '',
  lunesRpcUrls: (process.env.LUNES_RPC_URL || 'wss://ws.lunes.io').split(',').map(url => url.trim()),
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  nobleContractAddress: process.env.NOBLE_CONTRACT_ADDRESS || '', // Add this
  oracleSeed: process.env.ORACLE_SEED || '//OracleAccount',
  minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS || '12', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '10000', 10),
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.ORACLE_API_KEY || 'dev-secret-key', // Default for dev only
  enableMock: process.env.ENABLE_MOCK_PAYMENTS === 'true',
};

// Registro de pagamentos pendentes (em produção, use Redis ou DB)
// interface PendingPayment mooved to db.ts

// Registro de pagamentos pendentes gerenciado via db.ts
// const pendingPayments: Map<string, PendingPayment> = new Map();

// Clientes
let solanaVerifier: SolanaVerifier;
let lunesClient: LunesContractClient;
let oracleWatcher: OracleWatcher;
let nobleWatcher: NobleWatcher; // Declare nobleWatcher

// Rate Limiting (Simple In-Memory)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

function rateLimiter(req: Request, res: Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }

  record.count++;
  rateLimitMap.set(ip, record);

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

// Authentication Middleware
function authenticate(req: Request, res: Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    return;
  }
  next();
}

/**
 * Inicializa o serviço
 */
async function initialize(): Promise<void> {
  console.log('🚀 Iniciando Don Fiapo Oracle Service...\n');

  if (config.enableMock) {
    console.log('⚠️  MODO MOCK ATIVADO - Sem conexão real com blockchains\n');
  }

  // Valida configuração (menos rigorosa em modo mock)
  if (!config.enableMock) {
    if (!config.usdtReceiverAddress) {
      throw new Error('USDT_RECEIVER_ADDRESS não configurado');
    }
    if (!config.contractAddress) {
      throw new Error('CONTRACT_ADDRESS não configurado');
    }
  }

  // Inicializa verificador Solana
  solanaVerifier = new SolanaVerifier(
    config.solanaRpcUrl,
    config.usdtTokenAddress,
    config.usdtReceiverAddress || 'MockReceiverAddress',
    config.minConfirmations
  );
  console.log('✅ Verificador Solana inicializado');
  console.log(`   USDT Receiver: ${config.usdtReceiverAddress || 'MockReceiverAddress'}`);

  // Inicializa cliente Lunes
  lunesClient = new LunesContractClient(
    config.lunesRpcUrls,
    config.contractAddress || 'MockContractAddress',
    config.oracleSeed
  );

  // Só conecta se não estiver em modo mock
  if (!config.enableMock) {
    await lunesClient.connect();
    console.log('✅ Cliente Lunes conectado');
    console.log(`   Oracle Address: ${lunesClient.getOracleAddress()}`);
  } else {
    console.log('✅ Cliente Lunes inicializado (MOCK)');
  }
  console.log('');

  // Inicializa e inicia o watcher (só em modo real)
  if (!config.enableMock) {
    oracleWatcher = new OracleWatcher(solanaVerifier, lunesClient, config.pollIntervalMs);
    oracleWatcher.start();
    console.log('✅ Oracle Watcher iniciado');
  } else {
    console.log('⏸️  Oracle Watcher desabilitado em modo mock');
  }

  // Inicializa Noble Watcher se endereço configurado
  if (!config.enableMock && config.nobleContractAddress) {
    nobleWatcher = new NobleWatcher(
      config.lunesRpcUrls,
      config.nobleContractAddress
    );
    await nobleWatcher.start();
    console.log('✅ Noble Watcher inicializado');
  } else if (!config.nobleContractAddress) {
    console.log('⚠️  Noble Contract Address not set - Skipping Noble Watcher');
  }
}

/**
 * Cria servidor Express para API
 */
function createServer(): express.Application {
  const app = express();
  app.use(express.json());

  // Apply Rate Limiting globally
  app.use(rateLimiter);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  /**
   * POST /api/payment/create
   * 
   * Cria um pagamento pendente
   * Body: { lunesAccount, fiapoAmount, expectedAmount, expectedSender? }
   */


  // ... inside createServer ...

  /**
   * POST /api/payment/create
   */
  /**
   * POST /api/payment/create
   * Protected by API Key
   */
  app.post('/api/payment/create', authenticate, (req: Request, res: Response) => {
    const { lunesAccount, paymentType, itemAmount, expectedAmount, expectedSender } = req.body;

    if (!lunesAccount || !paymentType || !itemAmount || !expectedAmount) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const id = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payment: PendingPayment = {
      id,
      lunesAccount,
      paymentType,
      itemAmount,
      expectedAmount,
      expectedSender,
      createdAt: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hora
      status: 'pending'
    };

    try {
      PaymentRepository.create(payment);
    } catch (e) {
      console.error("DB Error:", e);
      res.status(500).json({ error: "Failed to persist payment" });
      return;
    }

    res.json({
      paymentId: id,
      payToAddress: config.usdtReceiverAddress,
      amount: expectedAmount,
      amountUsdt: expectedAmount / 1_000_000,
      expiresAt: payment.expiresAt,
      instructions: `Envie ${expectedAmount / 1_000_000} USDT para ${config.usdtReceiverAddress}`,
    });
  });

  /**
   * POST /api/payment/verify
   */
  /**
   * POST /api/payment/verify
   * Protected by API Key
   */
  app.post('/api/payment/verify', authenticate, async (req: Request, res: Response) => {
    const { paymentId, transactionHash } = req.body;

    if (!paymentId || !transactionHash) {
      res.status(400).json({ error: 'Missing paymentId or transactionHash' });
      return;
    }

    // Busca pagamento pendente
    const payment = PaymentRepository.get(paymentId);
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Check status
    if (payment.status !== 'pending') {
      res.status(400).json({ error: `Payment already ${payment.status}` });
      return;
    }

    // Verifica se expirou
    if (Date.now() > payment.expiresAt) {
      // PaymentRepository.delete(paymentId); // Optional: keep history
      PaymentRepository.updateStatus(paymentId, 'expired');
      res.status(400).json({ error: 'Payment expired' });
      return;
    }

    try {
      // 1. Verifica transação na Solana
      console.log(`\n🔍 Verificando transação: ${transactionHash}`);
      const verification = await solanaVerifier.verifyTransaction(
        transactionHash,
        payment.expectedAmount,
        payment.expectedSender
      );

      if (!verification.isValid) {
        res.status(400).json({
          error: 'Transaction verification failed',
          details: verification.error,
        });
        return;
      }

      console.log('✅ Transação Solana verificada!');

      // 2. Confirma no contrato Lunes com base no tipo de pagamento
      let confirmResult: ConfirmPaymentResult;

      if (payment.paymentType === 'spin_purchase') {
        console.log('📝 Creditando giros no contrato Lunes...');
        confirmResult = await lunesClient.creditSpins(
          payment.lunesAccount,
          payment.itemAmount, // quantidade de giros
          transactionHash
        );
      } else {
        // Lógica padrão para ICO
        console.log('📝 Confirmando pagamento de ICO no contrato Lunes...');
        confirmResult = await lunesClient.confirmSolanaPayment(
          transactionHash,
          verification.sender,
          verification.amount,
          verification.blockTime,
          verification.slot
        );
      }

      if (!confirmResult.success) {
        res.status(500).json({
          error: 'Failed to confirm on Lunes contract',
          details: confirmResult.error,
        });
        return;
      }

      console.log('✅ Pagamento confirmado no contrato!');

      // 3. Atualiza status
      PaymentRepository.updateStatus(paymentId, 'completed');

      res.json({
        success: true,
        message: 'Payment verified and confirmed',
        solana: {
          transactionHash,
          sender: verification.sender,
          amount: verification.amount,
          confirmations: verification.confirmations,
        },
        lunes: {
          transactionHash: confirmResult.transactionHash,
          blockNumber: confirmResult.blockNumber,
        },
      });

    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      res.status(500).json({
        error: 'Verification error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/payment/:id
   */
  app.get('/api/payment/:id', (req: Request, res: Response) => {
    const payment = PaymentRepository.get(req.params.id);

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({
      ...payment,
      isExpired: Date.now() > payment.expiresAt
    });
  });

  return app;
}

/**
 * Main
 */
async function main(): Promise<void> {
  try {
    await initialize();

    const app = createServer();
    app.listen(config.port, () => {
      console.log(`\n🌐 Oracle Service rodando em http://localhost:${config.port}`);
      console.log('\nEndpoints disponíveis:');
      console.log('  GET  /health              - Health check');
      console.log('  POST /api/payment/create  - Criar pagamento pendente');
      console.log('  POST /api/payment/verify  - Verificar e confirmar pagamento');
      console.log('  GET  /api/payment/:id     - Consultar status do pagamento');
      console.log('\n📋 Exemplo de uso:');
      console.log('  1. POST /api/payment/create');
      console.log('     Body: { "lunesAccount": "5...", "paymentType": "ico", "itemAmount": 1000, "expectedAmount": 1000000 }');
      console.log('  2. Usuário envia USDT para o endereço retornado');
      console.log('  3. POST /api/payment/verify');
      console.log('     Body: { "paymentId": "PAY_...", "transactionHash": "5Vfy..." }');
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar serviço:', error);
    process.exit(1);
  }
}

main();
