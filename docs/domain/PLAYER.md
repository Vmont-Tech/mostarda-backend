# Player Engine

Player é o domínio de execução multimídia no Edge. Recebe uma composição declarativa autorizada, produz frames e emite fatos de playback; não decide Campaign, preço, Evidence ou dinheiro. Seu supervisor faz parte do Edge Runtime, enquanto a composição visual pertence ao Canvas.

## Responsabilidades

| Área | Contrato |
| --- | --- |
| Timeline e frames | Executa item, relógio monotônico, duração e `PlaybackChecksum`. |
| Media | Decode de vídeo, imagem, áudio e live de formatos homologados. |
| Camadas | Entrega superfícies ao Canvas para vídeo, PIP, border ads, legendas, QR, NFC overlay e widgets. |
| Transições | Executa transições e animações aprovadas sem quebrar safe area ou duração contratada. |
| Emergência | `EmergencyBroadcast` preempta a composição normal por prioridade, com motivo e intervalo auditáveis. |
| Recuperação | Reporta erro, frame drop, buffer e estado; Player Supervisor reinicia ou faz rollback sem inventar prova. |

`PlayerSession` é o Aggregate de execução local: identidade, versão, estado (`IDLE`, `PREPARING`, `PLAYING`, `DEGRADED`, `FAILED`), referência de composição e resumo de saúde. Ele referencia Layers/Canvas, mas não possui suas políticas. Eventos: `PlaybackStarted`, `PlaybackFinished`, `PlaybackInterrupted`, `PlaybackFailed`, `FrameDropDetected`, `EmergencyBroadcastStarted` e `EmergencyBroadcastEnded`.

PIP, live, border ads, subtitles, QR e NFC overlay só são renderizados quando a composição Canvas e a Capability declarada permitem. NFC overlay é visual e não resolve uma leitura NFC. O Player registra versões e checksums no PlaybackEvent para que Cloud possa provar o software e o criativo efetivamente executados.
