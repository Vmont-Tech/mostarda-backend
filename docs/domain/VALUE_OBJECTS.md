# VALUE OBJECTS — Mostarda

Value Objects (VO) descrevem **características**, não identidades com ciclo de vida próprio. Regras gerais:

1. **Imutáveis** — qualquer mudança produz uma nova instância.
2. **Sem identidade** — igualdade por valor, não por referência.
3. **Auto-validados** — não existe instância inválida; construção inválida falha.
4. **Sem dependência de infraestrutura** — nenhum VO conhece banco, HTTP ou provedor externo.
5. **Sem lógica de aplicação** — apenas invariantes próprias e comportamento derivado puro.

---

## Money

- **Descrição:** valor monetário com moeda.
- **Regras:** armazenado em menor unidade inteira (centavos); moeda obrigatória; operações só entre mesma moeda; arredondamento explícito e determinístico; nunca negativo em cobranças (crédito/débito é expresso por tipo de operação, não por sinal implícito).
- **Validação:** moeda ISO-4217 válida; valor inteiro; escala definida.

## GeoLocation

- **Descrição:** posição geográfica de um Venue/TV.
- **Regras:** latitude −90..90, longitude −180..180; precisão declarada; imutável após cadastro (mudança de local gera novo vínculo TV↔Venue).
- **Validação:** faixas numéricas e precisão obrigatória.

## TimeSlot

- **Descrição:** intervalo temporal fechado (`start`, `end`).
- **Regras:** `end > start`; sempre com fuso horário; usado para janela de Campaign, horário de operação do Venue, janela de manutenção e validade de QR.
- **Validação:** instantes válidos, ordem correta, fuso presente.

## TVIdentifier (`TV ID`)

- **Descrição:** identidade única de uma TV.
- **Regras:** imutável por toda a vida do dispositivo; nunca reutilizado após `TvDecommissioned`; formato opaco (não codifica dados de negócio).
- **Validação:** formato canônico e unicidade global.

## CampaignIdentifier

- **Descrição:** identidade única de uma Campaign.
- **Regras:** imutável; obrigatoriamente vinculada a um **Advertiser**; presente em todo Slot e Evidence derivados.
- **Validação:** formato canônico.

## SlotIdentifier

- **Descrição:** identidade única de uma reserva de exibição.
- **Regras:** imutável; único por (Campaign, TV, instante alocado); base da deduplicação de Evidence.
- **Validação:** formato canônico e unicidade.

## EvidenceHash

- **Descrição:** hash íntegro do conteúdo de uma Evidence.
- **Regras:** algoritmo declarado e versionado; calculado sobre payload canônico; imutável; base da ancoragem no Quantum Registry.
- **Validação:** tamanho/formato compatível com o algoritmo declarado; recomputável a partir do payload.

## DeviceSignature

- **Descrição:** assinatura do Playback Event pela chave privada da TV.
- **Regras:** produzida somente no Edge; verificável com a chave pública registrada; imutável.
- **Validação:** verificação criptográfica obrigatória antes de qualquer materialização de Evidence.

## DeviceHealth

- **Descrição:** estado consolidado de saúde do dispositivo.
- **Regras:** composto por severidade e indicadores (CPU, temperatura, memória, armazenamento, rede, HDMI); é um retrato de instante, nunca editado.
- **Validação:** severidade dentro do enum; indicadores em faixas plausíveis.

## PlaybackWindow

- **Descrição:** janela em que uma exibição pode ocorrer para um Slot.
- **Regras:** contida no horário de operação do Venue e na janela da Campaign; expira sem execução.
- **Validação:** interseção não vazia entre Campaign Window e Operating Hours.

## PlaybackDuration

- **Descrição:** duração atômica da exibição.
- **Regras:** unidade oficial de **15 segundos**; tolerância técnica definida e explícita; fora da tolerância a Evidence não é `VALID`.
- **Validação:** dentro da tolerância homologada.

## OccupancyLevel

- **Descrição:** nível de ocupação medida do ambiente.
- **Regras:** escala normalizada e finita; sempre acompanhado de `ConfidenceScore`; nunca identifica pessoas.
- **Validação:** dentro da escala; confiança presente.

## ConfidenceScore

- **Descrição:** confiança de uma medição ou inferência.
- **Regras:** intervalo `0..1`; abaixo do limiar homologado a medição não pode influenciar preço.
- **Validação:** faixa numérica e limiar declarado.

## SettlementCycle

- **Descrição:** período de apuração financeira.
- **Regras:** intervalo fechado e não sobreposto por perfil; imutável após `SettlementCycleClosed`; contém apenas Evidences `VALID` e ancoradas.
- **Validação:** ausência de sobreposição; fechamento único.

## SplitShare

- **Descrição:** fatia de um participante no Split Payment.
- **Regras:** percentual ou valor fixo; soma das fatias de um Split = 100% do valor líquido; participante deve ser elegível.
- **Validação:** soma exata e participante elegível.

## PricingQuote

- **Descrição:** preço congelado aplicado a um Slot.
- **Regras:** contém `Money`, insumos usados e instante do cálculo; imutável após `PriceApplied`; é o `valor cobrado` da Evidence.
- **Validação:** dentro de floor/ceiling; insumos presentes.

## AssetReference

- **Descrição:** referência imutável a um Creative Asset (`id` + hash do arquivo).
- **Regras:** hash obrigatório; divergência entre hash exibido e referenciado invalida a Evidence.
- **Validação:** hash presente e verificável.

## AnchoringReceipt

- **Descrição:** comprovante de ancoragem no Quantum Registry.
- **Regras:** contém identificador externo e timestamp; imutável; pré-requisito para `SettlementAuthorized`.
- **Validação:** identificador não vazio e timestamp válido.

## InteractionIdentifier

- **Descrição:** identificador público de uma **NFC Interaction** ou **QR Interaction**.
- **Regras:** opaco; não revela dados pessoais nem detalhes da Campaign; consultável publicamente.
- **Validação:** formato canônico.

## Role

- **Descrição:** papel do usuário no ecossistema (Advertiser, Dono da TV, Dono do espaço, Vendedor, Influencer, operador Mostarda).
- **Regras:** conjunto fechado; papéis nunca gravados junto ao perfil como atributo livre — sempre associação explícita e auditável.
- **Validação:** valor pertencente ao conjunto oficial.
