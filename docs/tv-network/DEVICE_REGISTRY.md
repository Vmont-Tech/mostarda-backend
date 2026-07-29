# Device Registry

Device Registry mantém a identidade física e lógica da frota: TV, Display, MiniPC, EdgeInstallation e periféricos declarados. Cada item possui identificador permanente, serial quando aplicável, fabricante/modelo, relação com TV, estado, data de vínculo e histórico append-only.

Uma TV possui um Display principal e um Edge ativo por vez; substituição fecha o vínculo anterior e cria novo vínculo, sem sobrescrever serial ou histórico. Venue, localização e proprietário são referências do TV Network e versionam alterações. Registry não armazena conteúdo, preço, Campaign, pagamentos ou prova.

Eventos: `DeviceRegistered`, `DeviceBoundToTV`, `DeviceReplaced`, `DeviceUnbound`, `TvLocationChanged`, `TvOwnerChanged`, `DeviceDecommissioned`.
