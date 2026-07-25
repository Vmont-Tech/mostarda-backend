# TV e Edge — Modelo Operacional

A `TV` é o agregado físico raiz da rede. Ela referencia, sem absorver seus domínios, `MiniPC`, `Display`, `Player`, Edge, Capabilities, Facets, Assets, Evidence, Health, Telemetry, NFC, QR, Remote Control e Heartbeat.

```text
TV → MiniPC → Display → Player → Edge Runtime
                              ├─ Capabilities → Facets → Assets
                              ├─ Evidence / Telemetry / Health / Heartbeat
                              ├─ NFC (tag) e QR (renderização de referência Cloud)
                              └─ Remote Control e manutenção
```

`TV Network` é dono da identidade, vínculo com Venue, proprietários e elegibilidade. `Edge Runtime` é dono da execução local. `Telemetry` custodia sinais operacionais. `Evidence Ledger` materializa a prova. QR é criado, resolvido, versionado e revogado no Cloud/Quantum; o Edge apenas renderiza a referência recebida. NFC resolve no fluxo público Quantum, nunca no Edge.

## Estado desejado e estado atual

Cloud publica um `DesiredState` versionado por TV: energia, playlist, volume, versões esperadas de Player/Edge/Facet/modelo e configurações permitidas. Edge reporta `CurrentState`: valores observados, playlist efetiva, versões instaladas, atualização em curso, saúde e motivo de divergência. Um reconciliador compara ambos e emite comandos assinados, idempotentes e auditáveis até convergir; Edge confirma o resultado pelo estado atual. Nenhuma reconciliação pode sobrescrever uma manutenção ativa, comando de segurança ou política de rollback.

## Runtime obrigatório do Edge

| Capacidade | Responsabilidade |
| --- | --- |
| Player Supervisor | Inicia, supervisiona e reinicia o player; impede loop de crash e preserva diagnóstico. |
| HDMI Detection | Detecta conexão, resolução, perda de sinal e troca de display. |
| TV Power Scheduler / Wake on LAN | Agenda energia dentro das janelas autorizadas; confirma retorno por heartbeat/HDMI. |
| Watchdog e Health Check | Detecta travamento e avalia saúde antes/depois de update. |
| Heartbeat | Publica liveness, versão, fila, conectividade e saúde; Cloud deriva indisponibilidade. |
| Offline Queue / Retry Queue | Persiste comandos, telemetria e Playback Events com ordem, TTL, idempotência e backoff. |
| Evidence Collector | Assina Playback Event e conserva material para reenvio; nunca decide `VALID`. |
| Telemetry Collector | Coleta CPU, GPU, memória, disco, conectividade, display e recursos, preservando anonimização. |
| Auto Recovery / Crash Recovery / Auto Heal | Recupera processo, conectividade e configuração conhecida; escalona quando o limite é atingido. |
| Remote Update / Maintenance | Instala pacote assinado, aplica maintenance window, health gate e rollback. |
| Resource Monitor | Monitora CPU, GPU, memória, disco e rede com limiares e alertas. |
| Local AI | Executa somente modelo homologado, manifesto assinado, inferência limitada, cache, política offline, `ModelVersion`, `PromptVersion`, `AgentVersion`, `PolicyVersion`, versionamento e rollback. |

O Edge é leve: não calcula preço, split, seguro, cobertura, elegibilidade comercial, liquidação ou resolução pública de QR/NFC. Comandos remotos são assinados, autorizados, idempotentes e auditáveis. Uma operação local degradada nunca produz prova financeira por inferência.
