import { readFileSync } from 'fs';
import { join } from 'path';

const srcRoot = join(process.cwd(), 'src');

describe('payment replay protection', () => {
  it('persists and checks transaction hashes before confirming payments', () => {
    const dbSource = readFileSync(join(srcRoot, 'db.ts'), 'utf8');
    const indexSource = readFileSync(join(srcRoot, 'index.ts'), 'utf8');

    expect(dbSource).toMatch(/transaction_hash TEXT/);
    expect(dbSource).toMatch(/pending_payments_transaction_hash_key/);
    expect(dbSource).toMatch(/findByTransactionHash/);
    expect(dbSource).toMatch(/completeWithTransactionHash/);
    expect(indexSource).toMatch(/PaymentRepository\.findByTransactionHash\(transactionHash\)/);
    expect(indexSource).toMatch(/PaymentRepository\.completeWithTransactionHash\(paymentId,\s*transactionHash\)/);
  });
});
