---
name: "cs-docs"
description: "依据仓库文档和源码，说明与排查 Codex Shell 当前实现。适用于 CS 功能、配置、开发和使用问题；不替代 OpenAI 或 Codex 官方产品文档。"
metadata:
  short-description: "说明 Codex Shell 当前实现、配置、开发流程和能力边界。"
---

# Codex Shell Docs

Use this skill when the user asks how Codex Shell currently works, whether CS supports a feature, how to configure or build CS, or how the CS code and documentation are organized.

## Source priority

When the Codex Shell repository is available, use these sources in order:

1. Current source code and generated protocol types for actual behavior.
2. `AGENTS.md` for durable project rules and architecture boundaries.
3. `README.md` for user-facing setup, installation, configuration, and release instructions.
4. `DESIGN.md` for UI behavior and visual contracts.
5. The relevant `docs/status/*-status.md` file for current module boundaries, risks, and verification evidence.
6. `docs/status/PROJECT_STATUS.md` only for cross-module milestones and project-level risks.

Treat `design-plans/` as proposed work and Git history as historical context, not proof of current behavior. If the source and a status document disagree, report the drift and prefer the verified source behavior until the owning document is corrected.

## Keep CS separate from official Codex

Codex Shell uses the official Codex app-server, but it is a separate Windows client with its own UI, isolated `CODEX_HOME`, configuration, and supported feature set. Do not infer that an official Codex desktop or CLI feature is available in CS. When comparing them, state separately:

- what the official Codex documentation promises;
- what the current CS source and verification evidence implement;
- what remains unsupported or unverified in CS.

For official OpenAI, Codex, API, ChatGPT Work, model, pricing, or product documentation, use `OpenAI Docs` instead. Do not invent current OpenAI product facts from the CS repository.

## Answering implementation questions

Prefer a concise explanation of the current data flow, source location, boundary, and verification evidence. Mention the exact limitation when a capability depends on app-server support, Windows APIs, credentials, external tools, or an unverified manual step. Do not describe planned work as implemented.
