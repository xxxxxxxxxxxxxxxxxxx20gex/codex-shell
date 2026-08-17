import { useState, useSyncExternalStore } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { errorMessage } from "../../shared/errors";
import type { JsonValue } from "../runtime/appServerClient";
import { safeHttpUrl } from "../../shared/externalUrl";
import { assertModelVisibleInput, MAX_MODEL_VISIBLE_INPUT_BYTES } from "../../shared/modelVisibleInput";
import type {
  ServerInteraction,
  ServerInteractionStore,
} from "./serverInteractionStore";
import "./ServerInteractionDialog.css";

interface Props {
  store: ServerInteractionStore;
}

function approvalLines(interaction: ServerInteraction) {
  if (interaction.kind === "commandApproval") {
    return [
      interaction.params.command && `命令：${interaction.params.command}`,
      interaction.params.cwd && `目录：${interaction.params.cwd}`,
      interaction.params.reason && `原因：${interaction.params.reason}`,
    ].filter(Boolean) as string[];
  }
  if (interaction.kind === "fileChangeApproval") {
    return [
      interaction.params.grantRoot && `写入目录：${interaction.params.grantRoot}`,
      interaction.params.reason && `原因：${interaction.params.reason}`,
    ].filter(Boolean) as string[];
  }
  if (interaction.kind !== "permissionsApproval") return [];

  const fileSystem = interaction.params.permissions.fileSystem;
  return [
    `当前目录：${interaction.params.cwd}`,
    interaction.params.reason && `原因：${interaction.params.reason}`,
    fileSystem?.read?.length && `读取：${fileSystem.read.join("、")}`,
    fileSystem?.write?.length && `写入：${fileSystem.write.join("、")}`,
    interaction.params.permissions.network?.enabled && "网络：允许访问",
  ].filter(Boolean) as string[];
}

function ApprovalInteraction({ interaction, store }: Props & { interaction: ServerInteraction }) {
  const title = interaction.kind === "commandApproval"
    ? "允许执行命令？"
    : interaction.kind === "fileChangeApproval"
      ? "允许修改文件？"
      : "允许额外权限？";
  return (
    <>
      <span className="eyebrow">需要你的确认</span>
      <h2 id="interaction-title">{title}</h2>
      <p>Codex 请求在当前任务中执行受保护操作。请核对范围后再允许。</p>
      <div className="interaction-details">
        {approvalLines(interaction).map((line) => <code key={line}>{line}</code>)}
      </div>
      <footer>
        <button className="secondary-button danger-button" onClick={store.declineCurrent}>拒绝</button>
        <button className="secondary-button" onClick={() => store.approveCurrent("turn")}>仅本次允许</button>
        <button className="primary-button" onClick={() => store.approveCurrent("session")}>本会话允许</button>
      </footer>
    </>
  );
}

function UserInputInteraction({ interaction, store }: Props & { interaction: ServerInteraction }) {
  const params = interaction.kind === "userInput" ? interaction.params : null;
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(
    params?.questions.map((question) => [question.id, ""]) ?? [],
  ));
  const [inputError, setInputError] = useState("");
  if (!params) return null;
  const questions = params.questions;
  const complete = questions.every((question) => answers[question.id]?.trim());

  function submit() {
    const response = Object.fromEntries(questions.map((question) => [
      question.id,
      { answers: [answers[question.id].trim()] },
    ]));
    try {
      questions.forEach((question) => assertModelVisibleInput(
        answers[question.id].trim(),
        `${question.header}的回答`,
      ));
      assertModelVisibleInput(JSON.stringify(response), "全部回答");
      store.resolveCurrent({ answers: response });
    } catch (submitError) {
      setInputError(errorMessage(submitError));
    }
  }

  return (
    <>
      <span className="eyebrow">Codex 需要更多信息</span>
      <h2 id="interaction-title">请回答后继续</h2>
      <p>这些问题由 app-server 原生工具请求发起，答案会返回当前 Turn。</p>
      <div className="interaction-form">
        {questions.map((question) => (
          <fieldset key={question.id}>
            <legend><strong>{question.header}</strong><span>{question.question}</span></legend>
            {question.options?.map((option) => (
              <button
                type="button"
                className={answers[question.id] === option.label ? "selected" : ""}
                key={option.label}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.label }))}
              >
                <strong>{option.label}</strong><small>{option.description}</small>
              </button>
            ))}
            {(!question.options || question.isOther) && (
              <input
                type={question.isSecret ? "password" : "text"}
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswers((current) => ({
                  ...current,
                  [question.id]: event.target.value,
                }))}
                placeholder={question.isSecret ? "输入内容（界面将隐藏）" : "输入回答"}
                maxLength={MAX_MODEL_VISIBLE_INPUT_BYTES}
                autoComplete="off"
              />
            )}
          </fieldset>
        ))}
      </div>
      {inputError && <p className="interaction-error">{inputError}</p>}
      <footer>
        <button className="secondary-button danger-button" onClick={store.declineCurrent}>取消请求</button>
        <button className="primary-button" disabled={!complete} onClick={submit}>提交回答</button>
      </footer>
    </>
  );
}

