# 发布记录目录

`releases/` 用来承载当前仓库的结构化发布记录，不承担发布脚本本身，也不替代操作指南。

当前第一刀约定：

- `releases/history/<environment>/`：真实发布记录输出目录
- `*.release-manifest.json`：单次发布记录
- `*.rollback-manifest.json`：对应的回滚记录
- `templates/`：字段模板，方便人工补记或后续脚本升级

记录目标：

- 让每次发布至少留下版本、环境、`envId`、`appid`、`branch`、`commit`、时间戳
- 给出同环境下“上一条已记录发布”的回滚锚点
- 让 README / RELEASE_GUIDE / RELEASE_HANDOFF 不再只停留在口头流程

当前推荐用法：

```bash
npm run release:record -- --Version 1.0.0 --Desc "说明"
```

或通过：

```bash
npm run release:guarded
```

在上传完成后自动尝试写入记录。

说明：

- 第一刀只负责结构化记录，不负责构建完整的自动回滚平台。
- 如果当前环境还没有历史记录，`rollback-manifest` 会保留空锚点并明确说明原因。
