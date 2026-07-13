# Mostarda — Production Checklist

## Pré-requisitos
- [ ] Oracle Cloud VPS criada
- [ ] Docker + Docker Compose instalados
- [ ] Domínio configurado (api.mostarda.app)
- [ ] SSL via Certbot

## Segurança
- [ ] Firewall: portas 22, 80, 443 abertas (5432 fechada)
- [ ] Fail2Ban instalado
- [ ] PostgREST JWT secret forte
- [ ] PG senha forte (não "postgres")
- [ ] Backups automáticos configurados

## Blockchain
- [ ] QuantumCert API key (produção)
- [ ] Stellar account + trustline
- [ ] Solana account

## Monitoramento
- [ ] Healthcheck a cada 5 min
- [ ] Backup diário do PostgreSQL
- [ ] Logs centralizados

## Performance
- [ ] PgBouncer para pool de conexões
- [ ] Índices verificados (EXPLAIN ANALYZE)
- [ ] VACUUM configurado
