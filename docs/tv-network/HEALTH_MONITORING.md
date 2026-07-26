# Health Monitoring

Health Monitoring observa CPU, GPU, memória, disco, temperatura, conectividade, display/HDMI, processos, watchdog, armazenamento, energia e sincronização. Cada observação é append-only: Health nunca é sobrescrito.

`HealthScore` é derivado, versionado e explicável por política: cada dimensão, limiar, severidade, timestamp e origem são preservados. Estados: `HEALTHY`, `DEGRADED`, `CRITICAL`, `UNKNOWN`. `UNKNOWN` não é saudável por ausência de dados. Diagnóstico correlaciona Current State, Observed State, Heartbeat e eventos de dispositivo sem inferir fatos de outros contextos.

Fleet Health agrega leituras por grupo, Venue, região, versão e onda de rollout; agregação não substitui o HealthRecord individual.
