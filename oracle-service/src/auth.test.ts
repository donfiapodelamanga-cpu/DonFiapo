import { apiKeyMatches, assertApiKeyConfig } from './index';

// Auditoria 2026-06-18 — #11 (timing-safe) e #12 (gate de força da API key).
describe('API key auth', () => {
  const K = 'x'.repeat(40);

  it('#11 igual -> true', () => expect(apiKeyMatches(K, K)).toBe(true));
  it('#11 diferente -> false', () => expect(apiKeyMatches('y'.repeat(40), K)).toBe(false));
  it('#11 tamanhos diferentes -> false (sem throw)', () => expect(apiKeyMatches('short', K)).toBe(false));
  it('#11 header array/ausente -> false', () => {
    expect(apiKeyMatches(['x'], K)).toBe(false);
    expect(apiKeyMatches(undefined, K)).toBe(false);
  });
  it('#11 expected vazio -> false', () => expect(apiKeyMatches('anything', '')).toBe(false));

  it('#12 chave forte em modo real -> ok', () => expect(() => assertApiKeyConfig(K, false)).not.toThrow());
  it('#12 chave fraca/ausente em modo real -> throw', () => {
    expect(() => assertApiKeyConfig('short', false)).toThrow();
    expect(() => assertApiKeyConfig('', false)).toThrow();
  });
  it('#12 modo mock ignora a chave', () => expect(() => assertApiKeyConfig('', true)).not.toThrow());
});
