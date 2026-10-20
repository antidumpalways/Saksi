use crate::{Error, InvoiceStatus, Policy, Saksi, SaksiClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup() -> (Env, SaksiClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let underwriter = Address::generate(&env);
    let contract_id = env.register(Saksi, (admin.clone(), underwriter.clone()));
    let client = SaksiClient::new(&env, &contract_id);
    (env, client, admin, underwriter)
}

fn valid_policy() -> Policy {
    Policy {
        max_single_invoice: 100_000,
        max_debtor_exposure: 250_000,
        min_discount_bps: 100,
        max_discount_bps: 1_000,
    }
}

fn invoice_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

fn decision_hash(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

#[test]
fn sets_and_reads_policy() {
    let (_env, client, admin, _underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    assert_eq!(client.get_policy(), Some(valid_policy()));
}

#[test]
fn rejects_invalid_policy_bands() {
    let (_env, client, admin, _underwriter) = setup();

    let mut zero_single = valid_policy();
    zero_single.max_single_invoice = 0;
    assert!(client.try_set_policy(&admin, &zero_single).is_err());

    let mut inverted = valid_policy();
    inverted.min_discount_bps = 900;
    inverted.max_discount_bps = 100;
    assert!(client.try_set_policy(&admin, &inverted).is_err());

    let mut over_100_percent = valid_policy();
    over_100_percent.max_discount_bps = 10_001;
    assert!(client.try_set_policy(&admin, &over_100_percent).is_err());

    let mut single_over_exposure = valid_policy();
    single_over_exposure.max_single_invoice = 300_000;
    single_over_exposure.max_debtor_exposure = 250_000;
    assert!(client.try_set_policy(&admin, &single_over_exposure).is_err());
}

#[test]
fn registers_invoice_and_reserves_exposure() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 1);

    client.register_invoice(&underwriter, &id, &debtor, &50_000, &300);

    let invoice = client.get_invoice(&id).unwrap();
    assert_eq!(invoice.amount, 50_000);
    assert_eq!(invoice.status, InvoiceStatus::Registered);
    assert_eq!(client.get_debtor_exposure(&debtor), 50_000);
}

#[test]
fn rejects_single_invoice_above_cap_and_keeps_state() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 2);

    assert!(client
        .try_register_invoice(&underwriter, &id, &debtor, &100_001, &300)
        .is_err());
    assert_eq!(client.get_debtor_exposure(&debtor), 0);
    assert!(client.get_invoice(&id).is_none());
}

#[test]
fn rejects_debtor_exposure_above_cap() {
    let (env, client, admin, underwriter) = setup();
    let mut policy = valid_policy();
    policy.max_single_invoice = 100_000;
    policy.max_debtor_exposure = 150_000;
    client.set_policy(&admin, &policy);

    let debtor = Address::generate(&env);
    client.register_invoice(&underwriter, &invoice_id(&env, 3), &debtor, &100_000, &300);
    assert!(client
        .try_register_invoice(
            &underwriter,
            &invoice_id(&env, 4),
            &debtor,
            &60_000,
            &300
        )
        .is_err());
    assert_eq!(client.get_debtor_exposure(&debtor), 100_000);
}

#[test]
fn rejects_discount_out_of_band() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);

    assert!(client
        .try_register_invoice(
            &underwriter,
            &invoice_id(&env, 5),
            &debtor,
            &10_000,
            &99
        )
        .is_err());
    assert!(client
        .try_register_invoice(
            &underwriter,
            &invoice_id(&env, 6),
            &debtor,
            &10_000,
            &1_001
        )
        .is_err());
}

#[test]
fn rejects_zero_or_negative_amount() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);

    assert!(client
        .try_register_invoice(&underwriter, &invoice_id(&env, 7), &debtor, &0, &300)
        .is_err());
    assert!(client
        .try_register_invoice(&underwriter, &invoice_id(&env, 8), &debtor, &-1, &300)
        .is_err());
}

#[test]
fn rejects_duplicate_invoice() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 9);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    assert!(client
        .try_register_invoice(&underwriter, &id, &debtor, &10_000, &300)
        .is_err());
    assert_eq!(client.get_debtor_exposure(&debtor), 10_000);
}

