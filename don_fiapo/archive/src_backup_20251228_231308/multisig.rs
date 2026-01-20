//! Sistema de Multi-Assinatura para reduzir centralização
//! 
//! Este módulo implementa um sistema de multi-assinatura robusto para operações críticas,
//! reduzindo a dependência de um único owner e aumentando a segurança do contrato.

use ink::prelude::vec::Vec;
use ink::storage::Mapping;
use scale::{Decode, Encode};

/// Erros relacionados ao sistema de multi-assinatura
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum MultiSigError {
    /// Operação não autorizada
    Unauthorized,
    /// Proposta não encontrada
    ProposalNotFound,
    /// Proposta já executada
    ProposalAlreadyExecuted,
    /// Proposta expirada
    ProposalExpired,
    /// Assinaturas insuficientes
    InsufficientSignatures,
    /// Signatário já assinou
    AlreadySigned,
    /// Signatário não autorizado
    NotAuthorizedSigner,
    /// Threshold inválido
    InvalidThreshold,
    /// Muitos signatários
    TooManySigners,
}

/// Tipos de operações que requerem multi-assinatura
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum OperationType {
    /// Transferência de ownership
    TransferOwnership { new_owner: AccountId },
    /// Mudança de configuração crítica
    ConfigChange { config_type: String, new_value: String },
    /// Pausa de emergência
    EmergencyPause { reason: String },
    /// Upgrade do contrato
    ContractUpgrade { new_implementation: AccountId },
    /// Mudança de wallets do sistema
    SystemWalletChange { wallet_type: String, new_wallet: AccountId },
    /// Mudança de threshold de multi-sig
    ThresholdChange { new_threshold: u32 },
    /// Adição/remoção de signatários
    SignerManagement { action: String, signer: AccountId },
}

/// Status de uma proposta
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ProposalStatus {
    /// Proposta ativa, aguardando assinaturas
    Active,
    /// Proposta executada com sucesso
    Executed,
    /// Proposta expirada
    Expired,
    /// Proposta cancelada
    Cancelled,
}

/// Estrutura de uma proposta multi-sig
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Proposal {
    /// ID único da proposta
    pub id: u32,
    /// Tipo de operação
    pub operation: OperationType,
    /// Criador da proposta
    pub proposer: AccountId,
    /// Timestamp de criação
    pub created_at: u64,
    /// Timestamp de expiração
    pub expires_at: u64,
    /// Status atual
    pub status: ProposalStatus,
    /// Lista de signatários que já assinaram
    pub signatures: Vec<AccountId>,
    /// Número de assinaturas necessárias
    pub required_signatures: u32,
    /// Hash da operação para verificação
    pub operation_hash: [u8; 32],
}

/// Sistema de Multi-Assinatura
#[derive(Debug, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct MultiSigSystem {
    /// Signatários autorizados
    pub authorized_signers: Vec<AccountId>,
    /// Número mínimo de assinaturas necessárias
    pub threshold: u32,
    /// Propostas ativas e históricas
    pub proposals: Mapping<u32, Proposal>,
    /// Próximo ID de proposta
    pub next_proposal_id: u32,
    /// Tempo padrão de expiração (em segundos)
    pub default_expiration_time: u64,
    /// Máximo de signatários permitidos
    pub max_signers: u32,
}

impl MultiSigSystem {
    /// Cria um novo sistema de multi-assinatura
    pub fn new(
        initial_signers: Vec<AccountId>,
        threshold: u32,
        default_expiration_time: u64,
    ) -> Result<Self, MultiSigError> {
        // Validações
        if threshold == 0 || threshold > initial_signers.len() as u32 {
            return Err(MultiSigError::InvalidThreshold);
        }
        
        if initial_signers.len() > 10 {
            return Err(MultiSigError::TooManySigners);
        }

        Ok(Self {
            authorized_signers: initial_signers,
            threshold,
            proposals: Mapping::default(),
            next_proposal_id: 1,
            default_expiration_time,
            max_signers: 10,
        })
    }

    /// Cria uma nova proposta
    pub fn create_proposal(
        &mut self,
        proposer: AccountId,
        operation: OperationType,
        current_time: u64,
        custom_expiration: Option<u64>,
    ) -> Result<u32, MultiSigError> {
        // Verificar se o proposer é um signatário autorizado
        if !self.is_authorized_signer(&proposer) {
            return Err(MultiSigError::NotAuthorizedSigner);
        }

        let proposal_id = self.next_proposal_id;
        let expires_at = custom_expiration
            .unwrap_or(current_time + self.default_expiration_time);

        let operation_hash = self.calculate_operation_hash(&operation);

        let proposal = Proposal {
            id: proposal_id,
            operation,
            proposer,
            created_at: current_time,
            expires_at,
            status: ProposalStatus::Active,
            signatures: Vec::new(),
            required_signatures: self.threshold,
            operation_hash,
        };

        self.proposals.insert(proposal_id, &proposal);
        self.next_proposal_id += 1;

        Ok(proposal_id)
    }

