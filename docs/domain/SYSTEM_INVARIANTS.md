# System Invariants — Constituição da Plataforma

Estas regras são não negociáveis. Toda decisão, contrato, implementação, migração e operação deve preservá-las. Exceção exige ADR aprovado; não existe exceção implícita.

1. Nenhum pagamento ou repasse existe sem Evidence `VALID`, íntegra, não revertida e ancorada.
2. Nenhuma Evidence é alterada após `VALID`; correções são eventos compensatórios append-only.
3. Edge nunca calcula preço, dinheiro, split, cobertura ou liquidação.
4. Quantum nunca conhece Campaign, anunciante, pessoa, preço ou Edge; recebe somente `Canonical Evidence Package`/hash e ancora somente hash.
5. Split canônico soma exatamente 100%: 30% Mostarda, 20% Dono da TV, 20% Dono do Local, 20% Vendedor responsável e 10% Influenciador.
6. Uma parcela de split tem ciclo próprio; indisponibilidade de um recebedor não bloqueia nem redistribui as demais.
7. QR nunca contém destino final ou URL de anunciante: contém somente token opaco, resolvido pelo Cloud.
8. Todo evento possui contexto proprietário, identificador, timestamp e versão de schema.
9. Toda decisão financeira preserva `PricingPolicyVersion`, `SettlementPolicyVersion`, `TaxPolicyVersion`, `InsurancePolicyVersion` e `SplitPolicyVersion` aplicáveis.
10. Toda decisão de IA preserva `ModelVersion`, `PromptVersion`, `AgentVersion` e `PolicyVersion`, além da explicação e dos insumos permitidos.
11. Todo documento auditável possui hash; formato de transporte nunca é identidade da prova.
12. Facets são independentes, isoladas, versionáveis e hot-swappable; não compartilham estado ou dependência direta.
13. Cloud declara `DesiredState`, Edge reporta `CurrentState` e Cloud deriva `ObservedState`; o reconciliador converge os três por comandos assinados, idempotentes e auditáveis.
14. Blockchain/Quantum é camada de prova, nunca rail de pagamento ou custódia de valor.
15. Dados pessoais e telemetria obedecem proprietário, consentimento e minimização; telemetria nunca substitui Evidence.
16. Settlement cria direitos financeiros; Financial Platform mantém Ledger/Wallet/Withdrawal; Asaas só executa instruções desse contexto.
17. Campaign só consome Available Budget compensado; Contract Value não é saldo e Quantum nunca movimenta dinheiro.
