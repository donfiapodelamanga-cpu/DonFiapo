process.env.DB_PATH = ':memory:';
import { PaymentRepository, PendingPayment } from '../db';

// Auditoria 2026-06-18 — alta #13: reserva atomica impede dupla confirmacao on-chain.
const mk = (id: string): PendingPayment => ({
  id,
  lunesAccount: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  paymentType: 'ico',
  itemAmount: 1,
  expectedAmount: 100,
  expectedSender: 'soLsender',
  createdAt: Date.now(),
  expiresAt: Date.now() + 600_000,
  status: 'pending',
});

describe('reserva atomica anti-TOCTOU (#13)', () => {
  it('apenas a primeira reserva vence; concorrente no mesmo pagamento recebe false', () => {
    PaymentRepository.create(mk('p1'));
    expect(PaymentRepository.reserveForProcessing('p1', 'tx-AAA')).toBe(true);
    expect(PaymentRepository.reserveForProcessing('p1', 'tx-AAA')).toBe(false);
    expect(PaymentRepository.get('p1')!.status).toBe('processing');
  });

  it('tx_hash ja usado por outro pagamento -> false (unique index)', () => {
    PaymentRepository.create(mk('p2'));
    PaymentRepository.create(mk('p3'));
    expect(PaymentRepository.reserveForProcessing('p2', 'tx-SHARED')).toBe(true);
    expect(PaymentRepository.reserveForProcessing('p3', 'tx-SHARED')).toBe(false);
  });

  it('release devolve para pending e permite retry legitimo', () => {
    PaymentRepository.create(mk('p4'));
    expect(PaymentRepository.reserveForProcessing('p4', 'tx-REL')).toBe(true);
    PaymentRepository.releaseReservation('p4');
    const after = PaymentRepository.get('p4')!;
    expect(after.status).toBe('pending');
    expect(after.transactionHash).toBeFalsy();
    expect(PaymentRepository.reserveForProcessing('p4', 'tx-REL2')).toBe(true);
  });
});
