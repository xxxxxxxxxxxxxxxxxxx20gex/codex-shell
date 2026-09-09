import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { errorMessage } from "../../shared/errors";
import type { PluginMarketplaceEntry } from "../../generated/app-server/v2/PluginMarketplaceEntry";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { useExtensions } from "../extensions/useExtensions";
import "./ExtensionManagement.css";

interface Props {
  extensions: ReturnType<typeof useExtensions>;
  revision: number;
  onClose: () => void;
  onChanged: () => void;
}

export function PluginManagementPage({ extensions, revision, onClose, onChanged }: Props) {
  const { listPlugins, addMarketplace, removeMarketplace, upgradeMarketplace, readPlugin, installPlugin, uninstallPlugin } = extensions;
  const [marketplaces, setMarketplaces] = useState<PluginMarketplaceEntry[]>([]);
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void listPlugins().then((result) => {
      if (!active) return;
      setMarketplaces(result.marketplaces);
      if (result.marketplaceLoadErrors.length) setError(result.marketplaceLoadErrors.map((item) => item.message).join("\n"));
    }).catch((value) => { if (active) setError(errorMessage(value)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listPlugins, revision, refresh]);

  async function action(work: () => Promise<unknown>, changed = true) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (value) { setError(errorMessage(value)); }
    finally {
      if (changed) { setDetail(null); onChanged(); setRefresh((value) => value + 1); }
      setBusy(false);
    }
  }

  return <div className="skill-management-page extension-page">
    <header className="skill-management-header"><div><h1>Plugins</h1><p>安装可信来源的插件。插件可执行 MCP、Hooks 并提供 Skills；变更后请新建会话。</p></div><button type="button" onClick={onClose}>返回会话</button></header>
    <form className="extension-source" onSubmit={(event) => { event.preventDefault(); void action(() => addMarketplace(source.trim())); }}>
      <label>Marketplace 来源<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="本地目录或 Git 仓库 URL" required /></label>
      <div className="extension-actions"><button type="submit" disabled={busy || !source.trim()}>添加来源</button><button type="button" disabled={busy} onClick={() => void action(async () => {
        const path = await open({ directory: true, multiple: false, title: "选择 Marketplace 根目录" });
        if (typeof path === "string") await addMarketplace(path);
      })}>选择本地目录</button><button type="button" disabled={busy} onClick={() => { setError(""); setRefresh((value) => value + 1); }}>刷新</button></div>
    </form>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading && <p>正在读取插件…</p>}{!loading && marketplaces.length === 0 && <p>尚未添加本地 Marketplace。</p>}
    {marketplaces.map((marketplace) => <section className="extension-marketplace" key={marketplace.name}>
      <header><strong>{marketplace.interface?.displayName || marketplace.name}</strong><div className="extension-actions"><button type="button" disabled={busy} onClick={() => void action(() => upgradeMarketplace(marketplace.name))}>更新来源</button><button type="button" disabled={busy || marketplace.plugins.some((item) => item.installed)} title="请先卸载该来源中的插件" onClick={() => void action(() => removeMarketplace(marketplace.name))}>移除来源</button></div></header>
      {marketplace.plugins.map((plugin) => <article className="extension-row" key={plugin.id}>
        <div><strong>{plugin.interface?.displayName || plugin.name}</strong><p>{plugin.interface?.shortDescription || plugin.name}</p><small>{plugin.installed ? (plugin.enabled ? "已安装 · 已启用" : "已安装 · 已禁用") : "未安装"} · {plugin.authPolicy === "ON_INSTALL" ? "安装时认证" : "使用时认证"}{plugin.disabledReason && ` · ${plugin.disabledReason}`}{plugin.eligiblePlanTypes?.length ? ` · 套餐：${plugin.eligiblePlanTypes.join("、")}` : ""}</small></div>
        <div className="extension-actions"><button type="button" disabled={busy || !marketplace.path} onClick={() => void action(async () => { setDetail((await readPlugin({ marketplacePath: marketplace.path, pluginName: plugin.name })).plugin); }, false)}>详情</button>
          {plugin.installed ? <button type="button" disabled={busy || plugin.installPolicy === "INSTALLED_BY_DEFAULT"} onClick={() => void action(() => uninstallPlugin(plugin.id))}>卸载</button> : <button type="button" disabled={busy || !marketplace.path || plugin.installPolicy !== "AVAILABLE" || plugin.availability !== "AVAILABLE"} onClick={() => void action(async () => {
            const result = await installPlugin({ marketplacePath: marketplace.path, pluginName: plugin.name });
            setNotice(result.appsNeedingAuth.length ? `已安装，以下 Connector 仍待认证：${result.appsNeedingAuth.map((app) => app.name).join("、")}。CS 不提供 OpenAI 账户认证，请勿视为已可用。` : "已安装，请新建会话使用。MCP 如需 OAuth，请在 MCP 面板完成授权。");
          })}>安装</button>}
        </div>
      </article>)}
    </section>)}
    {detail && <section className="extension-detail"><header><strong>{detail.summary.name}</strong><button type="button" onClick={() => setDetail(null)}>关闭详情</button></header><p>{detail.description}</p><p>Skills：{detail.skills.map((skill) => skill.name).join("、") || "无"}</p><p>MCP：{detail.mcpServers.join("、") || "无"}</p><p>Hooks：{detail.hooks.length} 个</p><p>Connector：{detail.apps.map((app) => app.name).join("、") || "无"}</p></section>}
  </div>;
}
