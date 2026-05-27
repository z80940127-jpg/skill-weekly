# Skill 周刊

一个面向普通 AI 工具用户的中文阅读站点。每周自动整理近期热门的开源 Agent Skills，核对公开仓库证据后发布最多 5 个新的正式精选，并保留来源链接和风险提示。

网站地址：[https://skill-weekly.vercel.app/](https://skill-weekly.vercel.app/)

## 阅读规则

- 候选来源为 [skills.sh trending](https://www.skills.sh/trending) 与 [skills.sh hot](https://www.skills.sh/hot)。
- 正式精选必须能核对公开仓库、许可信息和 `SKILL.md` 内容。
- 已精选过但仍热门的项目进入“持续热门”，不占新的 5 个名额。
- 资料不充分但未发现明确危险模式的候选仅进入“风险观察”。
- 包含明显危险命令或诱导指令的候选不会出现在网站中。
- 内容由公开信息自动整理，不构成安装建议或安全背书。

`skills.sh` 在这里被当作公开网页来源，而不是承诺稳定的公共 API；如果页面结构发生变化，发布任务会停止，不会在无法核对时写入新一期。

## 本地运行

```powershell
npm install
npm test
npm run build
npm run dev
```

生产内容保存在 `src/data/issues/`。仓库在首次真实发布前保持该目录为空，因此普通构建只显示首期尚未发布的首页。

要查看包含示例卡片的页面布局，请仅在本地使用测试内容源：

```powershell
$env:SKILL_WEEKLY_FIXTURE_BUILD="1"
npm run dev
```

## 生成一期

发布命令需要一个可以访问 GitHub Models 的 `GITHUB_TOKEN`。命令会读取热门候选、核验 GitHub 仓库、通过 GitHub Models 生成中文摘要，并且只在整期数据校验通过后写入 JSON。

```powershell
$env:GITHUB_TOKEN="你的令牌"
npm run issue:generate -- --publish-date 2026-05-26
npm run build
```

同一日期已有合法期刊时，命令不会重复生成。榜单来源、模型或整期结构校验失败都会阻止新一期写入。

## 自动发布

[发布工作流](.github/workflows/publish-weekly.yml) 支持手动执行，并计划在每周一北京时间 `08:00` 自动运行。它使用仓库自带的 `GITHUB_TOKEN`，声明 `models: read` 调用 GitHub Models，并声明 `contents: write` 将新一期内容提交回默认分支。

首次上线顺序：

1. 将本仓库推送为公开 GitHub 仓库，并确认默认分支包含发布工作流。
2. 在 GitHub 仓库的 **Actions** 页面手动运行 **Publish weekly issue**。
3. 确认工作流提交了 `src/data/issues/YYYY-MM-DD.json`，打开本地或预览构建检查真实首期内容。
4. 在 Vercel 中连接该 GitHub 仓库的 `main` 分支，构建命令使用 `npm run build`，输出目录使用 `dist`。
5. 访问 [https://skill-weekly.vercel.app/](https://skill-weekly.vercel.app/)；发布工作流提交新的期刊文件后，Vercel 会自动构建并更新这个地址。

这样网站第一次公开可访问时，仓库中已经有真实可阅读内容，而不是演示数据。

## 资料链接

- [GitHub Models 快速入门](https://docs.github.com/en/github-models/quickstart)
- [GitHub Actions 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
