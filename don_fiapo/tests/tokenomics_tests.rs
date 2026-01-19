#[cfg(test)]
mod tokenomics_tests {
    use don_fiapo_contract::ico::*;
    use don_fiapo_contract::nft_evolution::*;
    
    #[test]
    fn test_evolution_tier_requirements() {
        let manager = EvolutionManager::new();
        
        // Tier 0 (Free) -> Tier 1: Requires 5
        let tiers_free_4 = vec![0, 0, 0, 0];
        assert!(manager.can_evolve(&tiers_free_4).is_err());
        
        let tiers_free_5 = vec![0, 0, 0, 0, 0];
        assert_eq!(manager.can_evolve(&tiers_free_5).unwrap(), 1);
        
        // Tier 1 -> Tier 2: Requires 2
        let tiers_t1_1 = vec![1];
        assert!(manager.can_evolve(&tiers_t1_1).is_err());
        
        let tiers_t1_2 = vec![1, 1];
        assert_eq!(manager.can_evolve(&tiers_t1_2).unwrap(), 2);
    }

    #[test]
    fn test_burn_rewards_values() {
        let manager = EvolutionManager::new();
        let decimals = 10u128.pow(8);
        
        assert_eq!(manager.get_burn_reward(0), 100 * decimals);   // Shovel
        assert_eq!(manager.get_burn_reward(1), 500 * decimals);   // Pickaxe
        assert_eq!(manager.get_burn_reward(5), 50_000 * decimals); // Mango Eye
        assert_eq!(manager.get_burn_reward(6), 100_000 * decimals); // Scepter
    }

    #[test]
    fn test_prestige_bonus_triggers() {
        let manager = EvolutionManager::new();
        let decimals = 10u128.pow(8);
        let max_supply = 50_000;
        
        // Early Adopter (Tier 2 - Pickaxe)
        assert_eq!(manager.get_prestige_bonus(1, 1, max_supply), 10_000 * decimals);
        assert_eq!(manager.get_prestige_bonus(1, 100, max_supply), 10_000 * decimals);
        assert_eq!(manager.get_prestige_bonus(1, 101, max_supply), 0);
        
        // Last Survivor (Tier 3 - Candelabrum)
        assert_eq!(manager.get_prestige_bonus(2, 49_991, max_supply), 100_000 * decimals);
        assert_eq!(manager.get_prestige_bonus(2, 50_000, max_supply), 100_000 * decimals);
        assert_eq!(manager.get_prestige_bonus(2, 50_001, max_supply), 0);
        
        // Royal Scepter (Tier 7)
        assert_eq!(manager.get_prestige_bonus(6, 1, 1000), 1_000_000 * decimals);
    }

    #[test]
    fn test_dynamic_supply_adjustments() {
        let mut manager = ICOManager::new();
        
        // Pickaxe (Tier 2, idx 1)
        let nft_type = NFTType::Tier2;
        
        // Simular que já foram vendidas 10 unidades (inicializando estado para o teste)
        if let Some(config) = manager.get_nft_config_mut(&nft_type) {
             config.minted = 10;
        }

        let initial_max = manager.get_nft_config(&nft_type).unwrap().max_supply;
        let initial_minted = manager.get_nft_config(&nft_type).unwrap().minted;
        
        // Burn 2 Pickaxes
        manager.record_nft_burn(&nft_type);
        manager.record_nft_burn(&nft_type);
        
        let config_after_burn = manager.get_nft_config(&nft_type).unwrap();
        assert_eq!(config_after_burn.max_supply, initial_max - 2);
        assert_eq!(config_after_burn.minted, initial_minted - 2);
        
        // Evolve to Candelabrum (Tier 3, idx 2)
        let target_type = NFTType::Tier3;
        let target_initial_max = manager.get_nft_config(&target_type).unwrap().max_supply;
        let target_initial_minted = manager.get_nft_config(&target_type).unwrap().minted;
        
        manager.record_evolution_mint(&target_type);
        
        let config_after_upgrade = manager.get_nft_config(&target_type).unwrap();
        assert_eq!(config_after_upgrade.max_supply, target_initial_max + 1);
        assert_eq!(config_after_upgrade.minted, target_initial_minted + 1);
        
        // Verify stats
        assert_eq!(manager.stats.evolved_per_type[2], 1);
        assert_eq!(manager.stats.total_created_per_type[2], 1);
    }
}
