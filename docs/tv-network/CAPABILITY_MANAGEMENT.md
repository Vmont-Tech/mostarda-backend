# Capability Management

## Modelo

Capability descreve declarativamente o que uma TV consegue oferecer no plano operacional. Ela é contrato observável, não implementação.

Há dois conceitos:

- `CapabilityDefinition`: identidade, versão e contrato operacional reconhecido pela plataforma;
- `TVCapability`: declaração de que uma TV específica suporta determinada definição sob determinadas versões e condições.

Capabilities são independentes de Facets. O Registry não conhece, não enumera e não acopla a implementação interna que produz a capacidade.

`TVCapability` é o Aggregate owner de uma declaração por TV e revisão. Capability Registry mantém definições reconhecidas e consulta as revisões; ele não ativa diretamente uma TV.

## Manifesto conceitual

Uma revisão de manifesto contém `CapabilityId`, versão da definição, TV/Edge owner, requisitos de hardware e software, dependências, modos suportados, limitações, origem da declaração, integridade, instante e versão da política de compatibilidade.

O manifesto nunca contém Campaign, anúncio, preço, Evidence ou consequência comercial.

## Ciclo de vida

```text
DECLARED → VALIDATED → ACTIVE
DECLARED/VALIDATED → REJECTED
ACTIVE → DEGRADED ↔ ACTIVE
ACTIVE/DEGRADED → SUSPENDED → ACTIVE/RETIRED
qualquer não final → RETIRED
```

`REJECTED` encerra aquela revisão; uma correção cria nova revisão. `RETIRED` é final para a revisão.

## Regras

- Ativação exige manifesto íntegro, origem confiável, compatibilidade válida, dependências satisfeitas e Health aplicável.
- Autodeclaração do Edge nunca equivale a ativação.
- Mudança de versão ou manifesto cria nova revisão; não edita a anterior.
- `DEGRADED` e `SUSPENDED` deixam de anunciar disponibilidade da Capability.
- Recuperação exige nova observação e validação; não ocorre por expiração silenciosa.
- Conflito entre Current State e manifesto gera diagnóstico e suspensão conforme política.
- Compatibilidade e Health usam políticas versionadas. Matriz, limiares e critérios quantitativos permanecem `OPEN`.

Eventos: `CapabilityDeclared`, `CapabilityValidated`, `CapabilityRejected`, `CapabilityActivated`, `CapabilityDegraded`, `CapabilitySuspended`, `CapabilityRecovered` e `CapabilityRetired`.

Commands: `DeclareCapability`, `ValidateCapability`, `ActivateCapability`, `DegradeCapability`, `SuspendCapability`, `RecoverCapability` e `RetireCapability`.

## Ordering, duplicidade e confiança

Ordering é por `TV + CapabilityId + revisão`. Uma revisão nunca recebe manifesto diferente depois de declarada. Repetição idêntica é idempotente; mesmo identificador/revisão com manifesto divergente é conflito.

Manifesto atrasado pode completar histórico, mas não substitui revisão ativa. Replay preserva origem e identidade. Manifesto autodeclarado, sem integridade ou vindo de Edge quarentenado não pode avançar além de `DECLARED`.

Clock do Edge é preservado como sinal; vigência oficial usa avaliação temporal do TV Network. Tolerância de drift permanece `OPEN`.

## Exemplos

**Válido:** Edge declara suporte em nova revisão; o Registry mantém `DECLARED` até compatibilidade e Health serem validados.

**Válido:** Capability ativa degrada após perda do Display; deixa de anunciar disponibilidade e só recupera após nova observação.

**Contraexemplo:** inferir Capability pelo nome de uma Facet instalada. Registry não conhece Facets.

**Contraexemplo:** editar o manifesto da revisão ativa para refletir nova versão. Deve ser criada nova revisão.
