# ADR-005：使用 Core 原生迁移保留旧会话编辑

- 状态：accepted
- 记录日期：2026-10-01
- 影响范围：Runtime 启动、历史持久化、消息编辑、内核降级

## 背景

0.159.2 移除了 `thread/rollback`，替代接口 `thread/revert` 要求分页历史。只更新类型并删除旧回滚分支，会让 legacy 会话失去编辑能力。官方 Core 提供独立迁移命令及启动后台迁移功能，后者尚属于 UnderDevelopment，默认关闭。

## 决策

CS 使用官方 `background_paginated_rollout_migration` 启动选项迁移独立 CODEX_HOME 内的 legacy 历史；转换、索引、迁移日志及忙文件处理均由 Core 实现，Shell 不手写 rollout 或 SQLite 转换。该实验能力仅为旧会话继续编辑这一既有需求启用，并要求启动参数测试和真实迁移／回退探针。

消息编辑统一使用 `thread/revert`，成功后读取原生分页历史。不保留已被删除的 RPC，也不通过复制 Session 或改写本地文件模拟同一会话回退。

## 选择理由与未采用方案

- 不修改 Core，避免维护第二套历史格式与迁移算法。
- 不永久固定旧内核，也不在旧会话中悄悄禁用已有编辑功能。
- 不在每次启动前同步全量扫描或复制用户数据库；官方后台迁移使用自己的游标、锁和恢复机制。

## 后果

- 首次新版启动可能在后台改写 legacy 历史。升级前应关闭所有使用相同 CODEX_HOME 的 CS 实例并备份整个目录；安装包回退不能代替数据回退，也不保证旧内核可读取新历史格式。
- 忙文件、损坏历史或迁移期间被旧进程占用可能导致延迟或失败；此类失败应诊断、重试原生迁移，不能隐藏为编辑成功。隔离小型 fixture 通过不等同于所有真实历史均已验证。
- 协议适配和 Runtime 暂存仍遵守 ADR-003；后续 Core 迁移语义变化必须重跑实际升级探针。

## 关联状态文档

- [Runtime](../status/runtime-status.md)
- [协议](../status/protocol-status.md)
- [项目与线程](../status/workspace-thread-status.md)