type FormValues = Record<string, JsonValue>;
type SchemaRecord = Record<string, unknown>;

function initialFormValues(properties: Record<string, unknown>, required: ReadonlySet<string>) {
  return Object.fromEntries(Object.entries(properties).flatMap(([name, rawSchema]) => {
    const schema = rawSchema as SchemaRecord;
    if (Object.prototype.hasOwnProperty.call(schema, "default")) {
      return [[name, schema.default as JsonValue]];
    }
    if (required.has(name) && schema.type === "boolean") return [[name, false]];
    return [];
  }));
}

interface FormOption {
  value: string;
  label: string;
}

function schemaOptions(schema: SchemaRecord): FormOption[] | null {
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => ({ value: String(value), label: String(value) }));
  }
  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map((option) => {
      const record = option as SchemaRecord;
      return { value: String(record.const), label: String(record.title ?? record.const) };
    });
  }
  const items = schema.items as SchemaRecord | undefined;
  if (Array.isArray(items?.enum)) {
    return items.enum.map((value) => ({ value: String(value), label: String(value) }));
  }
  if (Array.isArray(items?.anyOf)) {
    return items.anyOf.map((option) => {
      const record = option as SchemaRecord;
      return { value: String(record.const), label: String(record.title ?? record.const) };
    });
  }
  return null;
}

function hasFormValue(value: JsonValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== "" && value !== null && value !== undefined;
}

