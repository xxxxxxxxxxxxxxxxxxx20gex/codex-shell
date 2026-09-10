use super::{
    ModelSettings, ChannelCatalog, ChannelConversationSettings, default_settings,
    migrate_legacy_settings, normalize_settings, validate_settings,
};
use crate::config::Channel;

#[test]
fn persists_initial_identity_and_atomically_replaces_settings() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("settings.json");
    let first = super::read_settings_file(&path).unwrap();
    assert_eq!(super::read_settings_file(&path).unwrap(), first);
    let mut changed = first.clone();
    changed.channels[0].name = "changed".to_string();
    super::write_settings_file(&path, &changed).unwrap();
    assert_eq!(super::read_settings_file(&path).unwrap(), changed);
}

#[test]
fn rejects_unsupported_catalog_on_read_and_reports_failed_migration_backup() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("settings.json");
    let mut settings = default_settings();
    settings.channels[0].catalog = ChannelCatalog::File { path: "models.json".to_string() };
    super::write_settings_file(&path, &settings).unwrap();
    assert!(super::read_settings_file(&path).unwrap_err().contains("vendorDefault"));
    let invalid_path = directory.path().join("not-a-directory").join("settings.json");
    std::fs::write(directory.path().join("not-a-directory"), "block").unwrap();
    assert!(super::persist_migration(&invalid_path, "legacy", &settings).is_err());
}

#[test]
fn migration_retries_use_the_same_credential_identity() {
    let legacy = r#"{"baseUrl":"https://api.openai.com/v1","modelId":"custom"}"#;
    let (_, first) = migrate_legacy_settings(serde_json::from_str(legacy).unwrap());
    let (_, second) = migrate_legacy_settings(serde_json::from_str(legacy).unwrap());
    assert_eq!(first, second);
}

fn channel(id: &str, vendor: &str, base_url: &str) -> Channel {
    Channel {
        id: id.to_string(),
        vendor: vendor.to_string(),
        name: "渠道".to_string(),
        base_url: base_url.to_string(),
        catalog: ChannelCatalog::VendorDefault,
        conversation: ChannelConversationSettings::default(),
    }
}

#[test]
fn defaults_to_a_single_active_openai_channel() {
    let settings = default_settings();
    assert_eq!(settings.schema_version, 2);
    assert_eq!(settings.channels.len(), 1);
    let active = settings.active_channel().expect("default channel is active");
    assert_eq!(active.vendor, "openai");
    assert_eq!(active.base_url, "https://api.openai.com/v1");
    assert_eq!(active.conversation.model_id.as_deref(), Some("gpt-5.6-sol"));
    assert_eq!(active.conversation.reasoning_effort, None);
    assert_eq!(active.conversation.reasoning_summary, None);
    assert_eq!(active.conversation.verbosity, None);
    assert_eq!(active.conversation.service_tier, "default");
}

#[test]
fn migrates_legacy_settings_into_one_equivalent_channel() {
    let legacy: super::LegacyModelSettings = serde_json::from_str(
        r#"{"baseUrl":"https://api.deepseek.com","modelId":"deepseek-flash","reasoningEffort":"high","reasoningSummary":"detailed","verbosity":"low","serviceTier":"priority"}"#,
    )
    .expect("legacy settings should deserialize");

    let (settings, channel_id) = migrate_legacy_settings(legacy);
    assert_eq!(settings.schema_version, 2);
    assert_eq!(settings.active_channel_id.as_deref(), Some(channel_id.as_str()));
    let active = settings.active_channel().expect("migrated channel is active");
    assert_eq!(active.vendor, "deepseek");
    assert_eq!(active.base_url, "https://api.deepseek.com");
    assert_eq!(active.conversation.model_id.as_deref(), Some("deepseek-flash"));
    assert_eq!(active.conversation.reasoning_effort.as_deref(), Some("high"));
    assert_eq!(active.conversation.reasoning_summary.as_deref(), Some("detailed"));
    assert_eq!(active.conversation.verbosity.as_deref(), Some("low"));
    assert_eq!(active.conversation.service_tier, "priority");
    assert!(crate::credentials::channel_id_is_valid(&channel_id));
}

