# Rollback Policy

Rollback retorna o runtime à última versão saudável registrada para o escopo afetado. É uma nova transição operacional, não exclusão da atualização falha. A política define gatilhos de health gate, limites de falha, aprovação, janela, escopo (TV, grupo ou onda), ordem de componentes e critérios de conclusão.

Rollback é obrigatório quando uma atualização viola health crítico ou política de segurança; é proibido quando não há versão aprovada/compatível ou quando conflita com operação de emergência. `UpdateRolledBack` preserva versão falha, diagnóstico, versão restaurada, ator/sistema e timestamps. Após rollback, TV fica `HEALTHY`, `DEGRADED` ou `SUSPENDED` conforme observação, nunca automaticamente ativa por suposição.
