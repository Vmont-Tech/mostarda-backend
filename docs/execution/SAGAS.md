# Sagas — Workflows Distribuídos

Uma Saga coordena eventos e Commands entre contextos; não é dona de regras de negócio, não altera Aggregates diretamente e não substitui autorização. Toda Saga tem correlação, timeout, retry idempotente e compensações explícitas.

| Saga | Participantes e ordem | Timeout/retry | Rollback e compensações |
| --- | --- | --- | --- |
| Compra de Campaign | Advertiser → Campaign `Create/Publish` → Pricing `Quote` → Slot `Reserve` → Edge recebe fila. | Reserva expira pela janela; retry por command key. | Falha em preço/reserva mantém Campaign publicável ou pausada; revoga somente Slots futuros. |
| Provisionamento da TV | TV Network `Register/Provision` → Security credencial → Edge `Install` → Capability `Declare/Activate` → health → `ActivateTV`. | Instalação e heartbeat têm TTL; retry limitado por pacote/revisão. | Falha suspende provisionamento, revoga credencial/pacote quando aplicável; não reutiliza identidade. |
| Exibição | Slot alocado → Edge agenda → Player inicia/finaliza → Playback Collector assina/submete. | Fila offline com TTL/backoff; cada tentativa é única. | Interrupção/falha gera fato; não cobra, não cria Evidence válida. |
| Construção de Evidence | PlaybackEvent → Builder correlaciona → Validator decide → Ledger cria EvidenceRecord → Package → Quantum Anchor. | Reenvio/validação/âncora idempotentes por evento/hash; âncora com retry. | Rejeição/disputa preserva registro; reversão é evento compensatório, jamais edição. |
| Liquidação | Scheduler abre ciclo → seleciona Evidence válida/ancorada → calcula shares → autoriza → Asaas paga cada share → reconcilia. | Retry por `SplitShare`/tentativa e webhook deduplicado. | Share bloqueada/unclaimed não bloqueia demais; estorno/chargeback usa linhas compensatórias. |
| Seguro | Claim filed → cobertura/carência → reserva → aprova/nega → repara/substitui → InsuranceSettlement. | SLA de análise e retry de integração financeira. | Reserva é liberada se negar/cancelar; reposição preserva vínculo histórico. |
| Atualização remota | Desired State → reconciliador → janela → pacote assinado → update → health gate → Current/Observed State. | TTL do comando, retry por revisão; ondas limitam impacto. | Falha aciona rollback para versão saudável; suspensão se não recuperar. |
| Emergência | Operador autorizado → ativa broadcast → Canvas/Player preemptam → Edge confirma → expira/clear → restaura composição. | Comando de emergência possui TTL curto e confirmação. | `ClearEmergencyBroadcast` obrigatório; restauração usa última composição compatível. |
| Recuperação Offline | Edge persiste PlaybackEvents/telemetria → reconecta → ordena/reenvia → Cloud deduplica/valida → observa gaps. | Backoff, TTL e limite de fila; retry idempotente por eventId. | Evento fora de validade é rejeitado preservando trilha; nunca fabricado/reordenado. |
