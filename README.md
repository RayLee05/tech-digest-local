# Tech Digest

本机优先的科技日报网页版工具。它会从 RSS 和官方源抓取 AI、机器人、芯片、互联网头部公司等新闻，生成中文 Top 12 图文简报，并保存在本地 SQLite 数据库里。

## Quick Start

```bash
npm install
Copy-Item .env.example .env
Copy-Item sources.example.yaml sources.yaml
npm run dev
```

开发模式下打开 `http://localhost:3000`。前端运行在 3000，API 运行在 3001，并通过 Vite 代理 `/api`。

生产模式：

```bash
npm run build
npm run start
```

生产模式默认监听 `127.0.0.1:3000`。

Windows 登录后常驻任务示例：

```powershell
.\scripts\register-windows-task.ps1
```

## Configuration

编辑 `.env`。官方 OpenAI：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-5.4-mini
```

OpenAI-compatible 平台，例如 DeepSeek、SiliconFlow、OpenRouter、Moonshot、DashScope 等：

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=你的平台 API Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

如果平台给的是完整 `/chat/completions` 地址，也可以直接填：

```env
LLM_BASE_URL=https://api.example.com/v1/chat/completions
```

没有配置 API Key 时会自动使用本地规则摘要，便于离线开发和开源演示。

- `LLM_PROVIDER`：`openai`、`openai-compatible` 或 `heuristic`。
- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`：用于 OpenAI-compatible 平台。
- `OPENAI_API_KEY` / `OPENAI_MODEL`：用于官方 OpenAI Responses API。
- `DIGEST_CRON`：默认 `30 8 * * *`，即每天 08:30。
- `TIMEZONE`：默认 `Asia/Shanghai`。
- `SOURCES_FILE`：默认 `sources.yaml`。
- `DATABASE_PATH`：默认 `data/tech-digest.sqlite`。

编辑 `sources.yaml` 可以增加、关闭或调整数据源权重。示例见 `sources.example.yaml`。

## API

- `GET /api/health`
- `GET /api/digests/latest`
- `GET /api/digests/:date`
- `POST /api/jobs/run`
- `GET /api/sources`

## Extension Points

项目预留了几个适配层，方便 fork 后替换：

- `SourceAdapter`：RSS、官方博客、搜索 API 或自定义站点。
- `SummaryProvider`：OpenAI、Ollama 或其他模型服务。
- `Ranker`：重要性排序策略。
- `StorageProvider`：默认 SQLite，后续可接 PostgreSQL。
- `NotificationProvider`：MVP 不启用，后续可接邮件、Webhook、飞书、Slack、Telegram。

## Local-First Notes

默认只监听 `127.0.0.1`，适合个人本机使用。如果要部署到 NAS、服务器或公网，请先增加认证、限流和 HTTPS 入口。
