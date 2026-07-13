# 📡 MOSTARDA API Reference

**Base:** `http://localhost:8000/api/v1`
**Auth:** `Authorization: Bearer <token>`

---

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

## Revenue Split (5 Atores)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/revenue/split` | Configuração dos splits |
| POST | `/revenue/simulate` | Simular distribuição |
| POST | `/revenue/distribute` | Executar distribuição |
| GET | `/revenue/reconcile` | Verificar reconciliação contábil |

**Split padrão:**
- Dono do Ponto: 25% → Mensal
- Dono da TV: 20% → Mensal
- Vendedor: 20% → Semanal
- Embaixador: 10% → Semanal
- Mostarda (Holding): 25% → Mensal

**Stacking:** Máximo 50% por usuário

## Off-Ramp (Settlement)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/offramp/pending` | Settlement pendentes |
| POST | `/offramp/execute` | Executar lote maduro |
| GET | `/offramp/history` | Histórico de lotes |
| GET | `/offramp/summary` | Resumo semanal/mensal |

**Cadências:**
- Semanal: Vendedores (20%) + Embaixadores (10%)
- Mensal: Donos (45%) + Holding (25%)

## Blockchain

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/blockchain/status` | Status Stellar + Solana |
| GET | `/blockchain/queue` | Tamanho da replay queue |
| POST | `/blockchain/sync` | Forçar re-sync da replay queue |
| GET | `/blockchain/circuit` | Estado do circuit breaker |

## Yield Pool

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/yield/positions` | Posições ativas |
| POST | `/yield/allocate` | Alocar ao pool |
| POST | `/yield/withdraw` | Retirar do pool (requer min hold) |
| POST | `/yield/estimate` | Estimar yield |

## Analytics

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/analytics/tv/{id}/audience` | Audiência |
| GET | `/analytics/tv/{id}/proofs` | Proofs of Play |
| GET | `/analytics/summary` | Resumo geral |

## Health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status geral (inclui blockchain) |

---

## Modelos de Dados

### Proof of Play (com Fallback)

```json
{
  "sequence": 847293,
  "tv_id": "tv_abc123",
  "slot_id": "slot_def456",
  "campaign_id": "camp_789ghi",
  "blockchain": "stellar",
  "fallback": false,
  "replay_pending": 0,
  "tx_hash": "a1b2c3..."
}
```

### Revenue Distribution (Reconciliada)

```json
{
  "valor_bruto_brl": "R$ 1.000,00",
  "total_distribuido_brl": "R$ 1.000,00",
  "centavos_retidos": 0,
  "reconciliado": true,
  "detalhes": [
    {"ator": "Dono do Ponto", "porcentagem": "25%", "valor_brl": "R$ 250,00", "cadencia": "mensal"},
    {"ator": "Dono da TV", "porcentagem": "20%", "valor_brl": "R$ 200,00", "cadencia": "mensal"},
    {"ator": "Vendedor", "porcentagem": "20%", "valor_brl": "R$ 200,00", "cadencia": "semanal"},
    {"ator": "Embaixador", "porcentagem": "10%", "valor_brl": "R$ 100,00", "cadencia": "semanal"},
    {"ator": "Mostarda (Holding)", "porcentagem": "25%", "valor_brl": "R$ 250,00", "cadencia": "mensal"}
  ]
}
```
