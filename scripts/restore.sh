#!/usr/bin/env bash
# ============================================================
# PGI — Script de restauración de adjuntos
# Uso: ./scripts/restore.sh /var/backups/pgi/attachments_20260413_020000.tar.gz
# ============================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STORAGE_DEST="${PROJECT_DIR}/backend/storage"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <archivo_backup.tar.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Archivo de backup no encontrado: $BACKUP_FILE"
  exit 1
fi

# Verificar checksum si existe
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  echo "[INFO] Verificando checksum..."
  sha256sum --check "$CHECKSUM_FILE" || { echo "[ERROR] Checksum inválido. Backup corrupto."; exit 1; }
  echo "[OK] Checksum verificado."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restaurando desde: $BACKUP_FILE"
echo "[AVISO] Esto sobreescribirá el directorio storage/attachments. ¿Continuar? (s/N)"
read -r CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
  echo "Restauración cancelada."
  exit 0
fi

tar -xzf "$BACKUP_FILE" -C "$STORAGE_DEST"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada en: $STORAGE_DEST/attachments"
