# B站主题跟随 Chrome 深色模式

让哔哩哔哩（bilibili.com）的深/浅色主题自动跟随 **Chrome 的配色模式**（Chrome 设为「跟随系统」时即跟随 Windows 系统），覆盖首页、视频页、个人主页等全站页面。

## 特点

- **不修改任何 CSS** —— 不创建、不改写任何样式表，零样式崩坏风险
- **不抢 B 站的 cookie** —— 尊重 B 站自己的主题存储与跨页面继承机制
- **只在必要时刻干预** —— 检测页面实际显示，仅当与目标不一致时，发送一个"等同按下主题切换按钮"的原生信号
- **兼容 B 站新旧两套前端** —— `bili_dark`（新版首页）、`night-mode` + `__css-map__`（旧版视频页/个人主页）三种机制全覆盖

## 安装

1. 给浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 打开本仓库的 [`bilibili-theme-follow-system.user.js`](./bilibili-theme-follow-system.user.js)，复制全文
3. Tampermonkey 管理面板 → 「添加新脚本」→ 粘贴覆盖 → `Ctrl+S` 保存
4. 或者：把该 `.user.js` 文件直接拖进浏览器窗口，Tampermonkey 会弹出安装页

> 若提示「请启用允许用户脚本」：打开 `chrome://extensions/` → Tampermonkey「详细信息」→ 打开「允许用户脚本」，网站访问权限选择「在所有网站上」。

## 工作原理

B 站的主题系统本身是完整的，脚本做的是"接入"而不是"重写"：

| B 站的机制 | 说明 |
|------|------|
| `theme_style` cookie | 主题偏好存储（`domain=.bilibili.com, path=/`），页面加载时读取并**原生渲染** |
| `html.bili_dark` / `html.night-mode` | 新版 / 旧版前端的深色类 |
| `#__css-map__` 样式表 | 旧版前端通过它加载 `bili-theme/dark.css` / `light.css` |
| 头像菜单「主题 → 深色/浅色」 | 原生切换入口，内部调用 `modifyTheme`，纯本地操作、无账号 API |

脚本只做三件事：

1. **检测** —— 对比页面**实际显示**的主题（`__css-map__` 指向 / html 主题类）与 Chrome 配色（`matchMedia('(prefers-color-scheme: dark)')`）
2. **必要时发信号** —— 不一致时调用 B 站头像组件暴露的 `modifyTheme(dark|light)`，**完全等同点击主题切换按钮**，由 B 站自己更新内部状态、样式表与 cookie
3. **兜底** —— 对无法调用原生接口的页面（如新版首页的静态头部），复刻 B 站自己的切换动作（切换主题类 + 写 cookie）

切换成功一次后，B 站自己写入的 cookie 会被后续所有页面继承，**脚本不再需要做任何事**。

## 常见问题

**Q：切换 Chrome 深色模式后，B 站为什么不是"瞬间"跟着变？**
A：脚本在页面加载后持续检测（最多约 15 秒，对齐即停）；若浏览器配色在页面打开期间变化，会立即响应。个别页面若长时间未变，刷新一次即可——此时 cookie 已正确，刷新后 B 站会原生渲染正确主题。

**Q：会影响我在 B 站手动切换主题吗？**
A：不会立刻。脚本不做周期性强制纠正；手动切换后，只有等浏览器配色变化或页面重新加载时才会再次同步。

**Q：脚本会改动 B 站页面的样式吗？**
A：不会。脚本不创建、不修改任何样式表，只读取页面状态并在必要时调用 B 站自己的切换接口。

**Q：为什么脚本名字里有 Chrome？Edge / 其他 Chromium 浏览器能用吗？**
A：`matchMedia('(prefers-color-scheme: dark)')` 反映的是 Chromium 内核浏览器的有效配色模式，Edge、Brave 等同样适用。

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md) —— 里面有从 v1 到 v13 的完整踩坑记录。

## License

[MIT](./LICENSE)
