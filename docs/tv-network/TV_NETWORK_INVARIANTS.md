# TV Network Invariants

1. TV Network nunca conhece Campaign, anúncio, preço, Financial, Evidence ou Settlement.
2. A identidade de TV e Device é permanente e nunca reutilizada.
3. Inventory, Fleet e Health agregado são leituras; não modificam Aggregates proprietários diretamente.
4. Reconciler compara Desired, Current e Observed State, mas somente emite Commands válidos.
5. Toda observação de Health, Heartbeat, diagnóstico, instalação e atualização é append-only; Health nunca é sobrescrito.
6. Atualização exige política, assinatura, compatibilidade, maintenance window e health gate; nunca é forçada sem política.
7. Rollback nunca apaga histórico, versões ou falhas; cria fato operacional novo.
8. Capability é declarativa, versionada e independente de Facets; capability degradada não anuncia disponibilidade.
9. Toda operação remota é autorizada, assinada, idempotente, temporalmente limitada e auditável.
10. Fleet action nunca altera diretamente membro algum; produz Commands individuais para os owners.
11. Ausência de heartbeat gera lacuna/diagnóstico, não conclusão automática de estado saudável.
12. Versionamento de Edge, Player, Canvas, Capability Manifest, OS e Firmware acompanha todo Current/Observed State e toda atualização.
