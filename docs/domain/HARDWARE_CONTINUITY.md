# Plano Mostarda de Continuidade Operacional

Status: `ACCEPTED`

## 1. Propósito e fronteira

Hardware Continuity mantém disponibilidade de TVs do modelo completo por serviço recorrente de manutenção, logística, equipamento temporário, reparo e substituição equivalente. Não é seguro, proteção mutualista, indenização ou garantia de aparelho novo.

TV Network continua owner de identidade, instalação, health e disponibilidade. Financial registra cobrança e gasto. Quantum ancora pacotes. Governance julga responsabilidade. Hardware Continuity decide elegibilidade do serviço e seu lifecycle.

## 2. Aggregates

| Aggregate | Responsabilidade |
| --- | --- |
| `ContinuitySubscription` | adesão por TV, vigência, cobrança, limites e estado |
| `MaintenanceCase` | diagnóstico, orçamento, reparo e aceite |
| `TemporaryReplacement` | empréstimo de TV Mostarda durante reparo |
| `PermanentExchange` | troca bilateral após perda total |
| `ContinuityBenefitAccount` | consumo anual de limites e coparticipação |
| `CircularInventory` | peças, TVs doadoras, equivalentes e descarte rastreável |
| `AssetProvenance` | declaração, custódia, ownership e histórico append-only |

## 3. Subscription

```text
PENDING → ACTIVE ↔ SUSPENDED → CANCELLED
ACTIVE/SUSPENDED → EXPIRED
```

Ativação exige modelo completo, TV ativa ou em onboarding elegível, preço/política aceitos e pagamento conforme policy. Freemium é inelegível.

Preço piloto: R$24,90 por TV/mês. Parâmetros e revisão pertencem a `ServicePlanPriceVersion`.

## 4. Atendimento

Ordem normativa:

1. diagnóstico;
2. reparo com peça compatível;
3. peça recondicionada rastreável;
4. TV temporária durante indisponibilidade;
5. substituição definitiva equivalente;
6. coparticipação somente quando limites forem excedidos.

Limites de custo, ocorrências, carência, permanência, prazo e coparticipação são policy versionada. O parceiro vê consumo e custo antes de autorizar gasto excedente.

## 5. TV temporária

Toda TV temporária pertence à Mostarda e é emprestada. Possui serial, estado, instalação, custodiante e prazo. Nunca usa ativo de outro parceiro.

Devolução encerra o vínculo; atraso, dano ou desaparecimento abre incidente, nunca débito automático sem decisão autorizada.

## 6. Perda total e equivalência

Substituta definitiva pode ser recondicionada e não precisa ter mesma marca/modelo. Deve preservar tamanho compatível, resolução, brilho, orientação, conectividade, segurança, estado visual aceitável e capabilities mínimas.

`PermanentExchange` coordena:

```text
PROPOSED → SIGNING → DELIVERY_PENDING → INSPECTION
→ COMPLETED
PROPOSED/SIGNING/DELIVERY_PENDING/INSPECTION → CANCELLED/DISPUTED
```

Conclusão atualiza conjuntamente os históricos:

- TV original: parceiro → Mostarda;
- TV equivalente: Mostarda → parceiro.

## 7. Proveniência

Registro inicial produz `OWNERSHIP_DECLARED`, nunca garantia material absoluta.

Pacote:

- identidades e poderes;
- declaração de propriedade/origem;
- ausência de ônus conhecido;
- serial, fotos, vídeo e laudo;
- defeitos conhecidos;
- entrega/aceite;
- assinaturas;
- logs, timestamp, hash e anchor.

Quantum prova integridade e anterioridade do pacote; documento completo permanece no owner documental. Nota fiscal é anexada quando existir. Ausência exige declaração reforçada, sem dispensar obrigação fiscal aplicável.

## 8. CircularInventory

TV transferida à Mostarda pode ser reparada, desmontada ou descartada. Cada peça registra origem, diagnóstico, teste, compatibilidade, técnico, instalação de destino e descarte.

Peça reutilizada nunca é apresentada como nova. Falha de rastreabilidade torna-a inelegível.

## 9. Responsabilidade

| Ocorrência | Regra |
| --- | --- |
| desgaste/defeito natural do mini PC | Mostarda substitui por equivalente |
| violação, remoção de peça, mau uso | incidente e julgamento |
| defeito preexistente declarado | tratado conforme policy |
| defeito preexistente omitido | suspensão de benefício e investigação |
| causa ambígua | GovernanceCase |

Hardware Continuity publica fatos; nunca declara culpa.

## 10. Commands

| Command | Owner | Resultado |
| --- | --- | --- |
| `ActivateContinuitySubscription` | ContinuitySubscription | ativa ou rejeita com policy/version |
| `OpenMaintenanceCase` | MaintenanceCase | registra diagnóstico pendente |
| `AuthorizeRepair` | MaintenanceCase | compromete benefício/coparticipação |
| `AssignTemporaryReplacement` | TemporaryReplacement | vincula ativo Mostarda |
| `CompleteTemporaryReturn` | TemporaryReplacement | encerra custódia |
| `ProposePermanentExchange` | PermanentExchange | congela ativos e termos |
| `AcceptPermanentExchange` | PermanentExchange | registra assinatura/aceite |
| `CompletePermanentExchange` | PermanentExchange | conclui somente com gates satisfeitos |
| `RegisterDonorPart` | CircularInventory | registra origem e teste |

Todos exigem expected revision, autorização, idempotency key e auditoria.

## 11. Events

`ContinuitySubscriptionActivated`, `MaintenanceCaseOpened`, `RepairAuthorized`,
`TemporaryReplacementAssigned`, `TemporaryReplacementReturned`,
`PermanentExchangeProposed`, `PermanentExchangeAccepted`,
`PermanentExchangeCompleted`, `AssetOwnershipDeclared`,
`AssetOwnershipTransferred`, `DonorPartRegistered`, `AssetRetired`.

## 12. Falhas e concorrência

- duas trocas não podem comprometer o mesmo ativo;
- assinatura duplicada retorna o primeiro resultado;
- divergência de serial suspende operação;
- falha Quantum não desfaz troca já consumada; anchor permanece pendente;
- falha antes dos gates deixa troca incompleta e compensável;
- histórico nunca é corrigido destrutivamente.

## 13. Receita e custos

Mensalidade é receita de serviço e não CampaignBudget, split ou patrimônio restrito. A Mostarda pode alocar internamente a manutenção, frota, peças, logística, mini PCs e suporte, preservando obrigações contábeis e contratuais.

## 14. Proibições

- chamar o plano de seguro, apólice ou indenização;
- prometer TV nova;
- usar TV de outro parceiro como temporária;
- transferir ativo somente por edição de banco;
- afirmar que blockchain garante verdade material;
- declarar fraude sem investigação;
- apagar histórico de ownership ou reparo.
