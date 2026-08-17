import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Server, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";
import type { ResourceContent } from "../../generated/app-server/ResourceContent";
import { errorMessage } from "../../shared/errors";
import { safeHttpUrl } from "../../shared/externalUrl";

interface Props {
  loadServers: () => Promise<McpServerStatus[]>;
  loginServer: (name: string) => Promise<string>;
  reloadServers: () => Promise<void>;
  readResource: (server: string, uri: string) => Promise<ResourceContent[]>;
  onClose: () => void;
}

const AUTH_LABELS: Record<McpServerStatus["authStatus"], string> = {
  unsupported: "无需登录",
  notLoggedIn: "未登录",
  bearerToken: "Token",
  oAuth: "OAuth",
};

const MAX_RESOURCE_PREVIEW_CHARS = 100_000;

function buildResourcePreview(contents: ResourceContent[]) {
  const text = contents.map((content) => "text" in content
    ? content.text
    : `[二进制资源 · ${content.mimeType ?? "未知类型"} · ${content.blob.length} 字符]`).join("\n\n");
  return text.length <= MAX_RESOURCE_PREVIEW_CHARS
    ? text
    : `${text.slice(0, MAX_RESOURCE_PREVIEW_CHARS)}\n\n[预览已截断]`;
}

export function McpStatusPanel({ loadServers, loginServer, reloadServers, readResource, onClose }: Props) {
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionServer, setActionServer] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [resourcePreview, setResourcePreview] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setServers(await loadServers());
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setLoading(false);
    }
  }, [loadServers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(name: string) {
    setActionServer(name);
    setError("");
    try {
      const url = safeHttpUrl(await loginServer(name));
      if (!url) throw new Error("MCP 服务器返回了不安全的 OAuth 地址");
      setAuthorizationUrl(url);
      await openUrl(url);
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setActionServer(null);
    }
  }

  async function reload() {
    setActionServer("*");
    setError("");
    try {
      await reloadServers();
      await refresh();
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setActionServer(null);
    }
  }

  async function previewResource(server: string, uri: string) {
    setActionServer(server);
    setError("");
    try {
      setResourcePreview(buildResourcePreview(await readResource(server, uri)));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setActionServer(null);
    }
  }

  return <div className="agent-command-panel mcp-panel">
    <header><div><strong>MCP</strong><small>服务器、OAuth、工具与资源</small></div><span><button className="mcp-refresh" disabled={actionServer !== null} onClick={() => void reload()}><RefreshCw aria-hidden="true" />刷新配置</button><button onClick={onClose} aria-label="关闭 MCP"><X aria-hidden="true" /></button></span></header>
    <div className="command-panel-list">
      {loading && <p>正在读取 MCP 状态…</p>}{error && <p className="error">{error}</p>}
      {!loading && !error && servers.length === 0 && <p>当前没有配置 MCP 服务器。</p>}
      {authorizationUrl && <p className="mcp-auth-link">浏览器未打开？<a href={authorizationUrl} target="_blank" rel="noreferrer" onClick={(event) => { event.preventDefault(); void openUrl(authorizationUrl).catch((value) => setError(errorMessage(value))); }}>继续 OAuth 登录</a></p>}
      {resourcePreview && <div className="mcp-resource-preview"><button onClick={() => setResourcePreview("")}>关闭预览</button><pre>{resourcePreview}</pre></div>}
      {servers.map((server) => {
        const tools = Object.keys(server.tools);
        return <details className="mcp-server" key={server.name}>
          <summary><i><Server aria-hidden="true" /></i><span><strong>{server.name}</strong><small>{tools.length} 个工具 · {AUTH_LABELS[server.authStatus]}</small></span><em>{server.serverInfo ? "已连接" : "未启动"}</em></summary>
          <div className="mcp-server-actions">
            {server.authStatus === "notLoggedIn" && <button className="secondary-button" disabled={actionServer !== null} onClick={() => void login(server.name)}>{actionServer === server.name ? "正在登录…" : "OAuth 登录"}</button>}
          </div>
          <div className="mcp-tool-list">{tools.length > 0 ? tools.map((tool) => <code key={tool}>{tool}</code>) : <small>该服务器没有公开工具。</small>}</div>
          {server.resources.length > 0 && <div className="mcp-resource-list"><small>资源</small>{server.resources.map((resource) => <button key={resource.uri} title={resource.uri} disabled={actionServer !== null} onClick={() => void previewResource(server.name, resource.uri)}>{resource.title ?? resource.name}</button>)}</div>}
        </details>;
      })}
    </div>
  </div>;
}
