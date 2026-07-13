# 🚀 Deploy Guide

## Docker (Local)

```bash
cd mostarda-backend
cp .env.example .env
# Edit .env com credenciais reais
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

## Oracle Cloud (Produção)

```bash
# Provisionar VM.Standard.E2.1.Micro (Always Free)
ssh ubuntu@<IP>
sudo apt update && sudo apt install -y docker.io docker-compose
git clone https://github.com/Vmont-Tech/mostarda-backend.git
cd mostarda-backend
cp .env.example .env
# Editar .env
docker compose up -d
```

## Variáveis Essenciais

| Variável | Descrição |
|----------|-----------|
| `SECRET_KEY` | JWT (min 32 chars) |
| `DATABASE_URL` | PostgreSQL |
| `PSAV_API_KEY` | Depix/MB/Liqi |
| `STELLAR_DISTRIBUTION_SEED` | Conta Stellar |