#[test]
fn rejects_register_from_non_underwriter() {
    let (env, client, admin, _underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let other = Address::generate(&env);
    let debtor = Address::generate(&env);

    assert!(client
        .try_register_invoice(&other, &invoice_id(&env, 10), &debtor, &10_000, &300)
        .is_err());
}

#[test]
fn rejects_set_policy_from_non_admin() {
    let (env, client, _admin, _underwriter) = setup();
    let other = Address::generate(&env);

    assert!(client.try_set_policy(&other, &valid_policy()).is_err());
}

#[test]
fn attests_approved_decision_and_verifies_hash() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 11);
    let hash = decision_hash(&env, 11);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &hash, &true);

    let invoice = client.get_invoice(&id).unwrap();
    assert_eq!(invoice.status, InvoiceStatus::Decisioned);
    assert_eq!(invoice.approved, Some(true));
    assert_eq!(invoice.decision_hash, Some(hash.clone()));
    assert!(client.verify_decision(&id, &hash));
    assert!(!client.verify_decision(&id, &decision_hash(&env, 12)));
    assert!(!client.verify_decision(&invoice_id(&env, 99), &hash));
    assert_eq!(client.get_debtor_exposure(&debtor), 10_000);
}

#[test]
fn rejected_decision_releases_exposure() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 13);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &decision_hash(&env, 13), &false);

    let invoice = client.get_invoice(&id).unwrap();
    assert_eq!(invoice.approved, Some(false));
    assert_eq!(client.get_debtor_exposure(&debtor), 0);
}

#[test]
fn rejects_double_attestation() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 14);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &decision_hash(&env, 14), &true);
    assert!(client
        .try_attest_decision(&underwriter, &id, &decision_hash(&env, 15), &true)
        .is_err());
}

#[test]
fn rejects_reused_decision_hash_across_invoices() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor_a = Address::generate(&env);
    let debtor_b = Address::generate(&env);
    let id_a = invoice_id(&env, 20);
    let id_b = invoice_id(&env, 21);
    let hash = decision_hash(&env, 20);

    client.register_invoice(&underwriter, &id_a, &debtor_a, &10_000, &300);
    client.register_invoice(&underwriter, &id_b, &debtor_b, &10_000, &300);
    client.attest_decision(&underwriter, &id_a, &hash, &true);
    assert!(client
        .try_attest_decision(&underwriter, &id_b, &hash, &true)
        .is_err());
}

#[test]
fn rejects_attest_from_non_underwriter() {
    let (env, client, admin, _underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 22);
    let other = Address::generate(&env);

    client.register_invoice(
        &_underwriter,
        &id,
        &debtor,
        &10_000,
        &300,
    );
    assert!(client
        .try_attest_decision(&other, &id, &decision_hash(&env, 22), &true)
        .is_err());
}

#[test]
fn admin_releases_approved_but_unfunded_invoice_once() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 16);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &decision_hash(&env, 16), &true);
    client.release_invoice(&admin, &id);

    assert_eq!(client.get_invoice(&id).unwrap().status, InvoiceStatus::Released);
    assert_eq!(client.get_debtor_exposure(&debtor), 0);
    assert!(client.try_release_invoice(&admin, &id).is_err());
}

#[test]
fn underwriter_cannot_release_invoice() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 23);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &decision_hash(&env, 23), &true);
    assert!(client.try_release_invoice(&underwriter, &id).is_err());
    assert_eq!(client.get_debtor_exposure(&debtor), 10_000);
}

#[test]
fn rejects_attest_for_unknown_invoice() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());

    assert!(client
        .try_attest_decision(
            &underwriter,
            &invoice_id(&env, 17),
            &decision_hash(&env, 17),
            &true
        )
        .is_err());
}

#[test]
fn rejects_release_for_registered_invoice() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 18);

    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    assert!(client.try_release_invoice(&admin, &id).is_err());
}

#[test]
fn rejects_operations_before_policy_is_set() {
    let (env, client, _admin, underwriter) = setup();
    let debtor = Address::generate(&env);

    assert!(client
        .try_register_invoice(&underwriter, &invoice_id(&env, 19), &debtor, &10_000, &300)
        .is_err());
}

