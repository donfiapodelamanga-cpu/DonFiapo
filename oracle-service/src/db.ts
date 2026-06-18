import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../payments.db');
const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS pending_payments (
    id TEXT PRIMARY KEY,
    lunes_account TEXT NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'ico',
      item_amount TEXT NOT NULL,
      expected_amount REAL NOT NULL,
      expected_sender TEXT,
      transaction_hash TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending'
  )
`);

const existingColumns = db.prepare("PRAGMA table_info(pending_payments)").all() as { name: string }[];
if (!existingColumns.some((column) => column.name === 'transaction_hash')) {
    db.exec('ALTER TABLE pending_payments ADD COLUMN transaction_hash TEXT');
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS pending_payments_transaction_hash_key
  ON pending_payments(transaction_hash)
  WHERE transaction_hash IS NOT NULL
`);

export type PaymentType = 'ico' | 'spin_purchase' | 'nft_mint' | `staking:${string}`;

export interface PendingPayment {
    id: string;
    lunesAccount: string;
    paymentType: PaymentType;
    itemAmount: number; // Amount of $FIAPO or spins
    expectedAmount: number; // Amount of USDT
    expectedSender?: string;
    transactionHash?: string;
    createdAt: number;
    expiresAt: number;
    status: string;
}

export const PaymentRepository = {
    create: (payment: PendingPayment) => {
        const stmt = db.prepare(`
      INSERT INTO pending_payments (id, lunes_account, payment_type, item_amount, expected_amount, expected_sender, created_at, expires_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
            payment.id,
            payment.lunesAccount,
            payment.paymentType,
            String(payment.itemAmount),
            payment.expectedAmount,
            payment.expectedSender || null,
            payment.createdAt,
            payment.expiresAt,
            payment.status
        );
    },

    get: (id: string): PendingPayment | undefined => {
        const stmt = db.prepare('SELECT * FROM pending_payments WHERE id = ?');
        const row = stmt.get(id) as any;
        if (!row) return undefined;
        return {
            id: row.id,
            lunesAccount: row.lunes_account,
            paymentType: row.payment_type,
            itemAmount: Number(row.item_amount),
            expectedAmount: row.expected_amount,
            expectedSender: row.expected_sender,
            transactionHash: row.transaction_hash,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            status: row.status,
        };
    },

    findByTransactionHash: (transactionHash: string): PendingPayment | undefined => {
        const stmt = db.prepare('SELECT * FROM pending_payments WHERE transaction_hash = ?');
        const row = stmt.get(transactionHash) as any;
        if (!row) return undefined;
        return {
            id: row.id,
            lunesAccount: row.lunes_account,
            paymentType: row.payment_type,
            itemAmount: Number(row.item_amount),
            expectedAmount: row.expected_amount,
            expectedSender: row.expected_sender,
            transactionHash: row.transaction_hash,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            status: row.status,
        };
    },

    delete: (id: string) => {
        const stmt = db.prepare('DELETE FROM pending_payments WHERE id = ?');
        stmt.run(id);
    },

    // Optional: Mark as completed instead of deleting
    updateStatus: (id: string, status: string) => {
        const stmt = db.prepare('UPDATE pending_payments SET status = ? WHERE id = ?');
        stmt.run(status, id);
    },

    completeWithTransactionHash: (id: string, transactionHash: string) => {
        const stmt = db.prepare("UPDATE pending_payments SET status = 'completed', transaction_hash = ? WHERE id = ?");
        stmt.run(transactionHash, id);
    },

    // Auditoria 2026-06-18 — alta #13: reserva atomica anti-TOCTOU.
    // UPDATE condicional pending->processing gravando o transaction_hash sob o
    // unique index. Retorna true SOMENTE para o requisitante que ganhou a corrida;
    // concorrentes (mesmo paymentId ja em processing, ou tx_hash ja usado por outro
    // pagamento -> violacao de unique) recebem false e NAO chamam o contrato.
    reserveForProcessing: (id: string, transactionHash: string): boolean => {
        try {
            const stmt = db.prepare("UPDATE pending_payments SET status = 'processing', transaction_hash = ? WHERE id = ? AND status = 'pending'");
            const info = stmt.run(transactionHash, id);
            return info.changes > 0;
        } catch {
            return false; // unique constraint: transaction_hash ja reservado
        }
    },

    // Libera a reserva (processing->pending, limpa tx_hash) quando a confirmacao
    // on-chain falha, permitindo retry legitimo.
    releaseReservation: (id: string) => {
        const stmt = db.prepare("UPDATE pending_payments SET status = 'pending', transaction_hash = NULL WHERE id = ? AND status = 'processing'");
        stmt.run(id);
    },

    cleanupExpired: () => {
        const now = Date.now();
        const stmt = db.prepare("DELETE FROM pending_payments WHERE expires_at < ? AND status = 'pending'");
        stmt.run(now);
    }
};
