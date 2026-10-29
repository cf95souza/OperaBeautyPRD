#!/bin/bash
# Script de deploy automatizado para a VM de testes local
# Execute este script logado na sua VM: bash scripts/deploy_vm.sh

set -e

echo "🚀 Iniciando Deploy na VM de Homologação..."

cd "$(dirname "$0")/.."

# Verifica se o arquivo .env existe, se não, tenta usar o .env.vm
if [ ! -f .env ]; then
    if [ -f .env.vm ]; then
        echo "📝 Arquivo .env não encontrado. Copiando .env.vm para .env..."
        cp .env.vm .env
    else
        echo "❌ ERRO: Arquivo .env.vm ou .env não encontrado na raiz do projeto!"
        exit 1
    fi
fi

echo "🛑 Parando containers atuais..."
docker compose down

echo "🏗️ Construindo e subindo novos containers..."
docker compose up -d --build

echo "⏳ Aguardando serviços inicializarem..."
sleep 10

echo "✅ Status atual dos containers:"
docker compose ps

echo "📋 Exibindo os últimos logs da API:"
docker compose logs --tail=20 api
