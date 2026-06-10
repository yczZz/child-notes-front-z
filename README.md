# 幼儿简记微信小程序 Child Notes Front

宝宝成长记录微信小程序前端，配套 `child-notes-backend` 使用。小程序提供宝宝档案、喂养记录、成长记录、统计、家庭成员、积分任务和 AI 分析等页面。

## 功能特性

- 微信登录与用户资料维护。
- 多宝宝档案与家庭成员协作。
- 喂养、睡眠、尿布、体温、成长、疫苗、辅食、异常症状等记录录入。
- 首页概览、今日记录、历史记录与统计页面。
- 积分签到、任务、抽奖入口。
- 图片上传、记录编辑、AI 分析报告查看。

## 技术栈

| 组件 | 说明 |
| --- | --- |
| 微信小程序原生框架 | 页面、组件、API 调用 |
| WeUI Miniprogram | 基础 UI 组件 |
| npm | 小程序依赖管理 |

## 快速开始

安装依赖：

```bash
npm install
```

在微信开发者工具中导入本目录，首次打开后执行“工具 -> 构建 npm”。开源版本的 `project.config.json` 使用 `touristappid`，本地预览可以直接使用；需要真机调试、登录或发布时，请在微信开发者工具里替换为自己的小程序 AppID。

启动后端：

```bash
cd ../child-notes-backend
mvn spring-boot:run -Plocal
```

前端默认请求 `http://localhost:8080`。如需连接其它后端地址，修改 `config/index.js`：

```js
apiBaseUrl: 'https://your-api.example.com'
```

生产环境需要在微信公众平台配置 request/uploadFile 合法域名，并使用 HTTPS。

## 配置说明

| 文件 | 说明 |
| --- | --- |
| `config/index.js` | 小程序运行配置，包含 API 地址、mock 开关和业务常量 |
| `project.config.json` | 微信开发者工具项目配置，已移除真实 AppID |
| `project.private.config.json` | 开发者工具私有配置，已加入 `.gitignore` |
| `package.json` | npm 依赖声明 |

## 目录结构

```text
.
├── api/                 # 请求封装
├── components/          # 业务组件
├── config/              # 应用配置
├── constants/           # 常量
├── custom-tab-bar/      # 自定义 TabBar
├── pages/               # 小程序页面
├── services/            # API 服务模块
├── utils/               # 工具函数
├── app.js
├── app.json
└── app.wxss
```

## 后端接口

小程序依赖后端以下接口模块：

| 模块 | 路径 |
| --- | --- |
| 登录 | `/api/auth/**` |
| 宝宝与家庭 | `/api/baby/**` |
| 记录 | `/api/records/**` |
| 积分 | `/api/points/**` |
| 上传 | `/api/upload` |
| AI 分析 | `/api/smart-analysis/**` |

## 开源安全说明

- 真实小程序 AppID 和线上 API 域名已移除。
- `node_modules/`、`miniprogram_npm/`、`project.private.config.json`、`.idea/`、`.codegraph/` 等本地产物已加入 `.gitignore`。
- 发布前请使用自己的 AppID、后端域名和微信平台合法域名配置。
