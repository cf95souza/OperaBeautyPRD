#!/bin/bash
# ==============================================================================
# OperaBeauty - Script de Rollback em 1 Comando (G2 - P1)
# ==============================================================================
# - Permite reverter a aplicação para a tag de imagem anterior instantaneamente
# - Suporta tag explícita ou restauração automática a partir de .last_deployed_tag
# - Executa docker compose pull && docker compose up -d de forma atômica
# - Realiza verificação de saúde pós-rollback (Smoke Test)
# - Notifica webhooks de alerta (Discord / Telegram)
# ==============================================================================

set -euo pipefail

# Desativa conversão de caminhos pelo MSYS/Git-Bash no Windows
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

LAST_TAG_FILE="$PROJECT_ROOT/.last_deployed_tag"
PREV_TAG_FILE="$PROJECT_ROOT/.previous_tag_before_rollback"
ENV_FILE="$PROJECT_ROOT/.env"

# Webhooks de Notificação
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-${TELEGRAM_WEBHOOK_URL:-}}"

send_notification() {
    local status="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$status] $message"

    if [ -n "$WEBHOOK_URL" ]; then
        local payload
        if [ "$status" = "SUCCESS" ]; then
            payload="{\"content\":\"🔄 **OperaBeauty Rollback [SUCESSO]**\n$message\"}"
        else
            payload="{\"content\":\"🚨 **OperaBeauty Rollback [FALHA CRÍTICA]**\n$message\"}"
        fi
        curl -s -m 10 -H "Content-Type: application/json" -X POST -d "$payload" "$WEBHOOK_URL" > /dev/null || true
    fi
}

echo "=========================================================="
echo "    OperaBeauty SaaS - Mecanismo de Rollback em 1 Comando"
echo "=========================================================="

TARGET_TAG="${1:-}"

# 1. Determina a tag de destino do rollback
if [ -z "$TARGET_TAG" ]; then
    if [ -f "$LAST_TAG_FILE" ]; then
        TARGET_TAG="$(cat "$LAST_TAG_FILE" | tr -d '[:space:]')"
        echo "ℹ️ Nenhuma tag informada. Usando tag registrada no último deploy estável: [$TARGET_TAG]"
    else
        echo "❌ Erro: Nenhuma tag informada e o arquivo .last_deployed_tag não foi encontrado."
        echo "Uso: ./scripts/rollback.sh <IMAGE_TAG_OU_COMMIT_SHA>"
        exit 1
    fi
fi

if [ -z "$TARGET_TAG" ]; then
    echo "❌ Erro: Tag de destino do rollback vazia."
    exit 1
fi

# 2. Captura a tag atual antes de sobrescrever
CURRENT_TAG="latest"
if [ -f "$ENV_FILE" ]; then
    CURRENT_TAG=$(grep -E "^IMAGE_TAG=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '[:space:]' || echo "latest")
fi

echo "⚠️ Rollback solicitado:"
echo "   Versão atual:    [$CURRENT_TAG]"
echo "   Versão destino:  [$TARGET_TAG]"
echo ""

# Salva a tag atual para auditoria
echo "$CURRENT_TAG" > "$PREV_TAG_FILE"

# 3. Atualiza o arquivo .env com a nova IMAGE_TAG
if [ -f "$ENV_FILE" ]; then
    if grep -q "^IMAGE_TAG=" "$ENV_FILE"; then
        # Substitui a linha existente
        sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TARGET_TAG}/" "$ENV_FILE"
    else
        echo "IMAGE_TAG=${TARGET_TAG}" >> "$ENV_FILE"
    fi
else
    echo "IMAGE_TAG=${TARGET_TAG}" > "$ENV_FILE"
fi

export IMAGE_TAG="$TARGET_TAG"

echo "📥 1/3 Baixando imagens da versão [$TARGET_TAG]..."
if ! docker compose pull; then
    echo "⚠️ Aviso: Falha ao baixar imagens remotas. Tentando utilizar imagens locais em cache..."
fi

echo "🚀 2/3 Reiniciando containers na versão [$TARGET_TAG]..."
docker compose up -d --remove-orphans

echo "🩺 3/3 Executando Healthcheck pós-rollback..."
MAX_ATTEMPTS=12
ATTEMPT=1
HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "   Aguardando subida dos serviços (tentativa $ATTEMPT/$MAX_ATTEMPTS)..."
    sleep 3
    
    # Testa healthcheck da API
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health || true)
    
    # Testa disponibilidade do Frontend Caddy
    FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || true)
    
    if [ "$API_STATUS" = "200" ] && [ "$FRONT_STATUS" = "200" ]; then
        HEALTHY=true
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTHY" = true ]; then
    echo ""
    echo "=========================================================="
    echo "✅ ROLLBACK CONCLUÍDO COM SUCESSO!"
    echo "   Ambiente restaurado para a versão: [$TARGET_TAG]"
    echo "   API (5001): OK (HTTP 200)"
    echo "   Frontend/Caddy (8080): OK (HTTP 200)"
    echo "=========================================================="
    
    # Atualiza o arquivo de última tag para refletir o rollback
    echo "$TARGET_TAG" > "$LAST_TAG_FILE"
    send_notification "SUCCESS" "Rollback executado com sucesso para a versão [$TARGET_TAG] pelo operador."
    exit 0
else
    echo ""
    echo "=========================================================="
    echo "❌ FALHA NO ROLLBACK: Os serviços não responderam com HTTP 200 dentro do tempo limite."
    echo "   API Status: $API_STATUS | Frontend Status: $FRONT_STATUS"
    echo "   Inspecione os logs com: docker compose logs --tail=100"
    echo "=========================================================="
    send_notification "FAILED" "Falha no healthcheck após rollback para a versão [$TARGET_TAG]. Inspecione os logs imediatamente."
    exit 1
fi
