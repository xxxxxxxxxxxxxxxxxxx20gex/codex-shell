import { useEffect, useMemo, useState } from "react";
import type { Model } from "../../generated/app-server/v2/Model";
import type { ModelSettings } from "./types";
import { useDismissiblePopover } from "../../shared/useDismissiblePopover";

interface Props {
  settings: ModelSettings;
  loadModels: () => Promise<Model[]>;
  onChange: (settings: ModelSettings) => void;
  onDisplayName: (displayName: string | null) => void;
  onAdvanced: () => void;
  onClose: () => void;
}

export function ModelQuickPicker({ settings, loadModels, onChange, onDisplayName, onAdvanced, onClose }: Props) {
  const [models, setModels] = useState<Model[]>([]);
  const rootRef = useDismissiblePopover<HTMLDivElement>({ open: true, onClose });
  useEffect(() => {
    let active = true;
    void loadModels().then((items) => {
      if (!active) return;
      const visibleModels = items.filter((model) => !model.hidden);
      setModels(visibleModels);
      const selectedModel = visibleModels.find((model) => model.model === settings.modelId || model.id === settings.modelId);
      onDisplayName(selectedModel?.displayName || selectedModel?.model || null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadModels, onDisplayName, settings.modelId]);

  const selected = useMemo(() => models.find((model) => model.model === settings.modelId || model.id === settings.modelId), [models, settings.modelId]);
  const efforts = selected?.supportedReasoningEfforts.map((option) => option.reasoningEffort)
    ?? (settings.reasoningEffort ? [settings.reasoningEffort] : []);

  return (
    <div ref={rootRef} className="model-picker-popover" role="dialog" aria-label="模型选择">
      <div className="model-picker-section">
        <span className="model-picker-label">模型</span>
        <div className="model-picker-options">
          {models.length === 0 && <span className="model-picker-empty">暂无原生模型目录</span>}
          {models.map((model) => <button key={model.id} className={model.model === settings.modelId ? "active" : ""} onClick={() => { onDisplayName(model.displayName || model.model); onChange({ ...settings, modelId: model.model, reasoningEffort: model.defaultReasoningEffort }); }}>{model.displayName || model.model}</button>)}
        </div>
      </div>
      {efforts.length > 0 && <div className="model-picker-section">
        <span className="model-picker-label">推理强度</span>
        <div className="model-picker-options compact">
          {efforts.map((effort) => <button key={effort} className={settings.reasoningEffort === effort ? "active" : ""} onClick={() => onChange({ ...settings, reasoningEffort: effort })}>{effort}</button>)}
        </div>
      </div>}
      <button className="model-picker-advanced" onClick={onAdvanced}>高级设置 <span>›</span></button>
      <button className="model-picker-close" onClick={onClose} aria-label="关闭模型选择">×</button>
    </div>
  );
}
