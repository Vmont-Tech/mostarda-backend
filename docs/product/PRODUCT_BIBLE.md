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

O modelo é baseado em **eventos atômicos de exibição de 15 segundos**. Cada exibição válida gera:

- uma **evidência íntegra** (ver ADR-003);
- um **valor cobrado** definido por precificação dinâmica;
- um **split** entre participantes elegíveis àquela exibição;
- uma **liquidação** processada via Asaas.

O sistema não opera em pré-pagamento cego: **o anunciante só paga o que foi realmente exibido e provado**.

## Divisão de receitas

A divisão de cada exibição respeita o seguinte modelo (percentuais indicativos, ajustáveis por contrato):

| Participante        | Faixa típica |
| ------------------- | ------------ |
| Dono da TV          | 30–45%       |
| Dono do espaço      | 10–20%       |
| Vendedor            | 5–15%        |
| Influenciador       | 0–15%        |
| Mostarda (plataforma) | 15–25%     |
| Fundo de seguro da TV | 3–7%       |

Regras:

- A soma **sempre** fecha 100% do valor líquido cobrado do anunciante.
- Se um papel não participa daquela exibição (ex: sem influenciador), sua fatia é redistribuída conforme regra contratual.
- O split é calculado a partir da **evidência**, nunca a partir do orçamento planejado.

## Seguro da TV

Todo hardware ativo no ecossistema contribui, por cada exibição, a um **Fundo de Seguro da TV**. Esse fundo cobre:

- reposição em caso de dano/roubo elegível;
- manutenção preventiva pactuada;
- indisponibilidade prolongada por falha coberta.

O seguro é **parte do modelo**, não um add-on. O objetivo é reduzir o risco do dono da TV e manter o inventário saudável.

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
