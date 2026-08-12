use super::{ModelSettings, normalize_legacy_settings};

#[test]
fn reads_legacy_settings_without_serializing_the_template() {
    let settings: ModelSettings = serde_json::from_str(
        r#"{"baseUrl":"https://example.test/v1","modelId":"custom","capabilityTemplate":"openai-compatible-basic","reasoningEffort":"high","verbosity":"low"}"#,
    )
    .expect("legacy settings should deserialize");

    let settings = normalize_legacy_settings(settings);
    assert_eq!(settings.reasoning_effort, None);
    assert_eq!(settings.verbosity, None);
    let serialized = serde_json::to_value(settings).expect("settings should serialize");
    assert_eq!(serialized.get("capabilityTemplate"), None);
}
