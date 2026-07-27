# AI Architecture

## Moderação de Creative

O serviço de IA produz somente:

- `AUTO_APPROVED`;
- `AUTO_REJECTED`;
- `HUMAN_REVIEW_REQUIRED`.

Incerteza, conflito, baixa confiança ou dados insuficientes produzem obrigatoriamente revisão humana. Limiar e modelo pertencem a policy versionada do serviço; Campaign preserva versões, score, explicação e decisão. Timeout nunca aprova conteúdo.

Moderador humano pode aprovar, rejeitar, solicitar alteração e classificar caso especial. Advertiser mantém autoria e responsabilidade pelo conteúdo; IA e moderador validam conformidade.

AI Orchestration fornece agentes especializados e o produto Grão. IA recomenda, interpreta e automatiza tarefas permitidas; os Bounded Contexts proprietários continuam decidindo preço, dinheiro, Evidence, permissão e estado.

## Pipeline de decisão

```text
Intent → Context Assembly → Knowledge/Memory retrieval → Prompt Pipeline
→ Agent Workflow / Tools → Policy Gate → Explanation → Recommendation or delegated command
```

Cada execução preserva `ModelVersion`, `PromptVersion`, `AgentVersion`, `PolicyVersion`, janela de contexto, fontes de conhecimento, memórias usadas, ferramentas invocadas, custos, resultado, explicação e nível de confiança. Context Window é mínima e consentida; Knowledge é versionado e tem fonte; Memory do Grão é corrigível/removível e não substitui fatos de domínio.

Agentes podem validar Creative Asset, recomendar inventário, diagnosticar performance, sugerir orçamento ou produzir relatórios. Tools são adapters com escopo mínimo, autorização e auditoria. Policy Gate bloqueia uso de ferramenta, dado, autonomia ou custo fora da política. Nenhum agente grava diretamente em contexto alheio: emite recomendação ou comando delegado que o dono valida.
