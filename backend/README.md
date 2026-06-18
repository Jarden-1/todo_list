# SmartTodo Backend

SmartTodo 后端已经从设计文档阶段进入运行实现阶段。当前服务使用 Fastify、Prisma、PostgreSQL、Redis 和 HttpOnly Cookie Session，为 `frontend/` 提供 `/api/v1` 接口。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 创建环境配置：

```bash
cp .env.example .env
```

3. 按需修改 `.env` 中的 `DATABASE_URL`、`REDIS_URL`、`SESSION_SECRET` 和 `AI_KEY_ENCRYPTION_SECRET`。

4. 生成 Prisma Client：

```bash
npm run prisma:generate
```

5. 启动开发服务：

```bash
npm run dev
```

默认监听 `http://localhost:3000`，健康检查为 `GET /api/v1/health`。

## 常用命令

```bash
npm run typecheck
npm test
npm run build
```

## 已接入能力

- 注册、登录、退出和当前用户查询
- 用户维度数据隔离
- Todo、Project、Tag、Settings 的主要 CRUD
- 工作区 bootstrap、导入、导出和清空
- Markdown 图片与附件上传、私有读取、软删除和清理任务
- 用户自定义 AI Key 加密保存，AI 整理待办和 Markdown 润色
- 服务端提醒扫描、通知事件和 Web Push 订阅

## 前端衔接

当前有效前端目录是项目根目录下的 `frontend/`。前端通过 `frontend/src/lib/apiClient.ts` 统一访问后端，默认开发代理来自 `frontend/vite.config.ts`：

```text
/api -> http://localhost:3000
```

跨域部署时需要显式设置前端的 `VITE_API_BASE_URL`，并确认 Cookie、HTTPS、SameSite 和 Web Push 域名配置。

## 当前工程风险

- `todos.service.ts` 和 `workspace.service.ts` 仍偏长，后续可以按领域动作拆分，但当前已有集成测试覆盖主流程。
- Web Push 生产环境依赖 HTTPS、有效 VAPID key 和浏览器权限。
- 部分 API 文档仍是规划/契约说明，真实行为应以运行代码和集成测试为准。
