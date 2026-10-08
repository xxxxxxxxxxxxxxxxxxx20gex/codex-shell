import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, RefreshCw, Server, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";
import type { ResourceContent } from "../../generated/app-server/ResourceContent";
import { errorMessage } from "../../shared/errors";
import { safeHttpUrl } from "../../shared/externalUrl";
import { McpConfigPanel } from "./McpConfigPanel";
import "./ExtensionManagement.css";
import "./McpManagement.css";
import type { UserMcpConfig, McpConfig } from "../extensions/mcpConfig";

interface Props {
  loadServers: () => Promise<McpServerStatus[]>;
  loginServer: (name: string) => Promise<string>;
  reloadServers: () => Promise<void>;
  readResource: (server: string, uri: string) => Promise<ResourceContent[]>;
  onClose: () => void;
  readConfig?: () => Promise<UserMcpConfig>;
  writeConfig?: (name: string, value: McpConfig | null, version: string) => Promise<void>;
  onChanged?: () => void;
  revision?: number;
}

const AUTH_LABELS: Record<McpServerStatus["authStatus"], string> = {
  unknown: "未知",
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

export function McpStatusPanel({ loadServers, loginServer, reloadServers, readResource, onClose, readConfig, writeConfig, onChanged, revision }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!panelRef.current?.contains(event.target as Node)) onClose(); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [onClose]);
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionServer, setActionServer] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [resourcePreview, setResourcePreview] = useState("");
  const [configRevision, setConfigRevision] = useState(0);

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
  }, [refresh, revision]);

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
      setConfigRevision((value) => value + 1);
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

  function renderServer(name: string, actions?: ReactNode, description?: string) {
    const server = servers.find((entry) => entry.name === name);
    const tools = Object.keys(server?.tools ?? {});
    const status = server?.runtimeStatus ?? (server?.serverInfo ? "connected" : "notStarted");
    const statusLabel = ({ notStarted: "未启动", starting: "连接中", connected: "已连接", authenticationRequired: "需要认证", failed: "连接失败", cancelled: "已取消", disabled: "已禁用" })[status];
    return <div className="mcp-server-entry" key={name}>
      <div className="mcp-server-heading"><Server aria-hidden="true" /><div><strong title={name}>{name}</strong><small>{description ?? "由其他配置提供"}{server ? ` · ${AUTH_LABELS[server.authStatus]}` : ""}</small></div><span className="mcp-connection-state" data-state={status}>{statusLabel}</span>{actions}</div>
      {server && <details className="mcp-server-details"><summary><ChevronRight aria-hidden="true" />工具与资源 <span>{tools.length} 个工具 · {server.resources.length} 个资源</span></summary>
        <div className="mcp-tool-list">{tools.length ? tools.map((tool) => <code key={tool}>{tool}</code>) : <small>暂无可用工具</small>}</div>
        {server.toolsError && <p className="error">{server.toolsError}</p>}
        {server.resources.length > 0 && <div className="mcp-resource-list">{server.resources.map((resource) => <button key={resource.uri} title={resource.uri} disabled={actionServer !== null} onClick={() => void previewResource(name, resource.uri)}>{resource.title ?? resource.name}</button>)}</div>}
      </details>}
      {server?.authStatus === "notLoggedIn" && <button className="secondary-button" disabled={actionServer !== null} onClick={() => void login(name)}>{actionServer === name ? "正在登录…" : "OAuth 登录"}</button>}
    </div>;
  }

  return <div ref={panelRef} className="agent-command-panel mcp-panel" role="dialog" aria-label="MCP 服务器">
    <header><div><strong>MCP 服务器</strong><small>连接外部工具，扩展智能体能力</small></div><span><button className="mcp-refresh" title="刷新连接状态和配置" disabled={actionServer !== null} onClick={() => void reload()}><RefreshCw aria-hidden="true" />刷新</button><button className="mcp-close" onClick={onClose} aria-label="关闭 MCP" title="关闭"><X aria-hidden="true" /></button></span></header>
    <div className="command-panel-list">
      {loading && <p>正在读取 MCP 状态…</p>}{error && <p className="error">{error}</p>}
      {!readConfig && !loading && !error && servers.length === 0 && <p>当前没有配置 MCP 服务器。</p>}
      {authorizationUrl && <p className="mcp-auth-link">浏览器未打开？<a href={authorizationUrl} target="_blank" rel="noreferrer" onClick={(event) => { event.preventDefault(); void openUrl(authorizationUrl).catch((value) => setError(errorMessage(value))); }}>继续 OAuth 登录</a></p>}
      {resourcePreview && <div className="mcp-resource-preview"><button onClick={() => setResourcePreview("")}>关闭预览</button><pre>{resourcePreview}</pre></div>}
      {readConfig && writeConfig ? <McpConfigPanel refreshRevision={configRevision} read={readConfig} write={writeConfig} onChanged={() => { onChanged?.(); void refresh(); }} serverNames={servers.map((server) => server.name)} renderServer={renderServer} /> : servers.map((server) => renderServer(server.name))}
    </div>
  </div>;
}
