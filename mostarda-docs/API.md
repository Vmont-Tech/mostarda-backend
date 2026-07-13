# 📡 MOSTARDA API Reference

**Base:** `http://localhost:8000/api/v1`
**Auth:** `Authorization: Bearer <token>`

## Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login (retorna JWT) |
| POST | `/auth/refresh` | Refresh token |

## Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/me` | Perfil do usuário logado |
| GET | `/users/{id}` | Buscar usuário |

## TVs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tvs/` | Listar todas |
| GET | `/tvs/{id}` | Detalhes |
| GET | `/tvs/identifier/{code}` | Buscar por QR code |

## Slots

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/slots/tv/{tv_id}` | Slots de uma TV |
| GET | `/slots/tv/{tv_id}/available` | Slots disponíveis |

## Campanhas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/campaigns/` | Listar |
| POST | `/campaigns/` | Criar |

## Eleições

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/elections/` | Listar |
| GET | `/elections/tv/{tv_id}` | Eleições de uma TV |
| GET | `/elections/{id}/results` | Resultados |

## Carteira

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/wallet/` | Saldo |
| GET | `/wallet/transactions` | Histórico |

## Pagamentos (PSAV)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/payments/pix` | Criar PIX → BRLX |
| POST | `/payments/webhook` | Webhook PSAV |
| GET | `/payments/balance` | Saldo stablecoin |

## Revenue Split

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/revenue/split` | Configuração |
| POST | `/revenue/simulate` | Simular |
| POST | `/revenue/distribute` | Distribuir |

## Analytics

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/analytics/tv/{id}/audience` | Audiência |
| GET | `/analytics/tv/{id}/proofs` | Proofs of Play |
| GET | `/analytics/summary` | Resumo |

## Health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status |
