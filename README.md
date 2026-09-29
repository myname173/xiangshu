# 项述（Xiangshu）

从 **GitHub 仓库** + **岗位 JD** 自动生成可粘贴的项目经历段落：

- **LaTeX**（Billryan / Awesome-CV / moderncv / 通用 itemize，特殊字符已转义）
- **Markdown**（备用）
- 数字只来自仓库证据与你填写的贡献说明；缺则标「待填」，不编造

## 本地运行

需要 **Node.js 22+**。

```bash
git clone https://github.com/myname173/xiangshu.git
cd xiangshu
npm install
cp .env.example .env   # 可选：填入模型 API Key
npm run dev
```

浏览器打开终端提示的地址（默认 `http://localhost:8080`）。

没有模型密钥或额度不足时，会按仓库 README、语言、提交记录和 JD 关键词做规则起草，并在结果中标明。

## 用法

1. 填写 GitHub **用户名** 或 `owner/repo`，点「读取」。
2. 私有仓库：展开「私有仓库 / 提高配额」，填写只读 PAT（仅存 `sessionStorage`，不入库、不进 `.env`）。
3. 粘贴应聘岗位 **JD**，可选填写你的真实贡献与量化数字。
4. 点「生成项目经历」，在右侧复制 LaTeX / Markdown，或下载完整 `.tex`。
5. 中文简历请用 **XeLaTeX / LuaLaTeX** 编译。

「载入示例」会拉取 `gin-gonic/gin` 并填入一份 Golang 后端 JD，方便试跑。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `XAI_API_KEY` | 可选。有额度时优先用大模型撰写；不足或未配置则走证据起草。 |
| `DEEPSEEK_API_KEY` | 可选（若你在本地扩展 DeepSeek 调用）。 |

GitHub PAT **不要**写进 `.env`，在页面按次填写即可。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm run preview` | 预览构建产物 |

## 架构要点

- **TanStack Start** 全栈：`createServerFn` 拉取 GitHub、生成草稿
- **GitHub REST**：公开仓库无需令牌；可选 PAT
- **LaTeX**：服务端转义 + 多模板渲染
- **Fallback**：无模型时用 `draft-fallback` 按证据与 JD 关键词起草

## 许可

仅供个人简历撰写辅助使用。请如实描述个人贡献，勿将开源作者身份写成自己的业绩。
