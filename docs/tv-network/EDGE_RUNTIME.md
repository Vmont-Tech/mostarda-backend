# Edge Runtime

Edge Runtime é o ambiente operacional identificado do MiniPC. Ele executa processos autorizados, reporta estado e aplica comandos operacionais assinados; não contém regras de negócio ou conhecimento de Campaign, Financeiro, Evidence, Settlement, preço ou anúncios.

O runtime declara e preserva versões de Edge, Player, Canvas, Capability Manifest, OS e Firmware. `EdgeInstallation` possui estados `UNINSTALLED → INSTALLING → HEALTHY`; pode ficar `DEGRADED`, `UPDATING`, `ROLLING_BACK` ou `FAILED`. Health gate e política determinam transição; rollback cria nova observação e nunca remove versões anteriores.

O Supervisor controla processos críticos, Watchdog detecta ausência de progresso e Restart Policy limita tentativas, registra causa e escala diagnóstico. Sincronização é idempotente, ordenada por revisão operacional e resiliente a conectividade intermitente.
