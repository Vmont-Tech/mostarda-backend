# 🟡 Mostarda — Backend (Supabase Self-Hosted)

**Plataforma descentralizada de mídia DOOH** com blockchain fallback e eleição de influenciadores.

## Stack
- PostgreSQL 15 + PostgREST (REST API automática)
- Docker Compose

## Início Rápido
```powershell
cd D:\Users\vinicius\mostarda
docker compose up -d
docker exec mostarda-db psql -U postgres -d mostarda -c "SELECT 'OK' as status"
```

## Revenue Split (5 atores individuais)
| Ator | % |
|------|---|
| Mostarda (Platform) | 25% |
| Space Owner | 25% |
| TV Owner | 20% |
| Affiliate Seller | 20% |
| Influencer | 10% |
| **Total** | **100%** |

## Estrutura
```
mostarda/
├── docker-compose.yml
└── supabase/volumes/db/init/
    ├── 00-schema.sql    (21 tabelas, enums, RLS)
    ├── 01-functions.sql  (35+ funções RPC)
    └── 02-seed.sql       (dados de teste)
```

## APIs (PostgREST em http://localhost:3001)
- `GET /tvs` - Listar TVs
- `POST /rpc/calculate_dynamic_price` - Preço dinâmico
- `POST /rpc/get_device_config` - Config da TV
- `POST /rpc/distribute_slot_revenue` - Distribuir receita
- `POST /rpc/get_tv_health_status` - Saúde da TV
- `GET /rpc/revenue_split` - Split de receita
