# SmartTodo Backend Notes

这个目录先作为后端对齐区使用，当前只放设计文档和接口契约，不写运行时代码。

## 当前结论

- 当前有效前端目录是 `frontend/`，`smart-todo/` 视为废弃目录，不参与后端设计。
- 前端现在把 `todos / projects / tags / undoRecord / settings / theme` 存在浏览器 `localStorage`。
- 登录页目前只是本地演示登录，后端第一阶段需要补真实用户系统。注册开放，登录名只要求不重复，暂不做邮箱验证码、邮箱验证或第三方 OAuth。
- AI 整理和 AI 润色现在由前端直连模型接口。接后端后应改成后端代理，用户在设置里自定义 API Key，后端不提供默认 Key。
- 当前前端本地数据只作为演示数据，不按真实用户数据自动迁移。设置页已有导入入口，后端继续支持手动导入。

## 推荐后端方向

第一版建议用：

- Runtime: Node.js + TypeScript
- API: Fastify 或 Express，建议 Fastify，接口 schema 更清晰
- Validation: Zod
- ORM: Prisma
- Database: PostgreSQL。部署到腾讯云服务器时建议用 Docker Compose 管理 API + Postgres + Redis。
- Auth: 唯一登录名 + 密码登录，HttpOnly Cookie Session
- Password hash: Argon2id，若部署环境不方便则 bcrypt
- Queue/Cache: Redis，用于会话、提醒扫描锁和后续后台任务
- Push: Web Push，用于浏览器关闭后仍能收到系统通知

这里的核心不是先堆功能，而是把前端已有的本地状态迁移成稳定的服务端契约。

## 文档

- [架构边界](./docs/architecture.md)
- [接口规范](./docs/api.md)
- [数据模型](./docs/data-model.md)
- [前端接入计划](./docs/frontend-integration.md)

## 第一阶段范围

必须做：

- 用户注册/登录/退出/当前用户
- 用户维度的数据隔离
- 工作区首屏数据加载
- Todo / Project / Tag / Settings 的 CRUD
- Markdown 图片和附件的真实文件上传、私有读取和软删除
- 用户自定义 AI Key 的加密保存、更新和清除
- AI 整理创建待办，使用当前用户自己的 AI Key
- AI 润色 Markdown，使用当前用户自己的 AI Key
- 导入、导出、清空当前用户数据
- 服务端提醒调度、通知事件生成、Web Push 推送和发送状态同步
- 软删数据到期后的物理清理任务

暂缓：

- 邮箱验证码
- 邮箱验证
- OAuth 登录
- 团队协作和共享项目
- 多设备实时同步
- 短信、邮件等外部提醒渠道。Web Push 第一版必须做。
- 完整操作历史
- 对象存储、CDN 和图片转码。第一版不接 COS，上传文件固定保存在腾讯云服务器本机磁盘。
