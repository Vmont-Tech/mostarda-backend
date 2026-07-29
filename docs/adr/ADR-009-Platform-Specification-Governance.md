# ADR-009 — Especificação Oficial e Governança

- **Status:** Aceito
- **Data:** 2026-07-26

## Decisão

A Mostarda adota `docs/specification/PLATFORM_SPECIFICATION.md` como fonte normativa primária após sua aprovação. Documentos de produto, domínio, execução, Financial Platform e TV Network passam a ser derivados/detalhados e vinculados por rastreabilidade.

Esta decisão supersede especificamente a cláusula do ADR-001 que tratava `docs/domain/` como fonte única. `docs/domain/` permanece fonte detalhada do domínio, subordinada à especificação aceita.

Mudanças de decisão devem ocorrer primeiro na especificação, registrar ADR/supersessão quando aplicável, atualizar o Decision Registry e sincronizar documentos derivados antes de qualquer alteração de implementação. Lacunas são marcadas `OPEN`, nunca preenchidas por suposição.

## Consequências

- Contradições tornam-se visíveis e governáveis.
- Regras ganham identificadores estáveis para documentação e implementação futura.
- A especificação permanece `DRAFT` até revisão formal do fundador; enquanto isso, decisões aprovadas existentes continuam vigentes.
