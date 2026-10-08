import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { errorMessage } from "../../shared/errors";
import { bearerEnv, mcpHttpUrl, mcpKey, type McpConfig, type UserMcpConfig } from "../extensions/mcpConfig";

interface Props {
  read: () => Promise<UserMcpConfig>;
  write: (name: string, value: McpConfig | null, version: string) => Promise<void | { warning: string | null }>;
  reload: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  onChanged?: () => void;
  serverNames: string[];
  refreshRevision: number;
  renderServer: (name: string, actions?: ReactNode, endpoint?: string) => ReactNode;
}

export function McpConfigPanel({ read, write, reload, onBusyChange, onChanged, serverNames, renderServer, refreshRevision }: Props) {
  const [config, setConfig] = useState<UserMcpConfig | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<UserMcpConfig | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);

  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  useEffect(() => {
    if (confirmDelete) deleteDialog.current?.showModal();
    else deleteDialog.current?.close();
  }, [confirmDelete]);

  useEffect(() => {
    let active = true;
    void read().then((value) => { if (active) setConfig(value); }).catch((value) => { if (active) setError(errorMessage(value)); });
    return () => { active = false; };
  }, [read, revision, refreshRevision]);

  function closeEditor() {
    setEditorOpen(false); setError("");
    requestAnimationFrame(() => addButton.current?.focus());
  }

  function edit(server: string | null) {
    setEditSnapshot(config);
    setEditorOpen(true); setError(""); setNotice(""); setConfirmDelete(null);
    const value = server ? config?.servers[server] : undefined;
    setEditing(server); setName(server ?? "");
    setTransport(value?.url ? "http" : "stdio");
    setEndpoint(String(value?.url ?? value?.command ?? ""));
    setArgs(JSON.stringify(value?.args ?? []));
    setEnvVars(Array.isArray(value?.env_vars) ? value.env_vars.join(", ") : "");
    if (tokenRef.current) tokenRef.current.value = "";
  }

  async function save() {
    if (!config || !editSnapshot || saving.current) return;
    saving.current = true;
    const secret = transport === "http" ? tokenRef.current?.value : undefined;
    setBusy(true); setError(""); setNotice("");
    let configSaved = false;
    try {
      const server = name.trim();
      mcpKey(server);
      if (!editing && Object.prototype.hasOwnProperty.call(config.servers, server)) throw new Error("同名服务器已存在，请点击编辑。");
      if (!endpoint.trim()) throw new Error("请输入命令或 HTTP 地址。");
      const value: McpConfig = { ...(editing ? editSnapshot.servers[editing] : { enabled: true }) };
      delete value.command; delete value.args; delete value.url;
      if (transport === "http") {
        if (secret && /[\r\n\0]/.test(secret)) throw new Error("Token 不能包含换行符或空字符。");
        value.url = mcpHttpUrl(endpoint);
        delete value.env_vars; delete value.env; delete value.cwd;
        if (secret) value.bearer_token_env_var = bearerEnv(server);
      } else {
        const parsed: unknown = JSON.parse(args);
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) throw new Error("参数必须是 JSON 字符串数组。");
        const variables = envVars.split(",").map((item) => item.trim()).filter(Boolean);
        if (variables.some((item) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(item))) throw new Error("环境变量名格式无效；请使用逗号分隔。");
        value.command = endpoint.trim(); value.args = parsed; value.env_vars = variables;
        delete value.bearer_token_env_var; delete value.http_headers; delete value.env_http_headers;
      }
      const result = await write(server, value, editSnapshot.version);
      configSaved = true;
      if (secret) {
        await invoke("save_mcp_secret", { name: server, secret });
        setNotice("配置与凭据已保存。请等待任务结束后，在设置 → 运行环境重启，使新 Token 生效。");
      } else {
        setNotice("配置已保存。已有会话建议重新创建。");
      }
      closeEditor();
      try { await reload(); }
      catch { setError("配置与凭据处理已完成，但 MCP 重新加载失败。请点击刷新重试，或重启运行环境。"); }
      if (result?.warning) setNotice(result.warning + (secret ? " 新 Token 需重启运行环境后生效。" : ""));
    } catch (value) {
      if (configSaved) setEditorOpen(false);
      setError(configSaved ? "配置已保存，但凭据保存失败。请重新编辑并输入 Token。" : errorMessage(value));
    } finally {
      if (tokenRef.current) tokenRef.current.value = "";
      if (configSaved) onChanged?.();
      setRevision((value) => value + 1); setBusy(false); saving.current = false;
    }
  }

  async function change(server: string, value: McpConfig | null) {
    if (!config || saving.current) return;
    saving.current = true;
    setBusy(true); setError(""); setNotice("");
    let saved = false;
    try {
      const result = await write(server, value, config.version); saved = true;
      if (value === null) {
        await invoke("save_mcp_secret", { name: server, secret: null });
        setNotice("MCP 配置与 CS 保存的 Token 已删除；运行中进程的旧环境变量在下次重启时清除。OAuth 授权由服务端管理。");
        setConfirmDelete(null);
        if (editing === server) setEditorOpen(false);
      }
      try { await reload(); }
      catch { setError("配置与凭据处理已完成，但 MCP 重新加载失败。请点击刷新重试，或重启运行环境。"); }
      if (result?.warning) setNotice(result.warning);
    } catch (failure) { setError(saved ? "配置已删除，但凭据清理失败，请重新保存同名配置后重试删除。" : errorMessage(failure)); }
    finally { if (saved) onChanged?.(); setRevision((current) => current + 1); setBusy(false); saving.current = false; }
  }

  return <section className="mcp-config-panel">
    <header className="mcp-config-toolbar">{editorOpen ? <><button type="button" disabled={busy} onClick={closeEditor}><ArrowLeft aria-hidden="true" />返回列表</button><strong>{editing ? `编辑 ${editing}` : "添加服务器"}</strong></> : <><span>管理连接与工具访问</span><button ref={addButton} className="mcp-primary" type="button" disabled={busy || !config} onClick={() => edit(null)}><Plus aria-hidden="true" />添加服务器</button></>}</header>
    {editorOpen && <form className="mcp-config-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy || !config}>
        <label>服务器名称<input autoFocus={editing === null} required value={name} disabled={editing !== null} placeholder="例如：browser-tools" onChange={(event) => setName(event.target.value)} /></label>
        <label>连接方式<select value={transport} onChange={(event) => { setTransport(event.target.value); setEndpoint(""); }}><option value="stdio">本地命令（stdio）</option><option value="http">HTTP</option></select></label>
        <label>{transport === "http" ? "HTTP 地址" : "可执行命令"}<input autoFocus={editing !== null} required value={endpoint} placeholder={transport === "http" ? "https://example.com/mcp" : "例如：npx、uvx 或程序完整路径"} onChange={(event) => setEndpoint(event.target.value)} /></label>
        {transport === "stdio" ? <><label>参数（JSON 数组）<input value={args} onChange={(event) => setArgs(event.target.value)} /></label><label>传入的环境变量名（逗号分隔）<input value={envVars} onChange={(event) => setEnvVars(event.target.value)} /></label></> : <label>Bearer Token（留空保留现有凭据）<input type="password" ref={tokenRef} autoComplete="new-password" /></label>}
        <p className="mcp-form-hint">{transport === "http" ? "Token 存入 Windows 凭据管理器，留空保留现有凭据。" : "参数使用 JSON 字符串数组；环境变量填写名称，不在这里输入密钥。"}</p>
      </fieldset>
      <div className="extension-actions"><button type="button" disabled={busy} onClick={closeEditor}>取消</button><button className="mcp-primary" disabled={busy || !config} type="submit">{busy ? "正在保存…" : editing ? "保存修改" : "添加服务器"}</button></div>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!config && !error && <p role="status">正在读取配置…</p>}
    {error && <button type="button" disabled={busy} onClick={() => { setError(""); setRevision((value) => value + 1); }}>重新读取配置</button>}
    {!editorOpen && [...new Set([...Object.keys(config?.servers ?? {}), ...serverNames])].sort((a, b) => a.localeCompare(b)).map((server) => {
      const value = config?.servers[server];
      return <div key={server} className="mcp-managed-server">{renderServer(server, value && <div className="mcp-row-actions">
        <button type="button" title="编辑" aria-label={`编辑 ${server}`} disabled={busy} onClick={() => edit(server)}><Pencil aria-hidden="true" /></button>
        <button type="button" title="删除" aria-label={`删除 ${server}`} disabled={busy} onClick={() => setConfirmDelete(server)}><Trash2 aria-hidden="true" /></button>
        <button className="skill-enable-switch" type="button" role="switch" aria-label={`启用 ${server}`} aria-checked={value.enabled !== false} disabled={busy} onClick={() => void change(server, { ...value, enabled: value.enabled === false })}><span /></button>
      </div>, value ? (value.enabled === false ? "已禁用 · " : "") + (value.url ? "HTTP" : "本地命令") : undefined)}
      </div>;
    })}
    <dialog ref={deleteDialog} className="mcp-delete-confirm" aria-labelledby="mcp-delete-title" onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); if (!busy) setConfirmDelete(null); }}>
      <h2 id="mcp-delete-title">删除 {confirmDelete}？</h2><p>将移除此服务器配置和 CS 保存的 Token，OAuth 授权仍由服务端管理。</p>
      {error && <p className="error" role="alert">{error}</p>}
      <footer><button autoFocus disabled={busy} onClick={() => setConfirmDelete(null)}>取消</button><button className="mcp-delete-action" disabled={busy} onClick={() => { if (confirmDelete) void change(confirmDelete, null); }}>确认删除</button></footer>
    </dialog>
    {!editorOpen && config && Object.keys(config.servers).length === 0 && serverNames.length === 0 && <div className="mcp-empty">尚未添加服务器。点击“添加服务器”连接本地工具或 HTTP 服务。</div>}
  </section>;
}
