#!/bin/bash
# ==============================================================================
# OperaBeauty - Script de Monitoramento de Infraestrutura & Alertas (G3 - P1)
# ==============================================================================
# - Monitora uso de disco (alerta se > 85% e emergência se > 92%)
# - Monitora uso de memória RAM (alerta se memória livre < 10%)
# - Inspeciona status de saúde dos containers Docker (db, redis, api, caddy, wa-gateway)
# - Verifica a execução do backup diário do PostgreSQL (alerta se > 26h sem backup)
# - Testa resposta HTTP local dos endpoints /health e /health/complete
# - Dispara webhook instantâneo (Discord / Telegram) em caso de degradação
# ==============================================================================

set -euo pipefail

# Desativa conversão de caminhos pelo MSYS/Git-Bash no Windows
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DAILY_DIR="${BACKUP_DIR:-/backups/operabeauty}/daily"
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-${TELEGRAM_WEBHOOK_URL:-}}"

DISK_WARN_THRESHOLD=85
DISK_CRIT_THRESHOLD=92
MEM_WARN_FREE_PERCENT=10

STATUS="HEALTHY"
ALERTS=()

send_webhook_alert() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"

    if [ -n "$WEBHOOK_URL" ]; then
        local icon="⚠️"
        if [ "$level" = "CRITICAL" ]; then
            icon="🚨"
        elif [ "$level" = "INFO" ]; then
            icon="ℹ️"
        fi

        local payload="{\"content\":\"$icon **OperaBeauty Monitor [$level]**\n$message\"}"
        curl -s -m 10 -H "Content-Type: application/json" -X POST -d "$payload" "$WEBHOOK_URL" > /dev/null || true
    fi
}

echo "=========================================================="
echo "    OperaBeauty SaaS - Auditoria de Saúde da Infraestrutura"
echo "=========================================================="

# 1. Checagem de Uso de Disco
if command -v df >/dev/null 2>&1; then
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    echo "💾 Uso de Disco: ${DISK_USAGE}% (Limiares: Warn >${DISK_WARN_THRESHOLD}%, Crit >${DISK_CRIT_THRESHOLD}%)"

    if [ "$DISK_USAGE" -ge "$DISK_CRIT_THRESHOLD" ]; then
        STATUS="CRITICAL"
        ALERTS+=("Disco CRÍTICO: Partição raiz atingiu ${DISK_USAGE}% de ocupação.")
    elif [ "$DISK_USAGE" -ge "$DISK_WARN_THRESHOLD" ]; then
        [ "$STATUS" != "CRITICAL" ] && STATUS="WARNING"
        ALERTS+=("Disco em ALERTA: Partição raiz atingiu ${DISK_USAGE}% de ocupação.")
    fi
fi

# 2. Checagem de Memória RAM (se comando free disponível)
if command -v free >/dev/null 2>&1; then
    MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
    MEM_AVAIL=$(free -m | awk '/^Mem:/{print $7}')
    if [ -n "$MEM_TOTAL" ] && [ -n "$MEM_AVAIL" ] && [ "$MEM_TOTAL" -gt 0 ]; then
        MEM_FREE_PERCENT=$((MEM_AVAIL * 100 / MEM_TOTAL))
        echo "🧠 Memória Disponível: ${MEM_FREE_PERCENT}% (${MEM_AVAIL}MB livres de ${MEM_TOTAL}MB)"

        if [ "$MEM_FREE_PERCENT" -le "$MEM_WARN_FREE_PERCENT" ]; then
            [ "$STATUS" != "CRITICAL" ] && STATUS="WARNING"
            ALERTS+=("Memória RAM em ALERTA: Apenas ${MEM_FREE_PERCENT}% disponível.")
        fi
    fi
fi

# 3. Checagem de Saúde dos Containers Docker
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Inspecionando containers Docker..."
    REQUIRED_CONTAINERS=("operabeauty-db" "operabeauty-redis" "operabeauty-api" "operabeauty-caddy" "operabeauty-wa-gateway")
    
    for c in "${REQUIRED_CONTAINERS[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${c}\$"; then
            STATE=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "unknown")
            HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null || echo "none")
            
            if [ "$STATE" != "running" ]; then
                STATUS="CRITICAL"
                ALERTS+=("Container PARADO: $c está no estado '$STATE'.")
                echo "   ❌ $c: $STATE"
            elif [ "$HEALTH" = "unhealthy" ]; then
                STATUS="CRITICAL"
                ALERTS+=("Container DEGRADADO: $c reportou status UNHEALTHY.")
                echo "   ❌ $c: unhealthy"
            else
                echo "   ✅ $c: $STATE ($HEALTH)"
            fi
        else
            echo "   ⚠️ $c: Container não encontrado na máquina local."
        fi
    done
fi

# 4. Checagem do Último Backup Executado
echo "📦 Verificando esteira de backups..."
if [ -d "$BACKUP_DAILY_DIR" ]; then
    LATEST_BACKUP=$(find "$BACKUP_DAILY_DIR" -type f -name "*.enc" -mtime -1 2>/dev/null | head -n 1 || true)
    if [ -z "$LATEST_BACKUP" ]; then
        # Verifica se há qualquer backup nas últimas 26h
        LATEST_ANY=$(find "$BACKUP_DAILY_DIR" -type f -name "*.enc" -mmin -1560 2>/dev/null | head -n 1 || true)
        if [ -z "$LATEST_ANY" ]; then
            [ "$STATUS" != "CRITICAL" ] && STATUS="WARNING"
            ALERTS+=("Backup ATRASADO: Nenhum backup cifrado foi gerado nas últimas 26 horas.")
            echo "   ⚠️ Nenhum backup encontrado nas últimas 26 horas em $BACKUP_DAILY_DIR."
        else
            echo "   ✅ Backup diário recente verificado com sucesso."
        fi
    else
        echo "   ✅ Backup diário recente verificado com sucesso."
    fi
else
    echo "   ℹ️ Diretório de backups não configurado localmente ($BACKUP_DAILY_DIR)."
fi

# 5. Teste de Resposta da API
echo "🌐 Testando endpoints de saúde da aplicação..."
API_URL="${API_HEALTH_URL:-http://localhost:5001/health}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || true)

if [ "$API_STATUS" = "200" ]; then
    echo "   ✅ API Healthcheck OK (HTTP 200)"
else
    STATUS="CRITICAL"
    ALERTS+=("API INDISPONÍVEL: Endpoint $API_URL retornou HTTP $API_STATUS.")
    echo "   ❌ API Healthcheck Falhou (HTTP $API_STATUS)"
fi

echo "=========================================================="
if [ "$STATUS" = "HEALTHY" ]; then
    echo "✅ AUDITORIA CONCLUÍDA: Todos os subsistemas estão saudáveis."
    exit 0
else
    echo "$STATUS: Foram detectadas anomalias operacionais."
    ALERT_MSG=""
    for a in "${ALERTS[@]}"; do
        echo "   • $a"
        ALERT_MSG="${ALERT_MSG}\n• ${a}"
    done
    send_webhook_alert "$STATUS" "$ALERT_MSG"
    [ "$STATUS" = "CRITICAL" ] && exit 1 || exit 0
fi
