# Getting Started

## 项目结构

```
new-codereview-mcp/
├── packages/
│   ├── extension/          # VSCode 扩展 (UI层 - React)
│   │   ├── src/
│   │   │   ├── webview/   # React 组件
│   │   │   │   ├── sidebar/     # 侧边栏
│   │   │   │   ├── diffviewer/  # 差异查看器
│   │   │   │   └── workflow/    # 工作流编辑器
│   │   │   ├── providers/       # VSCode Provider
│   │   │   ├── database/        # 数据库管理
│   │   │   ├── types/           # TypeScript 类型
│   │   │   └── extension.ts     # 入口文件
│   │   └── package.json
│   └── server/             # MCP 服务器 (逻辑层 - TypeScript)
│       ├── src/
│       │   ├── database/        # 数据库读取
│       │   ├── errors/          # 错误处理
│       │   ├── schemas.ts       # Zod 验证
│       │   └── index.ts         # MCP 服务器
│       └── package.json
└── package.json            # 工作区根配置
```

## 技术栈

### Extension (UI层)
- **React 18** + **TypeScript** - UI 组件
- **VSCode Extension API** - 编辑器集成
- **sql.js** - SQLite 数据库
- **tsup** - 构建工具

### Server (逻辑层)
- **TypeScript** - 强类型语言
- **Zod** - 数据验证
- **MCP SDK** - Model Context Protocol
- **sql.js** - 数据库读取

## 开发流程

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
# 构建所有包
npm run build

# 或者分别构建
npm run build:server
npm run build:extension
```

### 3. 开发模式

```bash
# 启动 watch 模式
npm run dev:extension  # Extension watch
npm run dev:server     # Server watch
```

### 4. 调试扩展

在 VSCode 中:
1. 打开 Run and Debug 面板 (Ctrl+Shift+D)
2. 选择 "Run Extension"
3. 按 F5 启动

### 5. 打包扩展

```bash
npm run package:extension
```

生成的 `.vsix` 文件在 `packages/extension/` 目录下。

## 架构说明

### UI 层 (Extension)

所有 UI 相关代码都在 Extension 包中：

- **React 组件**: `src/webview/` - 所有 Webview 使用 React + TSX
- **Provider**: `src/providers/` - VSCode Webview Provider 
- **数据库管理**: `src/database/` - 本地 SQLite 数据库操作
- **类型定义**: `src/types/` - 共享的 TypeScript 类型

### 逻辑层 (Server)

所有业务逻辑都在 Server 包中：

- **MCP 服务器**: `src/index.ts` - MCP 协议实现
- **数据验证**: `src/schemas.ts` - Zod 验证规则
- **错误处理**: `src/errors/` - 统一错误处理
- **数据读取**: `src/database/` - 只读数据库访问

### 通信流程

```
UI (React) → VSCode API → Extension Provider → Database
                                              ↓
AI Assistant → MCP Server → Database Reader  ↑
                           ↓                  
                     Add Comments → Database
```

## 强类型实践

项目全面使用 TypeScript 强类型：

1. **不使用 `any`** - 所有类型都明确定义
2. **readonly 属性** - 接口使用 `readonly` 保护数据
3. **严格模式** - `tsconfig.json` 启用所有严格选项
4. **Zod 验证** - Server 层使用 Zod 运行时验证
5. **类型推导** - 从 Zod schema 推导 TypeScript 类型

## 代码规范

使用 Biome 进行代码检查和格式化：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 类型检查
npm run type-check
```

## 注意事项

1. **UI 和逻辑分离** - UI 代码不包含业务逻辑，逻辑代码不处理 UI
2. **单向数据流** - Extension → Database ← Server
3. **类型安全** - 所有接口都有明确的类型定义
4. **错误处理** - 使用统一的错误处理机制
5. **代码质量** - 通过 lint 和 type-check 确保代码质量

