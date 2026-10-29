#!/bin/bash
# Script para validar a paridade da VM local com a VPS de produção
# Execute este script logado na sua VM: bash scripts/validate_parity.sh

echo "🔍 Iniciando validação de paridade VM ↔ VPS..."
echo "================================================="

FAILED=0

check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ FALHA: $1"
        FAILED=1
    fi
}

# 1. Verifica Docker
docker --version > /dev/null 2>&1
check_status "Docker instalado"

# 2. Verifica Docker Compose
docker compose version > /dev/null 2>&1
check_status "Docker Compose (Plugin) instalado"

# 3. Verifica Swap (pelo menos 1GB)
SWAP_TOTAL=$(free -m | awk '/Swap/ {print $2}')
if [ "$SWAP_TOTAL" -ge 1000 ]; then
    echo "✅ Memória Swap configurada (${SWAP_TOTAL}MB)"
else
    echo "❌ FALHA: Memória Swap insuficiente ou inativa (${SWAP_TOTAL}MB)"
    FAILED=1
fi

# 4. Verifica UFW (Firewall)
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ Firewall (UFW) está ativo"
    
    # Verifica portas essenciais
    sudo ufw status | grep -q "22/tcp.*ALLOW"
    check_status "Porta 22 (SSH) liberada"
    sudo ufw status | grep -q "80/tcp.*ALLOW"
    check_status "Porta 80 (HTTP) liberada"
    sudo ufw status | grep -q "443/tcp.*ALLOW"
    check_status "Porta 443 (HTTPS) liberada"
else
    echo "❌ FALHA: Firewall (UFW) inativo"
    FAILED=1
fi

# 5. Verifica status dos Containers (se o docker compose estiver na raiz)
cd "$(dirname "$0")/.."
if [ -f "docker-compose.yml" ]; then
    echo "📦 Verificando containers da aplicação..."
    
    # API
    if docker ps --format '{{.Names}}' | grep -q "operabeauty-api"; then
        echo "✅ Container da API está rodando"
    else
        echo "❌ FALHA: Container da API NÃO está rodando"
        FAILED=1
    fi
    
    # Banco de Dados
    if docker ps --format '{{.Names}}' | grep -q "operabeauty-db"; then
        echo "✅ Container do DB está rodando"
    else
        echo "❌ FALHA: Container do DB NÃO está rodando"
        FAILED=1
    fi
    
    # Caddy (Frontend/Proxy)
    if docker ps --format '{{.Names}}' | grep -q "operabeauty-caddy"; then
        echo "✅ Container Caddy (Proxy) está rodando"
    else
        echo "❌ FALHA: Container Caddy NÃO está rodando"
        FAILED=1
    fi
else
    echo "⚠️ Arquivo docker-compose.yml não encontrado no diretório pai. Pulando checagem de containers."
fi

echo "================================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 SUCESSO: A sua VM local possui paridade com a infraestrutura da VPS!"
else
    echo "⚠️ ATENÇÃO: Foram encontradas divergências na configuração da sua VM."
    echo "Por favor, rode 'sudo bash scripts/setup_vm.sh' para corrigir pendências no sistema operacional."
    exit 1
fi
