# Fleet Management

Fleet Management agrupa TVs por região, Venue, proprietário, modelo, versão, Capability, conectividade, estado e onda operacional. `Fleet` é Aggregate de seleção/versionamento, não dono das TVs individuais.

Usos permitidos: rollout em ondas, manutenção coordenada, diagnóstico de saúde, inventário e operações remotas autorizadas. Uma ação de Fleet emite comandos individuais para cada owner; não modifica diretamente TVs/Edges. Critérios de seleção, membros no instante da ação, política, resultado por membro e impacto são auditáveis.
