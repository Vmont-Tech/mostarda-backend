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

Quando o Creative possui duração inferior aos 15 segundos do Slot, o Player reproduz o arquivo integralmente e congela seu último frame até o limite exato da janela. O áudio termina com o arquivo e não é repetido ou estendido. O Player não inicia o próximo item antes do horário programado e registra separadamente a duração do Creative e a permanência do frame final. Falha antes do final natural torna a tentativa incompleta; falha posterior, restrita ao frame congelado, não altera a conclusão já registrada e gera diagnóstico próprio.

Falha anterior ao final natural encerra definitivamente a entrega naquele Slot. O Player não continua do ponto interrompido e não reinicia o Creative, ainda que reste tempo. Ele registra a falha, ativa o asset institucional local pelo restante da janela e mantém o início do próximo Slot inalterado. O fallback não é anúncio substituto, não cobra, não consome budget e não gera Settlement.

O Player reporta sinais suficientes para separar falha determinística do arquivo de falha do processo, equipamento, saída ou causa desconhecida. Ele não declara culpa. Somente quando o defeito estiver comprovadamente restrito ao Creative os demais anúncios permanecem autorizados; qualquer outra classificação bloqueia novas reproduções pagas localmente até ordem de recuperação válida.

O teste de recuperação usa asset institucional conhecido, íntegro e versionado. O Player deve reproduzi-lo até o final natural e registrar duração, checksums, versão, resultado de renderização e sinais disponíveis da saída. Esse teste não é anúncio, não cobra, não consome budget e não gera Settlement. Sucesso local é evidência para TV Network, não autorização autônoma para voltar ao inventário pago.

PIP, live, border ads, subtitles, QR e NFC overlay só são renderizados quando a composição Canvas e a Capability declarada permitem. NFC overlay é visual e não resolve uma leitura NFC. O Player registra versões e checksums no PlaybackEvent para que Cloud possa provar o software e o criativo efetivamente executados.
