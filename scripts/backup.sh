#!/usr/bin/env bash
# ============================================================
# PGI — Script de backup de adjuntos
# Uso:     ./scripts/backup.sh
# Cron:    0 2 * * * /ruta/al/proyecto/scripts/backup.sh >> /var/log/pgi-backup.log 2>&1
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Configuración ─────────────────────────────────────────────
STORAGE_SRC="${PROJECT_DIR}/backend/storage/attachments"
BACKUP_DEST="${BACKUP_DEST:-/var/backups/pgi}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DEST}/attachments_${TIMESTAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# ── Validaciones ──────────────────────────────────────────────
if [ ! -d "$STORAGE_SRC" ]; then
  echo "[ERROR] Directorio de almacenamiento no encontrado: $STORAGE_SRC"
  exit 1
fi

mkdir -p "$BACKUP_DEST"

# ── Crear backup comprimido ───────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup..."
tar -czf "$BACKUP_FILE" -C "$(dirname "$STORAGE_SRC")" "$(basename "$STORAGE_SRC")"

# ── Checksum del backup ────────────────────────────────────────
sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup creado: $BACKUP_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checksum: $(cat "$CHECKSUM_FILE")"

# ── Tamaño del backup ─────────────────────────────────────────
SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tamaño: $SIZE"

# ── Limpieza de backups antiguos ─────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Eliminando backups mayores a ${RETENTION_DAYS} días..."
find "$BACKUP_DEST" -name "attachments_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DEST" -name "attachments_*.tar.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete

REMAINING=$(find "$BACKUP_DEST" -name "attachments_*.tar.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completado. Backups retenidos: ${REMAINING}"
