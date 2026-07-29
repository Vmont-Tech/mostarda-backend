# Evidence Pipeline — Fatos, Prova e Ancoragem

O termo **Evidence** é reservado ao fato de prova materializado no Cloud. O Edge não cria, valida nem conhece Evidence: produz fatos de playback assinados. Os quatro objetos são distintos.

| Objeto | Dono | Responsabilidade |
| --- | --- | --- |
| `PlaybackEvent` | Edge | Fato atômico de execução: Slot, tempo, checksums, métricas e versões. |
| `PlaybackSignature` | Edge / Security | Assinatura criptográfica do payload canônico do evento pela chave do dispositivo. |
| `EvidenceRecord` | Cloud / Evidence Ledger | Prova append-only construída, validada e versionada a partir do evento e dos fatos Cloud. |
| `CanonicalEvidencePackage` | Cloud / Evidence Ledger | Representação canônica, independente de transporte, preparada para hash e ancoragem. |
| `QuantumAnchor` | Quantum | Recibo externo da ancoragem do hash do pacote. |

## Fluxo canônico

```text
Playback Event → Playback Signature → Cloud
→ Evidence Builder → Evidence Validator → Evidence Ledger (EvidenceRecord)
→ CanonicalEvidencePackage → hash → Quantum Anchor
```

O `Playback Collector` no Edge coleta `PlaybackEvent`, `PlaybackChecksum`, `CreativeChecksum`, métricas e versões de Player/Edge/OS/modelo. Ele assina, persiste na fila offline e reenvia de modo idempotente; não monta Evidence, não define `VALID` e não calcula dinheiro.

No Cloud, `Evidence Builder` correlaciona o evento com Slot, `PricingQuote`, política e contexto. `Evidence Validator` verifica assinatura, janela temporal, duração, checksums, identidade, unicidade, versões e coerência com os fatos Cloud. Só então cria o `EvidenceRecord` no Evidence Ledger. O pacote canônico contém a representação congelada do registro e das referências auditáveis; seu formato não é contrato do Quantum. Uma correção gera evento compensatório, nunca mutação.

Settlement só consome `EvidenceRecord` `VALID`, não revertido e com `QuantumAnchor` confirmado. Falha de coleta é um fato operacional; falha de validação é um estado da prova; falha de ancoragem bloqueia somente as parcelas financeiras afetadas.
