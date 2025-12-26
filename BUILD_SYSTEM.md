# MCP Code Review - 构建系统说明

## 项目重构总结

该项目已重构为标准的 React + Vite 架构，以下是关键改进：

### ✅ 已完成的改进

1. **UI 包标准化**
   - 从 tsup 迁移到 Vite
   - 使用标准的 React + TypeScript 工具链
   - CSS 导入方式从 `?raw` 改为标准 import
   - 所有样式合并为单个 CSS 文件

2. **构建流程优化**
   - 清理了构建顺序，避免文件冲突
   - 添加 `clean` 步骤确保干净构建
   - 优化了 copy 脚本，包含详细日志

3. **Webview 集成改进**
   - 修复 CSP 配置，支持 ES modules
   - 正确配置 `localResourceRoots`
   - 动态生成 HTML，引用打包后的资源
   - 添加详细的调试日志

4. **文档完善**
   - 创建 UI 包 README
   - 创建详细的调试指南（DEBUGGING_GUIDE.md）

## 项目结构

```
new-codereview-mcp/
├── packages/
│   ├── server/          # MCP Server (TypeScript + tsup)
│   │   ├── src/
│   │   │   ├── core/              # 核心 Review 逻辑
│   │   │   ├── database/          # SQLite 数据库
│   │   │   ├── protocol/          # MCP 通信协议
│   │   │   └── index.ts
│   │   └── dist/                  # 构建输出
│   │
│   ├── ui/              # React UI (React + Vite)
│   │   ├── src/
│   │   │   ├── components/        # React 组件
│   │   │   │   ├── sidebar/
│   │   │   │   ├── diffviewer/
│   │   │   │   └── workflow/
│   │   │   ├── styles/            # CSS 文件
│   │   │   └── types/             # TypeScript 类型
│   │   ├── vite.config.ts         # Vite 配置
│   │   ├── README.md              # UI 包文档
│   │   └── dist/                  # 构建输出
│   │       ├── sidebar/index.js
│   │       ├── diffviewer/index.js
│   │       ├── workflow/index.js
│   │       ├── chunks/common-*.js # React 共享代码
│   │       └── assets/ui-*.css    # 合并的样式
│   │
│   └── extension/       # VS Code Extension (TypeScript + tsup)
│       ├── src/
│       │   ├── providers/         # Webview Providers
│       │   ├── services/          # 业务服务
│       │   └── extension.ts       # 扩展入口
│       ├── scripts/
│       │   ├── copy-server.mjs    # 复制 server 到 dist
│       │   └── copy-ui.mjs        # 复制 UI 到 dist
│       └── dist/                  # 最终打包输出
│           ├── extension.js       # 扩展主代码
│           ├── server/            # MCP Server
│           └── webview/           # UI 资源
│               ├── sidebar/
│               ├── diffviewer/
│               ├── workflow/
│               ├── chunks/
│               └── assets/
│
├── DEBUGGING_GUIDE.md   # 详细调试指南
└── README.md            # 项目主文档
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发构建

```bash
# 完整构建（包括所有包）
npm run build

# 或分别构建各个包
npm run build:server
npm run build:extension
```

### 调试扩展

1. 在 VS Code 中打开项目
2. 按 `F5` 启动调试
3. 在新窗口中查看侧边栏的 MCP Review 面板

详细调试步骤请参考 [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

## 构建命令

### 完整构建流程

```bash
cd packages/extension
npm run build
```

这会执行：
1. `clean` - 清空 dist 目录
2. `build:server` - 构建 MCP Server
3. `build:ui` - 构建 React UI
4. `build:extension` - 构建扩展主代码
5. `copy:server` - 复制 server 文件
6. `copy:ui` - 复制 UI 文件

### 增量构建

如果只修改了特定部分：

```bash
# 只重建 UI
cd packages/ui
npm run build
cd ../extension
npm run copy:ui

# 只重建扩展代码
cd packages/extension
npm run build:extension

