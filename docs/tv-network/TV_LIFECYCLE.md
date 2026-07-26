# TV Lifecycle

`TV` possui identidade permanente (`TVIdentifier`) e não é reutilizada, mesmo após remoção física. Ciclo: `REGISTERED → PROVISIONING → INSTALLED → ACTIVE ↔ SUSPENDED → MAINTENANCE → ACTIVE/SUSPENDED → DECOMMISSIONED`.

`DECOMMISSIONED` é final: preserva histórico, credenciais são revogadas e não há reativação. Substituição não muda a TV antiga: registra equipamento substituto, motivo, vínculo histórico e novo ciclo de provisionamento. Suspensão interrompe disponibilidade operacional sem apagar inventário, saúde ou eventos.

Transições exigem comando autorizado, motivo, ator, timestamp, correlação e revisão. Uma TV só fica `ACTIVE` após instalação, Edge identificado, capability declarada e health mínimo aprovado pela política.
