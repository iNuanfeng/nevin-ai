# Nevin AI 部署指南

> 版本：v0.1 | 更新：2026-06-07

---

## 环境要求

- **Node.js** ≥ 18.x
- **npm** / pnpm
- **SQLite**（系统自带，无需额外安装）

---

## 环境变量

```bash
# .env.local
DEEPSEEK_API_KEY=sk-your-key-here
```

| 变量 | 必填 | 说明 |
|------|------|------|
| DEEPSEEK_API_KEY | 是 | DeepSeek API 密钥 |
| PORT | 否 | 服务端口（默认 3000） |

---

## 开发环境

```bash
# 1. 克隆项目
git clone <repo-url>
cd nevin-ai

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 DEEPSEEK_API_KEY

# 4. 启动开发服务器
pnpm dev
```

浏览器访问 http://localhost:3000

---

## 生产部署

### 1. 配置环境变量

```bash
# SSH 到服务器后
cd /path/to/nevin-ai

# 创建配置（.env.local 已在 .gitignore 中，git pull 不会覆盖它）
cat > .env.local << 'EOF'
DEEPSEEK_API_KEY=sk-your-key-here
EOF
```


```bash
# 1. 构建
npm run build

# 2. 启动（建议使用 PM2）
npm start

# 或 PM2
npm install -g pm2
pm2 start npm --name "nevin-ai" -- start
pm2 save
pm2 startup
```

---

## Nginx 反代

```nginx
server {
    listen 443 ssl;
    server_name ai.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE 必须关闭 buffering
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
```

---

## 数据备份

```bash
# 每日备份（crontab）
0 3 * * * cd /path/to/nevin-ai && sqlite3 data/nevin.db ".backup 'data/backup/nevin-$(date +\\%Y\\%m\\%d).db'"

# 手动备份
sqlite3 data/nevin.db ".backup 'backup.db'"

# 恢复
sqlite3 data/nevin.db ".restore 'backup.db'"
```

---

## PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nevin-ai',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

---

## 常见问题

### SSE 不工作

确保 Nginx 配置了 `proxy_buffering off;`，否则 SSE 流会被缓冲导致前端一直收不到数据。

### 数据库权限

确保 `data/` 目录对运行用户可写：

```bash
chmod 755 data/
chown -R www-data:www-data data/
```

### 构建时 native 模块出错

better-sqlite3 需要编译原生绑定，确保系统有 build-essential：

```bash
# Ubuntu
apt install python3 make g++

# macOS
xcode-select --install
```
