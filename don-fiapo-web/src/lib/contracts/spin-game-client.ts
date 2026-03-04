import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { web3FromSource } from '@polkadot/extension-dapp';
import spinGameMetadata from './spin_game.json';

// Endereço do contrato do jogo Spin (será configurado após deploy)
const SPIN_GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS || '';

export interface SpinResult {
  prizeIndex: number;
  prizeDescription: string;
}

export class SpinGameClient {
  private contract: ContractPromise | null = null;
  private api: ApiPromise | null = null;

  constructor(api: ApiPromise) {
    this.api = api;
    if (SPIN_GAME_CONTRACT_ADDRESS) {
      this.contract = new ContractPromise(api, spinGameMetadata, SPIN_GAME_CONTRACT_ADDRESS);
    }
  }

  /**
   * Verifica se o contrato está configurado
   */
  isConfigured(): boolean {
    return this.contract !== null && SPIN_GAME_CONTRACT_ADDRESS !== '';
  }

  /**
   * Obtém o saldo de giros de um jogador
   */
  async getSpinBalance(playerAddress: string): Promise<number> {
    if (!this.contract || !this.api) {
      console.warn('Spin game contract not configured');
      return 0;
    }

    try {
      const gasLimit = this.api.registry.createType('WeightV2', {
        refTime: BigInt(10000000000),
        proofSize: BigInt(131072)
      }) as unknown as bigint;

      const { result, output } = await this.contract.query.getSpinBalance(
        playerAddress,
        { gasLimit },
        playerAddress
      );

      if (result.isOk && output) {
        return output.toJSON() as number;
      }
      return 0;
    } catch (error) {
      console.error('Error getting spin balance:', error);
      return 0;
    }
  }

  /**
   * Gira a roleta (requer assinatura do usuário)
   */
  async spinTheWheel(
    account: InjectedAccountWithMeta
  ): Promise<SpinResult | null> {
    if (!this.contract || !this.api) {
      throw new Error('Spin game contract not configured');
    }

    const injector = await web3FromSource(account.meta.source);

    return new Promise(async (resolve, reject) => {
      try {
        const gasLimit = this.api!.registry.createType('WeightV2', {
          refTime: BigInt(50000000000),
          proofSize: BigInt(262144),
        }) as unknown as bigint;

        await this.contract!.tx
          .spinTheWheel({ gasLimit })
          .signAndSend(account.address, { signer: injector.signer }, ({ status, events }) => {
            if (status.isInBlock || status.isFinalized) {
              // Procura pelo evento WheelSpun
              const wheelSpunEvent = events.find(({ event }) =>
                this.api!.events.contracts.ContractEmitted.is(event)
              );

              if (wheelSpunEvent) {
                // Decodifica o evento do contrato
                // Por simplicidade, retornamos um resultado padrão
                // Em produção, decodificaria o evento corretamente
                resolve({
                  prizeIndex: 0,
                  prizeDescription: 'Prêmio',
                });
              } else {
                resolve({
                  prizeIndex: 11, // "Nada" por padrão se não encontrar evento
                  prizeDescription: 'Tente novamente!',
                });
              }
            }
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Lista de prêmios disponíveis no jogo
   */
  static getPrizeList(): { index: number; name: string; description: string; color: string }[] {
    return [
      { index: 0, name: 'prizes.p10k.name', description: 'prizes.p10k.desc', color: '#FFD700' },
      { index: 1, name: 'prizes.p5k.name', description: 'prizes.p5k.desc', color: '#FFA500' },
      { index: 2, name: 'prizes.p05.name', description: 'prizes.p05.desc', color: '#1ABC9C' },
      { index: 3, name: 'prizes.usdt2.name', description: 'prizes.usdt2.desc', color: '#27AE60' },
      { index: 4, name: 'prizes.p500.name', description: 'prizes.p500.desc', color: '#3498DB' },
      { index: 5, name: 'prizes.p05.name', description: 'prizes.p05.desc', color: '#1ABC9C' },
      { index: 6, name: 'prizes.usdt050.name', description: 'prizes.usdt050.desc', color: '#2ECC71' },
      { index: 7, name: 'prizes.boost.name', description: 'prizes.boost.desc', color: '#F39C12' },
      { index: 8, name: 'prizes.p05.name', description: 'prizes.p05.desc', color: '#1ABC9C' },
      { index: 9, name: 'prizes.p50.name', description: 'prizes.p50.desc', color: '#9B59B6' },
      { index: 10, name: 'prizes.p05.name', description: 'prizes.p05.desc', color: '#E67E22' },
      { index: 11, name: 'prizes.nothing.name', description: 'prizes.nothing.desc', color: '#95A5A6' },
    ];
  }
}

export default SpinGameClient;
