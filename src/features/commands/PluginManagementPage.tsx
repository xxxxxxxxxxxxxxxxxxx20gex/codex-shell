import { useEffect, useState } from "react";
import { FileStack } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { errorMessage } from "../../shared/errors";
import type { PluginMarketplaceEntry } from "../../generated/app-server/v2/PluginMarketplaceEntry";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { useExtensions } from "../extensions/useExtensions";
import "./ExtensionManagement.css";
import { PluginDetailView } from "./PluginDetailView";

interface Props {
  extensions: ReturnType<typeof useExtensions>;
  revision: number;
  onClose: () => void;
  onChanged: () => void;
  loadSkills?: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  onOpenSkillPath?: (path: string) => Promise<void>;
}

export function PluginManagementPage({ extensions, revision, onClose, onChanged, loadSkills, onOpenSkillPath }: Props) {
  const { listPlugins, readPlugin, installPlugin, uninstallPlugin, addMarketplace } = extensions;
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
    }, !keepDetail);
  }

  async function previewBuiltinOffice() {
    await action(async () => {
      const source = await invoke<string>("prepare_builtin_office_plugin");
      setDetail((await readPlugin({ marketplacePath: `${source}/.agents/plugins/marketplace.json`, pluginName: "cs-office" })).plugin);
    }, false);
  }

  const installed = marketplaces.flatMap((marketplace) => marketplace.plugins.map((plugin) => ({ marketplace, plugin })))
    .sort((a, b) => a.plugin.name.localeCompare(b.plugin.name, "zh-CN") || a.plugin.id.localeCompare(b.plugin.id, "en"));
  const office = installed.find(({ marketplace, plugin }) => marketplace.name === "cs-curated" && plugin.name === "cs-office");
  const entries = [
    { key: "cs-office", name: "CS Office", description: "PDF、Word、表格、演示文稿与办公模板", installed: office },
    ...installed.filter((entry) => entry !== office).map((entry) => ({ key: entry.plugin.id, name: entry.plugin.interface?.displayName || entry.plugin.name, description: entry.plugin.interface?.shortDescription, installed: entry })),
  ];
  function openDetail(entry: typeof entries[number]) {
    if (!entry.installed) { void previewBuiltinOffice(); return; }
    const { marketplace, plugin } = entry.installed;
    void action(async () => { setDetail((await readPlugin({ marketplacePath: marketplace.path, pluginName: plugin.name })).plugin); }, false);
  }

  if (detail) return <div className="skill-management-page extension-page plugin-detail-page"><PluginDetailView key={`${detail.summary.id}:${detail.summary.installed}`} detail={detail} extensions={extensions} onClose={() => setDetail(null)} onChanged={onChanged} onInstall={detail.summary.name === "cs-office" ? () => void installBuiltinOffice(true) : undefined} installing={busy} installError={error} loadSkills={loadSkills} revision={revision} onOpenSkillPath={onOpenSkillPath} /></div>;

  return <div className="skill-management-page extension-page">
    <header className="skill-management-header"><h1>插件</h1><div><button type="button" onClick={onClose}>返回会话</button></div></header>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="extension-plugin-list" aria-busy={loading}>
      {entries.map((entry) => <article className="skill-management-card" key={entry.key}>
        <button className="skill-management-main" type="button" disabled={busy || loading || Boolean(entry.installed && !entry.installed.marketplace.path)} onClick={() => openDetail(entry)}>
          <span className="skill-management-icon"><FileStack aria-hidden="true" /></span>
          <span><strong>{entry.name}</strong><p>{entry.description}</p></span>
        </button>
        <div className="extension-actions">
          {entry.installed ? <button type="button" disabled={busy || loading || entry.installed.plugin.installPolicy === "INSTALLED_BY_DEFAULT"} onClick={() => void action(() => uninstallPlugin(entry.installed!.plugin.id))}>卸载</button>
            : <button type="button" disabled={busy || loading} onClick={() => void installBuiltinOffice()}>安装</button>}
        </div>
      </article>)}
    </div>
  </div>;
}
