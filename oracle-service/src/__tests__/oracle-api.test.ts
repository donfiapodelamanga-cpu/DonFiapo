import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

type HealthResponse = {
  status: string;
  timestamp: number;
};

type ErrorResponse = {
  error: string;
};

type CreatePaymentResponse = {
  paymentId: string;
  amount: number;
};

type PaymentStatusResponse = {
  paymentType: string;
  expectedAmount: number;
  itemAmount: number;
  expectedSender: string;
};

describe('oracle HTTP API', () => {
  let server: Server | undefined;
  let baseUrl: string;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = join(tmpdir(), `don-fiapo-oracle-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = dbPath;
    process.env.ORACLE_API_KEY = 'test-oracle-key';

    const { createServer } = await import('../index');
    const app = createServer();

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server?.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }

    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  async function postJson(path: string, body: unknown, apiKey = 'test-oracle-key') {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  async function readJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
  }

  it('serves health without API key', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await readJson<HealthResponse>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });

  it('requires API key for payment creation', async () => {
    const response = await postJson('/api/payment/create', {
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'nft_mint',
      tierId: 2,
      quantity: 1,
      expectedSender: 'solana-wallet',
    }, '');

    expect(response.status).toBe(401);
  });

  it('rejects client-priced payment creation payloads', async () => {
    const response = await postJson('/api/payment/create', {
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'nft_mint',
      tierId: 2,
      quantity: 1,
      expectedAmount: 1,
      itemAmount: 999,
      expectedSender: 'solana-wallet',
    });
    const body = await readJson<ErrorResponse>(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Client supplied/);
  });

  it('creates a derived NFT payment and exposes status by id', async () => {
    const createResponse = await postJson('/api/payment/create', {
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'nft_mint',
      tierId: 2,
      quantity: 2,
      expectedSender: 'solana-wallet',
    });
    const created = await readJson<CreatePaymentResponse>(createResponse);

    expect(createResponse.status).toBe(200);
    expect(created.paymentId).toMatch(/^PAY_/);
    expect(created.amount).toBe(82_000_000);

    const statusResponse = await fetch(`${baseUrl}/api/payment/${created.paymentId}`);
    const status = await readJson<PaymentStatusResponse>(statusResponse);

    expect(statusResponse.status).toBe(200);
    expect(status.paymentType).toBe('nft_mint');
    expect(status.expectedAmount).toBe(82_000_000);
    expect(status.itemAmount).toBe(33_600);
    expect(status.expectedSender).toBe('solana-wallet');
  });

  it('validates payment verification request shape before chain calls', async () => {
    const response = await postJson('/api/payment/verify', {
      paymentId: 'PAY_missing_hash',
    });
    const body = await readJson<ErrorResponse>(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Missing paymentId or transactionHash/);
  });
});
