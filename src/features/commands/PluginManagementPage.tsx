import { useEffect, useState } from "react";
import { FileStack } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { errorMessage } from "../../shared/errors";
import type { PluginMarketplaceEntry } from "../../generated/app-server/v2/PluginMarketplaceEntry";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { useExtensions } from "../extensions/useExtensions";
import "./ExtensionManagement.css";
import { PluginDetailView } from "./PluginDetailView";

interface Props {
  extensions: ReturnType<typeof useExtensions>;
  revision: number;
  onClose: () => void;
  onChanged: () => void;
}

export function PluginManagementPage({ extensions, revision, onClose, onChanged }: Props) {
  const { listPlugins, readPlugin, installPlugin, uninstallPlugin, addMarketplace } = extensions;
  const [marketplaces, setMarketplaces] = useState<PluginMarketplaceEntry[]>([]);
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setBusy(true); setError(""); setNotice("");
    try { await work(); if (changed) { setDetail(null); onChanged(); setRefresh((value) => value + 1); } }
    catch (value) { setError(errorMessage(value)); }
    finally {
      setBusy(false);
    }
  }

  async function installBuiltinOffice(keepDetail = false) {
    await action(async () => {
      const source = await invoke<string>("prepare_builtin_office_plugin");
      let result = await listPlugins();
      let marketplace = result.marketplaces.find((item) => item.name === "cs-curated" && item.plugins.some((plugin) => plugin.name === "cs-office"));
      if (!marketplace) {
        await addMarketplace(source);
        result = await listPlugins();
        marketplace = result.marketplaces.find((item) => item.name === "cs-curated" && item.plugins.some((plugin) => plugin.name === "cs-office"));
      }
      if (!marketplace?.path) throw new Error("Core 未返回 CS Office 的本地市场路径。");
      await installPlugin({ marketplacePath: marketplace.path, pluginName: "cs-office" });
      if (keepDetail) {
        onChanged();
        setRefresh((value) => value + 1);
        setDetail((await readPlugin({ marketplacePath: marketplace.path, pluginName: "cs-office" })).plugin);
      }
      setNotice("CS Office 已安装。请新建会话使用办公技能。");
    }, !keepDetail);
  }

  async function previewBuiltinOffice() {
    await action(async () => {
      const source = await invoke<string>("prepare_builtin_office_plugin");
      setDetail((await readPlugin({ marketplacePath: `${source}/.agents/plugins/marketplace.json`, pluginName: "cs-office" })).plugin);
    }, false);
  }

  const officeInstalled = marketplaces.some((marketplace) => marketplace.name === "cs-curated" && marketplace.plugins.some((plugin) => plugin.name === "cs-office"));

  if (detail) return <div className="skill-management-page extension-page plugin-detail-page"><PluginDetailView key={`${detail.summary.id}:${detail.summary.installed}`} detail={detail} extensions={extensions} onClose={() => setDetail(null)} onChanged={onChanged} onInstall={detail.summary.name === "cs-office" ? () => void installBuiltinOffice(true) : undefined} installing={busy} installError={error} /></div>;

  return <div className="skill-management-page extension-page">
    <header className="skill-management-header"><h1>插件</h1><div><button type="button" disabled={busy || loading} onClick={() => { setError(""); setRefresh((value) => value + 1); }}>刷新</button><button type="button" onClick={onClose}>返回会话</button></div></header>
    <section className="skill-management-section"><h2>CS 内置</h2>{officeInstalled ? <p>CS Office 已安装，可在下方查看详情或卸载。</p> : <article className="extension-row"><div className="extension-builtin-summary"><span className="skill-management-icon"><FileStack aria-hidden="true" /></span><div><strong>CS Office</strong><p>本地创建和编辑 PDF、Word 与电子表格，不依赖 ChatGPT 账户。</p><small>包含 PDF、文档、电子表格 3 个 Skill</small></div></div><div className="extension-actions"><button type="button" disabled={busy || loading} onClick={() => void previewBuiltinOffice()}>详情</button><button type="button" disabled={busy || loading} onClick={() => void installBuiltinOffice()}>安装</button></div></article>}</section>
    <h2>已安装</h2>
    {notice && <p role="status">{notice}</p>}
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
  </div>;
}
