import { useEffect, useState } from "react";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";
import { errorMessage } from "../../shared/errors";

interface Props {
  loadServers: () => Promise<McpServerStatus[]>;
  onClose: () => void;
}

const AUTH_LABELS: Record<McpServerStatus["authStatus"], string> = {
  unsupported: "无需登录",
  notLoggedIn: "未登录",
  bearerToken: "Token",
  oAuth: "OAuth",
};

export function McpStatusPanel({ loadServers, onClose }: Props) {
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadServers().then(setServers).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [loadServers]);

  return <div className="agent-command-panel mcp-panel">
    <header><div><strong>MCP</strong><small>已配置的服务器与工具</small></div><button onClick={onClose}>×</button></header>
    <div className="command-panel-list">
      {loading && <p>正在读取 MCP 状态…</p>}{error && <p className="error">{error}</p>}
      {!loading && !error && servers.length === 0 && <p>当前没有配置 MCP 服务器。</p>}
      {servers.map((server) => {
        const tools = Object.keys(server.tools);
        return <details className="mcp-server" key={server.name}>
          <summary><i>⌘</i><span><strong>{server.name}</strong><small>{tools.length} 个工具 · {AUTH_LABELS[server.authStatus]}</small></span><em>{server.serverInfo ? "已连接" : "未启动"}</em></summary>
          <div className="mcp-tool-list">{tools.length > 0 ? tools.map((tool) => <code key={tool}>{tool}</code>) : <small>该服务器没有公开工具。</small>}</div>
        </details>;
      })}
    </div>
  </div>;
}
