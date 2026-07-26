# Provisioning

Provisioning transforma uma TV registrada em infraestrutura identificada e pronta para operar. Ordem: registrar TV/dispositivos → validar instalação e vínculo com Venue → emitir identidade Edge → registrar versões/manifesto → declarar Capabilities → coletar primeiro Current State/Heartbeat → validar Health → ativar TV.

Falha em qualquer etapa mantém a TV em `PROVISIONING` ou `SUSPENDED`; nunca presume capacidade ou disponibilidade. Repetição é idempotente por TV e revisão de provisionamento. Credenciais, manifestos e decisões de aprovação são auditáveis; reprovisionamento cria nova revisão e não apaga a anterior.
