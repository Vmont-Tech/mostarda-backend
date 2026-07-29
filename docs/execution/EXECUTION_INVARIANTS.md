# Execution Invariants — Constituição do Comportamento

1. Um Command modifica somente Aggregate do contexto proprietário.
2. Um Event é fato imutável e nunca altera estado diretamente.
3. Uma Saga coordena; ela nunca decide regra de negócio ou burla autorização.
4. EvidenceRecord nunca nasce no Edge; Edge produz somente PlaybackEvent e PlaybackSignature.
5. Quantum nunca recebe PlaybackEvent, Campaign, preço, pessoas ou documento não canônico; recebe hash/pacote canônico permitido.
6. Settlement nunca lê Player, Canvas ou fila Edge; consome somente EvidenceRecord elegível.
7. Edge nunca recebe Command financeiro e nunca calcula preço, split ou cobertura.
8. Nenhuma transição pode pular estados obrigatórios ou sair de estado final.
9. Todo Command, Event, retry e webhook é idempotente e correlacionável.
10. Toda compensação cria novo fato; nunca apaga, edita ou reutiliza prova, ciclo ou pagamento.
11. Versões de política, algoritmo, schema e software aplicáveis acompanham a decisão/fato auditável.
12. `DesiredState`, `CurrentState` e `ObservedState` são distintos; divergência é diagnosticada antes de qualquer conclusão operacional.
13. Falha de um SplitShare não bloqueia ou redistribui as demais parcelas.
14. A autorização é verificada pelo owner antes da transição; a Saga e o consumidor não a presumem.
15. Settlement cria direitos; Financial Platform credita Ledger; somente Withdrawal instrui saída via Asaas.
16. CampaignBudget só autoriza Slots com AvailableBudget compensado; ContractValue não é saldo.