function validStringFormat(value: string, format: unknown) {
  if (format === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (format === "uri") {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  if (format === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (format === "date-time") return !Number.isNaN(Date.parse(value));
  return true;
}

function validatedFormContent(
  properties: Record<string, unknown>,
  required: ReadonlySet<string>,
  values: FormValues,
) {
  const content: FormValues = {};
  Object.entries(properties).forEach(([name, rawSchema]) => {
    const schema = rawSchema as SchemaRecord;
    const value = values[name];
    if (!hasFormValue(value)) {
      if (required.has(name)) throw new Error(`${String(schema.title ?? name)}为必填项`);
      return;
    }
    const label = String(schema.title ?? name);
    if ((schema.type === "number" || schema.type === "integer") && typeof value === "number") {
      if (schema.type === "integer" && !Number.isInteger(value)) throw new Error(`${label}必须是整数`);
      if (typeof schema.minimum === "number" && value < schema.minimum) throw new Error(`${label}不能小于 ${schema.minimum}`);
      if (typeof schema.maximum === "number" && value > schema.maximum) throw new Error(`${label}不能大于 ${schema.maximum}`);
    }
    if (schema.type === "string" && typeof value === "string") {
      if (typeof schema.minLength === "number" && value.length < schema.minLength) throw new Error(`${label}至少需要 ${schema.minLength} 个字符`);
      if (typeof schema.maxLength === "number" && value.length > schema.maxLength) throw new Error(`${label}最多允许 ${schema.maxLength} 个字符`);
      if (!validStringFormat(value, schema.format)) throw new Error(`${label}格式无效`);
    }
    if (schema.type === "array" && Array.isArray(value)) {
      const minItems = typeof schema.minItems === "bigint" ? Number(schema.minItems) : schema.minItems;
      const maxItems = typeof schema.maxItems === "bigint" ? Number(schema.maxItems) : schema.maxItems;
      if (typeof minItems === "number" && value.length < minItems) throw new Error(`${label}至少选择 ${minItems} 项`);
      if (typeof maxItems === "number" && value.length > maxItems) throw new Error(`${label}最多选择 ${maxItems} 项`);
    }
    content[name] = value;
  });
  return content;
}

function McpFormInteraction({ interaction, store }: Props & { interaction: ServerInteraction }) {
  const params = interaction.kind === "mcpElicitation" ? interaction.params : null;
  const typedProperties = params?.mode === "form" ? params.requestedSchema.properties : {};
  const typedRequired = new Set(params?.mode === "form" ? params.requestedSchema.required ?? [] : []);
  const [values, setValues] = useState<FormValues>(() => initialFormValues(
    typedProperties,
    typedRequired,
  ));
  const [jsonText, setJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  if (!params) return null;

  function acceptOpenAiForm() {
    try {
      assertModelVisibleInput(jsonText, "MCP 表单回答");
      const content = JSON.parse(jsonText) as JsonValue;
      assertModelVisibleInput(JSON.stringify(content), "MCP 表单回答");
      store.resolveCurrent({ action: "accept", content, _meta: null });
    } catch (formError) {
      setJsonError(errorMessage(formError));
    }
  }

  function acceptTypedForm() {
    try {
      const content = validatedFormContent(typedProperties, required, values);
      assertModelVisibleInput(JSON.stringify(content), "MCP 表单回答");
      store.resolveCurrent({ action: "accept", content, _meta: null });
    } catch (formError) {
      setJsonError(errorMessage(formError));
    }
  }

  async function openInteractionUrl(url: string) {
    setJsonError("");
    try {
      await openUrl(url);
    } catch (openError) {
      setJsonError(errorMessage(openError));
    }
  }

  if (params.mode === "url") {
    const url = safeHttpUrl(params.url);
    return (
      <>
        <span className="eyebrow">MCP · {params.serverName}</span>
        <h2 id="interaction-title">服务器请求打开链接</h2>
        <p>{params.message}</p>
        {url
          ? <a className="interaction-url" href={url} target="_blank" rel="noreferrer" onClick={(event) => { event.preventDefault(); void openInteractionUrl(url); }}>{url}</a>
          : <p className="interaction-error">服务器返回了不安全的链接，已阻止打开。</p>}
        <footer>
          <button className="secondary-button danger-button" onClick={store.declineCurrent}>拒绝</button>
          <button className="primary-button" disabled={!url} onClick={() => store.resolveCurrent({ action: "accept", content: null, _meta: null })}>已打开，继续</button>
        </footer>
      </>
    );
  }

  if (params.mode === "openai/form") {
    return (
      <>
        <span className="eyebrow">MCP · {params.serverName}</span>
        <h2 id="interaction-title">服务器请求结构化信息</h2>
        <p>{params.message}</p>
        <textarea className="interaction-json" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
        {jsonError && <p className="interaction-error">{jsonError}</p>}
        <footer>
          <button className="secondary-button danger-button" onClick={store.declineCurrent}>拒绝</button>
          <button className="primary-button" onClick={acceptOpenAiForm}>提交</button>
        </footer>
      </>
    );
  }

  const required = typedRequired;
  const complete = Object.keys(typedProperties).every((name) => !required.has(name)
    || hasFormValue(values[name]));
  return (
    <>
      <span className="eyebrow">MCP · {params.serverName}</span>
      <h2 id="interaction-title">服务器请求更多信息</h2>
      <p>{params.message}</p>
      <div className="interaction-form">
        {Object.entries(typedProperties).map(([name, rawSchema]) => {
          const schema = rawSchema as SchemaRecord;
          const label = String(schema.title ?? name);
          const description = schema.description ? String(schema.description) : "";
          const options = schemaOptions(schema);
          const selectedValues = Array.isArray(values[name])
            ? new Set(values[name].map(String))
            : new Set<string>();
          return (
            <div className="interaction-field" key={name}>
              <span>{label}{required.has(name) ? " *" : ""}</span>
              {schema.type === "array" && options ? (
                <div className="interaction-multiselect" role="group" aria-label={label}>
                  {options.map((option) => (
                    <button
                      type="button"
                      className={selectedValues.has(option.value) ? "selected" : ""}
                      key={option.value}
                      onClick={() => setValues((current) => {
                        const selected = new Set(Array.isArray(current[name]) ? current[name].map(String) : []);
                        if (selected.has(option.value)) selected.delete(option.value);
                        else selected.add(option.value);
                        return { ...current, [name]: [...selected] };
                      })}
                    >{option.label}</button>
                  ))}
                </div>
              ) : options ? (
                <select aria-label={label} value={String(values[name] ?? "")} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}>
                  <option value="">请选择</option>
                  {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : schema.type === "boolean" ? (
                <input aria-label={label} type="checkbox" checked={Boolean(values[name])} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} />
              ) : (
                <input
                  aria-label={label}
                  type={schema.type === "number" || schema.type === "integer" ? "number" : "text"}
                  value={String(values[name] ?? "")}
                  min={typeof schema.minimum === "number" ? schema.minimum : undefined}
                  max={typeof schema.maximum === "number" ? schema.maximum : undefined}
                  minLength={typeof schema.minLength === "number" ? schema.minLength : undefined}
                  maxLength={typeof schema.maxLength === "number" ? schema.maxLength : undefined}
                  step={schema.type === "integer" ? 1 : undefined}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    [name]: schema.type === "number" || schema.type === "integer"
                      ? event.target.value === "" ? "" : Number(event.target.value)
                      : event.target.value,
                  }))}
                />
              )}
              {description && <small>{description}</small>}
            </div>
          );
        })}
      </div>
      <footer>
        <button className="secondary-button danger-button" onClick={store.declineCurrent}>拒绝</button>
        <button className="primary-button" disabled={!complete} onClick={acceptTypedForm}>提交</button>
      </footer>
      {jsonError && <p className="interaction-error">{jsonError}</p>}
    </>
  );
}

function InteractionContent({ interaction, store }: Props & { interaction: ServerInteraction }) {
  if (interaction.kind === "userInput") {
    return <UserInputInteraction interaction={interaction} store={store} />;
  }
  if (interaction.kind === "mcpElicitation") {
    return <McpFormInteraction interaction={interaction} store={store} />;
  }
  return <ApprovalInteraction interaction={interaction} store={store} />;
}

export function ServerInteractionDialog({ store }: Props) {
  const interactions = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const interaction = interactions[0];
  if (!interaction) return null;
  return (
    <div className="interaction-backdrop" role="presentation">
      <section className="interaction-dialog" role="dialog" aria-modal="true" aria-labelledby="interaction-title">
        {interactions.length > 1 && <small className="interaction-queue-count">待处理 {interactions.length} 项</small>}
        <InteractionContent key={String(interaction.requestId)} interaction={interaction} store={store} />
      </section>
    </div>
  );
}
