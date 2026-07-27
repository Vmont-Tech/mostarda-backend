# Device Registry

## Responsabilidade

Device Registry mantém identidade, atributos declarados e vínculos históricos de Display, MiniPC e periféricos. `TV`, `Device` e `EdgeInstallation` possuem identidades diferentes:

- `TVIdentifier` identifica o nó lógico da rede;
- `DeviceIdentifier` identifica permanentemente uma peça física;
- `EdgeInstallationIdentifier` identifica uma instalação lógica do runtime em um MiniPC.

Nenhum identificador é reutilizado. Serial de fabricante é atributo de verificação, não identidade de domínio.

A credencial operacional identifica uma `EdgeInstallation`, não a TV abstrata nem o MiniPC isoladamente. Durante sua vigência, uma EdgeInstallation referencia exatamente um MiniPC e uma TV. Troca de MiniPC encerra vínculo e credencial anteriores e exige nova EdgeInstallation; a TVIdentifier permanece. Credencial antiga nunca é copiada ou reativada no equipamento substituto.

## Registro conceitual

Cada `DeviceRegistration` preserva:

- identificador permanente e tipo;
- serial, fabricante, modelo e revisão quando disponíveis;
- origem e confiança dos atributos;
- estado `REGISTERED`, `BOUND`, `UNBOUND`, `QUARANTINED` ou `DECOMMISSIONED`;
- vínculos temporais com TV e EdgeInstallation;
- motivo, ator e correlação de cada mudança;
- sinais de possível duplicidade, clonagem ou adulteração.

Uma TV possui no máximo um Display principal e uma EdgeInstallation ativa no mesmo instante. Vínculos históricos podem coexistir desde que seus períodos não se sobreponham.

## Duplicidade e confiança

- Repetir o mesmo Command e a mesma identidade é idempotente.
- O mesmo serial apresentado por identidades incompatíveis gera conflito; não ocorre fusão automática.
- Uma mensagem autenticada por identidade revogada, clonada ou incompatível gera observação de segurança e pode levar o Device/Edge à `QUARANTINED`.
- Quarentena impede ativação e operações sensíveis até decisão autorizada; não descomissiona automaticamente.

## Substituição e descomissionamento

`ReplaceDevice` encerra o vínculo anterior e cria outro de forma atômica no domínio. O substituído continua consultável. `DECOMMISSIONED` é final para o Device; o identificador e o histórico permanecem.

Venue, localização e proprietário são referências versionadas da TV. Device Registry não se torna owner dessas entidades externas e não armazena conteúdo, Campaign, preço, pagamento, Evidence ou Settlement.

Eventos normativos: `DeviceRegistered`, `DeviceBoundToTV`, `DeviceUnbound`, `DeviceReplaced`, `DeviceQuarantined`, `DeviceReleasedFromQuarantine` e `DeviceDecommissioned`.

Commands: `RegisterDevice`, `BindDeviceToTV`, `UnbindDeviceFromTV`, `ReplaceDevice`, `QuarantineDevice`, `ReleaseDeviceFromQuarantine` e `DecommissionDevice`.

## Ordering e auditoria

Ordering é por Device/revisão e, para exclusividade de papel, pela revisão do vínculo da TV. Command duplicado com mesmo conteúdo é idempotente. Evento atrasado pode completar um período passado, mas não reabre vínculo encerrado.

Cada mudança preserva Device, TV, papel, período, estado anterior/novo, ator, motivo, política, timestamps e correlação. Timestamp alegado pelo dispositivo não prevalece sobre decisão de vínculo; divergência de clock é preservada.

## Exemplos

**Válido:** troca de MiniPC fecha o vínculo A e abre B, mantendo a mesma TVIdentifier e criando nova EdgeInstallation.

**Válido:** serial repetido em dois Devices gera conflito/quarentena até investigação.

**Contraexemplo:** renomear o Device novo com o identificador do antigo para “facilitar” a troca.

**Contraexemplo:** apagar vínculo anterior depois da substituição.
