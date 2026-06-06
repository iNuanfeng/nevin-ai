/**
 * E2E Test Specifications — Home Page & Navigation
 *
 * 覆盖：首页、导师过滤器、对话列表、底部导航、通讯录、档案、导师人设、备份
 * 运行：npx playwright test tests/e2e/home.spec.ts
 */

export const homePageTests = [
  { name: "首页标题显示 Nevin", action: "open /", expect: "h1 包含 'Nevin'" },
  { name: "空状态引导文案", action: "open /", expect: "'还没有对话' + '点击右下角 + 开始吧'" },
  { name: "导师过滤器 7 个 chip", action: "open /", expect: "全部/总管家/职场军师/情场顾问/家庭调解师/摄影导师/成长教练" },
  { name: "全部默认高亮", action: "open /", expect: "第一个 chip 有 active 样式" },
  { name: "FAB 按钮存在", action: "open /", expect: "右下角 '+' 按钮可见" },
  { name: "FAB 点击弹出导师面板", action: "click FAB", expect: "底部 sheet 出现，含 6 个导师" },
  { name: "底部导航 5 tab", action: "open /", expect: "首页/通讯录/档案/导师/备份" },
  { name: "导航 tab 切换", action: "click 通讯录", expect: "通讯录视图显示" },
  { name: "活跃 tab 高亮", action: "click 备份", expect: "备份 tab 文字蓝色" },
  { name: "通讯录空列表", action: "click 通讯录", expect: "列表区域显示（可为空）" },
  { name: "通讯录新建按钮", action: "click 通讯录", expect: "右下角蓝色 '+' 按钮" },
  { name: "通讯录新建表单弹出", action: "click '+'", expect: "底部 sheet 含姓名/关系/背景字段" },
  { name: "通讯录搜索过滤", action: "输入搜索词", expect: "列表实时过滤" },
  { name: "档案表单回填", action: "click 档案", expect: "6 个字段回填已有数据" },
  { name: "档案保存按钮", action: "click 档案", expect: "点击后调用 PUT /api/profile" },
  { name: "导师列表 6 人", action: "click 导师", expect: "6 个导师项，各带图标和风格描述" },
  { name: "导师展开编辑", action: "click 导师", expect: "点击展开 textarea + 保存按钮" },
  { name: "导师保存风格", action: "点击保存", expect: "调用 PUT /api/mentors/:id" },
  { name: "备份统计卡片", action: "click 备份", expect: "4 格统计显示数字" },
  { name: "备份下载按钮", action: "click 备份", expect: "下载按钮存在" },
];

export const responsiveTests = [
  { name: "375px 宽度布局不变形", viewport: { width: 375, height: 812 }, expect: "无水平滚动" },
  { name: "430px 宽度布局正常", viewport: { width: 430, height: 932 }, expect: "内容完整显示" },
  { name: "桌面端居中显示", viewport: { width: 1280, height: 800 }, expect: "max-w-[430px] 居中" },
];

export const designTests = [
  { name: "颜色系统", expect: "背景 #fff / 文字 #1d1d1f / 强调 #007aff" },
  { name: "圆角一致性", expect: "卡片 12-16px / 按钮 12px / 标签 20px" },
  { name: "底部 sheet 动画", expect: "slideUp 0.3s ease" },
  { name: "打字指示器动画", expect: "三点跳动" },
  { name: "Toast 动画", expect: "fadeIn 0.2s ease" },
];
