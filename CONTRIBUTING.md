# Contributing

欢迎提交数据源、摘要提供方、排序策略、部署脚本和 UI 改进。

## Development

```bash
npm install
npm run dev
npm run test
npm run typecheck
```

## Guidelines

- 不要提交 `.env`、API Key、私有源或本机数据库。
- 新增数据源时优先选择 RSS、官方博客或可稳定引用的公开源。
- 新增模型服务时实现 `SummaryProvider`，不要把 provider 逻辑写进 job 流水线。
- 新增存储后端时实现 `StorageProvider`，保持 HTTP API 返回结构稳定。
- UI 文案默认使用中文，接口和类型名使用英文。
