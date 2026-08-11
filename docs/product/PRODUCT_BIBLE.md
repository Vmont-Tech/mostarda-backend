# PRODUCT BIBLE — Mostarda

Este documento é a fonte oficial de identidade, princípios e regras econômicas da plataforma Mostarda. Qualquer decisão de produto ou engenharia deve ser coerente com ele.

## Missão

Tornar a mídia física **transparente, justa e inteligente**, conectando telas, espaços, anunciantes e criadores em um único ecossistema com prova auditável de cada exibição.

## Visão

Ser a **infraestrutura padrão** de mídia inteligente da América Latina — presente em qualquer tela, em qualquer espaço, com prova pública e liquidação automática.

## Valores

- **Prova antes de dinheiro.** Nada é liquidado sem evidência íntegra.
- **Simples para o humano, robusto por baixo.** Complexidade fica no sistema, nunca no usuário.
- **Justo por padrão.** A divisão de valor respeita todos os participantes do ecossistema.
- **Aberto e auditável.** O que a Mostarda promete, ela consegue provar.
- **Autonomia com responsabilidade.** Edge decide localmente, mas responde ao sistema.
- **IA como aliada, não como intermediária opaca.** O Grão explica o que faz.

## Participantes do ecossistema

### 1. Anunciante
Pessoa ou empresa que contrata exibição de conteúdo. Recebe métricas, evidência e recomendações de IA.

### 2. Dono da TV
Investe no hardware físico (mini PC + tela + acessórios). Recebe receita proporcional às exibições realizadas em seu equipamento. Tem acesso a manutenção, telemetria e seguro.

### 3. Dono do espaço
Cede o local físico onde a TV opera. Recebe receita pela performance da localização.

### 4. Vendedor
Intermedia contratos, prospecta anunciantes, mantém a carteira. Recebe comissão sobre ciclos.

### 5. Influenciador
Cria ou empresta imagem/conteúdo a campanhas. Recebe receita pela participação.

### 6. Mostarda
Operadora e mantenedora do ecossistema. Recebe pela orquestração, validação e liquidação.

### 7. Grão
Agente pessoal de IA de cada usuário. Não recebe receita — é benefício embutido.

## Modelo econômico

O modelo é baseado em **Slots atômicos de exibição de 15 segundos**. O produto comercial é capacidade financeira de acesso ao inventário, consumida em Slots conforme estratégia manual ou delegada pelo Advertiser. A Mostarda não vende Campaign pronta, pacote fechado, audiência garantida, alcance mínimo nem quantidade fixa de exibições.

Cada exibição válida gera:

- uma **evidência íntegra** (ver ADR-003);
- um **valor cobrado** definido por precificação dinâmica;
- um **split** entre participantes elegíveis àquela exibição;
- uma **liquidação** processada via Asaas.

Pagamento compensado cria capacidade financeira disponível. Reserva compromete o valor para um Slot; consumo definitivo exige exibição comprovada e elegível. O sistema não cobra uma exibição inexistente nem overdelivery causado por falha da plataforma.

## Divisão de receitas

A divisão de cada exibição respeita o modelo canônico vigente:

| Participante        | Faixa típica |
| ------------------- | ------------ |
| Dono da TV          | 20% fixos |
| Dono do espaço      | 20% fixos |
| Vendedor            | componentes conquistados, até 20% |
| Fundo de aquisição do Seller | componentes de Seller não conquistados |
| Influenciador       | componentes conquistados, até 10% |
| Fundo de aquisição do Influencer | componentes de Influencer não conquistados |
| Mostarda (plataforma) | 30% fixos neste modelo |


Regras:

- A soma **sempre** fecha 100% do valor líquido cobrado do anunciante.
- Cada componente conquistado remunera o participante e cada componente não conquistado remunera o fundo de aquisição correspondente. Os cenários de 0%, parcial e teto são fixtures de teste, não presets de Campaign. `DEC-049` e o Fundo de Desenvolvimento de Influenciadores permanecem mecanismo separado.
- O split é calculado a partir da **evidência**, nunca a partir do orçamento planejado.
- Alteração dos percentuais exige nova versão de política e decisão arquitetural aprovada.

## Continuidade operacional da TV

O conceito de seguro foi supersedido pelo Plano Mostarda de Continuidade Operacional, serviço mensal do modelo completo. Freemium não participa. O plano prioriza diagnóstico, reparo, TV temporária Mostarda e substituição equivalente, conforme limites versionados.

## Rede de parceiros

Freemium reserva 40% de cada faixa à programação local e 60% à Mostarda. Conteúdo local ocupa até 30 segundos consecutivos. O parceiro controla a liberação de sua quota; conteúdo confirmado é imutável. Consulte [PARTNER_NETWORK_OPERATING_MODEL.md](PARTNER_NETWORK_OPERATING_MODEL.md).

## Anúncios de 15 segundos

A **unidade atômica de mídia** da Mostarda é o **anúncio de 15 segundos**. Toda a plataforma — evidência, precificação, split, telemetria, IA — é modelada em torno dessa unidade. Isso garante:

- comparabilidade absoluta entre inventário;
- precificação dinâmica justa;
- evidência atômica auditável;
- previsibilidade para o anunciante.

Formatos mais longos são compostos por múltiplos slots atômicos de 15s.

## Marketplace de mídia

O ecossistema opera como um **marketplace bilateral**:

- **Oferta:** donos de TV e donos de espaço listam inventário (localização, público, horário).
- **Demanda:** anunciantes (com ou sem vendedor) contratam campanhas.
- **Preço:** dinâmico, ajustado por demanda, contexto, performance histórica e recomendação de IA.
- **Prova:** cada exibição vira evidência, que alimenta o histórico de reputação do inventário.

O marketplace é aberto — qualquer participante elegível pode entrar — e **auditável** — todo movimento gera evento.
