use serde::Serialize;
use std::time::Duration;

use crate::credentials::read_channel_secret;

/// 探针只验证「路由可达 + 密钥被接受 + 目录可读」，不发送推理请求，因此不产生用量。
const PROBE_TIMEOUT: Duration = Duration::from_secs(20);
const USER_AGENT: &str = concat!("codex-shell/", env!("CARGO_PKG_VERSION"));

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelProbeReport {
    pub endpoint: String,
    pub status: u16,
    pub model_count: Option<usize>,
    pub message: String,
}

/// `GET {base}/models` 是 OpenAI 兼容路由的通用目录接口，OpenAI 与 DeepSeek 都提供。
fn models_endpoint(base_url: &str) -> Result<String, String> {
    let trimmed = base_url.trim().trim_end_matches('/');
    let absolute = trimmed.split_once("://").is_some_and(|(scheme, rest)| {
        matches!(scheme.to_ascii_lowercase().as_str(), "http" | "https") && !rest.is_empty()
    });
    if !absolute {
        return Err("Base URL 必须以 http:// 或 https:// 开头".to_string());
    }
    if trimmed.chars().any(char::is_whitespace) {
        return Err("Base URL 不能包含空白字符".to_string());
    }
    Ok(format!("{trimmed}/models"))
}

/// 优先使用界面上刚输入的密钥；没有时才回读该渠道已经保存的密钥。
fn resolve_secret(channel_id: Option<&str>, secret: Option<String>) -> Result<String, String> {
    if let Some(secret) = secret
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        return Ok(secret);
    }
    let channel_id = channel_id.ok_or_else(|| "请先填写 API Key".to_string())?;
    read_channel_secret(channel_id)?.ok_or_else(|| "该渠道尚未保存 API Key".to_string())
}

fn count_models(body: &str) -> Option<usize> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    Some(value.get("data")?.as_array()?.len())
}

fn describe_probe(status: u16, model_count: Option<usize>) -> String {
    match status {
        200..=299 => match model_count {
            Some(count) => format!("连接正常，模型目录返回 {count} 个模型。"),
            None => "路由与密钥可用，但响应不是模型列表格式。".to_string(),
        },
        401 | 403 => "路由可达，但 API Key 被拒绝。".to_string(),
        404 => "路由可达，但没有 /models 接口；请检查 Base URL 是否包含正确的版本路径。".to_string(),
        429 => "路由与密钥可用，但当前请求被限流。".to_string(),
        other => format!("路由返回 HTTP {other}。"),
    }
}

/// rustls 需要进程级加密后端；Updater 使用 ring，这里保持同一后端。
fn install_crypto_provider() {
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
}

/// 测试渠道的路由与密钥，只返回可展示的结论，不回传密钥本身。
#[tauri::command]
pub async fn test_channel_connection(
    base_url: String,
    channel_id: Option<String>,
    secret: Option<String>,
) -> Result<ChannelProbeReport, String> {
    let endpoint = models_endpoint(&base_url)?;
    let api_key = resolve_secret(channel_id.as_deref(), secret)?;
    install_crypto_provider();
    let client = reqwest::Client::builder()
        .timeout(PROBE_TIMEOUT)
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| format!("无法初始化网络客户端：{error}"))?;
    let response = client
        .get(&endpoint)
        .bearer_auth(&api_key)
        .send()
        .await
        .map_err(|error| format!("无法连接 {endpoint}：{error}"))?;
    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();
    let model_count = count_models(&body);
    Ok(ChannelProbeReport {
        message: describe_probe(status, model_count),
        endpoint,
        status,
        model_count,
    })
}

#[cfg(test)]
mod tests {
    use super::{count_models, describe_probe, models_endpoint, resolve_secret};

    #[test]
    fn builds_the_openai_compatible_models_endpoint() {
        assert_eq!(
            models_endpoint("https://api.deepseek.com").unwrap(),
            "https://api.deepseek.com/models"
        );
        assert_eq!(
            models_endpoint("  https://api.openai.com/v1/  ").unwrap(),
            "https://api.openai.com/v1/models"
        );
    }

    #[test]
    fn rejects_endpoints_that_cannot_carry_a_bearer_token() {
        for base_url in ["", "   ", "api.deepseek.com", "file:///C:/keys.txt", "ftp://host"] {
            assert!(
                models_endpoint(base_url).is_err(),
                "expected {base_url:?} to be rejected"
            );
        }
        assert!(models_endpoint("https://host/with space").is_err());
    }

    #[test]
    fn prefers_the_typed_secret_over_the_stored_one() {
        assert_eq!(
            resolve_secret(None, Some(" typed ".to_string())).unwrap(),
            "typed"
        );
        assert!(resolve_secret(None, None).is_err());
        assert!(resolve_secret(None, Some("  ".to_string())).is_err());
    }

    #[test]
    fn counts_only_a_real_model_list() {
        assert_eq!(count_models(r#"{"data":[{"id":"a"},{"id":"b"}]}"#), Some(2));
        assert_eq!(count_models(r#"{"data":[]}"#), Some(0));
        assert_eq!(count_models(r#"{"error":{"message":"nope"}}"#), None);
        assert_eq!(count_models("not json"), None);
    }

    #[test]
    fn explains_the_probe_outcome_without_leaking_headers() {
        assert!(describe_probe(200, Some(3)).contains("3 个模型"));
        assert!(describe_probe(401, None).contains("被拒绝"));
        assert!(describe_probe(404, None).contains("版本路径"));
        assert!(describe_probe(503, None).contains("503"));
    }
}
