#!/bin/bash

# OperaBeauty - Script de Limpeza de Tokens Expirados (FINDING-09)
# Este script deve ser chamado pelo cron diariamente

echo "[$(date)] Iniciando limpeza de refresh tokens expirados..."

CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep db | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "[$(date)] ERRO: Container do banco de dados não encontrado."
    exit 1
fi

docker exec "$CONTAINER_NAME" psql -U postgres -d operabeauty -c "DELETE FROM public.cap_refresh_tokens WHERE expires_at < NOW();"

if [ $? -eq 0 ]; then
    echo "[$(date)] Limpeza de tokens expirados concluída com sucesso."
else
    echo "[$(date)] ERRO na execução da query de limpeza."
    exit 1
fi
