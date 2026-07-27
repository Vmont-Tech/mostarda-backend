# Technical Behavioral Specification — Design

**Status:** aprovado para revisão escrita  
**Data:** 2026-07-27  
**Origem:** Implementation Readiness Review V1  
**Escopo:** comportamento técnico transversal; nenhuma regra de domínio ou escolha de stack.

## 1. Objetivo

Criar uma Technical Behavioral Specification (TBS) normativa e transversal que elimine as lacunas técnicas identificadas pelo IRR e permita que implementações independentes produzam o mesmo comportamento observável.

A TBS será a ponte entre os artefatos autorizados e a futura Code Generation Specification.

Ela não reavalia:

- Domain Freeze;
- Architecture Lock;
- decisões de domínio;
- ownership;
- boundaries;
- artefatos bloqueados.

## 2. Cláusula constitucional

> A TBS define exclusivamente semântica observável. Sempre que uma decisão puder ser modificada sem alterar o comportamento observável do domínio, ela não pertence à TBS.

Teste de pertencimento:

- se duas implementações válidas puderem produzir efeitos observáveis diferentes, a decisão pertence à TBS;
- se produzirem os mesmos efeitos observáveis e diferirem apenas em estrutura, tecnologia ou desempenho, a decisão pertence à CGS ou à configuração.

## 3. Fronteiras

### 3.1 TBS

Define:

- resultados observáveis de Commands;
- erros normativos;
- comportamento sob concorrência;
- atomicidade observável;
- replay e reidratação;
- validade conceitual de snapshots;
- compatibilidade de Events;
- duplicidade e idempotência;
- ordering, gaps e schemas desconhecidos;
- rebuild de Projections;
- comportamento transversal de Sagas;
- testes normativos de conformidade.

### 3.2 CGS

Define:

- linguagem e framework;
- estrutura de arquivos;
- namespaces;
- interfaces e classes base;
- representação de Result e Error;
- bibliotecas;
- persistência física;
- serialização;
- dependency injection;
- adapters e observabilidade técnica.

A CGS materializa a TBS e nunca pode alterá-la.

### 3.3 Vertical Slice e configuração

Definem ou validam parâmetros quantitativos:

- frequência de snapshots;
- timeout;
- TTL;
- número de tentativas;
- batch size;
- thresholds;
- SLOs;
- limites de capacidade;
- algoritmos de compressão e storage.

Ausência de parâmetro obrigatório para operação real produz falha explícita. Não existe default silencioso com força normativa.

## 4. Estrutura da TBS

### 4.1 Princípios e escopo

Declarará autoridade, precedência, linguagem normativa e não objetivos.

### 4.2 Critérios normativos

Aplicará o teste de comportamento observável e distinguirá regra normativa, exemplo, recomendação, materialização técnica e configuração.

### 4.3 Command Result normativo

Congelará significados observáveis para:

- `Accepted`;
- `Rejected`;
- `Conflict`;
- `Duplicate`;
- `Expired`;
- `Unauthorized`;
- `InvariantViolation`.

A TBS definirá condições e efeitos. A CGS escolherá enum, union, hierarchy ou Result type.

### 4.4 Catálogo e envelope de erros

Definirá:

- identidade estável do erro;
- significado;
- condição normativa;
- retryability;
- recoverability;
- severidade;
- consumidor;
- correlação com Command/Event;
- preservação durante replay e transporte.

Mapeamento para HTTP, gRPC ou exception pertence à CGS/contrato técnico correspondente.

### 4.5 Optimistic Concurrency

Fixará:

- `ExpectedRevision` obrigatório para mutação de Aggregate existente;
- append atômico;
- conflito determinístico;
- ausência de merge automático;
- releitura antes de nova intenção;
- retry cego proibido;
- duplicidade distinta de conflito concorrente.

Tipo numérico e representação da revisão pertencem à CGS.

### 4.6 Persistência e publicação atômicas

Fixará:

- estado autoritativo deriva de Events persistidos;
- Event persistido não pode ser perdido por falha de publicação;
- publicação repetida preserva identidade;
- consumidor idempotente;
- side effect externo nunca é executado durante replay/rebuild;
- falha parcial não cria novo fato com identidade diferente.

Outbox, transação, broker e banco pertencem à CGS.

### 4.7 Replay e reidratação

Fixará:

- aplicação por stream e revisão;
- estado inicial conhecido;
- invariantes verificáveis durante replay;
- ausência de side effects;
- abortar diante de Event desconhecido/incompatível;
- Aggregate não continua parcialmente conhecido;
- replay integral é referência normativa.

### 4.8 Snapshots conceituais

Fixará:

- snapshot é derivado e descartável;
- nunca substitui nem altera Events;
- possui versão e integridade verificáveis;
- snapshot incompatível é ignorado e causa replay integral;
- snapshot + tail replay produz estado idêntico ao replay integral;
- ausência/corrupção de snapshot não altera significado.

Frequência, tamanho, compressão e storage ficam fora da TBS.

### 4.9 Evolução e compatibilidade de Events

Fixará:

- Event original é imutável;
- nova semântica exige nova versão;
- campos desconhecidos não podem alterar significado conhecido;
- upcast é determinístico, versionado e sem side effect;
- downgrade heurístico é proibido;
- Event futuro não suportado aborta reidratação do Aggregate;
- depreciação não apaga histórico;
- compatibilidade declarada deve possuir teste.

