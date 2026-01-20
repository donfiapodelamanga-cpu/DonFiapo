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
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
  )
`);

export type PaymentType = 'ico' | 'spin_purchase';

export interface PendingPayment {
    id: string;
    lunesAccount: string;
    paymentType: PaymentType;
    itemAmount: number; // Amount of $FIAPO or spins
    expectedAmount: number; // Amount of USDT
    expectedSender?: string;
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

    cleanupExpired: () => {
        const now = Date.now();
        const stmt = db.prepare("DELETE FROM pending_payments WHERE expires_at < ? AND status = 'pending'");
        stmt.run(now);
    }
};
