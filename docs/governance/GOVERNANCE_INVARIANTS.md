# Governance Invariants

## 1. Autoridade

1. Somente Governance & Dispute Management publica responsabilidade oficial.
2. ResponsibilityDecisionPublished possui producer único: GovernanceCase.
3. Contextos de origem publicam fatos e nunca julgamento.
4. Consumidores não reinterpretam responsibleParty, category ou decisão.
5. IA nunca executa PublishDecision.

## 2. Evidência e investigação

6. Todo julgamento referencia fatos autoritativos.
7. Governance nunca altera o fato externo.
8. EvidenceReference preserva identidade, schema e digest.
9. Duplicidade lógica não cria segunda referência.
10. Payload divergente sob a mesma identidade bloqueia uso.
11. Gap obrigatório impede publicação.
12. Timeout nunca significa conclusão.
13. Ambiguidade exige revisão humana.

## 3. ResponsibilityDecision

14. Toda decisão possui decisionId e revision.
15. Toda decisão possui exatamente um responsibleParty.
16. Responsabilidade compartilhada é proibida.
17. Toda decisão possui ResponsibilityCategory normativa.
18. Toda decisão possui Severity normativa.
19. Toda decisão possui reason e evidenceReferences.
20. Decisões são append-only.
21. Nova revisão nunca altera decisão anterior.
22. Recurso nunca apaga decisão.
23. Mudança de responsável exige nova ResponsibilityDecisionPublished.
24. `UNKNOWN` é proibido como ResponsibilityCategory.
25. Party ou category indeterminada mantém investigação aberta e impede publicação.

## 4. Confidence

26. Confidence é obrigatório.
27. Confidence pertence ao intervalo fechado `[0.00,1.00]`.
28. Confidence mede robustez segundo qualidade, completude e consistência das evidências disponíveis.
29. Confidence não mede probabilidade estatística de culpa.
30. Confidence não mede risco nem certeza jurídica.
31. ResponsibilityDecisionPublished é oficial independentemente do confidence.
32. Confidence nunca altera efeito operacional, financeiro, contratual ou jurídico.
33. LOW, MEDIUM e HIGH de confidence nunca são persistidos.
34. Categorias visuais são projections de Configuration Policy versionada.
35. Mudança de limiar não reinterpreta decisão histórica.
36. Cada revisão preserva exatamente o confidence publicado.

## 5. Policy

37. Toda ResponsibilityDecision referencia exatamente uma GovernancePolicyVersion.
38. GovernancePolicyVersion publicada é imutável.
39. A referência policyVersion da decisão é imutável.
40. Nova policy exige nova decisão e nova revision.
41. Replay utiliza a policy histórica referenciada.

## 6. Lifecycle

42. Transições pertencem exclusivamente ao GovernanceCase.
43. DECIDED exige ResponsibilityDecisionPublished.
44. Appeal referencia decisão e revisão existentes.
45. Reavaliação não edita revisão contestada.
46. CLOSED é final.
47. Novo fato após CLOSED abre caso correlacionado.
48. UNKNOWN não existe no lifecycle de Governance.

## 7. Distribuição

49. Commands usam idempotency key.
50. Mesma chave e payload retornam o mesmo resultado.
51. Mesma chave e payload divergente retornam conflito.
52. Concorrência usa expected aggregate revision.
53. Events ordenam por GovernanceCaseId e aggregateRevision.
54. Consumidores deduplicam por Event ID e decisionId + revision.
55. Replay não publica nova decisão.
56. Rebuild não executa efeitos externos.
57. Falha de broker usa outbox e preserva Event ID.
58. Resultado desconhecido é reconciliado pelo executor.

## 8. Consequências

59. Consequência material referencia decisionId e revision.
60. Financial executa, mas nunca julga.
61. Settlement governa direitos, mas nunca julga culpa.
62. Campaign reage por Command próprio e respeita seu lifecycle.
63. Mudança de decisão causa compensação append-only.
64. Nenhum consumidor edita efeito histórico.

## 9. Eventos proibidos

65. ResponsibilityAssigned é proibido.
66. ResponsibilityReassigned é proibido.
67. Nenhum alias pode restaurar a semântica desses eventos.
68. GovernanceCaseReevaluationStarted representa exclusivamente o início.
69. GovernanceCaseReevaluated representa exclusivamente a conclusão.
70. Em uma reavaliação, ResponsibilityDecisionPublished precede GovernanceCaseReevaluated.

## 10. Contraexemplos

São violações:

- cobrar automaticamente porque confidence excede limiar;
- ignorar decisão por confidence baixo;
- alterar policyVersion no banco;
- publicar decisão com party ou category indeterminadas;
- Financial escolher quem absorve chargeback;
- Evidence declarar parceiro culpado;
- replay repetir refund;
- fechar caso por timeout;
- publicar duas decisões com a mesma revision.