    /// Assina uma proposta
    pub fn sign_proposal(
        &mut self,
        proposal_id: u32,
        signer: AccountId,
        current_time: u64,
    ) -> Result<bool, MultiSigError> {
        // Verificar se o signer é autorizado
        if !self.is_authorized_signer(&signer) {
            return Err(MultiSigError::NotAuthorizedSigner);
        }

        let mut proposal = self.proposals.get(proposal_id)
            .ok_or(MultiSigError::ProposalNotFound)?;

        // Verificar status da proposta
        if proposal.status != ProposalStatus::Active {
            return Err(MultiSigError::ProposalAlreadyExecuted);
        }

        // Verificar expiração
        if current_time > proposal.expires_at {
            proposal.status = ProposalStatus::Expired;
            self.proposals.insert(proposal_id, &proposal);
            return Err(MultiSigError::ProposalExpired);
        }

        // Verificar se já assinou
        if proposal.signatures.contains(&signer) {
            return Err(MultiSigError::AlreadySigned);
        }

        // Adicionar assinatura
        proposal.signatures.push(signer);

        // Verificar se atingiu o threshold
        let ready_to_execute = proposal.signatures.len() >= proposal.required_signatures as usize;

        self.proposals.insert(proposal_id, &proposal);

        Ok(ready_to_execute)
    }

    /// Executa uma proposta se tiver assinaturas suficientes
    pub fn execute_proposal(
        &mut self,
        proposal_id: u32,
        current_time: u64,
    ) -> Result<OperationType, MultiSigError> {
        let mut proposal = self.proposals.get(proposal_id)
            .ok_or(MultiSigError::ProposalNotFound)?;

        // Verificar status
        if proposal.status != ProposalStatus::Active {
            return Err(MultiSigError::ProposalAlreadyExecuted);
        }

        // Verificar expiração
        if current_time > proposal.expires_at {
            proposal.status = ProposalStatus::Expired;
            self.proposals.insert(proposal_id, &proposal);
            return Err(MultiSigError::ProposalExpired);
        }

        // Verificar assinaturas suficientes
        if proposal.signatures.len() < proposal.required_signatures as usize {
            return Err(MultiSigError::InsufficientSignatures);
        }

        // Marcar como executada
        proposal.status = ProposalStatus::Executed;
        self.proposals.insert(proposal_id, &proposal);

        Ok(proposal.operation)
    }

    /// Verifica se uma conta é signatário autorizado
    pub fn is_authorized_signer(&self, account: &AccountId) -> bool {
        self.authorized_signers.contains(account)
    }

    /// Adiciona um novo signatário (requer multi-sig)
    pub fn add_signer(&mut self, new_signer: AccountId) -> Result<(), MultiSigError> {
        if self.authorized_signers.len() >= self.max_signers as usize {
            return Err(MultiSigError::TooManySigners);
        }

        if !self.authorized_signers.contains(&new_signer) {
            self.authorized_signers.push(new_signer);
        }

        Ok(())
    }

    /// Remove um signatário (requer multi-sig)
    pub fn remove_signer(&mut self, signer: AccountId) -> Result<(), MultiSigError> {
        if let Some(pos) = self.authorized_signers.iter().position(|x| *x == signer) {
            self.authorized_signers.remove(pos);
            
            // Ajustar threshold se necessário
            if self.threshold > self.authorized_signers.len() as u32 {
                self.threshold = self.authorized_signers.len() as u32;
            }
        }

        Ok(())
    }

    /// Atualiza o threshold (requer multi-sig)
    pub fn update_threshold(&mut self, new_threshold: u32) -> Result<(), MultiSigError> {
        if new_threshold == 0 || new_threshold > self.authorized_signers.len() as u32 {
            return Err(MultiSigError::InvalidThreshold);
        }

        self.threshold = new_threshold;
        Ok(())
    }

    /// Obtém informações de uma proposta
    pub fn get_proposal(&self, proposal_id: u32) -> Option<Proposal> {
        self.proposals.get(proposal_id)
    }

    /// Lista propostas ativas
    pub fn get_active_proposals(&self, current_time: u64) -> Vec<u32> {
        let mut active_proposals = Vec::new();
        
        for id in 1..self.next_proposal_id {
            if let Some(proposal) = self.proposals.get(id) {
                if proposal.status == ProposalStatus::Active && current_time <= proposal.expires_at {
                    active_proposals.push(id);
                }
            }
        }
        
        active_proposals
    }

