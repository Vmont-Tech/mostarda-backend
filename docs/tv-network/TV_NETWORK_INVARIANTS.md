# TV Network Invariants

Estas regras são constitucionais. Política, operador, automação, retry, modo offline ou emergência não podem contorná-las.

## Fronteira

1. TV Network nunca conhece Campaign, Slot comercial, anúncio, criativo, preço, orçamento, Financial Platform, Evidence ou Settlement.
2. Sua responsabilidade termina na disponibilidade operacional verificável; elegibilidade e consequência comercial pertencem aos contextos consumidores.
3. TV Network conhece Player e Canvas somente como processo, versão e dependência operacional.
4. Nenhum evento de TV Network ordena mudança em outro contexto; ele publica fato operacional.

## Ownership e estado

5. Todo Command possui exatamente um Aggregate owner e revisão esperada.
6. Aggregate só muda após Command próprio válido; projeção nunca se torna atalho de escrita.
7. Fleet action e Reconciler não alteram membros/Aggregates diretamente; emitem Commands individuais.
8. `NetworkInventory`, `ObservedState`, `OperationalHealth` e `FleetHealth` são projeções reconstruíveis.
9. Nenhuma transição salta Installation, Provisioning ou gate obrigatório.
10. Estado final não reabre; recuperação usa transição prevista, nova tentativa ou nova identidade.

## Identidade e confiança

11. `TVIdentifier`, `DeviceIdentifier` e `EdgeInstallationId` são distintos, permanentes e nunca reutilizados.
12. Substituição fecha vínculo anterior e cria outro; não sobrescreve Device, serial, versão ou período.
13. Credencial revogada não volta a ser válida.
14. Conflito de identidade, spoofing ou replay divergente nunca é resolvido por “última mensagem vence”.
15. Quarentena retira confiança/disponibilidade, preserva histórico e só termina por Command autorizado apoiado em nova observação.

## História, tempo e idempotência

16. Heartbeat, Health, diagnóstico, Installation, Current State, operação, update e rollback são append-only.
17. Health nunca é sobrescrito; nova avaliação cria novo HealthRecord.
18. Rollback nunca apaga atualização ou versão falha.
19. Duplicata com mesma identidade e conteúdo não cria segundo efeito.
20. Mesma identidade com conteúdo divergente é conflito de integridade.
21. Evento atrasado pode completar histórico, mas não regride projeção corrente silenciosamente.
22. Replay preserva identidade e timestamp originais; reenviar fato antigo como novo é proibido.
23. Clock drift é preservado e avaliado; timestamp local nunca é corrigido silenciosamente nem usado sozinho para liveness.

## Heartbeat, Health e reconciliação

24. Heartbeat prova declaração autenticada, não Health, Playback ou disponibilidade.
25. Ausência de Heartbeat gera `UNKNOWN`, lacuna ou diagnóstico conforme policy; nunca `HEALTHY`.
26. `DesiredState` é intenção do Cloud, `CurrentState` é declaração do Edge e `ObservedState` é inferência independente.
27. Reconciler compara revisões compatíveis e apenas emite Commands; nunca escreve Current/Observed State.
28. Divergência ou cobertura insuficiente permanece explícita; não existe convergência por suposição.
29. HealthScore e FleetHealth são explicáveis, versionados e preservam cobertura/confiança.
30. Média agregada nunca mascara dimensão crítica nem exclui `UNKNOWN` silenciosamente.

## Capability

31. Capability é declarativa, versionada e independente de Facets.
32. Autodeclaração do Edge não equivale a validação ou ativação.
33. Capability `DEGRADED`, `SUSPENDED`, `REJECTED` ou `RETIRED` não anuncia disponibilidade.
34. Mudança de manifesto cria nova revisão; não edita a anterior.

## Operação remota, update e rollback

35. Toda operação remota é autorizada, idempotente, direcionada, temporalmente limitada, correlacionada e auditável.
36. Command expirado nunca é executado após reconexão.
37. ACK não equivale a conclusão; sucesso exige resultado observado.
38. Update exige origem íntegra, compatibilidade, policy, Maintenance Window, Health gate e rollback elegível.
39. Nenhuma onda avança com gate `UNKNOWN` ou cobertura insuficiente.
40. Membership de onda é snapshot imutável.
41. Rollback automático exige autorização prévia em policy; automático não significa sem regra.
42. Sem baseline aprovado e compatível, rollback é proibido e o equipamento permanece seguro/indisponível.
43. Operação de emergência só preempta outra quando política explícita autoriza; nunca elimina auditoria.

## Versionamento

44. Edge, Player, Canvas, Capability Manifest, OS e Firmware acompanham Current State, Observed State, Inventory, update e rollback.
45. Combinação de versões deve ser avaliada por política de compatibilidade versionada.
46. Valor quantitativo sem decisão aprovada permanece `OPEN`; implementação não pode inventá-lo.

## Exemplos

**Válido:** o Reconciler encontra divergência de versão e emite `ApplyUpdate`; ele aguarda Current/Observed State antes de concluir convergência.

**Válido:** Heartbeat atrasado completa a timeline, mas não recupera liveness da sessão atual.

## Contraexemplos proibidos

- Ativar TV após um único Heartbeat.
- Marcar Current State igual ao Desired sem declaração do Edge.
- Remover TV `UNKNOWN` da FleetHealth para melhorar score.
- Reemitir evento antigo com novo identificador para implementar retry.
- Atualizar fora da janela porque a Fleet é pequena.
- Restaurar “a versão anterior” sem validar compatibilidade.
- Inserir Campaign ou preço em Desired State.
