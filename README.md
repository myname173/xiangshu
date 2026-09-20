# 项述

从 GitHub 仓库与岗位 JD 生成可粘贴的项目经历：**LaTeX**（Billryan / Awesome-CV / moderncv / 通用 itemize）和 **Markdown**。数字缺省会标成待填，不编造成绩。

## 本地运行

需要 Node.js 22+。

```bash
npm install
cp .env.example .env   # 可选：填入 XAI_API_KEY
npm run dev
```

浏览器打开终端里提示的地址（默认 `http://localhost:8080`）。

没有模型密钥时，仍会按仓库 README、语言、提交记录和 JD 关键词起草，并在稿上标明。

## 用法

1. 填写 GitHub 用户名或 `owner/repo`，点「读取」。私有仓库在「私有仓库 / 提高配额」里填 PAT（只留在当前浏览器会话）。
2. 粘贴应聘岗位 JD，补上你的真实贡献与数字。
3. 点「生成项目经历」，在右侧复制 LaTeX 或 Markdown，或下载完整 `.tex`。中文稿请用 **XeLaTeX / LuaLaTeX** 编译。

示例数据：「载入示例」会拉取 `gin-gonic/gin` 并填入一份 Golang 后端 JD。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `XAI_API_KEY` | 可选。有额度时用 Grok 撰写；额度不足或未配置则走证据起草。 |

GitHub 令牌不要放进 `.env`，在页面里按次填写即可。

## 脚本

- `npm run dev` — 开发
- `npm run build` — 生产构建
- `npm run typecheck` — 类型检查
