# Update Management

Update Management administra versões de Edge, Player, Canvas, Capability Manifest, OS e Firmware como artefatos operacionais versionados. Atualização exige compatibilidade, assinatura, política, maintenance window, health gate e estratégia de rollback; nunca é forçada fora da política.

`UpdateRollout` progride `DRAFT → SCHEDULED → WAVE_RUNNING → PAUSED/COMPLETED/CANCELLED`. Cada onda seleciona grupo de frota explícito, aplica limite de impacto, observa Fleet Health e decide avançar, pausar ou reverter conforme política. Falha individual não edita estado prévio: registra resultado e aciona Recovery/Rollback quando elegível.
