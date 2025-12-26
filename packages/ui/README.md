# MCP Code Review UI Package

标准的 React + TypeScript + Vite 项目，为 VS Code 扩展提供 Webview UI 组件。

## 项目结构

```
packages/ui/
├── src/
│   ├── components/       # React 组件
│   │   ├── sidebar/     # 侧边栏视图
│   │   ├── diffviewer/  # Diff 查看器
│   │   └── workflow/    # 工作流编辑器
│   ├── styles/          # CSS 样式文件
│   ├── types/           # TypeScript 类型定义
│   └── utils/           # 工具函数
├── vite.config.ts       # Vite 构建配置
├── tsconfig.json        # TypeScript 配置
└── package.json
```

## 技术栈

- **React 18.3** - UI 框架
- **TypeScript 5.4** - 类型系统
- **Vite 6.0** - 构建工具
- **CSS** - 样式（使用 VS Code 主题变量）

## 构建配置

### Vite Library Mode

使用 Vite 的 Library Mode 将每个组件打包为独立的 ES 模块：

- **入口点**: `sidebar/index.tsx`, `diffviewer/index.tsx`, `workflow/index.tsx`
- **输出格式**: ES Module
- **代码分割**:
  - 每个组件有自己的 `[component]/index.js`
  - React 和 react-dom 提取到 `chunks/common-[hash].js`
  - 所有 CSS 合并到 `assets/ui-[hash].css`

### 构建输出

```
dist/
├── sidebar/
│   └── index.js          # 侧边栏组件
├── diffviewer/
│   └── index.js          # Diff 查看器组件
├── workflow/
│   └── index.js          # 工作流编辑器组件
├── chunks/
│   └── common-[hash].js  # 共享依赖（React）
└── assets/
    └── ui-[hash].css     # 所有样式
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build
```

## 与 Extension 的集成

Extension 包在构建时会：

1. 复制 `dist/` 中的所有文件到 `extension/dist/webview/`
2. 在运行时动态生成 HTML，引用打包后的 JS 和 CSS
3. 使用 VS Code Webview API 加载和显示 UI

### HTML 生成示例

```typescript
// 在 SidebarProvider.ts 中
private _getHtmlForWebview(webview: vscode.Webview): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar', 'index.js')
  );
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'ui-[hash].css')
  );

  return `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${cssUri}">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}
```

## CSS 样式规范

使用 VS Code 提供的 CSS 变量，确保与编辑器主题一致：

```css
.my-component {
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
}
```

常用变量：
- `--vscode-foreground` - 前景色
- `--vscode-editor-background` - 编辑器背景
- `--vscode-button-background` - 按钮背景
- `--vscode-input-background` - 输入框背景
- 更多变量见 [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)

## VS Code API 集成

每个组件都可以通过 `acquireVsCodeApi()` 与扩展通信：

```typescript
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

// 发送消息到扩展
vscode.postMessage({ command: 'doSomething', data: {...} });

// 接收来自扩展的消息
window.addEventListener('message', (event) => {
  const message = event.data;
  // 处理消息
});
```

## 性能优化

1. **代码分割**: React 和 react-dom 被提取到单独的 chunk，在所有组件间共享
2. **CSS 合并**: 所有样式合并到一个文件，减少请求次数
3. **Tree Shaking**: Vite 自动移除未使用的代码
4. **Minification**: 生产构建自动压缩代码

## 注意事项

1. **不要使用 node_modules 中的资源**: Webview 无法访问文件系统
2. **CSP 限制**: 内联脚本和样式受到限制，需要在 HTML 中配置 CSP
3. **路径解析**: 所有资源 URI 必须通过 `webview.asWebviewUri()` 转换
4. **状态管理**: 使用 `vscode.setState/getState` 而不是 localStorage

## 构建优化建议

如果需要进一步优化构建大小：

1. 考虑使用 Preact 替代 React（减小 ~30KB）
2. 使用动态导入实现按需加载
3. 压缩 CSS 变量名（需要自定义 PostCSS 插件）
4. 使用 CDN 托管 React（不推荐，因为 Webview 隔离）
