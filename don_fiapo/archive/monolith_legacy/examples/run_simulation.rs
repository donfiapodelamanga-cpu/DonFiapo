//! Executável para rodar a simulação de 100k usuários
//! 
//! Este exemplo executa a simulação completa e gera relatórios
//! detalhados sobre oportunidades de ganhos e eficiência do sistema.

use don_fiapo_contract::simulation_100k::*;
use std::iter;

fn main() {
    println!("🚀 Iniciando Simulação Don Fiapo - 100.000 Usuários");
    println!("{}", "=".repeat(60));
    
    // Inicializar simulador
    let mut simulator = DonFiapoSimulator::new();
    simulator.initialize_users();
    
    println!("✅ Simulador inicializado com {} usuários", simulator.users.len());
    println!();
    
    // Executar simulação
    println!("🔄 Executando simulação completa...");
    let (results, global_metrics) = simulator.run_full_simulation();
    
    // Gerar relatório global
    print_global_metrics(&global_metrics);
    
    // Gerar relatório por perfil
    let profile_summary = simulator.generate_profile_summary(&results);
    print_profile_summary(&profile_summary);
    
    // Análise de oportunidades
    print_opportunities_analysis(&results);
    
    // Métricas de sustentabilidade
    print_sustainability_analysis(&global_metrics);
    
    // Recomendações estratégicas
    print_strategic_recommendations(&global_metrics, &profile_summary);
    
    println!();
    println!("🎉 Simulação concluída com sucesso!");
}

fn print_global_metrics(metrics: &GlobalMetrics) {
    println!("📊 MÉTRICAS GLOBAIS DO SISTEMA");
    println!("{}", "-".repeat(40));
    println!("👥 Total de Usuários: {}", metrics.total_users);
    println!("⚡ Transações Diárias: {}", metrics.total_daily_transactions);
    println!("💰 Volume Diário: {}", format_large_number(metrics.total_daily_volume));
    println!("💸 Taxas Diárias: {}", format_large_number(metrics.total_daily_fees));
    println!("🔥 Queima Diária: {}", format_large_number(metrics.total_daily_burn));
    println!("📉 Deflação Anual: {:.2}%", metrics.annual_burn_percentage as f64 / 100.0);
    println!("🎯 Score Sustentabilidade: {}%", metrics.system_sustainability_score);
    println!();
}

fn print_profile_summary(summary: &[(UserProfile, u32, u128, u32)]) {
    println!("👥 RESUMO POR PERFIL DE USUÁRIO");
    println!("{}", "-".repeat(40));
    println!("{:<20} {:<10} {:<20} {:<10}", "Perfil", "Usuários", "Ganho Médio/Ano", "ROI %");
    println!("{}", "-".repeat(70));
    
    for (profile, count, avg_gains, avg_roi) in summary {
        let profile_name = match profile {
            UserProfile::Whale => "🐋 Whales",
            UserProfile::LargeInvestor => "🏢 Grandes Invest.",
            UserProfile::MediumInvestor => "💼 Médios Invest.",
            UserProfile::SmallInvestor => "👤 Pequenos Invest.",
            UserProfile::ActiveTrader => "⚡ Traders Ativos",
            UserProfile::CasualUser => "🎮 Usuários Casuais",
        };
        
        println!("{:<20} {:<10} {:<20} {:<10}", 
                profile_name, 
                format!("{}", count),
                format_large_number(*avg_gains),
                format!("{}%", avg_roi));
    }
    println!();
}