#[test]
fn migrates_legacy_gateway_configuration_as_openai() {
    let legacy: super::LegacyModelSettings = serde_json::from_str(
        r#"{"baseUrl":"https://relay.example/v1","modelId":"custom-model","capabilityTemplate":"openai-compatible-basic","reasoningEffort":"high","verbosity":"low"}"#,
    )
    .expect("legacy settings should deserialize");

    let (settings, _) = migrate_legacy_settings(legacy);
    let active = settings.active_channel().expect("migrated channel is active");
    assert_eq!(active.vendor, "openai");
    assert_eq!(active.conversation.model_id.as_deref(), Some("custom-model"));
    assert_eq!(active.conversation.reasoning_effort, None);
    assert_eq!(active.conversation.verbosity, None);
    assert_eq!(active.conversation.service_tier, "default");
}

#[test]
fn generated_channel_ids_are_accepted_by_the_secret_store() {
    let settings = default_settings();
    for channel in &settings.channels {
        assert!(crate::credentials::channel_id_is_valid(&channel.id));
    }
}

#[test]
fn normalization_drops_unusable_channels_and_repairs_the_active_channel() {
    let settings = ModelSettings {
        schema_version: 1,
        active_channel_id: Some("missing".to_string()),
        channels: vec![
            channel("openai-00000001", "openai", "  https://api.openai.com/v1  "),
            channel("bad id", "openai", "https://example.test/v1"),
            channel("deepseek-00000002", "deepseek", "   "),
            channel("openai-00000001", "openai", "https://example.test/v1"),
        ],
    };

    let normalized = normalize_settings(settings);
    assert_eq!(normalized.schema_version, 2);
    assert_eq!(normalized.channels.len(), 1);
    assert_eq!(normalized.channels[0].base_url, "https://api.openai.com/v1");
    assert_eq!(normalized.active_channel_id.as_deref(), Some("openai-00000001"));
}

#[test]
fn validation_rejects_configurations_that_cannot_be_recovered() {
    let mut settings = default_settings();
    assert!(validate_settings(&settings).is_ok());

    settings.channels[0].vendor = "unknown-vendor".to_string();
    assert!(validate_settings(&settings).is_err());

    let mut settings = default_settings();
    settings.channels[0].base_url = "api.openai.com/v1".to_string();
    assert!(validate_settings(&settings).is_err());

    let mut settings = default_settings();
    settings.active_channel_id = Some("missing".to_string());
    assert!(validate_settings(&settings).is_err());

    let mut settings = default_settings();
    settings.channels[0].name = "   ".to_string();
    assert!(validate_settings(&settings).is_err());
}

#[test]
fn normalization_clamps_conversation_values() {
    let mut settings = default_settings();
    settings.channels[0].conversation.reasoning_summary = Some("unexpected".to_string());
    settings.channels[0].conversation.service_tier = "unsupported".to_string();
    settings.channels[0].conversation.model_id = Some("   ".to_string());

    let normalized = normalize_settings(settings);
    assert_eq!(normalized.channels[0].conversation.reasoning_summary, None);
    assert_eq!(normalized.channels[0].conversation.service_tier, "default");
    assert_eq!(normalized.channels[0].conversation.model_id, None);
}

#[test]
fn catalog_defaults_to_the_vendor_catalog() {
    let catalog: ChannelCatalog =
        serde_json::from_str(r#"{"kind":"vendorDefault"}"#).expect("catalog should deserialize");
    assert_eq!(catalog, ChannelCatalog::VendorDefault);
    let file: ChannelCatalog = serde_json::from_str(r#"{"kind":"file","path":"C:/x.json"}"#)
        .expect("catalog should deserialize");
    assert_eq!(
        file,
        ChannelCatalog::File {
            path: "C:/x.json".to_string()
        }
    );
}

#[test]
fn normalizes_personalization_without_inventing_instructions() {
    assert_eq!(
        super::normalize_preferences(super::PersonalizationSettings {
            custom_instructions: "  Lead with the outcome.  ".to_string(),
            theme: "unexpected".to_string(),
        }),
        super::PersonalizationSettings {
            custom_instructions: "Lead with the outcome.".to_string(),
            theme: "dark".to_string(),
        }
    );
}
