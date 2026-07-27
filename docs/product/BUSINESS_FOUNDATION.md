# Business Foundation — Constituição de Negócio da Mostarda

Este é o contrato de negócio da Mostarda. Ele orienta produto, arquitetura, operação, investimento e futuras IAs que trabalhem no projeto. Mudanças em suas teses exigem decisão explícita e atualização rastreável; decisões técnicas não podem contrariá-lo.

## 1. Missão

Democratizar a mídia OOH brasileira, transformando qualquer televisão em um ativo de mídia inteligente, auditável e monetizável. A Mostarda permite que pequenos comerciantes, influenciadores, anunciantes e proprietários de telas participem de um ecossistema de publicidade digital antes acessível principalmente às grandes redes.

## 2. Visão

Construir a maior rede brasileira distribuída de Digital Out Of Home, com prova criptográfica de exibição, liquidação automática, inteligência artificial e infraestrutura escalável para milhões de telas.

> A Mostarda não vende simplesmente publicidade; ela opera infraestrutura de mídia.

## 3. Mercado inicial

| Lado da rede | Público do MVP |
| --- | --- |
| Oferta | Pequenos comerciantes, academias, padarias, restaurantes, barbearias, salões, lojas, clínicas, mercados e qualquer estabelecimento com televisão. |
| Demanda | PMEs, franquias, comércio local, prestadores de serviço, empresas regionais e agências. Médias e grandes empresas entram posteriormente. |

## 4. Região inicial e expansão

O piloto começa no Rio de Janeiro, nos bairros Bangu, Campo Grande, Realengo, Padre Miguel, Senador Camará e Santa Cruz. A expansão é sequencial: cidade do Rio de Janeiro → Estado do Rio de Janeiro → Sudeste → Brasil.

## 5. Estratégia de aquisição

O crescimento é orientado a efeito de rede, não dependente exclusivamente de vendedores internos. Cada participante aumenta o valor da rede: dono da TV, dono do estabelecimento, influenciador, vendedor e anunciante possuem incentivo econômico para convidar, ativar e manter outros participantes.

Produto, onboarding, convites, indicação, incentivos e automações comerciais devem reforçar essa tese; nenhuma funcionalidade pode criar valor apenas de um lado enquanto reduz a liquidez do outro.

## 6. Modelo comercial e cobrança

Modelo **SaaS + Marketplace**: o anunciante compra Campaigns; pagamento compensado cria Available Budget; a Campaign compra Slots; cada exibição comprovada gera Evidence Record; a prova elegível gera Settlement; Settlement gera direito financeiro; Financial Platform governa carteira e saque.

Cobrança é exclusivamente pelo Asaas, via PIX, cartão e boleto; assinaturas são futuras. Não há blockchain financeira, token ou criptomoeda.

### 6.1 Compromisso comercial

A Mostarda não vende Campaign pronta, pacote fixo, circuito fechado, audiência garantida, alcance mínimo ou quantidade fixa de exibições. O anunciante compra capacidade financeira de acesso ao inventário e decide como consumi-la em Slots independentes.

Campaign é o instrumento de planejamento e governança desse consumo, não o produto financeiro nem uma promessa de resultado de audiência. O Advertiser pode planejar manualmente ou delegar otimização ao Grão, mantendo sempre a decisão final.

### 6.2 Garantia

A Mostarda garante transparência, rastreabilidade, auditoria e comprovação da execução. Dados de audiência, preço e ocupação anteriores à execução são estimativas claramente identificadas.

Falha operacional não consome definitivamente orçamento sem exibição. O sistema tenta realocar o valor em Slot compatível antes de manter saldo remanescente. Overdelivery causado pela plataforma nunca é cobrado do Advertiser.

### 6.3 Cancelamento

O Advertiser pode cancelar a Campaign. Exibições já comprovadas permanecem faturadas; reservas liberáveis e saldo não consumido retornam ao fluxo financeiro de devolução. A plataforma pode oferecer retenção ou replanejamento, mas não impedir o cancelamento.

## 7. Modelo operacional

| Componente | Função de negócio |
| --- | --- |
| Edge | Executa e registra fatos de playback. |
| Cloud | Coordena rede, Campaigns, preço e prova. |
| Quantum | Ancora prova institucional. |
| Asaas | Cobra e liquida. |
| Grão | Auxilia usuários e operação. |
| Canvas | Compõe a tela. |
| Player | Reproduz mídia. |

## 8. Monetização

Receita principal: venda de Campaigns. Receitas secundárias: Marketplace, seguro das TVs, aluguel de telas, conteúdo patrocinado, Campaigns nacionais, Marketplace de influenciadores, Analytics, IA e API. Toda nova linha preserva prova, segregação financeira e experiência simples para o usuário.

## 9. Sucesso da rede

Sucesso não é somente faturamento; é uma rede saudável, líquida e confiável. KPIs primários: TVs ativas, tempo disponível vendido, fill rate, occupancy rate, proporção de Evidence `VALID`, disponibilidade do Edge, receita por TV, por local e por anunciante, CAC, LTV, churn, tempo até primeira Campaign, tempo até primeiro pagamento e tempo médio entre compra e primeira exibição.

## 10. Princípios não negociáveis de negócio

- A prova vale mais que a confiança.
- Nenhum pagamento sem Evidence Record `VALID` e ancorado.
- Blockchain nunca movimenta dinheiro; Asaas nunca depende de blockchain.
- Edge nunca toma decisão financeira; Cloud nunca altera provas já validadas.
- Quantum nunca conhece Campaigns; o usuário nunca precisa entender blockchain.
- A tecnologia deve desaparecer para o usuário.

## 11. Roadmap estratégico

| Fase | Objetivo |
| --- | --- |
| 1 | Marketplace local. |
| 2 | Rede estadual. |
| 3 | Rede nacional. |
| 4 | Programmatic Ads. |
| 5 | IA totalmente autônoma, dentro de políticas e invariantes. |
| 6 | Expansão internacional. |

## 12. Modelo de negócio resumido

**Parceiros-chave:** proprietários de TV e locais, anunciantes, agências, influenciadores, Asaas e Quantum. **Recursos-chave:** rede de telas, Edge/Player/Canvas, Evidence Ledger, dados de operação, marca e relacionamento local. **Atividades-chave:** ativação de telas, aquisição de demanda, alocação, prova, liquidação, suporte e qualidade da rede. **Estrutura de custos:** hardware/instalação quando aplicável, conectividade, cloud, meios de pagamento, operação de campo, suporte e aquisição. **Viabilidade:** cada canal deve medir CAC, ativação, retenção, receita e LTV; a expansão só avança quando a coorte demonstra economia unitária sustentável.
