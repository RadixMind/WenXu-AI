# 问虚 AI

问虚 AI 是一款使用大语言模型驱动的传统数术工具，可进行八字、紫微斗数、六爻、梅花易数、奇门遁甲、大六壬、塔罗和灵签排盘，并生成 AI 解读。

## 功能

- 八字排盘、命局分析、大运流年与合盘
- 紫微斗数排盘及多时段运势分析
- 六爻、梅花易数、奇门遁甲、大六壬、塔罗及灵签
- 使用用户自配模型 API 的流式 AI 对话
- 排盘与占卜历史保存在当前浏览器

## 部署架构

应用只构建为静态文件：浏览器运行排盘逻辑、保存本地历史，并直接向用户配置的模型服务商发送聊天请求。不提供 API 代理、账号服务、边缘函数、云端历史或服务端存储。

```text
Cloudflare Pages 静态文件
          │
          ├── 浏览器内的排盘与占卜计算
          ├── localStorage：模型配置与历史记录
          └── 浏览器直连：用户填写的 OpenAI-compatible API
```

## 本地开发

需要 Node.js 22 和 npm。

```bash
npm ci
npm run dev
```

本地构建与预览：

```bash
npm run build
npm run preview
```

Vite 会将可部署文件输出到 `dist/`。项目不需要 `.env`、服务器 API Key、KV 命名空间或后端进程。

## 配置模型 API

在排盘结果页选择 **API 设置**，填写：

- **API Base URL**：OpenAI-compatible API 的基础地址，通常以 `/v1` 结尾，例如 `https://api.example.com/v1`。
- **API Key**：由你选择的模型服务商签发。
- **模型名称**：点击 **获取模型** 从 `/models` 读取，或手动填写。

设置保存在当前浏览器的 `localStorage`。浏览器会将 API Key 和对话内容直接发送给填写的服务商；问虚没有服务端代理，也不会接收或存储这些内容。请勿在公共设备上保存个人 API Key。

服务商需要支持 `POST /v1/chat/completions` 的 SSE 流式响应。模型自动获取需要支持 `GET /v1/models`；若列表接口不可用，可以手动填写模型名称。浏览器直连还要求 API 服务允许当前网站域名跨域访问。OpenAI-compatible 代表请求格式兼容，不代表服务商一定允许浏览器 CORS 请求；失败时问虚会显示“当前模型服务商不兼容本项目”提示。

## 部署

Cloudflare Pages 的连接 Git 仓库部署与直接上传方式见 [部署说明](DEPLOYMENT.md)。

## 数据与隐私

- 排盘历史和占卜历史仅保存在当前浏览器；清除站点数据会删除这些记录。
- 模型 API 配置保存在当前浏览器，并按浏览器同源规则隔离。更换网站域名后，原域名下的数据不会自动转移。
- 排盘计算在浏览器执行。只有用户主动使用 AI 对话时，提示词和问题才会发送到所配置的模型服务商。
- 项目不附带共享模型 Key，也不承担用户的模型调用费用。

## 技术栈

React 19、TypeScript、Vite、React Router、tyme4ts、iztro。

## 目录结构

```text
src/          前端应用、排盘算法、模型直连与本地历史
public/       PWA 图标、清单、Service Worker 和静态响应头
scripts/      项目辅助脚本
build/        Vite 分块配置
tests/        算法和界面逻辑测试
```