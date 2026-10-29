#!/bin/bash
# ==============================================================================
# OperaBeauty - Script Automatizado de Backup do Banco e Uploads (C1 - P0)
# ==============================================================================
# - Realiza dump do PostgreSQL no formato custom (-Fc) otimizado para pg_restore
# - Realiza backup do volume de uploads (fotos de anamnese, CRM e comprovantes)
# - Criptografa ambos os arquivos via OpenSSL (AES-256-CBC com PBKDF2 e salt)
# - Política de retenção 7/4/6 (7 diários, 4 semanais e 6 mensais)
# - Sincronização opcional com Cloudflare R2 / Backblaze B2 / AWS S3
# - Disparo de webhook de alerta (Discord/Telegram) em caso de falha ou sucesso
# ==============================================================================

set -euo pipefail

# Desativa conversão de caminhos pelo MSYS/Git-Bash em ambientes Windows
export MSYS_NO_PATHCONV=1

# 1. Configurações de Diretórios e Variáveis
BACKUP_ROOT_DIR="${BACKUP_DIR:-/backups/operabeauty}"
DAILY_DIR="$BACKUP_ROOT_DIR/daily"
WEEKLY_DIR="$BACKUP_ROOT_DIR/weekly"
MONTHLY_DIR="$BACKUP_ROOT_DIR/monthly"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

DATE=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u") # 1 = Segunda, 7 = Domingo
DAY_OF_MONTH=$(date +"%d") # 01 a 31

DB_DUMP_NAME="operabeauty_db_${DATE}.dump"
DB_ENC_NAME="${DB_DUMP_NAME}.enc"
UPLOADS_TAR_NAME="operabeauty_uploads_${DATE}.tar.gz"
UPLOADS_ENC_NAME="${UPLOADS_TAR_NAME}.enc"

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-operabeauty}"
ENCRYPTION_PASSWORD="${BACKUP_ENCRYPTION_PASSWORD:-${DB_PASSWORD:-ChaveSeguraDeBackupOperabeauty!2026}}"

# S3 / R2 / B2 (Opcional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"

# Webhooks de Notificação
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-${TELEGRAM_WEBHOOK_URL:-}}"

# 2. Funções de Notificação
send_notification() {
    local status="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$status] $message"

    if [ -n "$WEBHOOK_URL" ]; then
        local payload
        if [ "$status" = "SUCCESS" ]; then
            payload="{\"content\":\"✅ **OperaBeauty Backup [SUCESSO]**\n$message\"}"
        else
            payload="{\"content\":\"🚨 **OperaBeauty Backup [FALHA CRÍTICA]**\n$message\"}"
        fi
        curl -s -m 10 -H "Content-Type: application/json" -X POST -d "$payload" "$WEBHOOK_URL" > /dev/null || true
    fi
}

on_failure() {
    local exit_code=$?
    local line_num=$1
    send_notification "ERROR" "Erro ao executar rotina de backup na linha $line_num (Exit code: $exit_code). Verifique os logs do servidor."
    exit "$exit_code"
}

trap 'on_failure $LINENO' ERR

send_notification "INFO" "Iniciando rotina automatizada de backup (Banco de Dados + Uploads)..."

# 3. Localização do Container do PostgreSQL
DB_CONTAINER=$(docker ps --filter "name=operabeauty-db" --format "{{.Names}}" | head -n 1 || true)
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "db|postgres" | head -n 1 || true)
fi

if [ -z "$DB_CONTAINER" ]; then
    send_notification "ERROR" "Container do banco de dados (operabeauty-db) não foi encontrado em execução."
    exit 1
fi

# 4. Dump do PostgreSQL em formato binário customizado (-Fc)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Executando pg_dump -Fc no container $DB_CONTAINER..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$DAILY_DIR/$DB_DUMP_NAME"

if [ ! -s "$DAILY_DIR/$DB_DUMP_NAME" ]; then
    send_notification "ERROR" "Arquivo de dump do banco de dados foi gerado vazio ou corrompido."
    rm -f "$DAILY_DIR/$DB_DUMP_NAME"
    exit 1
fi

# 5. Cifragem do Dump do Banco (OpenSSL AES-256-CBC PBKDF2)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cifrando dump do banco com OpenSSL AES-256-CBC..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$DAILY_DIR/$DB_DUMP_NAME" -out "$DAILY_DIR/$DB_ENC_NAME" -pass pass:"$ENCRYPTION_PASSWORD"
rm -f "$DAILY_DIR/$DB_DUMP_NAME"

# 6. Backup do Volume de Uploads (Fotos de Anamnese, CRM e Comprovantes)
API_CONTAINER=$(docker ps --filter "name=operabeauty-api" --format "{{.Names}}" | head -n 1 || true)
if [ -n "$API_CONTAINER" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Gerando arquivo comprimido do volume de uploads..."
    docker exec "$API_CONTAINER" sh -c "mkdir -p /usr/src/app/public/uploads && cd /usr/src/app/public/uploads && tar czf - ." > "$DAILY_DIR/$UPLOADS_TAR_NAME" || true
else
    # Fallback via container alpine temporário montando o volume Docker operabeauty-uploads
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] API container indisponível. Executando extração via container utilitário Docker..."
    docker run --rm -v operabeauty-uploads:/uploads alpine sh -c "cd /uploads && tar czf - ." > "$DAILY_DIR/$UPLOADS_TAR_NAME" || true
