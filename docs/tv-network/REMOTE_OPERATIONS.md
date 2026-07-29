# Remote Operations

Remote Operations executa somente Commands operacionais válidos: publicar Desired State, solicitar diagnóstico, reiniciar processo, abrir janela de manutenção, instalar/rollback versão, suspender/reativar TV e reconciliar estado. Todo comando é assinado, autorizado, idempotente, tem TTL, correlação, motivo e resultado auditável.

`DesiredState` é intenção versionada do Cloud; `CurrentState` é declaração do Edge; `ObservedState` é dedução independente de sinais operacionais. O Reconciler compara os três e emite Commands para o owner correto. Ele nunca altera Aggregate diretamente, força atualização, ignora maintenance window ou conclui disponibilidade sem observação.
