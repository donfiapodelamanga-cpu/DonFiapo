import { SolanaVerifier } from './solana-verifier';

// Auditoria 2026-06-18 — crítico #3: validação de mint USDT deve valer para
// TODA transferência considerada (top-level e inner), rejeitando `transfer`
// simples (que não prova o mint) e `transferChecked` com mint != USDT.
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const RECEIVER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const SENDER = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
const OTHER_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

const makeVerifier = () => new SolanaVerifier('https://api.devnet.solana.com', USDT, RECEIVER, 1);
const topIx = (parsed: any) => ({ transaction: { message: { instructions: [{ parsed, program: 'spl-token' }] } }, meta: {} });
const innerIx = (parsed: any) => ({ transaction: { message: { instructions: [] } }, meta: { innerInstructions: [{ instructions: [{ parsed, program: 'spl-token' }] }] } });

describe('extractUSDTTransfer — validação de mint (auditoria #3)', () => {
  const v = makeVerifier();
  const extract = (tx: any) => (v as any).extractUSDTTransfer(tx);

  it('rejeita transfer simples top-level (mint não verificável)', () => {
    expect(extract(topIx({ type: 'transfer', info: { source: SENDER, destination: RECEIVER, amount: '1000' } }))).toBeNull();
  });

  it('rejeita transferChecked com mint diferente de USDT', () => {
    expect(extract(topIx({ type: 'transferChecked', info: { source: SENDER, destination: RECEIVER, amount: '1000', mint: OTHER_MINT } }))).toBeNull();
  });

  it('aceita transferChecked com mint USDT', () => {
    expect(extract(topIx({ type: 'transferChecked', info: { authority: SENDER, destination: RECEIVER, amount: '1000', mint: USDT } })))
      .toEqual({ sender: SENDER, receiver: RECEIVER, amount: 1000 });
  });

  it('rejeita transfer simples em inner instructions (bypass fechado)', () => {
    expect(extract(innerIx({ type: 'transfer', info: { source: SENDER, destination: RECEIVER, amount: '1000' } }))).toBeNull();
  });

  it('rejeita transferChecked inner com mint diferente', () => {
    expect(extract(innerIx({ type: 'transferChecked', info: { source: SENDER, destination: RECEIVER, amount: '1000', mint: OTHER_MINT } }))).toBeNull();
  });

  it('aceita transferChecked USDT em inner instructions', () => {
    expect(extract(innerIx({ type: 'transferChecked', info: { authority: SENDER, destination: RECEIVER, amount: '1000', mint: USDT } })))
      .toEqual({ sender: SENDER, receiver: RECEIVER, amount: 1000 });
  });
});
