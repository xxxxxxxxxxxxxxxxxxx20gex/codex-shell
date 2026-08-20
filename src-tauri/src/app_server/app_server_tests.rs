use super::app_server_arguments;
use crate::config::ModelSettings;

#[test]
fn builds_environment_authenticated_gateway_provider() {
    let settings = ModelSettings {
        base_url: "https://gateway.example/v1".to_string(),
        model_id: "model-id".to_string(),
        legacy_capability_template: None,
        reasoning_effort: None,
        reasoning_summary: None,
        verbosity: None,
        service_tier: "default".to_string(),
    };

    let arguments = app_server_arguments(&settings, "\"model-id\"")
        .expect("gateway arguments should be encoded");

    assert_eq!(
        arguments,
        vec![
            "app-server",
            "--stdio",
            "-c",
            "features.code_mode_host=true",
            "-c",
            "model=\"model-id\"",
            "-c",
            "model_provider=\"codex_shell_gateway\"",
            "-c",
            "model_providers.codex_shell_gateway.name=\"Codex Shell Gateway\"",
            "-c",
            "model_providers.codex_shell_gateway.base_url=\"https://gateway.example/v1\"",
            "-c",
            "model_providers.codex_shell_gateway.wire_api=\"responses\"",
            "-c",
            "model_providers.codex_shell_gateway.env_key=\"OPENAI_API_KEY\"",
            "-c",
            "model_providers.codex_shell_gateway.requires_openai_auth=false",
            "-c",
            "service_tier=\"default\"",
        ]
    );
}

#[test]
fn includes_explicit_model_parameters() {
    let settings = ModelSettings {
        base_url: "https://gateway.example/v1".to_string(),
        model_id: "model-id".to_string(),
        legacy_capability_template: None,
        reasoning_effort: Some("high".to_string()),
        reasoning_summary: Some("detailed".to_string()),
        verbosity: Some("medium".to_string()),
        service_tier: "priority".to_string(),
    };

    let arguments =
        app_server_arguments(&settings, "\"model-id\"").expect("model arguments should be encoded");

    assert!(arguments.ends_with(&[
        "-c".to_string(),
        "model_reasoning_effort=high".to_string(),
        "-c".to_string(),
        "model_reasoning_summary=detailed".to_string(),
        "-c".to_string(),
        "model_verbosity=medium".to_string(),
        "-c".to_string(),
        "service_tier=\"priority\"".to_string(),
    ]));
}
