#!/bin/bash
# Nevin AI 一键备份脚本
# crontab: 0 3 * * * /path/to/nevin-ai/scripts/backup.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
DATA_DIR="${PROJECT_DIR}/data"
DB_FILE="${DATA_DIR}/nevin.db"
UPLOADS_DIR="${DATA_DIR}/uploads"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份开始..."
mkdir -p "${BACKUP_PATH}"

# 1. 数据库（.backup 保证一致性，不会出现写半截的脏数据）
if [ -f "${DB_FILE}" ]; then
    sqlite3 "${DB_FILE}" ".backup '${BACKUP_PATH}/nevin.db'"
    echo "OK 数据库: $(du -h "${BACKUP_PATH}/nevin.db" | cut -f1)"
fi

# 2. 图片
if [ -d "${UPLOADS_DIR}" ] && [ "$(ls -A "${UPLOADS_DIR}" 2>/dev/null)" ]; then
    tar czf "${BACKUP_PATH}/uploads.tar.gz" -C "${DATA_DIR}" uploads/
    echo "OK 图片: $(du -h "${BACKUP_PATH}/uploads.tar.gz" | cut -f1)"
fi

# 3. 元信息
CONV_COUNT=$(sqlite3 "${DB_FILE}" "SELECT count(*) FROM conversations;" 2>/dev/null || echo "0")
cat > "${BACKUP_PATH}/BACKUP_INFO.txt" << EOF
备份时间: $(date '+%Y-%m-%d %H:%M:%S')
对话数: ${CONV_COUNT}
EOF

# 4. 清理旧备份
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null || true

echo ""
echo "===== 备份完成 ====="
echo "  位置: ${BACKUP_PATH}"
echo "  大小: $(du -sh "${BACKUP_PATH}" | cut -f1)"
echo "===================="
