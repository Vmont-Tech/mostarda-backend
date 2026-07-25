# DOMAIN PRINCIPLES — Mostarda

Princípios obrigatórios. **Nada pode ser implementado contrariando esta lista.** Toda exceção exige um novo ADR aceito.

## Prova e liquidação

1. **Toda exibição gera evidência.** Uma exibição concluída de 15s sempre produz um **Playback Event** assinado.
2. **Sem evidência não existe liquidação.** Nenhum valor é cobrado ou repassado sem **Evidence** `VALID`.
3. **Toda evidência nasce no Edge.** O Cloud valida e materializa, mas não inventa evidência.
4. **Toda liquidação depende da evidência** e da confirmação de ancoragem.
5. **Erro de integridade bloqueia dinheiro.** Assinatura inválida, referência inconsistente, duplicidade ou divergência de valor impedem liquidação (ADR-003).
6. **O Ledger é append-only.** Correção só por evento compensatório, nunca por edição destrutiva.
7. **Telemetria nunca substitui evidência.** Telemetria é operacional; evidência é fiscal.

## Fronteiras de responsabilidade

8. **Blockchain nunca participa do pagamento.** Atua exclusivamente como camada de prova.
9. **Asaas nunca conhece blockchain.** O provedor financeiro só vê conceitos financeiros.
10. **Quantum nunca conhece campanhas.** Nem preço, nem orçamento, nem dados pessoais.
11. **Edge nunca decide regras de negócio.** Sem pricing, sem elegibilidade, sem split no dispositivo.
12. **Frontend nunca calcula métricas.** Consome números já consolidados pelo Analytics.
13. **Toda interação NFC pertence à Quantum.** O Edge não responde a NFC nem a QR.
14. **Todo QR pertence à campanha** que o originou, e resolve no Quantum Registry.
15. **Nenhum contexto lê o banco de outro contexto.** Só eventos e API pública.
16. **Toda informação tem um único proprietário** (ver [`OWNERSHIP.md`](./OWNERSHIP.md)).
17. **Toda integração externa passa por Anti-Corruption Layer.**

## Titularidade

18. **Toda campanha pertence a um anunciante** (**Advertiser**).
19. **Toda TV pertence a um parceiro** (Dono da TV) e está em **um** Venue.
20. **Todo Slot pertence a uma Campaign e a uma TV**, com preço congelado na alocação.
21. **Todo Influencer só recebe Split com contrato ativo.**
22. **Papéis de usuário vivem em associação própria**, nunca como atributo livre do perfil.

## Integridade e auditoria

23. **Todo documento possui hash.** Contratos, laudos e snapshots do Ledger têm hash calculado.
24. **Todo hash possui auditoria.** Registro de quem gerou, quando e sobre qual conteúdo.
25. **Preço aplicado é imutável e auditável.** Insumos do cálculo são registrados.
26. **Todo evento de domínio é versionado** e consumido de forma idempotente.
27. **Dados sensoriais são anonimizados na origem.** Nenhuma identificação de pessoas.
28. **Consentimento é pré-requisito** para tratamento de dados pessoais.

## Inteligência artificial

29. **Toda IA deve justificar recomendações.** Sem `ExplanationRecord` não há decisão de IA válida.
30. **IA recomenda; o contexto dono decide.** Pricing Engine e Settlement mantêm a palavra final sobre dinheiro.
31. **Grão é o único canal humano de IA.** Os demais agentes operam em background.
32. **Falha de IA não derruba o fluxo humano** — há fallback e sinalização de degradação.

## Linguagem e evolução

33. **Um termo só existe se estiver no [`DOMAIN_DICTIONARY.md`](./DOMAIN_DICTIONARY.md).**
34. **Nenhuma nova terminologia sem necessidade**; sinônimos são proibidos.
35. **Mudança arquitetural relevante gera novo ADR**; ADR aceito não é editado, é superseded.
36. **Unidade atômica da plataforma é 15 segundos** de exibição — nenhuma regra pode fracioná-la.
