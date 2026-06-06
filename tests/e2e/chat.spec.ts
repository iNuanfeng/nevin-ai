/**
 * E2E Test Specifications — Chat Page & SSE Streaming
 *
 * 覆盖：聊天页渲染、SSE 流式输出、联系人管理、Markdown 渲染
 * 运行：npx playwright test tests/e2e/chat.spec.ts
 * 注意：需要 DEEPSEEK_API_KEY 才能测试完整 SSE 流
 */

export const chatPageTests = [
  { name: "聊天页加载", action: "导航到 /conversations/:id", expect: "页面加载不报错" },
  { name: "聊天头部", action: "open", expect: "返回按钮 + 导师图标 + 名称 + 添加联系人" },
  { name: "联系人标签栏", action: "open", expect: "联系人 tag + 虚线 '+' 按钮" },
  { name: "消息气泡样式", action: "发送消息", expect: "用户蓝色右 / AI 灰色左 / 时间戳" },
  { name: "输入框存在", action: "open", expect: "textarea 带 placeholder '输入消息…'" },
  { name: "发送按钮 disabled", action: "input empty", expect: "发送按钮灰色不可点" },
  { name: "发送按钮 enabled", action: "输入文字", expect: "发送按钮变为可点" },
  { name: "附件按钮", action: "open", expect: "图片图标按钮存在" },
  { name: "Enter 发送 Shift+Enter 换行", action: "输入后按 Enter", expect: "消息发送 / Shift+Enter 换行" },
  { name: "输入框自适应", action: "输入多行文字", expect: "textarea 自动增高至最大 100px" },
  { name: "添加联系人弹窗", action: "click '+' ", expect: "底部 sheet 含联系人列表 + 确认按钮" },
  { name: "确认添加联系人", action: "勾选并确认", expect: "联系人 tag 出现在标签栏" },
  { name: "移除联系人", action: "click '×'", expect: "联系人 tag 消失" },
  { name: "SSE 流式渲染", action: "发送消息", expect: "逐 token 追加显示" },
  { name: "打字指示器", action: "发送消息", expect: "流开始前显示三点跳动动画" },
  { name: "流结束后刷新", action: "收到 done 事件", expect: "消息列表刷新，包含完整回复" },
  { name: "错误处理", action: "模拟 API 错误", expect: "显示 '抱歉，出错了' 提示消息" },
  { name: "返回按钮", action: "click ←", expect: "跳转到首页" },
  { name: "加载动画", action: "慢网络", expect: "加载中显示三点动画" },
];

export const markdownTests = [
  { name: "代码块渲染", content: "```const x = 1```", expect: "pre 代码块样式" },
  { name: "内联代码", content: "`const x`", expect: "内联 code 样式" },
  { name: "有序列表", content: "1. a\n2. b", expect: "ol 渲染" },
  { name: "无序列表", content: "- a\n- b", expect: "ul 渲染" },
  { name: "链接", content: "[text](url)", expect: "a 标签蓝色下划线" },
  { name: "表格", content: "|h|c|\n|-|-|\n|a|b|", expect: "表格 border 样式" },
  { name: "空回复", content: "", expect: "不阻塞渲染" },
  { name: "超长回复", content: "x".repeat(10000), expect: "不卡顿" },
  { name: "Emoji 渲染", content: "😊 🎉 ✅", expect: "正常显示" },
  { name: "中英文混合", content: "你好 Hello 世界 World", expect: "间距正常" },
];
