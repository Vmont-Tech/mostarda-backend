# Atomic Projection Store Design

## Autoridade e escopo

Este design materializa exclusivamente `TBS-PRJ-004..008` e a seção 9 da
`CODE_GENERATION_SPECIFICATION_PART_A`. Ele não cria Projection, Read Model,
Event ou schema de domínio. As lacunas específicas registradas no IRR V2
continuam bloqueadas.

## Alternativas avaliadas

1. **Staging genérico com promoção por ponteiro:** um rebuild completo é
   persistido como candidato imutável e uma transação troca a referência
   corrente. Preserva isolamento e atomicidade sem conhecer domínio.
2. **Shadow table por Projection:** oferece consultas tipadas, mas exige schemas
   específicos ainda não certificados.
3. **Troca física de schemas/tabelas:** torna detalhes operacionais observáveis e
   aumenta o acoplamento a migrations e ao banco.

Adota-se a alternativa 1.

## Modelo técnico

`projection_rebuilds` guarda um candidato completo identificado por
`projection_name + projection_version + rebuild_id`. O registro inclui state
JSONB, checkpoint, `as_of`, staleness e status.

`projection_heads` contém exatamente uma referência corrente por
`projection_name`. O método `stage` grava um candidato sem alterar a visão
corrente. O método `promote` abre uma transação, bloqueia o candidato, valida que
está completo e troca o head por upsert. Candidato inexistente, divergente ou já
invalidado falha explicitamente.

Uma falha anterior ao commit preserva o head anterior. Repetir a promoção do
mesmo `rebuild_id` é idempotente. Promover um rebuild anterior depois de outro
mais recente é recusado por checkpoint regressivo.

## Fronteiras

- kernel define o contrato `AtomicProjectionStore`;
- adapter PostgreSQL materializa staging e promoção;
- nenhuma camada conhece `GovernanceCase` ou outro Bounded Context;
- state permanece opaco para o adapter;
- rebuild não lê nem escreve Event Store ou Aggregate;
- parâmetros de retenção e limpeza não pertencem a este slice.

## Erros e observabilidade

Falhas são técnicas e explícitas: candidato ausente, candidato incompatível,
checkpoint regressivo e conflito de identidade. Nenhum fallback silencioso
promove estado parcial.

O resultado de leitura expõe o candidato corrente completo, incluindo version,
checkpoint, `asOf`, staleness e `rebuildId`.

## Provas

- testes de contrato em memória;
- testes estáticos da migration;
- teste PostgreSQL condicionado a `DATABASE_URL`;
- teste de falha antes da promoção;
- teste de retry idempotente;
- teste de regressão de checkpoint;
- testes de fronteira arquitetural.

Sem PostgreSQL vivo, o adapter não será declarado operacionalmente certificado.
