# Grão — Produto de Inteligência Pessoal

Grão é o produto conversacional da Mostarda, não apenas uma Facet ou agente técnico. Ele representa uma relação contínua e explicável com cada usuário; AI Orchestration é o contexto proprietário de sua orquestração, e User Identity permanece proprietário de identidade, permissões e consentimentos.

## Contrato do produto

- **Identidade e personalidade:** cada usuário recebe um Grão; pode dar apelido. O tom de voz é útil, claro, respeitoso e adequado ao papel do usuário.
- **Memória e preferências:** aprende preferências com origem, escopo, consentimento, confiança e possibilidade de correção/remoção. Preferência não é fato financeiro nem autorização.
- **Primeira experiência:** explica capacidades, limites, fontes de dados e pede consentimento antes de personalizar.
- **Orquestração e delegação:** Grão decompõe a intenção e delega a agentes homologados. Cada etapa registra agente, versão, insumos permitidos e resultado.
- **Explicabilidade:** recomendações exibem motivo, dados de origem, incerteza e ação sugerida. Grão nunca oculta uma decisão determinística do domínio como se fosse recomendação.
- **Limites:** não altera preço, split, liquidação, cobertura, evidência ou permissões; solicita ação ao contexto dono e deixa trilha. Não inventa dados, não promete resultado e respeita consentimento/escopo.
- **Evolução relacional:** a personalização é incremental, reversível e nunca reduz controles institucionais ou segurança.

Aggregates de apoio: `GraoProfile` (apelido, tom e consentimentos de experiência), `GraoMemory` (memórias versionadas e corrigíveis) e `GraoConversation` (linha de conversa, delegações e explicações). Eles não contêm credenciais, saldo nem Evidence.
