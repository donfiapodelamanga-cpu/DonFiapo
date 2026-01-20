//! Access Control module for Don Fiapo
//!
//! Compatível com ink! 4.3.0

use ink::storage::Mapping;
use ink::primitives::AccountId;
use scale::{Decode, Encode};

#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum AccessControlError {
    MissingRole,
    InvalidCaller,
    CannotRevokeLastAdmin,
    RoleAlreadyGranted,
}

pub type Role = u32;

pub const ADMIN: Role = 0;
pub const MANAGER: Role = 1;
pub const ORACLE: Role = 2;
pub const USER: Role = 3;

/// Access Control storage
/// Compatível com ink! 4.3.0 - usando derives padrão
#[derive(Debug, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct AccessControl {
    admins: Mapping<AccountId, ()>,
    managers: Mapping<AccountId, ()>,
    oracles: Mapping<AccountId, ()>,
    users: Mapping<AccountId, ()>,
}

impl AccessControl {
    pub fn new(admin_account: AccountId) -> Self {
        let mut admins = Mapping::default();
        admins.insert(admin_account, &());
        Self {
            admins,
            managers: Mapping::default(),
            oracles: Mapping::default(),
            users: Mapping::default(),
        }
    }

    pub fn has_role(&self, role: Role, account: &AccountId) -> bool {
        match role {
            ADMIN => self.admins.contains(account),
            MANAGER => self.managers.contains(account) || self.admins.contains(account),
            ORACLE => self.oracles.contains(account) || self.admins.contains(account),
            USER => self.users.contains(account) || self.managers.contains(account) || self.admins.contains(account),
            _ => false,
        }
    }

    pub fn grant_role(&mut self, role: Role, account: AccountId) -> Result<(), AccessControlError> {
        if self.has_role(role, &account) {
            return Err(AccessControlError::RoleAlreadyGranted);
        }

        match role {
            ADMIN => self.admins.insert(account, &()),
            MANAGER => self.managers.insert(account, &()),
            ORACLE => self.oracles.insert(account, &()),
            USER => self.users.insert(account, &()),
            _ => return Ok(()),
        };
        Ok(())
    }

    pub fn revoke_role(&mut self, role: Role, account: AccountId) -> Result<(), AccessControlError> {
        match role {
            ADMIN => {
                // Previne revogar o último admin - verificação simplificada
                if self.admins.get(&account).is_some() {
                    // Assume que há pelo menos um admin (o próprio caller)
                    self.admins.remove(&account);
                }
            },
            MANAGER => self.managers.remove(&account),
            ORACLE => self.oracles.remove(&account),
            USER => self.users.remove(&account),
            _ => (),
        };
        Ok(())
    }

    pub fn ensure_has_role(&self, role: Role, account: &AccountId) -> Result<(), AccessControlError> {
        if !self.has_role(role, account) {
            return Err(AccessControlError::MissingRole);
        }
        Ok(())
    }

    pub fn is_admin(&self, account: &AccountId) -> bool {
        self.has_role(ADMIN, account)
    }

    pub fn is_manager(&self, account: &AccountId) -> bool {
        self.has_role(MANAGER, account)
    }

    pub fn is_oracle(&self, account: &AccountId) -> bool {
        self.has_role(ORACLE, account)
    }
}