fn print_opportunities_analysis(results: &[UserResults]) {
    println!("💎 ANÁLISE DE OPORTUNIDADES DE GANHOS");
    println!("{}", "-".repeat(40));
    
    // Calcular totais por categoria
    let total_staking = results.iter().map(|r| r.annual_staking_rewards).sum::<u128>();
    let total_ranking = results.iter().map(|r| r.annual_ranking_rewards).sum::<u128>();
    let total_burn = results.iter().map(|r| r.annual_burn_rewards).sum::<u128>();
    let total_affiliate = results.iter().map(|r| r.annual_affiliate_rewards).sum::<u128>();
    let total_trading = results.iter().map(|r| r.annual_trading_gains).sum::<u128>();
    let grand_total = total_staking + total_ranking + total_burn + total_affiliate + total_trading;
    
    println!("🏆 Staking Rewards: {} ({:.1}%)", 
             format_large_number(total_staking),
             (total_staking as f64 / grand_total as f64) * 100.0);
    
    println!("🎖️  Ranking Rewards: {} ({:.1}%)", 
             format_large_number(total_ranking),
             (total_ranking as f64 / grand_total as f64) * 100.0);
    
    println!("🔥 Burn Rewards: {} ({:.1}%)", 
             format_large_number(total_burn),
             (total_burn as f64 / grand_total as f64) * 100.0);
    
    println!("🤝 Affiliate Rewards: {} ({:.1}%)", 
             format_large_number(total_affiliate),
             (total_affiliate as f64 / grand_total as f64) * 100.0);
    
    println!("📈 Trading Gains: {} ({:.1}%)", 
             format_large_number(total_trading),
             (total_trading as f64 / grand_total as f64) * 100.0);
    
    println!();
    println!("💰 TOTAL DE OPORTUNIDADES: {}", format_large_number(grand_total));
    println!();
    
    // Top performers
    let mut sorted_results = results.to_vec();
    sorted_results.sort_by(|a, b| b.total_annual_gains.cmp(&a.total_annual_gains));
    
    println!("🏆 TOP 5 MAIORES GANHOS INDIVIDUAIS:");
    for (i, result) in sorted_results.iter().take(5).enumerate() {
        let profile_name = match result.profile {
            UserProfile::Whale => "Whale",
            UserProfile::LargeInvestor => "Grande Investidor",
            UserProfile::MediumInvestor => "Médio Investidor",
            UserProfile::SmallInvestor => "Pequeno Investidor",
            UserProfile::ActiveTrader => "Trader Ativo",
            UserProfile::CasualUser => "Usuário Casual",
        };
        
        println!("{}. {} - {} (ROI: {}%)", 
                i + 1, 
                profile_name,
                format_large_number(result.total_annual_gains),
                result.roi_percentage);
    }
    println!();
}

fn print_sustainability_analysis(metrics: &GlobalMetrics) {
    println!("🌱 ANÁLISE DE SUSTENTABILIDADE");
    println!("{}", "-".repeat(40));
    
    let annual_fees = metrics.total_daily_fees * 365;
    let annual_burn = metrics.total_daily_burn * 365;
    
    println!("💰 Receita Anual (Taxas): {}", format_large_number(annual_fees));
    println!("🔥 Queima Anual: {}", format_large_number(annual_burn));
    println!("📊 Ratio Queima/Receita: {:.1}%", 
             (annual_burn as f64 / annual_fees as f64) * 100.0);
    
    // Análise de sustentabilidade
    let sustainability_status = if metrics.system_sustainability_score >= 90 {
        "🟢 EXCELENTE"
    } else if metrics.system_sustainability_score >= 70 {
        "🟡 BOA"
    } else if metrics.system_sustainability_score >= 50 {
        "🟠 MODERADA"
    } else {
        "🔴 BAIXA"
    };
    
    println!("🎯 Status de Sustentabilidade: {}", sustainability_status);
    
    // Projeção de supply
    let current_supply = 30_000_000_000_000_000_000u128;
    let supply_after_1_year = if annual_burn > current_supply {
        0
    } else {
        current_supply - annual_burn
    };
    let burn_5_years = annual_burn.saturating_mul(5);
    let supply_after_5_years = if burn_5_years > current_supply {
        0
    } else {
        current_supply - burn_5_years
    };
    
    println!();
    println!("📈 PROJEÇÃO DE SUPPLY:");
    println!("• Supply Atual: {}", format_large_number(current_supply));
    println!("• Supply após 1 ano: {}", format_large_number(supply_after_1_year));
    println!("• Supply após 5 anos: {}", format_large_number(supply_after_5_years));
    
    let reduction_5_years = if burn_5_years >= current_supply {
        100.0
    } else {
        ((current_supply - supply_after_5_years) as f64 / current_supply as f64) * 100.0
    };
    println!("• Redução em 5 anos: {:.1}%", reduction_5_years);
    println!();
}