    /// Calcula hash da operação para verificação
    fn calculate_operation_hash(&self, operation: &OperationType) -> [u8; 32] {
        use ink::env::hash::{Blake2x256, HashOutput};
        
        let encoded = scale::Encode::encode(operation);
        let mut output = <Blake2x256 as HashOutput>::Type::default();
        ink::env::hash_encoded::<Blake2x256, _>(&encoded, &mut output);
        output
    }

    /// Obtém configurações atuais
    pub fn get_config(&self) -> (Vec<AccountId>, u32, u64) {
        (
            self.authorized_signers.clone(),
            self.threshold,
            self.default_expiration_time,
        )
    }

    /// Limpa propostas expiradas (função de manutenção)
    pub fn cleanup_expired_proposals(&mut self, current_time: u64) -> u32 {
        let mut cleaned = 0;
        
        for id in 1..self.next_proposal_id {
            if let Some(mut proposal) = self.proposals.get(id) {
                if proposal.status == ProposalStatus::Active && current_time > proposal.expires_at {
                    proposal.status = ProposalStatus::Expired;
                    self.proposals.insert(id, &proposal);
                    cleaned += 1;
                }
            }
        }
        
        cleaned
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn get_test_accounts() -> (AccountId, AccountId, AccountId) {
        (
            AccountId::from([0x01; 32]),
            AccountId::from([0x02; 32]),
            AccountId::from([0x03; 32]),
        )
    }

    #[test]
    fn test_multisig_creation() {
        let (acc1, acc2, acc3) = get_test_accounts();
        let signers = vec![acc1, acc2, acc3];
        
        let multisig = MultiSigSystem::new(signers, 2, 86400).unwrap();
        
        assert_eq!(multisig.threshold, 2);
        assert_eq!(multisig.authorized_signers.len(), 3);
        assert!(multisig.is_authorized_signer(&acc1));
    }

    #[test]
    fn test_proposal_creation_and_signing() {
        let (acc1, acc2, acc3) = get_test_accounts();
        let signers = vec![acc1, acc2, acc3];
        let mut multisig = MultiSigSystem::new(signers, 2, 86400).unwrap();
        
        let operation = OperationType::TransferOwnership { new_owner: acc3 };
        let proposal_id = multisig.create_proposal(acc1, operation, 1000, None).unwrap();
        
        assert_eq!(proposal_id, 1);
        
        // Primeira assinatura
        let ready = multisig.sign_proposal(proposal_id, acc1, 1000).unwrap();
        assert!(!ready);
        
        // Segunda assinatura - deve estar pronta para execução
        let ready = multisig.sign_proposal(proposal_id, acc2, 1000).unwrap();
        assert!(ready);
        
        // Executar proposta
        let operation = multisig.execute_proposal(proposal_id, 1000).unwrap();
        match operation {
            OperationType::TransferOwnership { new_owner } => {
                assert_eq!(new_owner, acc3);
            }
            _ => panic!("Tipo de operação incorreto"),
        }
    }

    #[test]
    fn test_proposal_expiration() {
        let (acc1, acc2, _) = get_test_accounts();
        let signers = vec![acc1, acc2];
        let mut multisig = MultiSigSystem::new(signers, 2, 100).unwrap();
        
        let operation = OperationType::EmergencyPause { reason: "Test".to_string() };
        let proposal_id = multisig.create_proposal(acc1, operation, 1000, None).unwrap();
        
        // Tentar assinar após expiração
        let result = multisig.sign_proposal(proposal_id, acc1, 1200);
        assert_eq!(result, Err(MultiSigError::ProposalExpired));
    }

    #[test]
    fn test_unauthorized_signer() {
        let (acc1, acc2, acc3) = get_test_accounts();
        let signers = vec![acc1, acc2];
        let mut multisig = MultiSigSystem::new(signers, 2, 86400).unwrap();
        
        let operation = OperationType::TransferOwnership { new_owner: acc3 };
        
        // acc3 não é signatário autorizado
        let result = multisig.create_proposal(acc3, operation, 1000, None);
        assert_eq!(result, Err(MultiSigError::NotAuthorizedSigner));
    }

    #[test]
    fn test_threshold_validation() {
        let (acc1, acc2, _) = get_test_accounts();
        let signers = vec![acc1, acc2];
        
        // Threshold maior que número de signatários
        let result = MultiSigSystem::new(signers.clone(), 3, 86400);
        assert_eq!(result, Err(MultiSigError::InvalidThreshold));
        
        // Threshold zero
        let result = MultiSigSystem::new(signers, 0, 86400);
        assert_eq!(result, Err(MultiSigError::InvalidThreshold));
    }
}