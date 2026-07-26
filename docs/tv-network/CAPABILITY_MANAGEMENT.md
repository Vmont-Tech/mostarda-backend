# Capability Management

Capability Registry declara o que a infraestrutura suporta: `CapabilityId`, versão, estado, owner técnico, health, manifesto e contrato operacional. Capabilities são declarativas e independentes de Facets: o Registry não acopla Facets nem inspeciona sua lógica interna.

Fluxo: `DeclareCapability → ValidateCapability → ActivateCapability`; uma capability pode ficar `DEGRADED`, `SUSPENDED` ou `RETIRED`. Ativação exige manifesto assinado, compatibilidade com dispositivo e health aplicável. Toda mudança de manifesto, versão ou estado produz evento e mantém a revisão anterior. Capability degradada deixa de anunciar disponibilidade até recuperação validada.
