#!/bin/bash
# ⚠️ DESTRUTIVO: Apaga todos os dados e recria
echo "⚠️  Isso vai apagar TODOS os dados!"
read -p "Continuar? (y/N): " confirm

if [ "$confirm" != "y" ]; then
    echo "Abortado."
    exit 1
fi

docker compose down -v
docker compose up -d
echo "✅ Banco resetado!"