#[test]
fn admin_can_rotate_underwriter() {
    let (env, client, admin, old_underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let new_underwriter = Address::generate(&env);
    let debtor = Address::generate(&env);

    client.set_underwriter(&admin, &new_underwriter);
    assert!(client
        .try_register_invoice(
            &old_underwriter,
            &invoice_id(&env, 24),
            &debtor,
            &10_000,
            &300
        )
        .is_err());
    client.register_invoice(
        &new_underwriter,
        &invoice_id(&env, 25),
        &debtor,
        &10_000,
        &300,
    );
}

#[test]
fn admin_can_rotate_admin() {
    let (env, client, admin, _underwriter) = setup();
    let new_admin = Address::generate(&env);

    client.set_admin(&admin, &new_admin);
    assert!(client.try_set_policy(&admin, &valid_policy()).is_err());
    client.set_policy(&new_admin, &valid_policy());
    assert_eq!(client.get_policy(), Some(valid_policy()));
}

#[test]
fn requires_auth_when_not_mocked() {
    let (env, client, admin, underwriter) = setup();
    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    let id = invoice_id(&env, 26);
    let id_for_attest = invoice_id(&env, 28);
    client.register_invoice(&underwriter, &id, &debtor, &10_000, &300);
    client.register_invoice(&underwriter, &id_for_attest, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id, &decision_hash(&env, 26), &true);

    env.set_auths(&[]);
    let other = Address::generate(&env);

    assert!(client.try_set_policy(&admin, &valid_policy()).is_err());
    assert!(client.try_set_admin(&admin, &other).is_err());
    assert!(client.try_set_underwriter(&admin, &other).is_err());
    assert!(client
        .try_register_invoice(
            &underwriter,
            &invoice_id(&env, 27),
            &debtor,
            &10_000,
            &300
        )
        .is_err());
    assert!(client
        .try_attest_decision(&underwriter, &id_for_attest, &decision_hash(&env, 28), &true)
        .is_err());
    assert!(client.try_release_invoice(&admin, &id).is_err());
}

#[test]
fn asserts_typed_errors() {
    let (env, client, admin, underwriter) = setup();

    let mut bad_policy = valid_policy();
    bad_policy.max_single_invoice = 0;
    match client.try_set_policy(&admin, &bad_policy) {
        Err(Ok(Error::InvalidPolicy)) => {}
        _ => panic!("expected InvalidPolicy"),
    }

    client.set_policy(&admin, &valid_policy());
    let debtor = Address::generate(&env);
    match client.try_register_invoice(
        &underwriter,
        &invoice_id(&env, 29),
        &debtor,
        &100_001,
        &300,
    ) {
        Err(Ok(Error::SingleInvoiceCapExceeded)) => {}
        _ => panic!("expected SingleInvoiceCapExceeded"),
    }

    let id_a = invoice_id(&env, 30);
    client.register_invoice(&underwriter, &id_a, &debtor, &10_000, &300);
    client.attest_decision(&underwriter, &id_a, &decision_hash(&env, 30), &true);
    match client.try_attest_decision(&underwriter, &id_a, &decision_hash(&env, 31), &true) {
        Err(Ok(Error::AlreadyAttested)) => {}
        _ => panic!("expected AlreadyAttested"),
    }

    let id_b = invoice_id(&env, 32);
    client.register_invoice(&underwriter, &id_b, &debtor, &10_000, &300);
    match client.try_attest_decision(&underwriter, &id_b, &decision_hash(&env, 30), &true) {
        Err(Ok(Error::DecisionHashReused)) => {}
        _ => panic!("expected DecisionHashReused"),
    }

    match client.try_set_admin(&admin, &underwriter) {
        Err(Ok(Error::InvalidPolicy)) => {}
        _ => panic!("expected InvalidPolicy for set_admin"),
    }
    match client.try_set_underwriter(&admin, &admin) {
        Err(Ok(Error::InvalidPolicy)) => {}
        _ => panic!("expected InvalidPolicy for set_underwriter"),
    }
}

#[test]
#[should_panic]
fn rejects_same_admin_and_underwriter() {
    let env = Env::default();
    let same = Address::generate(&env);
    let _ = env.register(Saksi, (same.clone(), same));
}
