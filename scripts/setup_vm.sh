#!/bin/bash
# Script de configuração automatizada da VM de testes (Ubuntu Server)
# Execute este script logado na sua VM: sudo bash scripts/setup_vm.sh

set -e

echo "🚀 Iniciando setup automatizado da VM de Homologação..."

# 1. Atualização do Sistema
echo "📦 Atualizando pacotes do sistema..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Instalação do Docker e Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo "✅ Docker já está instalado."
fi

# 3. Docker no boot e usuário no grupo
echo "⚙️ Configurando Docker no boot..."
sudo systemctl enable docker
sudo systemctl enable containerd
if [ -n "$SUDO_USER" ]; then
    sudo usermod -aG docker "$SUDO_USER"
else
    sudo usermod -aG docker "$USER"
fi

# 4. Configuração de Swap (2GB)
if [ ! -f /swapfile ]; then
    echo "💾 Criando Swap de 2GB..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
else
    echo "✅ Arquivo de Swap já existe."
fi

# 5. Configuração do Firewall (UFW)
echo "🛡️ Configurando UFW Firewall..."
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Setup concluído com sucesso!"
echo "⚠️ IMPORTANTE: Faça logoff e login novamente na VM para aplicar as permissões do grupo docker."
