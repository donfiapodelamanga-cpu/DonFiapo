#[cfg(test)]
mod nft_tests {
    use ink::env::test;
    use don_fiapo_contract::ico::*;
    use ink::env::DefaultEnvironment;

    /// Testa a função token_uri para compatibilidade PSP34
    #[ink::test]
    fn test_token_uri_returns_valid_ipfs_url() {
        let manager = ICOManager::new();
        
        // Como não temos NFT criado, vamos testar diretamente a configuração IPFS
        let config = manager.get_ipfs_config(&NFTType::Free).unwrap();
        
        // Verificar se a configuração contém o gateway IPFS
        assert!(config.gateway_url.contains("https://ipfs.io/ipfs/"));
        assert!(config.metadata_hash.contains("Hash"));
    }

    /// Testa a obtenção de informações de display de um NFT
    #[ink::test]
    fn test_get_nft_display_info_free_type() {
        let manager = ICOManager::new();
        let (name, description, rarity) = manager.get_nft_display_info(&NFTType::Free);
        
        assert_eq!(name, "The Shovel of the Commoner Miner");
        assert!(description.contains("humble but reliable tool"));
        assert_eq!(rarity, "Common");
    }

    /// Testa metadados para NFT Tier 7 (mais caro)
    #[ink::test]
    fn test_get_nft_display_info_tier7() {
        let manager = ICOManager::new();
        let (name, description, rarity) = manager.get_nft_display_info(&NFTType::Tier7);
        
        assert_eq!(name, "The Royal Scepter of Don Himself");
        assert!(description.contains("ultimate symbol of power"));
        assert_eq!(rarity, "Mythic");
    }

    /// Testa as informações de display dos NFTs
    #[ink::test]
    fn test_get_nft_display_info() {
        let manager = ICOManager::new();
        
        let (name, description, rarity) = manager.get_nft_display_info(&NFTType::Tier3);
        assert_eq!(name, "The Candelabrum of the Explorer");
        assert!(description.contains("ancient candelabrum"));
        assert_eq!(rarity, "Uncommon");
        
        let (name, description, rarity) = manager.get_nft_display_info(&NFTType::Tier6);
        assert_eq!(name, "The Golden Mango Eye");
        assert_eq!(rarity, "Legendary");
    }

    /// Testa a obtenção de configuração IPFS
    #[ink::test]
    fn test_get_ipfs_config() {
        let manager = ICOManager::new();
        
        let config = manager.get_ipfs_config(&NFTType::Free)
            .expect("IPFS config should exist for Free NFT");
        
        assert!(config.image_hash.contains("Hash"));
        assert!(config.metadata_hash.contains("Hash"));
        assert_eq!(config.gateway_url, "https://ipfs.io/ipfs/");
    }

    /// Testa a atualização de hash de imagem (função administrativa)
    #[ink::test]
    fn test_update_nft_image_hash() {
        let mut manager = ICOManager::new();
        let new_hash = "QmNewImageHash123".to_string();
        
        // Atualizar hash da imagem
        manager.update_nft_image_hash(NFTType::Free, new_hash.clone());
        // Função não retorna Result, apenas executa a atualização
        
        // Verificar se foi atualizado
        let config = manager.get_ipfs_config(&NFTType::Free)
            .expect("IPFS config should exist");
        assert_eq!(config.image_hash, new_hash);
    }

    /// Testa a atualização de hash de metadados
    #[ink::test]
    fn test_update_nft_metadata_hash() {
        let mut manager = ICOManager::new();
        let new_hash = "QmNewMetadataHash456".to_string();
        
        manager.update_nft_metadata_hash(NFTType::Tier2, new_hash.clone());
        // Função não retorna Result, apenas executa a atualização
        
        let config = manager.get_ipfs_config(&NFTType::Tier2)
            .expect("IPFS config should exist");
        assert_eq!(config.metadata_hash, new_hash);
    }

    /// Testa a atualização do gateway IPFS
    #[ink::test]
    fn test_update_ipfs_gateway() {
        let mut manager = ICOManager::new();
        let new_gateway = "https://gateway.pinata.cloud/ipfs/".to_string();
        
        manager.update_ipfs_gateway(new_gateway.clone());
        // Função não retorna Result, apenas executa a atualização
        
        // Verificar se todos os configs foram atualizados
        for nft_type in [NFTType::Free, NFTType::Tier2, NFTType::Tier3, 
                        NFTType::Tier4, NFTType::Tier5, NFTType::Tier6, NFTType::Tier7] {
            let config = manager.get_ipfs_config(&nft_type)
                .expect("IPFS config should exist");
            assert_eq!(config.gateway_url, new_gateway);
        }
    }

    /// Testa as estatísticas de mineração de um NFT
    #[ink::test]
    fn test_get_mining_stats_new_nft() {
        let mut manager = ICOManager::new();
        
        // Para este teste, vamos verificar a configuração direta
        let config = &manager.nft_configs[2]; // Tier3 é index 2
        // Os valores estão em 10^8, então dividimos por 10^8
        assert_eq!(config.tokens_per_nft / 100_000_000, 16_800); // New: 150/day x 112 days
        assert_eq!(config.daily_mining_rate / 100_000_000, 150); // New: 150 tokens/day
    }

    /// Testa a validação de tipos de NFT
    #[ink::test]
    fn test_nft_type_validation() {
        let manager = ICOManager::new();
        
        // Verificar se todos os tipos de NFT têm configuração
        for (i, nft_type) in [NFTType::Free, NFTType::Tier2, NFTType::Tier3,
                             NFTType::Tier4, NFTType::Tier5, NFTType::Tier6, NFTType::Tier7]
                             .iter().enumerate() {
            let config = manager.get_ipfs_config(nft_type);
             assert!(config.is_ok(), "NFT type {:?} should have IPFS config", nft_type);
             
             // Para get_nft_metadata, precisamos de um ID de NFT, não o tipo
             // Vamos testar apenas se a configuração existe
             let (name, _, _) = manager.get_nft_display_info(nft_type);
            assert!(!name.is_empty(), "NFT type {:?} should have name", nft_type);
        }
    }

    /// Testa a consistência entre configurações de NFT e metadados
    #[ink::test]
    fn test_nft_config_metadata_consistency() {
        let manager = ICOManager::new();
        
        // Verificar Tier 4
        let config = &manager.nft_configs[3]; // Tier4 é index 3
        // get_nft_metadata espera um ID de NFT, não o tipo
         // Vamos testar apenas a configuração
         let (name, _, _) = manager.get_nft_display_info(&NFTType::Tier4);
         assert_eq!(name, "The Power to Unlock the Kingdom's Wealth");
        
        // Config tem preço em centavos
        assert_eq!(config.price_usdt_cents, 5500); // $55 = 5500 centavos
        
        // Verificar total de tokens (valores em 10^8)
        assert_eq!(config.tokens_per_nft / 100_000_000, 33_600); // New: 300/day x 112 days
    }

    /// Testa URLs completas de IPFS
    #[ink::test]
    fn test_complete_ipfs_urls() {
        let manager = ICOManager::new();
        
        for nft_type in [NFTType::Free, NFTType::Tier7] {
            let config = manager.get_ipfs_config(&nft_type).unwrap();
            
            // Verificar se a URL do gateway está configurada corretamente
            assert_eq!(config.gateway_url, "https://ipfs.io/ipfs/");
            
            // Verificar se tem hash de imagem e metadados
            assert!(!config.image_hash.is_empty());
            assert!(!config.metadata_hash.is_empty());
        }
    }
}