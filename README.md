# 生物做题小程序

基于 `Biol` 文件夹里的 V0.1 原型，已迁移为微信小程序页面。

## 已实现

- 题库新增、修改、删除和题干模糊查询
- 题库管理分页展示，避免题量变大后列表过长
- MySQL 数据库存储，支持本地缓存兜底
- 选择题、判断题两种题型
- 新增题目页支持手动填写和导入识别两种模式
- 微信 OCR 通用印刷体识别，识别后智能填入题目表单
- OCR/Word 提取文本粘贴后的智能填入
- `.txt` / `.md` / `.text` 文本文件读取后智能填入
- 随机抽取 10 / 25 / 50 道题开始练习
- 作答后立即判定对错，并锁定该题答案
- 提交时检查未作答题号，完成后统计做对/做错题数
- 使用微信小程序本地缓存保存题库

## 运行

使用微信开发者工具打开本项目根目录即可。当前小程序使用底部三栏导航：

```text
miniprogram/pages/bank/index    题库管理
miniprogram/pages/quiz/index    随机练习
miniprogram/pages/create/index  新增题目
```

OCR 走 `cloudfunctions/openapi` 云函数里的 `ocr.printedText` 云调用。使用前需要在微信开发者工具里上传并部署 `openapi` 云函数，并确认小程序已开通对应 OCR 权限。

## 数据库接口

本地 API 服务位于 `server/`，连接配置在 `server/.env`。首次运行先初始化数据库：

```bash
npm install
npm run db:init
npm run server
```

服务默认监听：

```text
http://127.0.0.1:3000
```

Windows 下也可以直接双击项目根目录的 `start-server.cmd`，保持弹出的窗口不要关闭。

小程序请求地址在 `miniprogram/config.js` 的 `apiBaseUrl`。微信开发者工具本地调试时，如果请求被拦，需要在详情设置里勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。

当前版本是本地题库 MVP；MySQL 连接配置说明见 `docs/mysql-connection.md`。
