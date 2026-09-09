import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { errorMessage } from "../../shared/errors";
import { bearerEnv, mcpKey, type McpConfig, type UserMcpConfig } from "../extensions/mcpConfig";

interface Props {
  read: () => Promise<UserMcpConfig>;
  write: (name: string, value: McpConfig | null, version: string) => Promise<void>;
  onChanged?: () => void;
}

export function McpConfigPanel({ read, write, onChanged }: Props) {
  const [config, setConfig] = useState<UserMcpConfig | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [transport, setTransport] = useState("stdio");
  const [endpoint, setEndpoint] = useState("");
  const [args, setArgs] = useState("[]");
  const [envVars, setEnvVars] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void read().then((value) => { if (active) setConfig(value); }).catch((value) => { if (active) setError(errorMessage(value)); });
    return () => { active = false; };
  }, [read, revision]);

  function edit(server: string | null) {
    const value = server ? config?.servers[server] : undefined;
    setEditing(server); setName(server ?? "");
    setTransport(value?.url ? "http" : "stdio");
    setEndpoint(String(value?.url ?? value?.command ?? ""));
    setArgs(JSON.stringify(value?.args ?? []));
    setEnvVars(Array.isArray(value?.env_vars) ? value.env_vars.join(", ") : "");
    if (tokenRef.current) tokenRef.current.value = "";
  }

  async function save() {
    if (!config) return;
    setBusy(true); setError(""); setNotice("");
    let configSaved = false;
    try {
      const server = name.trim();
      mcpKey(server);
      if (!editing && Object.prototype.hasOwnProperty.call(config.servers, server)) throw new Error("同名服务器已存在，请点击编辑。");
      if (!endpoint.trim()) throw new Error("请输入命令或 HTTP 地址。");
      const value: McpConfig = { ...(editing ? config.servers[editing] : { enabled: true }) };
      delete value.command; delete value.args; delete value.url;
      if (transport === "http") {
        const url = new URL(endpoint.trim());
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("请输入不含账号密码的 HTTP/HTTPS 地址。");
        value.url = url.href;
        delete value.env_vars; delete value.env; delete value.cwd;
        if (tokenRef.current?.value) value.bearer_token_env_var = bearerEnv(server);
      } else {
        const parsed: unknown = JSON.parse(args);
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) throw new Error("参数必须是 JSON 字符串数组。");
        const variables = envVars.split(",").map((item) => item.trim()).filter(Boolean);
        if (variables.some((item) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(item))) throw new Error("环境变量名格式无效；请使用逗号分隔。");
        value.command = endpoint.trim(); value.args = parsed; value.env_vars = variables;
        delete value.bearer_token_env_var; delete value.http_headers; delete value.env_http_headers;
      }
      await write(server, value, config.version);
      configSaved = true;
      if (transport === "http" && tokenRef.current?.value) {
        await invoke("save_mcp_secret", { name: server, secret: tokenRef.current.value });
        setNotice("配置与凭据已保存。请等待任务结束后，在设置 → 运行环境重启，使新 Token 生效。");
      } else setNotice("配置已保存并请求重新加载。查看下方实际连接状态；已有会话建议重新创建。");
      edit(null);
    } catch (value) {
      setError(configSaved ? "配置已保存，但凭据保存失败。请重新编辑并输入 Token。" : errorMessage(value));
    } finally {
      if (tokenRef.current) tokenRef.current.value = "";
      onChanged?.(); setRevision((value) => value + 1); setBusy(false);
    }
  }

  async function change(server: string, value: McpConfig | null) {
    if (!config) return;
    setBusy(true); setError("");
    let saved = false;
    try {
      await write(server, value, config.version); saved = true;
      if (value === null) {
        await invoke("save_mcp_secret", { name: server, secret: null });
        setNotice("MCP 配置与 CS 保存的 Token 已删除；运行中进程的旧环境变量在下次重启时清除。OAuth 授权由服务端管理。");
        if (editing === server) edit(null);
      }
    } catch (failure) { setError(saved ? "配置已删除，但凭据清理失败，请重新保存同名配置后重试删除。" : errorMessage(failure)); }
    finally { onChanged?.(); setRevision((current) => current + 1); setBusy(false); }
  }

  return <section className="mcp-config-panel">
    <header><strong>用户级 MCP 配置</strong><small>仅修改 CS 用户配置。HTTP Token 保存到 Windows Credential Manager；stdio 可引用系统环境变量。</small></header>
    <form className="mcp-config-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy || !config}>
        <label>服务器名称<input required value={name} disabled={editing !== null} onChange={(event) => setName(event.target.value)} /></label>
        <label>连接方式<select value={transport} onChange={(event) => { setTransport(event.target.value); setEndpoint(""); }}><option value="stdio">本地命令（stdio）</option><option value="http">HTTP</option></select></label>
        <label>{transport === "http" ? "HTTP 地址" : "可执行命令"}<input required value={endpoint} onChange={(event) => setEndpoint(event.target.value)} /></label>
        {transport === "stdio" ? <><label>参数（JSON 数组）<input value={args} onChange={(event) => setArgs(event.target.value)} /></label><label>传入的环境变量名（逗号分隔）<input value={envVars} onChange={(event) => setEnvVars(event.target.value)} /></label></> : <label>Bearer Token（留空保留现有凭据）<input type="password" ref={tokenRef} autoComplete="new-password" /></label>}
        <div className="extension-actions"><button type="submit">{editing ? "保存修改" : "添加 MCP"}</button>{editing && <button type="button" onClick={() => edit(null)}>取消编辑</button>}</div>
      </fieldset>
    </form>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button type="button" disabled={busy} onClick={() => { setError(""); setRevision((value) => value + 1); }}>重新读取配置</button>
    {config && Object.entries(config.servers).map(([server, value]) => <div className="mcp-config-row" key={server}>
      <span><strong>{server}</strong><small>{value.enabled === false ? "已禁用" : "已启用"}</small></span>
      <div className="extension-actions"><button type="button" disabled={busy} onClick={() => edit(server)}>编辑</button><button type="button" disabled={busy} onClick={() => void change(server, { ...value, enabled: value.enabled === false })}>{value.enabled === false ? "启用" : "禁用"}</button><button type="button" disabled={busy} onClick={() => void change(server, null)}>删除</button></div>
    </div>)}
  </section>;
}
