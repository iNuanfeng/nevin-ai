#!/bin/bash
# Nevin AI 恢复脚本
# 用法: ./scripts/restore.sh /path/to/backup/folder

set -e

if [ -z "$1" ]; then
    echo "用法: $0 <备份目录路径>"
    echo "示例: $0 ./backups/20260101_030000"
    echo ""
    echo "可用的备份:"
    ls -d ./backups/20* 2>/dev/null || echo "  无"
    exit 1
fi

BACKUP_PATH="$1"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${PROJECT_DIR}/data"

echo "即将从以下位置恢复: ${BACKUP_PATH}"
echo ""
echo "  数据库: $( [ -f "${BACKUP_PATH}/nevin.db" ] && echo '有' || echo '无')"
echo "  图片:   $( [ -f "${BACKUP_PATH}/uploads.tar.gz" ] && echo '有' || echo '无')"
echo ""
read -p "确认恢复？当前数据将被覆盖！(y/N): " CONFIRM
if [ "${CONFIRM}" != "y" ]; then
    echo "已取消"
    exit 0
fi

mkdir -p "${DATA_DIR}"

# 恢复数据库
if [ -f "${BACKUP_PATH}/nevin.db" ]; then
    cp "${BACKUP_PATH}/nevin.db" "${DATA_DIR}/nevin.db"
    echo "OK 数据库已恢复"
fi

# 恢复图片
if [ -f "${BACKUP_PATH}/uploads.tar.gz" ]; then
    tar xzf "${BACKUP_PATH}/uploads.tar.gz" -C "${DATA_DIR}"
    echo "OK 图片已恢复"
fi

echo "恢复完成"
