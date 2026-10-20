#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

const BPS_DENOMINATOR: u32 = 10_000;
const TTL_THRESHOLD: u32 = 17_280;
const TTL_EXTEND: u32 = 518_400;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Policy {
    pub max_single_invoice: i128,
    pub max_debtor_exposure: i128,
    pub min_discount_bps: u32,
    pub max_discount_bps: u32,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Registered = 0,
    Decisioned = 1,
    Released = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: BytesN<32>,
    pub debtor: Address,
    pub amount: i128,
    pub discount_bps: u32,
    pub status: InvoiceStatus,
    pub decision_hash: Option<BytesN<32>>,
    pub approved: Option<bool>,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Underwriter,
    Policy,
    Invoice(BytesN<32>),
    Exposure(Address),
    Decision(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    InvalidPolicy = 2,
    InvalidAmount = 3,
    DiscountOutOfBand = 4,
    SingleInvoiceCapExceeded = 5,
    DebtorExposureExceeded = 6,
    InvoiceExists = 7,
    InvoiceNotFound = 8,
    AlreadyAttested = 9,
    InvalidState = 10,
    NotAuthorized = 11,
    DecisionHashReused = 12,
}

#[contractevent]
pub struct PolicySet {
    #[topic]
    pub admin: Address,
    pub policy: Policy,
}

#[contractevent]
pub struct AdminChanged {
    #[topic]
    pub admin: Address,
    pub new_admin: Address,
}

#[contractevent]
pub struct UnderwriterChanged {
    #[topic]
    pub admin: Address,
    pub new_underwriter: Address,
}

#[contractevent]
pub struct InvoiceRegistered {
    #[topic]
    pub invoice_id: BytesN<32>,
    pub debtor: Address,
    pub amount: i128,
    pub discount_bps: u32,
}

#[contractevent]
pub struct DecisionAttested {
    #[topic]
    pub invoice_id: BytesN<32>,
    pub debtor: Address,
    pub amount: i128,
    pub decision_hash: BytesN<32>,
    pub approved: bool,
}

#[contractevent]
pub struct ExposureReleased {
    #[topic]
    pub invoice_id: BytesN<32>,
    pub debtor: Address,
    pub amount: i128,
    pub by_rejection: bool,
}

#[contract]
pub struct Saksi;

#[contractimpl]
impl Saksi {
    pub fn __constructor(env: Env, admin: Address, underwriter: Address) {
        assert!(admin != underwriter, "roles must differ");
        touch(&env);
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::Underwriter, &underwriter);
        bump(&env, &DataKey::Admin);
        bump(&env, &DataKey::Underwriter);
    }

    pub fn set_policy(env: Env, admin: Address, policy: Policy) -> Result<(), Error> {
        touch(&env);
        admin.require_auth();
        let stored_admin = require_admin(&env, &admin)?;
        validate_policy(&policy)?;
        env.storage().persistent().set(&DataKey::Policy, &policy);
        bump(&env, &DataKey::Policy);
        PolicySet {
            admin: stored_admin,
            policy: policy.clone(),
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        touch(&env);
        admin.require_auth();
        require_admin(&env, &admin)?;
        let underwriter: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Underwriter)
            .ok_or(Error::NotInitialized)?;
        if new_admin == underwriter {
            return Err(Error::InvalidPolicy);
        }
        env.storage().persistent().set(&DataKey::Admin, &new_admin);
        bump(&env, &DataKey::Admin);
        AdminChanged {
            admin,
            new_admin,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_underwriter(
        env: Env,
        admin: Address,
        new_underwriter: Address,
    ) -> Result<(), Error> {
        touch(&env);
        admin.require_auth();
        let current_admin = require_admin(&env, &admin)?;
        if new_underwriter == current_admin {
            return Err(Error::InvalidPolicy);
        }
        env.storage()
            .persistent()
            .set(&DataKey::Underwriter, &new_underwriter);
        bump(&env, &DataKey::Underwriter);
        UnderwriterChanged {
            admin,
            new_underwriter,
        }
        .publish(&env);
        Ok(())
    }

    pub fn register_invoice(
        env: Env,
        underwriter: Address,
        invoice_id: BytesN<32>,
        debtor: Address,
        amount: i128,
        discount_bps: u32,
    ) -> Result<(), Error> {
        touch(&env);
        underwriter.require_auth();
        require_underwriter(&env, &underwriter)?;

        let policy = get_policy_internal(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if discount_bps < policy.min_discount_bps || discount_bps > policy.max_discount_bps {
            return Err(Error::DiscountOutOfBand);
        }
        if amount > policy.max_single_invoice {
            return Err(Error::SingleInvoiceCapExceeded);
        }

        let invoice_key = DataKey::Invoice(invoice_id.clone());
        if env.storage().persistent().has(&invoice_key) {
            return Err(Error::InvoiceExists);
        }

        let exposure_key = DataKey::Exposure(debtor.clone());
        let current: i128 = env
            .storage()
            .persistent()
            .get(&exposure_key)
            .unwrap_or(0);
        let next = current
            .checked_add(amount)
            .ok_or(Error::DebtorExposureExceeded)?;
        if next > policy.max_debtor_exposure {
            return Err(Error::DebtorExposureExceeded);
        }

        let invoice = Invoice {
            id: invoice_id.clone(),
            debtor: debtor.clone(),
            amount,
            discount_bps,
            status: InvoiceStatus::Registered,
            decision_hash: None,
            approved: None,
        };

        env.storage().persistent().set(&invoice_key, &invoice);
        env.storage().persistent().set(&exposure_key, &next);
        bump(&env, &invoice_key);
        bump(&env, &exposure_key);
        InvoiceRegistered {
            invoice_id,
            debtor,
            amount,
            discount_bps,
        }
        .publish(&env);
        Ok(())
    }

    pub fn attest_decision(
        env: Env,
        underwriter: Address,
        invoice_id: BytesN<32>,
        decision_hash: BytesN<32>,
        approved: bool,
    ) -> Result<(), Error> {
        touch(&env);
        underwriter.require_auth();
        require_underwriter(&env, &underwriter)?;

        let invoice_key = DataKey::Invoice(invoice_id.clone());
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&invoice_key)
            .ok_or(Error::InvoiceNotFound)?;

        if invoice.decision_hash.is_some() {
            return Err(Error::AlreadyAttested);
        }
        if invoice.status != InvoiceStatus::Registered {
            return Err(Error::InvalidState);
        }

        let decision_key = DataKey::Decision(decision_hash.clone());
        if env.storage().persistent().has(&decision_key) {
            return Err(Error::DecisionHashReused);
        }

        invoice.decision_hash = Some(decision_hash.clone());
        invoice.approved = Some(approved);
        invoice.status = InvoiceStatus::Decisioned;

        env.storage()
            .persistent()
            .set(&decision_key, &invoice_id);
        env.storage().persistent().set(&invoice_key, &invoice);

        if !approved {
            release_exposure(&env, &invoice.debtor, invoice.amount)?;
            ExposureReleased {
                invoice_id: invoice_id.clone(),
                debtor: invoice.debtor.clone(),
                amount: invoice.amount,
                by_rejection: true,
            }
            .publish(&env);
        }

        bump(&env, &invoice_key);
        bump(&env, &decision_key);
        DecisionAttested {
            invoice_id,
            debtor: invoice.debtor.clone(),
            amount: invoice.amount,
            decision_hash,
            approved,
        }
        .publish(&env);
        Ok(())
    }

    pub fn release_invoice(
        env: Env,
        admin: Address,
        invoice_id: BytesN<32>,
    ) -> Result<(), Error> {
        touch(&env);
        admin.require_auth();
        require_admin(&env, &admin)?;

        let invoice_key = DataKey::Invoice(invoice_id.clone());
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&invoice_key)
            .ok_or(Error::InvoiceNotFound)?;

        if invoice.status != InvoiceStatus::Decisioned || invoice.approved != Some(true) {
            return Err(Error::InvalidState);
        }

        invoice.status = InvoiceStatus::Released;
        release_exposure(&env, &invoice.debtor, invoice.amount)?;
        env.storage().persistent().set(&invoice_key, &invoice);
        bump(&env, &invoice_key);
        ExposureReleased {
            invoice_id,
            debtor: invoice.debtor.clone(),
            amount: invoice.amount,
            by_rejection: false,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_policy(env: Env) -> Option<Policy> {
        let key = DataKey::Policy;
        let value = env.storage().persistent().get(&key);
        if value.is_some() {
            bump(&env, &key);
        }
        value
    }

    pub fn get_invoice(env: Env, invoice_id: BytesN<32>) -> Option<Invoice> {
        let key = DataKey::Invoice(invoice_id);
        let value: Option<Invoice> = env.storage().persistent().get(&key);
        if let Some(inv) = &value {
            bump(&env, &key);
            if let Some(hash) = &inv.decision_hash {
                bump(&env, &DataKey::Decision(hash.clone()));
            }
        }
        value
    }

    pub fn get_debtor_exposure(env: Env, debtor: Address) -> i128 {
        let key = DataKey::Exposure(debtor);
        let value: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if value > 0 {
            bump(&env, &key);
        }
        value
    }

    pub fn verify_decision(env: Env, invoice_id: BytesN<32>, expected_hash: BytesN<32>) -> bool {
        let key = DataKey::Invoice(invoice_id);
        let invoice: Option<Invoice> = env.storage().persistent().get(&key);
        match invoice {
            Some(inv) => {
                bump(&env, &key);
                match inv.decision_hash {
                    Some(hash) => {
                        bump(&env, &DataKey::Decision(hash.clone()));
                        hash == expected_hash
                    }
                    None => false,
                }
            }
            None => false,
        }
    }
}

fn validate_policy(policy: &Policy) -> Result<(), Error> {
    if policy.max_single_invoice <= 0
        || policy.max_debtor_exposure <= 0
        || policy.max_single_invoice > policy.max_debtor_exposure
        || policy.min_discount_bps > policy.max_discount_bps
        || policy.max_discount_bps > BPS_DENOMINATOR
    {
        return Err(Error::InvalidPolicy);
    }
    Ok(())
}

fn get_policy_internal(env: &Env) -> Result<Policy, Error> {
    let key = DataKey::Policy;
    let policy: Policy = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotInitialized)?;
    bump(env, &key);
    Ok(policy)
}

fn require_admin(env: &Env, caller: &Address) -> Result<Address, Error> {
    let key = DataKey::Admin;
    let admin: Address = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotInitialized)?;
    if &admin != caller {
        return Err(Error::NotAuthorized);
    }
    bump(env, &key);
    Ok(admin)
}

fn require_underwriter(env: &Env, caller: &Address) -> Result<(), Error> {
    let key = DataKey::Underwriter;
    let underwriter: Address = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotInitialized)?;
    if &underwriter != caller {
        return Err(Error::NotAuthorized);
    }
    bump(env, &key);
    Ok(())
}

fn release_exposure(env: &Env, debtor: &Address, amount: i128) -> Result<(), Error> {
    let exposure_key = DataKey::Exposure(debtor.clone());
    let current: i128 = env
        .storage()
        .persistent()
        .get(&exposure_key)
        .unwrap_or(0);
    let next = current.checked_sub(amount).ok_or(Error::InvalidState)?;
    env.storage().persistent().set(&exposure_key, &next);
    bump(env, &exposure_key);
    Ok(())
}

fn bump(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND);
}

fn touch(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
}

#[cfg(test)]
mod test;

