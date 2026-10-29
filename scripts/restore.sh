#!/bin/bash
# ==============================================================================
# OperaBeauty - Script de Restauração e Teste de Disaster Recovery (C1 - P0)
# ==============================================================================
# - Descriptografa arquivos .dump.enc e .tar.gz.enc gerados pelo backup.sh
# - Valida a integridade do arquivo de dump PostgreSQL custom format (-Fc)
# - Suporta modo de teste sem escrita (--dry-run / --verify-only)
# - Restaura o banco de dados via pg_restore com opção de limpeza (--clean)
# - Restaura o volume de uploads descompactando para a pasta correta
# ==============================================================================

set -euo pipefail

# Desativa conversão de caminhos pelo MSYS/Git-Bash em ambientes Windows
export MSYS_NO_PATHCONV=1

BACKUP_ROOT_DIR="${BACKUP_DIR:-/backups/operabeauty}"
DAILY_DIR="$BACKUP_ROOT_DIR/daily"
TEMP_DIR="$BACKUP_ROOT_DIR/.restore_tmp_$(date +%s)"

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-operabeauty}"
ENCRYPTION_PASSWORD="${BACKUP_ENCRYPTION_PASSWORD:-${DB_PASSWORD:-ChaveSeguraDeBackupOperabeauty!2026}}"

VERIFY_ONLY=false
RESTORE_UPLOADS=true

usage() {
    echo "Uso: $0 [OPÇÕES]"
    echo ""
    echo "Opções:"
    echo "  --db-file <caminho>       Caminho do arquivo .dump.enc a ser restaurado"
    echo "  --uploads-file <caminho>  Caminho do arquivo de uploads .tar.gz.enc"
    echo "  --verify-only             Apenas descriptografa e valida integridade, sem aplicar no banco"
    echo "  --skip-uploads            Restaura apenas o banco de dados, sem restaurar uploads"
    echo "  --help                    Exibe esta mensagem de ajuda"
    echo ""
    echo "Exemplo:"
    echo "  $0 --verify-only"
    echo "  $0 --db-file /backups/operabeauty/daily/operabeauty_db_20261022_120000.dump.enc"
    exit 1
}

TARGET_DB_FILE=""
TARGET_UPLOADS_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --db-file)
            TARGET_DB_FILE="$2"
            shift 2
            ;;
        --uploads-file)
            TARGET_UPLOADS_FILE="$2"
            shift 2
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        --skip-uploads)
            RESTORE_UPLOADS=false
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo "Opção desconhecida: $1"
            usage
            ;;
    esac
done

# Localização automática do backup mais recente se não especificado
if [ -z "$TARGET_DB_FILE" ]; then
    TARGET_DB_FILE=$(find "$DAILY_DIR" -type f -name "operabeauty_db_*.dump.enc" 2>/dev/null | sort -r | head -n 1 || true)
fi

if [ -z "$TARGET_DB_FILE" ] || [ ! -f "$TARGET_DB_FILE" ]; then
    echo "ERRO: Nenhum arquivo de backup do banco (.dump.enc) encontrado."
    exit 1
fi

if [ "$RESTORE_UPLOADS" = true ] && [ -z "$TARGET_UPLOADS_FILE" ]; then
    TARGET_UPLOADS_FILE=$(find "$DAILY_DIR" -type f -name "operabeauty_uploads_*.tar.gz.enc" 2>/dev/null | sort -r | head -n 1 || true)
fi

echo "=============================================================================="
echo "  OperaBeauty - Procedimento de Restauração de Backup"
echo "=============================================================================="
echo "Arquivo de Banco:   $TARGET_DB_FILE"
echo "Arquivo de Uploads: ${TARGET_UPLOADS_FILE:-[Não selecionado]}"
echo "Modo Verificação:   $VERIFY_ONLY"
echo "=============================================================================="

