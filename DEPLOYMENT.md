# Cloudflare Pages 部署说明

问虚 AI 只发布静态资源，浏览器会直接向用户填写的模型 API 发请求。

## 方式一：连接 Git 仓库

1. 在 GitHub 中 fork 本仓库。
2. 在 Cloudflare 控制台打开 **Workers & Pages**，选择 **Create application → Pages → Connect to Git**，授权并选择仓库。
3. 配置构建参数：

   | 设置项 | 值 |
   | --- | --- |
   | Production branch | `main` |
   | Root directory | `/` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable `NODE_VERSION` | `22` |

4. 保存并部署。后续推送到生产分支会触发静态构建和发布。
5. 部署完成后，可在项目的 **Custom domains** 设置自定义域名。

## 方式二：Wrangler 直接上传

在已安装 Node.js 22 与 npm 的环境中：直接上传项目创建后，后续可继续通过 Wrangler 上传；Cloudflare 当前不支持把 Direct Upload 项目切换为 Git 集成项目。若要使用 Git 自动部署，请一开始就选择“方式一”。

```bash
npm ci
npm run build
npx wrangler login
npx wrangler pages project create wenxu-ai --production-branch main --force
npx wrangler pages deploy dist --project-name wenxu-ai
```
