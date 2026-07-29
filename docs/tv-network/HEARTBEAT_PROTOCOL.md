# Heartbeat Protocol

Heartbeat é fato operacional periódico do Edge, autenticado pela identidade do dispositivo. Seu payload conceitual contém TV/Edge, instante, sequência, conectividade, versões, resumo de health, estado de processo, revisão de Desired State aplicada e Current State declarado.

O Cloud registra `HeartbeatReceived` e deriva liveness/Observed State conforme política. Heartbeat atrasado, ausente ou fora de ordem não reescreve o último fato; cria `HeartbeatMissed`, gap ou diagnóstico. Retry é idempotente por `edgeId + sequence`; reconexão preserva ordem quando possível e declara lacunas quando não for.

Heartbeat não carrega Campaign, anúncio, preço, saldo, Evidence ou Settlement.
