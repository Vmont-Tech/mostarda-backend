#!/bin/bash
# Deploy do Supabase na Oracle VPS
set -e

echo "📦 Instalando Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

echo "📁 Criando diretórios..."
mkdir -p supabase/volumes/db/init
mkdir -p supabase/kong

echo "🐳 Subindo containers..."
docker compose up -d

echo "⏳ Aguardando PostgreSQL..."
sleep 5

echo "✅ Verificando..."
docker compose ps

echo "📊 Testando conexão..."
docker exec mostarda-db psql -U postgres -d mostarda -c "SELECT 'OK' as status;"
