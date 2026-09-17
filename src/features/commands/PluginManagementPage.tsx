import { useEffect, useState } from "react";
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
  const { listPlugins, readPlugin, uninstallPlugin } = extensions;
  const [marketplaces, setMarketplaces] = useState<PluginMarketplaceEntry[]>([]);
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void listPlugins().then((result) => {
      if (!active) return;
      setMarketplaces(result.marketplaces.map((marketplace) => ({ ...marketplace, plugins: marketplace.plugins.filter((plugin) => plugin.installed) })).filter((marketplace) => marketplace.plugins.length));
      if (result.marketplaceLoadErrors.length) setError(result.marketplaceLoadErrors.map((item) => item.message).join("\n"));
    }).catch((value) => { if (active) setError(errorMessage(value)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listPlugins, revision, refresh]);

  async function action(work: () => Promise<unknown>, changed = true) {
    setBusy(true); setError("");
    try { await work(); if (changed) { setDetail(null); onChanged(); setRefresh((value) => value + 1); } }
    catch (value) { setError(errorMessage(value)); }
    finally {
      setBusy(false);
    }
  }

  return <div className="skill-management-page extension-page">
    <header className="skill-management-header"><h1>插件</h1><div><button type="button" disabled={busy || loading} onClick={() => { setError(""); setRefresh((value) => value + 1); }}>刷新</button><button type="button" onClick={onClose}>返回会话</button></div></header>
    <section className="skill-management-section"><h2>CS 内置</h2><p>暂无已适配的内置插件。</p></section>
    <h2>已安装</h2>
    {error && <p className="error" role="alert">{error}</p>}
    {loading && <p>正在读取插件…</p>}{!loading && !error && marketplaces.length === 0 && <p>暂无已安装插件。</p>}
    {marketplaces.map((marketplace) => <section className="extension-marketplace" key={marketplace.name}>
      <header><strong>{marketplace.interface?.displayName || marketplace.name}</strong></header>
      {marketplace.plugins.map((plugin) => <article className="extension-row" key={plugin.id}>
        <div><strong>{plugin.interface?.displayName || plugin.name}</strong>{plugin.interface?.shortDescription && <p>{plugin.interface.shortDescription}</p>}<small>{plugin.enabled ? "已安装 · 已启用" : "已安装 · 已禁用"} · {plugin.authPolicy === "ON_INSTALL" ? "安装时认证" : "使用时认证"}{plugin.disabledReason && ` · ${plugin.disabledReason}`}{plugin.eligiblePlanTypes?.length ? ` · 套餐：${plugin.eligiblePlanTypes.join("、")}` : ""}</small></div>
        <div className="extension-actions"><button type="button" disabled={busy || !marketplace.path} onClick={() => void action(async () => { setDetail((await readPlugin({ marketplacePath: marketplace.path, pluginName: plugin.name })).plugin); }, false)}>详情</button>
          <button type="button" disabled={busy || plugin.installPolicy === "INSTALLED_BY_DEFAULT"} onClick={() => void action(() => uninstallPlugin(plugin.id))}>卸载</button>
        </div>
      </article>)}
    </section>)}
    {detail && <section className="extension-detail"><header><strong>{detail.summary.name}</strong><button type="button" onClick={() => setDetail(null)}>关闭详情</button></header><p>{detail.description}</p><p>Skills：{detail.skills.map((skill) => skill.name).join("、") || "无"}</p><p>MCP：{detail.mcpServers.join("、") || "无"}</p><p>Hooks：{detail.hooks.length} 个</p><p>Connector：{detail.apps.map((app) => app.name).join("、") || "无"}</p></section>}
  </div>;
}