fi

if [ -s "$DAILY_DIR/$UPLOADS_TAR_NAME" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cifrando arquivo de uploads..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$DAILY_DIR/$UPLOADS_TAR_NAME" -out "$DAILY_DIR/$UPLOADS_ENC_NAME" -pass pass:"$ENCRYPTION_PASSWORD"
    rm -f "$DAILY_DIR/$UPLOADS_TAR_NAME"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Aviso: Volume de uploads vazio ou inacessível no momento."
    rm -f "$DAILY_DIR/$UPLOADS_TAR_NAME"
fi

# 7. Política de Retenção 7/4/6 (Semanal aos domingos e Mensal no dia 01)
# Copia para weekly se for domingo (DAY_OF_WEEK = 7)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Hoje é domingo. Arquivando cópia semanal em $WEEKLY_DIR..."
    cp "$DAILY_DIR/$DB_ENC_NAME" "$WEEKLY_DIR/"
    if [ -f "$DAILY_DIR/$UPLOADS_ENC_NAME" ]; then
        cp "$DAILY_DIR/$UPLOADS_ENC_NAME" "$WEEKLY_DIR/"
    fi
fi

# Copia para monthly se for o primeiro dia do mês (DAY_OF_MONTH = 01)
if [ "$DAY_OF_MONTH" = "01" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Primeiro dia do mês. Arquivando cópia mensal em $MONTHLY_DIR..."
    cp "$DAILY_DIR/$DB_ENC_NAME" "$MONTHLY_DIR/"
    if [ -f "$DAILY_DIR/$UPLOADS_ENC_NAME" ]; then
        cp "$DAILY_DIR/$UPLOADS_ENC_NAME" "$MONTHLY_DIR/"
    fi
fi

# 8. Rotação de Backups Locais
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Executando rotação de retenção (7 diários, 4 semanais, 6 mensais)..."
# Retenção Diária: apaga arquivos com mais de 7 dias
find "$DAILY_DIR" -type f -name "*.enc" -mtime +7 -delete 2>/dev/null || true
# Retenção Semanal: apaga arquivos com mais de 28 dias (4 semanas)
find "$WEEKLY_DIR" -type f -name "*.enc" -mtime +28 -delete 2>/dev/null || true
# Retenção Mensal: apaga arquivos com mais de 180 dias (6 meses)
find "$MONTHLY_DIR" -type f -name "*.enc" -mtime +180 -delete 2>/dev/null || true

# 9. Sincronização com Armazenamento Externo (S3 / R2 / B2)
if [ -n "$S3_BUCKET" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sincronizando com repositório remoto ($S3_BUCKET)..."
    EXTRA_FLAGS=""
    if [ -n "$S3_ENDPOINT" ]; then
        EXTRA_FLAGS="--endpoint-url $S3_ENDPOINT"
    fi

    if command -v aws &> /dev/null; then
        aws s3 cp "$DAILY_DIR/$DB_ENC_NAME" "$S3_BUCKET/daily/" $EXTRA_FLAGS || true
        if [ -f "$DAILY_DIR/$UPLOADS_ENC_NAME" ]; then
            aws s3 cp "$DAILY_DIR/$UPLOADS_ENC_NAME" "$S3_BUCKET/daily/" $EXTRA_FLAGS || true
        fi
        if [ "$DAY_OF_WEEK" -eq 7 ]; then
            aws s3 cp "$WEEKLY_DIR/$DB_ENC_NAME" "$S3_BUCKET/weekly/" $EXTRA_FLAGS || true
        fi
        if [ "$DAY_OF_MONTH" = "01" ]; then
            aws s3 cp "$MONTHLY_DIR/$DB_ENC_NAME" "$S3_BUCKET/monthly/" $EXTRA_FLAGS || true
        fi
    elif command -v rclone &> /dev/null; then
        rclone copy "$DAILY_DIR/$DB_ENC_NAME" "$S3_BUCKET/daily/" || true
        if [ -f "$DAILY_DIR/$UPLOADS_ENC_NAME" ]; then
            rclone copy "$DAILY_DIR/$UPLOADS_ENC_NAME" "$S3_BUCKET/daily/" || true
        fi
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Aviso: Nem 'aws' nem 'rclone' instalados. Backup remoto ignorado."
    fi
fi

# 10. Conclusão e Relatório de Sucesso
DB_SIZE=$(du -h "$DAILY_DIR/$DB_ENC_NAME" | cut -f1)
UPLOADS_STATUS="Não gerado"
if [ -f "$DAILY_DIR/$UPLOADS_ENC_NAME" ]; then
    UPLOADS_SIZE=$(du -h "$DAILY_DIR/$UPLOADS_ENC_NAME" | cut -f1)
    UPLOADS_STATUS="Concluído ($UPLOADS_SIZE)"
fi

SUCCESS_MSG="Backup finalizado com êxito!\n- Banco de Dados (Custom Fc): $DB_ENC_NAME ($DB_SIZE)\n- Uploads & Anexos: $UPLOADS_STATUS\n- Retenção: 7 diários, 4 semanais e 6 mensais mantidos."
send_notification "SUCCESS" "$SUCCESS_MSG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Processo de backup concluído com sucesso."
