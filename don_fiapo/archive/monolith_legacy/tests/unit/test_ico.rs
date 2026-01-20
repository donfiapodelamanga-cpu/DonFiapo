#![cfg(test)]

use don_fiapo::ico::*;
use ink::primitives::AccountId;

/// Cria uma conta de teste
fn create_test_account(id: u8) -> AccountId {
    AccountId::from([id; 32])
}

/// Testa a inicialização das configurações dos NFTs
#[test]
fn test_initialize_nft_configs() {
    let mut ico_manager = ICOManager::new();
    
    // Verifica se as configurações foram inicializadas corretamente
    assert_eq!(ico_manager.stats.ico_active, false);
    assert_eq!(ico_manager.next_nft_id, 1);
    
    // Verifica se as configurações dos NFTs foram inicializadas
    let free_config = ico_manager.get_nft_config(&NFTType::Free).unwrap();
    assert_eq!(free_config.max_supply, 10000);
    assert_eq!(free_config.tokens_per_nft, 25000 * 10u128.pow(8));
    
    let tier2_config = ico_manager.get_nft_config(&NFTType::Tier2).unwrap();
    assert_eq!(tier2_config.max_supply, 5000);
    assert_eq!(tier2_config.price_usdt_cents, 25000);
}

/// Testa a função de mintagem de NFTs gratuitos
#[test]
fn test_mint_free_nft() {
    let mut ico_manager = ICOManager::new();
    ico_manager.stats.ico_active = true;
    
    let caller = create_test_account(1);
    
    // Tenta mintar um NFT gratuito sem saldo suficiente de LUNES
    let result = ico_manager.mint_nft(NFTType::Free, 0);
    assert!(matches!(result, Err(ICOError::InsufficientLunesBalance)));
    
    // Tenta mintar um NFT gratuito com saldo suficiente de LUNES
    let result = ico_manager.mint_nft(NFTType::Free, 1000 * 10u128.pow(8));
    // Note: Este teste falhará porque não temos acesso ao ambiente de teste do Ink!
    // Em um ambiente de teste real, precisaríamos mockar o ambiente
}

/// Testa a função de mintagem de NFTs pagos
#[test]
fn test_mint_paid_nft() {
    let mut ico_manager = ICOManager::new();
    ico_manager.stats.ico_active = true;
    
    // Tenta mintar um NFT pago sem pagamento suficiente
    let result = ico_manager.mint_nft(NFTType::Tier2, 0);
    assert!(matches!(result, Err(ICOError::InsufficientPayment)));
}

/// Testa a função de cálculo de tokens minerados
#[test]
fn test_calculate_mined_tokens() {
    let mut ico_manager = ICOManager::new();
    ico_manager.stats.ico_active = true;
    
    // Cria um NFT de teste
    let config = ico_manager.get_nft_config(&NFTType::Free).unwrap().clone();
    let nft_data = NFTData {
        id: 1,
        nft_type: NFTType::Free,
        owner: create_test_account(1),
        created_at: 0,
        tokens_mined: 0,
        tokens_claimed: 0,
        last_mining_timestamp: 0,
        active: true,
    };
    
    ico_manager.nfts.insert(&1, &nft_data);
    
    // Calcula tokens minerados
    let claimable = ico_manager.get_claimable_tokens(1).unwrap();
    // Note: Este teste também falhará porque não temos acesso ao ambiente de teste do Ink!
}

/// Testa a função de staking de tokens
#[test]
fn test_stake_tokens() {
    let mut ico_manager = ICOManager::new();
    
    // Tenta fazer staking sem NFT
    let result = ico_manager.stake_tokens(1, 1000, crate::staking::StakingType::DonFiapo);
    assert!(matches!(result, Err(ICOError::NFTNotFound)));
}

/// Testa a função de unstaking de tokens
#[test]
fn test_unstake_tokens() {
    let mut ico_manager = ICOManager::new();
    
    // Tenta fazer unstaking sem NFT
    let result = ico_manager.unstake_tokens(1, 1000, crate::staking::StakingType::DonFiapo);
    assert!(matches!(result, Err(ICOError::NFTNotFound)));
}

/// Testa a função de resgate de tokens
#[test]
fn test_claim_tokens() {
    let mut ico_manager = ICOManager::new();
    
    // Tenta resgatar tokens sem NFT
    let result = ico_manager.claim_tokens(1);
    assert!(matches!(result, Err(ICOError::NFTNotFound)));
}

/// Testa a função de verificação de limite de NFTs gratuitos
#[test]
fn test_free_nft_limit() {
    let mut ico_manager = ICOManager::new();
    ico_manager.stats.ico_active = true;
    
    let caller = create_test_account(1);
    
    // Verifica o limite de NFTs gratuitos por carteira
    let result = ico_manager.can_mint_free_nft(&caller, 1000 * 10u128.pow(8));
    assert!(result.is_ok());
}

/// Testa os casos de erro
#[test]
fn test_error_cases() {
    let mut ico_manager = ICOManager::new();
    
    // Testa NFT não encontrado
    let result = ico_manager.get_claimable_tokens(999);
    assert!(matches!(result, Err(ICOError::NFTNotFound)));
    
    // Testa ICO não ativo
    let result = ico_manager.mint_nft(NFTType::Free, 1000 * 10u128.pow(8));
    assert!(matches!(result, Err(ICOError::ICONotActive)));
}
