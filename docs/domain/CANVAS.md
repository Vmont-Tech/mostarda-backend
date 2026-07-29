# Canvas Engine

Canvas é o compositor gráfico declarativo do Edge. Converte uma `CanvasComposition` versionada em regiões e camadas renderizáveis; não decide conteúdo comercial, preço ou resolução pública de QR/NFC.

## Modelo de composição

Uma composição contém `Regions`, `Layers`, `Templates`, `SafeAreas`, `AspectRatio`, `Resolution`, prioridades e janela de scheduling. Cada `Layer` tem `z-index`, visibilidade, geometria, opacidade, animação, fonte e política de fallback. Conflitos são resolvidos por prioridade explícita: emergência, segurança/acessibilidade, conteúdo contratado, informação e decoração.

| Elemento | Regra |
| --- | --- |
| Video / Live / PIP | Respeitam região, aspect ratio, buffer e prioridade do Player. |
| QR / NFC overlay | Renderizam token/referência fornecida pelo Cloud; não contêm destino final nem resolvem interação. |
| Subtitles / Ticker / Widgets | Respeitam safe area, acessibilidade, template e política de tempo. |
| Border Ads | Ocupam apenas regiões declaradas, sem encobrir conteúdo ou emergência. |
| Emergency | Preempta Layers inferiores, registra entrada/saída e restaura composição compatível. |

`CanvasComposition` é Aggregate do Canvas: versão, template, regiões, layers, prioridades e política de fallback. Assets do Canvas incluem `RenderingCapabilities`, `OutputProfiles`, `SafeAreaPolicy`, `TemplateLibrary`, `LayerPolicy` e `AnimationPolicy`; Services incluem layout, render e validação; Policies limitam formatos, z-index, acessibilidade e preempção; Events incluem `CompositionApplied`, `LayerRenderFailed`, `SafeAreaViolationDetected` e `EmergencyLayerActivated`.