Formato de serialização fica fora da TBS.

### 4.10 Idempotência e duplicidade

Fixará:

- mesma key e mesmo payload retorna resultado original;
- mesma key e payload diferente é conflito;
- retry não cria identidade causal nova;
- dedupe de Event usa identidade estável;
- retenção quantitativa da chave fica em configuração;
- expiração da retenção nunca autoriza repetir efeito conhecido.

### 4.11 Gaps, ordering e Events desconhecidos

Fixará:

- ordering por stream/revisão, não global;
- gap impede avanço do estado dependente;
- duplicata não avança revisão;
- Event atrasado não regride estado;
- Event desconhecido/incompatível produz replay abortado;
- nenhuma heurística ignora Event necessário.

O envelope normativo deverá representar falha como `ReplayAborted` com causa estável, incluindo `UnknownEventSchema` quando aplicável. A representação concreta pertence à CGS.

### 4.12 Rebuild de Projections e Read Models

Fixará:

- rebuild é determinístico;
- side effects externos ficam desabilitados;
- versão da projeção é registrada;
- read model antigo permanece distinguível até troca válida;
- falha não publica projeção parcial como atual;
- staleness é explícita;
- fonte autoritativa nunca é alterada pelo rebuild.

### 4.13 Comportamento normativo de Sagas

Fixará:

- Saga não decide domínio;
- estado e correlação persistidos;
- Commands preservam causation;
- retry não duplica efeito;
- resultado desconhecido bloqueia ação incompatível;
- compensação é nova intenção ao owner;
- replay/rebuild não executa side effects;
- conclusão exige condições terminais declaradas pela Saga específica.

Timeouts e tentativas quantitativas ficam em configuração.

### 4.14 Testes comportamentais obrigatórios

Definirá uma suíte de conformidade independente de linguagem:

- Command aceito;
- rejeição por precondição;
- violação de invariante;
- duplicate;
- conflict;
- unauthorized;
- optimistic concurrency;
- replay integral;
- snapshot + replay;
- snapshot corrompido/incompatível;
- Event duplicado;
- gap;
- Event desconhecido;
- versão futura;
- upcast;
- rebuild sem side effect;
- falha entre persistência e publicação;
- Saga retry/compensação.

### 4.15 Matriz TBS × CGS × Configuração

Cada decisão transversal será registrada em exatamente uma coluna:

| Decisão | TBS | CGS | Configuração/Vertical Slice |
| --- | --- | --- | --- |
| semântica de Event desconhecido | sim | não | não |
| representação de Result | não | sim | não |
| frequência de snapshot | não | não | sim |
| semântica de concurrency conflict | sim | não | não |
| tipo físico de revision | não | sim | não |
| timeout quantitativo | não | não | sim |

### 4.16 Critérios de conformidade

Uma implementação somente pode declarar conformidade quando:

- nenhuma decisão comportamental é inferida pelo código;
- todo comportamento obrigatório possui teste normativo;
- a mesma sequência de Commands e Events produz a mesma sequência de efeitos observáveis;
- comportamento não especificado falha explicitamente;
- extensão da implementação é marcada como não normativa;
- extensão não altera comportamento normativo;
- CGS, configuração e adapters não contradizem a TBS;
- resultados de conformidade são reproduzíveis.

### 4.17 Evolução da própria TBS

Fixará:

- alteração comportamental é breaking change;
- novo comportamento obrigatório exige nova versão normativa;
- exemplos não possuem força normativa;
- somente texto identificado como normativo altera conformidade;
- correção editorial não muda versão comportamental;
- CGS nunca pode superseder TBS;
- configuração nunca pode alterar semântica;
- implementação não pode promover extensão local a norma;
- versões antigas permanecem auditáveis.

## 5. Precedência

A cadeia após a criação da TBS será:

1. Domain Freeze define comportamento de domínio;
2. Architecture Lock define artefatos permitidos;
3. TBS define comportamento técnico transversal;
4. CGS define materialização por stack;
5. configuração define parâmetros operacionais permitidos;
6. código implementa, sem redefinir nenhuma camada superior.

Em conflito:

- TBS não pode alterar domínio;
- CGS não pode alterar TBS;
- configuração não pode alterar semântica;
- código não pode resolver omissão silenciosamente.

## 6. Validação inicial

GovernanceCase será o primeiro consumidor da TBS porque possui o conjunto mais completo de lifecycle, invariantes, Commands, Events, concurrency, replay e rebuild.

A TBS será considerada validada somente quando o Vertical Slice demonstrar:

- replay integral;
- snapshot + replay equivalente;
- concurrency conflict determinístico;
- idempotência;
- outbox/inbox sem duplicação observável;
- projeção reconstruível;
- schema evolution;
- suíte de conformidade.

Parâmetros medidos durante o slice não alteram a semântica da TBS.

## 7. Não objetivos

Este design não escolhe:

- linguagem;
- framework;
- banco;
- broker;
- Event Store;
- formato de serialização;
- frequência de snapshot;
- timeout;
- TTL;
- retry count;
- batch size;
- thresholds;
- estrutura de pastas;
- nomes de classes/interfaces.

Essas decisões pertencem à CGS, configuração ou Vertical Slice.

