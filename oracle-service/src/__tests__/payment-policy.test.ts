import {
  InvalidPaymentRequestError,
  normalizePaymentCreateRequest,
} from '../payment-policy';

describe('payment create policy', () => {
  it('derives spin purchase amount and price from the official package id', () => {
    const payment = normalizePaymentCreateRequest({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'spin_purchase',
      packageId: 'spin-50',
      itemAmount: 999,
      expectedAmount: 1,
    });

    expect(payment).toMatchObject({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'spin_purchase',
      itemAmount: 50,
      expectedAmount: 40_000_000,
    });
  });

  it('rejects spin purchases without an official package id', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'spin_purchase',
        itemAmount: 50,
        expectedAmount: 1,
      })
    ).toThrow(InvalidPaymentRequestError);
  });

  it('rejects unknown payment types', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'god_mode',
        itemAmount: 1,
        expectedAmount: 1,
      })
    ).toThrow(InvalidPaymentRequestError);
  });

  it('requires positive finite amounts for non-spin payments', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'nft_mint',
        itemAmount: 1,
        expectedAmount: 0,
      })
    ).toThrow(InvalidPaymentRequestError);
  });

  it('derives NFT mint amount and price from tier id and quantity', () => {
    const payment = normalizePaymentCreateRequest({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'nft_mint',
      tierId: 2,
      quantity: 3,
      expectedSender: 'solana-wallet',
    });

    expect(payment).toMatchObject({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'nft_mint',
      itemAmount: 50_400,
      expectedAmount: 123_000_000,
      expectedSender: 'solana-wallet',
    });
  });

  it('rejects NFT mint requests that try to override item or expected amount', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'nft_mint',
        tierId: 2,
        quantity: 1,
        itemAmount: 999_999,
        expectedAmount: 1,
        expectedSender: 'solana-wallet',
      })
    ).toThrow(InvalidPaymentRequestError);
  });

  it('derives staking payment amount from pool, method and FIAPO amount', () => {
    const payment = normalizePaymentCreateRequest({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'staking',
      stakingType: 'don-fiapo',
      paymentMethod: 'usdt',
      fiapoAmount: 10_000,
      expectedSender: 'solana-wallet',
    });

    expect(payment).toMatchObject({
      lunesAccount: '5FakeLunesAccount',
      paymentType: 'staking:don-fiapo:usdt',
      itemAmount: 10_000,
      expectedAmount: 100_000_000,
      expectedSender: 'solana-wallet',
    });
  });

  it('rejects staking requests with client-priced overrides or unsupported methods', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'staking:don-fiapo:usdt',
        fiapoAmount: 10_000,
        itemAmount: 10_000,
        expectedAmount: 1,
        expectedSender: 'solana-wallet',
      })
    ).toThrow(InvalidPaymentRequestError);

    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'staking',
        stakingType: 'don-fiapo',
        paymentMethod: 'lusdt',
        fiapoAmount: 10_000,
        expectedSender: 'lunes-wallet',
      })
    ).toThrow(InvalidPaymentRequestError);
  });

  it('rejects legacy ICO payment creation until a derived pricing policy exists', () => {
    expect(() =>
      normalizePaymentCreateRequest({
        lunesAccount: '5FakeLunesAccount',
        paymentType: 'ico',
        itemAmount: 1,
        expectedAmount: 1,
      })
    ).toThrow(InvalidPaymentRequestError);
  });
});