fn print_strategic_recommendations(metrics: &GlobalMetrics, summary: &[(UserProfile, u32, u128, u32)]) {
    println!("🎯 RECOMENDAÇÕES ESTRATÉGICAS");
    println!("{}", "-".repeat(40));
    
    // Análise de performance
    if metrics.system_sustainability_score >= 80 {
        println!("✅ Sistema altamente sustentável - Foco em crescimento");
        println!("   • Implementar programas de aquisição de usuários");
        println!("   • Expandir parcerias estratégicas");
        println!("   • Desenvolver features avançadas");
    } else {
        println!("⚠️  Sistema precisa de otimizações - Foco em eficiência");
        println!("   • Revisar estrutura de taxas");
        println!("   • Otimizar distribuição de recompensas");
        println!("   • Implementar mecanismos de estabilização");
    }
    
    println!();
    
    // Análise de distribuição de usuários
    let whale_count = summary.iter().find(|(p, _, _, _)| matches!(p, UserProfile::Whale))
        .map(|(_, count, _, _)| *count).unwrap_or(0);
    let total_users = summary.iter().map(|(_, count, _, _)| count).sum::<u32>();
    let whale_percentage = (whale_count as f64 / total_users as f64) * 100.0;
    
    if whale_percentage > 1.0 {
        println!("⚠️  Alta concentração de Whales ({:.1}%)", whale_percentage);
        println!("   • Implementar limites de staking para grandes holders");
        println!("   • Criar incentivos para distribuição mais equilibrada");
        println!("   • Monitorar riscos de centralização");
    } else {
        println!("✅ Distribuição equilibrada de usuários");
        println!("   • Manter incentivos atuais");
        println!("   • Focar em retenção de usuários médios");
    }
    
    println!();
    
    // Recomendações técnicas
    let tps_needed = metrics.total_daily_transactions / (24 * 60 * 60); // TPS médio
    
    println!("🔧 OTIMIZAÇÕES TÉCNICAS:");
    if tps_needed > 500 {
        println!("   • Implementar batch processing para transações");
        println!("   • Considerar soluções de Layer 2");
        println!("   • Otimizar algoritmos de consensus");
    } else {
        println!("   • Performance atual adequada");
        println!("   • Focar em otimizações de gas");
        println!("   • Melhorar experiência do usuário");
    }
    
    println!();
    
    // Próximos passos
    println!("🚀 PRÓXIMOS PASSOS RECOMENDADOS:");
    println!("   1. Implementar dashboard de métricas em tempo real");
    println!("   2. Criar sistema de alertas para métricas críticas");
    println!("   3. Desenvolver ferramentas de análise preditiva");
    println!("   4. Estabelecer programa de bug bounty");
    println!("   5. Preparar auditoria de segurança completa");
}

// Função auxiliar para formatação
fn format_large_number(num: u128) -> String {
    if num >= 1_000_000_000_000_000_000u128 {
        format!("{:.1}B FIAPO", num as f64 / 1_000_000_000_000_000_000.0)
    } else if num >= 1_000_000_000_000_000u128 {
        format!("{:.1}M FIAPO", num as f64 / 1_000_000_000_000_000.0)
    } else if num >= 1_000_000_000_000u128 {
        format!("{:.1}K FIAPO", num as f64 / 1_000_000_000_000.0)
    } else {
        format!("{} FIAPO", num)
    }
}