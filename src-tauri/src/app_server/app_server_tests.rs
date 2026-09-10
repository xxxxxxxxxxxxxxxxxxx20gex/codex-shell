use super::app_server_arguments;
use crate::config::{
    Channel, ChannelCatalog, ChannelConversationSettings, VENDOR_DEEPSEEK, VENDOR_OPENAI,
};
use std::path::Path;

fn channel(vendor: &str, base_url: &str, conversation: ChannelConversationSettings) -> Channel {
    Channel {
        id: format!("{vendor}-00000001"),
        vendor: vendor.to_string(),
        name: "渠道".to_string(),
        base_url: base_url.to_string(),
        catalog: ChannelCatalog::VendorDefault,
        conversation,
    }
}

#[test]
fn builds_environment_authenticated_gateway_provider() {
    let channel = channel(
        VENDOR_OPENAI,
        "https://gateway.example/v1",
        ChannelConversationSettings {
            model_id: Some("model-id".to_string()),
            ..ChannelConversationSettings::default()
        },
    );

    let arguments = app_server_arguments(&channel, None, Some("\"model-id\""))
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
fn omits_the_model_override_when_the_channel_has_no_default_model() {
    let channel = channel(
        VENDOR_OPENAI,
        "https://gateway.example/v1",
        ChannelConversationSettings::default(),
    );

    let arguments =
        app_server_arguments(&channel, None, None).expect("arguments should be encoded");

    assert!(!arguments.iter().any(|argument| argument.starts_with("model=")));
    assert_eq!(
        arguments[0..4],
        [
            "app-server".to_string(),
            "--stdio".to_string(),
            "-c".to_string(),
            "features.code_mode_host=true".to_string(),
        ]
    );
}

#[test]
fn injects_the_deepseek_catalog_and_disables_web_search() {
    let channel = channel(
        VENDOR_DEEPSEEK,
        "https://api.deepseek.com",
        ChannelConversationSettings {
            model_id: Some("deepseek-flash".to_string()),
            ..ChannelConversationSettings::default()
        },
    );

    let arguments = app_server_arguments(
        &channel,
        Some(Path::new("C:/data/deepseek-models.json")),
        Some("\"deepseek-flash\""),
    )
    .expect("deepseek arguments should be encoded");

    assert!(
        arguments.contains(&"model_catalog_json=\"C:/data/deepseek-models.json\"".to_string()),
        "catalog path must be injected: {arguments:?}"
    );
    assert!(
        arguments.contains(&"web_search=\"disabled\"".to_string()),
        "deepseek must disable the built-in web search: {arguments:?}"
    );
}

#[test]
fn keeps_openai_on_the_core_catalog_and_web_search() {
    let channel = channel(
        VENDOR_OPENAI,
        "https://api.openai.com/v1",
        ChannelConversationSettings::default(),
    );

    let arguments =
        app_server_arguments(&channel, None, None).expect("arguments should be encoded");

    assert!(!arguments.iter().any(|argument| argument.starts_with("web_search=")));
    assert!(!arguments.iter().any(|argument| argument.starts_with("model_catalog_json=")));
}

#[test]
fn includes_explicit_model_parameters() {
    let channel = channel(
        VENDOR_OPENAI,
        "https://gateway.example/v1",
        ChannelConversationSettings {
            model_id: Some("model-id".to_string()),
            reasoning_effort: Some("high".to_string()),
            reasoning_summary: Some("detailed".to_string()),
            verbosity: Some("medium".to_string()),
            service_tier: "priority".to_string(),
        },
    );

    let arguments = app_server_arguments(&channel, None, Some("\"model-id\""))
        .expect("model arguments should be encoded");

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