# 只重建 Server
cd packages/server
npm run build
cd ../extension
npm run copy:server
```

### 打包发布

```bash
cd packages/extension
npm run package
```

这会生成 `.vsix` 文件，可用于安装或发布。

## 技术栈

- **VS Code Extension**: TypeScript + tsup
- **MCP Server**: TypeScript + tsup + SQLite (sql.js)
- **UI**: React 18 + TypeScript + Vite
- **样式**: CSS (使用 VS Code 主题变量)

## 关键配置文件

### packages/ui/vite.config.ts

```typescript
// Vite Library Mode 配置
build: {
  lib: {
    entry: {
      sidebar: './src/components/sidebar/index.tsx',
      diffviewer: './src/components/diffviewer/index.tsx',
      workflow: './src/components/workflow/index.tsx',
    },
    formats: ['es'],  // ES Module 格式
  },
  rollupOptions: {
    output: {
      chunkFileNames: 'chunks/[name]-[hash].js',  // 共享代码
      assetFileNames: 'assets/[name]-[hash][extname]',  // CSS
    },
  },
}
```

### packages/extension/package.json

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "mcp-codereview",
        "title": "MCP Review",
        "icon": "$(code)"
      }]
    },
    "views": {
      "mcp-codereview": [{
        "id": "mcpCodeReview.sidebarView",
        "name": "CODEREVIEW",
        "type": "webview"
      }]
    }
  }
}
```

## 常见问题

### 1. Sidebar 不显示？

查看 [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) 的"问题 1"部分

### 2. 修改代码后不生效？

在 Extension Development Host 窗口执行 `Developer: Reload Window`

### 3. 构建错误？

```bash
# 完全清理重建
rm -rf packages/*/dist
npm run build
```

### 4. Webview 显示空白？

检查开发者工具 Console 是否有错误，参考调试指南

## 文档索引

- [UI 包文档](./packages/ui/README.md) - React 组件开发指南
- [调试指南](./DEBUGGING_GUIDE.md) - 详细的问题排查步骤
- [开发指南](./GETTING_STARTED.md) - 项目开发入门

## 架构决策

### 为什么使用 Vite 而不是 tsup？

1. **更好的 React 支持**：Vite 原生支持 React Fast Refresh
2. **标准工具链**：Vite 是 React 社区的标准选择
3. **更好的开发体验**：HMR、快速构建、清晰的错误信息
4. **代码分割**：自动提取共享依赖（React）到单独的 chunk

### 为什么动态生成 HTML？

1. **CSP 支持**：需要动态获取 `webview.cspSource`
2. **路径转换**：需要使用 `webview.asWebviewUri()` 转换路径
3. **灵活性**：可以根据环境动态调整配置
4. **Hash 文件名**：CSS 和 JS 文件名包含 hash，需要动态查找

### 为什么合并所有 CSS？

1. **减少请求**：Webview 中减少资源请求可以提高加载速度
2. **简化配置**：只需要引用一个 CSS 文件
3. **避免 FOUC**：Flash of Unstyled Content
4. **更小的体积**：压缩后的单文件比多个小文件更高效

## 性能优化

当前构建产物大小：
- `extension.js`: ~355KB
- `server/index.js`: ~934KB
- `webview/chunks/common-*.js`: ~730KB (React + react-dom)
- `webview/sidebar/index.js`: ~8KB
- `webview/assets/ui-*.css`: ~17KB

**总计**: ~2MB (未压缩)

### 进一步优化建议

1. 使用 Preact 替代 React（减小 ~30KB）
2. 按需加载 workflow 和 diffviewer 组件
3. 使用 CSS-in-JS 减小样式体积
4. Tree-shaking 未使用的 VS Code API

## 贡献指南

1. 修改代码
2. 运行 `npm run build` 确保构建成功
3. 按 `F5` 测试扩展
4. 运行 linter: `npm run lint`
5. 提交 PR

## License

MIT