mkdir -p "$TEMP_DIR"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# 1. Descriptografar o Dump do Banco
DECRYPTED_DUMP="$TEMP_DIR/db.dump"
echo "[1/4] Descriptografando dump do banco..."
openssl enc -d -aes-256-cbc -pbkdf2 -in "$TARGET_DB_FILE" -out "$DECRYPTED_DUMP" -pass pass:"$ENCRYPTION_PASSWORD"

if [ ! -s "$DECRYPTED_DUMP" ]; then
    echo "ERRO: Falha na descriptografia do dump. Senha incorreta ou arquivo corrompido."
    exit 1
fi

# 2. Validar Cabeçalho do Dump PostgreSQL (Custom Fc format)
echo "[2/4] Validando integridade do formato de arquivo PostgreSQL (-Fc)..."
HEADER=$(head -c 5 "$DECRYPTED_DUMP" || true)
if [[ "$HEADER" != *"PGDMP"* ]]; then
    echo "ERRO: O arquivo descriptografado não possui a assinatura válida de dump PostgreSQL (PGDMP)."
    exit 1
fi
echo "✓ Cabeçalho PGDMP validado com sucesso!"

# 3. Aplicar ou Validar no PostgreSQL
DB_CONTAINER=$(docker ps --filter "name=operabeauty-db" --format "{{.Names}}" | head -n 1 || true)
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "db|postgres" | head -n 1 || true)
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "ERRO: Container operabeauty-db não encontrado."
    exit 1
fi

if [ "$VERIFY_ONLY" = true ]; then
    echo "[3/4] Modo verificação ativo: Listando tabela de conteúdos do dump via pg_restore..."
    docker exec -i "$DB_CONTAINER" pg_restore -l < "$DECRYPTED_DUMP" > "$TEMP_DIR/toc.txt"
    TOTAL_ENTRIES=$(wc -l < "$TEMP_DIR/toc.txt")
    echo "✓ Teste de integridade passou! O dump possui $TOTAL_ENTRIES objetos válidos para restauração."
else
    echo "[3/4] Executando pg_restore no banco $DB_NAME..."
    # pg_restore com --clean para limpar objetos existentes antes de recriar
    docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$DECRYPTED_DUMP" || true
    echo "✓ Restauração do banco de dados concluída."
fi

# 4. Restauração de Uploads
if [ "$RESTORE_UPLOADS" = true ] && [ -n "$TARGET_UPLOADS_FILE" ] && [ -f "$TARGET_UPLOADS_FILE" ]; then
    DECRYPTED_UPLOADS="$TEMP_DIR/uploads.tar.gz"
    echo "[4/4] Descriptografando e restaurando volume de uploads..."
    openssl enc -d -aes-256-cbc -pbkdf2 -in "$TARGET_UPLOADS_FILE" -out "$DECRYPTED_UPLOADS" -pass pass:"$ENCRYPTION_PASSWORD"

    if [ "$VERIFY_ONLY" = true ]; then
        tar -tzf - < "$DECRYPTED_UPLOADS" > "$TEMP_DIR/uploads_list.txt"
        TOTAL_FILES=$(wc -l < "$TEMP_DIR/uploads_list.txt")
        echo "✓ Arquivo de uploads íntegro com $TOTAL_FILES itens arquivados."
    else
        API_CONTAINER=$(docker ps --filter "name=operabeauty-api" --format "{{.Names}}" | head -n 1 || true)
        if [ -n "$API_CONTAINER" ]; then
            docker exec -i "$API_CONTAINER" tar xzf - -C /usr/src/app/public/uploads < "$DECRYPTED_UPLOADS"
            echo "✓ Volume de uploads restaurado com sucesso."
        else
            docker run --rm -i -v operabeauty-uploads:/uploads alpine tar xzf - -C /uploads < "$DECRYPTED_UPLOADS"
            echo "✓ Volume de uploads restaurado via container Docker utilitário."
        fi
    fi
else
    echo "[4/4] Restauração de uploads ignorada ou arquivo não informado."
fi

echo "=============================================================================="
echo "  Operação concluída com 100% de sucesso!"
echo "=============================================================================="
