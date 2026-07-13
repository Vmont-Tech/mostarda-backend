# MOSTARDA — API Reference

## Endpoints (PostgREST em http://localhost:3001)

### Pricing Engine
| RPC | Método | Descrição |
|-----|--------|-----------|
| `calculate_dynamic_price` | POST | Calcula preço multi-fator |
| `recalculate_tv_prices` | POST | Recalcula preços de uma TV |
| `get_tv_pricing` | POST | Preços de uma TV por data |

### Campaigns
| RPC | Método | Descrição |
|-----|--------|-----------|
| `create_campaign` | POST | Cria campanha (mín R$20) |
| `activate_campaign` | POST | Ativa campanha |
| `book_slot` | POST | Reserva um slot |
| `update_campaign_status` | POST | Pausa/retoma/cancela |
| `get_advertiser_campaigns` | POST | Lista campanhas |

### Elections
| RPC | Método | Descrição |
|-----|--------|-----------|
| `create_election` | POST | Cria eleição (6 meses) |
| `nominate_candidate` | POST | Indica candidato |
| `cast_vote` | POST | Vota (peso por role) |
| `close_election` | POST | Encerra eleição |

### Wallet & Revenue
| RPC | Método | Descrição |
|-----|--------|-----------|
| `initialize_wallet` | POST | Cria carteira |
| `deposit_to_wallet` | POST | Depósito |
| `distribute_slot_revenue` | POST | Split 25/25/20/20/10 |
| `get_wallet_balance` | POST | Saldo |
| `get_platform_revenue` | POST | Receita total |

### Device Monitor
| RPC | Método | Descrição |
|-----|--------|-----------|
| `register_heartbeat` | POST | Heartbeat (start/mid/end) |
| `report_anomaly` | POST | Reporta anomalia |
| `get_tv_health_status` | POST | Status da TV |

### Blockchain
| RPC | Método | Descrição |
|-----|--------|-----------|
| `store_proof_of_play` | POST | Registra proof-of-play |

### Notifications
| RPC | Método | Descrição |
|-----|--------|-----------|
| `send_notification` | POST | Envia push |
| `get_notifications` | POST | Lista notificações |
| `get_unread_count` | POST | Contagem não-lidas |

### HTTP (tabelas diretas)
| GET | Descrição |
|-----|-----------|
| `/users` | Lista usuários |
| `/tvs` | Lista TVs |
| `/tv_slots` | Lista slots |
| `/campaigns` | Lista campanhas |
| `/revenue_splits` | Lista splits |
| `/elections` | Lista eleições |
