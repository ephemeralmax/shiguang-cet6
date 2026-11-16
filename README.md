# 拾光六级 · CET-6 Study Space

一个**完全离线**的六级（CET-6）备考桌面应用。数据全部存在本机 `localStorage`，不联网、不登录、不上传任何内容。

> Electron + 原生 JS，无框架、无构建步骤。5651 个六级词汇、常用短语、翻译真题、作文模板与写作练习。

## 功能

| 模块 | 内容 |
| --- | --- |
| 六级词汇 | 5651 词，按单元（114 个）或词频浏览，四档掌握度，间隔复习队列 |
| 常用短语 | 分类浏览 + 页内搜索 + 收藏 + 翻卡复习 |
| 翻译练习 | 122 道真题，参考译文对照、作答区 |
| 作文模板 | 内置模板 + 自定义模板编辑，两栏对照阅读 |
| 作文真题 | 解析 + 练习输入框，实时词数统计，草稿自动保存 |
| 全局搜索 | `Ctrl K` 搜索单词 / 短语 / 翻译 / 作文 / 模板，分组展示、命中高亮、`↑↓`+`Enter` 直达 |
| 今日目标 | 每日学习目标设置与完成度环，数据保存在本机 |

## 快捷键

- `Ctrl K` 全局搜索
- `Ctrl 1`–`Ctrl 5` 切换页面
- `Ctrl R` 开始复习
- `Esc` 关闭浮层 / 退出复习

## 运行

```bash
npm install
npm start
```

## 打包

```bash
npm run dist      # 产出 dist/拾光六级-x.y.z-安装程序.exe 与 便携版.exe
```

安装包体积约 76 MB / 个，不入库，统一放在 [Releases](https://github.com/ephemeralmax/shiguang-cet6/releases) 页面。

## 测试

```bash
npm test        # study-core 纯逻辑单测
npm run smoke   # Electron 离屏集成测试（含布局/层级/输入法回归）
```

## 目录

```
index.html      界面骨架
styles.css      全部样式
renderer.js     页面渲染 + 事件委托 + 交互
study-core.js   复习算法、搜索、状态迁移（无 DOM 依赖，可单测）
data/           预生成的词库/短语/翻译/作文数据（*.js，直接 <script> 引入）
scripts/        数据抽取脚本、冒烟测试
tests/          单测
```

## 数据来源

词库与例句由 [ECDICT](https://github.com/skywind3000/ECDICT)（MIT）等公开语料离线抽取生成，短语与翻译题目来自公开备考资料整理，仅供个人学习使用。

## 说明

- 版本号需同时修改 `package.json` 与 `renderer.js` 里的 `APP_VERSION`，冒烟测试会校验两者一致。
- 所有交互元素通过 `data-action` 事件委托处理，无内联 `onclick`（满足 CSP）。
