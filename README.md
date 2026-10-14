# Gusta Luthieria — Landing page

Next.js 16 + React 19 + GSAP/ScrollTrigger. Implementação do storyboard aprovado (`../Gusta_Luthieria_SPEC_DRIVEN.pdf`).

```bash
npm install
npm run dev      # http://localhost:3107
npm run build && npm start
npm run assets   # regenera os assets (requer Python + Pillow + numpy; ffmpeg para o vídeo): base, hero LIVE v3 e resultados
```

## Onde mexer

| O quê | Arquivo |
|---|---|
| Copy (placeholders) | `src/lib/content.ts` — `{texto}` vira destaque vermelho |
| WhatsApp / Instagram | `src/lib/site.ts` — vazio = CTAs apontam para `#contato` (nenhum link fictício) |
| Enquadramentos de câmera por label | `src/lib/scene.ts` → `getShots()` |
| Ênfase por serviço (layers ativos, transforms, opacidade) | `src/lib/scene.ts` → `FOCUS_JSON`, `OTHERS_OPACITY` |
| Flutuação / mouse / profundidade | `src/lib/living_pieces_motion_map.json` (do pacote) + `src/lib/living.ts` |
| Saída do exploded (fade final) | `src/lib/narrative.ts` → ramo `cta` (`.exploded-stage`) |
| Timeline / ScrollTrigger | `src/lib/narrative.ts` |
| Resultados (vídeos reais) | `src/components/Results.tsx` + `public/assets/resultados/` |

## Arquitetura

### Hero LIVE v3

A fonte oficial é `../Gusta_Hero_Exploded_LIVE_Assets_v3/Gusta_Hero_Exploded_LIVE_Assets_v3/` (pasta aninhada pelo zip). Ela não foi alterada. `npm run assets` gera `public/assets/hero-live/` e `src/lib/hero-live.json`.

**Camadas, conforme o spec v3:**

| Camada | O que é | Onde |
|---|---|---|
| 0 | Vídeo de fumaça sobre o fallback estático `background_static_fallback_1080x1920.jpg` | `.hero-bg` |
| 1 | Núcleo + 8 peças com alfa real, em canvas inteiro 941×1672 e transform identity, na ordem de z-index do pacote anterior | `.part-scroll` |
| 2 | `focus_glow_soft` atrás da peça ativa | dentro de `.part-pointer` |
| 3 | Hotspot (`focus_ring.svg`) e seta (traço + ponta de `focus_arrow.svg`), só transform/opacity | `.hotspot`, `.leader` |
| 4 | Textos e UI existentes | fluxo da página |

**Três wrappers por peça, cada um com uma única responsabilidade:**
- `.part-scroll`: GSAP/ScrollTrigger aprovado (`narrative.ts`).
- `.part-float`: microflutuação contínua (`living.ts`).
- `.part-pointer`: parallax do mouse no desktop (`living.ts`, suavizado no mesmo ticker).

**Flutuação e mouse**
- Os valores vêm de `06_MOTION_MAP/living_pieces_motion_map.json`, copiado para `src/lib/`, lidos em px do canvas.
- As senoides são determinísticas, com período e fase próprios por layer, num único `gsap.ticker`.
- A peça ativa flutua a 0,35×; ela desacelera mas não congela.
- O mouse usa um único `pointermove`, com o cursor normalizado pela viewport (sem `getBoundingClientRect`). `pointerleave` volta a 0. Não roda em touch.
- O hotspot e o início da seta acompanham a peça ativa.

**Foco**
- Usa os layers ativos e transforms do pacote anterior, com escala da ativa ≥ 1,045.
- As demais peças ficam em ≥ 0,78 de opacidade.
- A peça ativa recebe um rim vermelho estático: um `drop-shadow` aplicado só nela, ligado no momento do foco e nunca animado por frame.
- **Sequência de entrada** (`FOCUS_FX` em `narrative.ts`, frações de viewport de scroll a partir do fim do segmento):
  1. glow da peça (`-0,12`);
  2. rim (`-0,06`);
  3. hotspot com `scale` 0,75 → 1 (`-0,03`);
  4. a seta desenha do hotspot até o card (`scaleX`, `+0,04`);
  5. o card entra com `y` 10 → 0 (`+0,12`).
- **Saída**, curta e invertida antes da próxima, em 0,12u: card → a seta recolhe para a peça → hotspot e ponta → glow.
- **Seta** (`.leader`): elementos HTML com transform/opacity apenas, em uma única camada composta.
  - A âncora fica na borda do card e gira até o hotspot.
  - O comprimento entra como `scaleX`.
  - A ponta é o próprio `focus_arrow.svg`, recortado com a mesma escala do marcador SVG anterior.
  - Antes era um `<path>` SVG reescrito a cada frame, o que gerava layout + paint com `drop-shadow`.
- **Pulso do hotspot:** discreto (0,95 ↔ 1,03, 2,8 s), via compositor.

**Fechamento**
- A câmera mantém o enquadramento da última etapa (orçamento): nada se afasta, encolhe ou vai para o centro.
- Tudo da etapa (guitarra, peças, setas, hotspots) fica em `.exploded-stage` e sai junto num fade limpo: `autoAlpha` 1 → 0 e `scale` 1 → 0,98, de `0,74·cD` a `0,94·cD`. No fim fica `visibility: hidden` (não usa `display: none`, para a timeline scrubbed continuar reversível).
- A flutuação para junto com o fade. Não há convergência, flash nem brilho central.
- Os véus (dim/shades) só mudam depois que a guitarra já sumiu.
- Ao fim resta só o fundo animado + formulário + rodapé.

**Resultados (seção 05, `Results.tsx`), que substitui "Como pedir seu orçamento"**
- **Fonte:** `../Gusta_Resultados_Assets_v2/.../01_VIDEOS` e `02_POSTERS`, copiados sem alteração para `public/assets/resultados/`.
  - Os 01–03 são idênticos aos da v1.
  - O Resultado 04 (IMG_3790) tem preview leve no card (`resultado_04_guitarra_preta_preview.mp4`, sem áudio) e versão própria de tela cheia (`…_fullscreen.mp4`, 12 s, com áudio).
  - A versão de tela cheia só carrega quando a pessoa abre e é descarregada ao fechar.
  - Vídeos: 720×1280, H.264, sem áudio.
  - Spec: `03_DOCS/Gusta_Luthieria_SPEC_Resultados_v1.pdf`.
- **Layout:** título "Resultados", subtexto neutro, um card 9:16 por vez (contorno vermelho sutil), "01 / 03" + 3 dots e a dica "Arraste ou role…".
  - Não há texto atribuindo serviço a um vídeo.
  - Não há CTA de WhatsApp na seção (a conversão continua no formulário).
- **Mini-sequência pinned:** seção de 335svh (4 resultados × 0,75 de rolagem). A trilha interna transborda 92svh por baixo do painel do formulário, para o card continuar preso até o crossfade.
  - Unidades de viewport a partir do topo da seção no fundo da tela:
    - entrada (`autoAlpha` 0→1, `y` 24→0, `scale` 0,985→1): 0,25 → 0,75;
    - trocas de card: 1,75, 2,50 e 3,25 (crossfade de 0,4 s + translateY de 14px);
    - saída: 4,03 → 4,21, sobreposta à entrada do formulário.
  - A timeline é própria e isolada da narrativa do exploded, com o mesmo `scrub: 0.55`.
- **Narrativa do exploded:** só lê o início e o fim de `#resultados` (etapa "orcamento" da câmera e o fechamento). Nada mais mudou nela.
  - Comparada à build anterior nas mesmas posições (câmera, layers e véus), a diferença é ≤ 0,004.
- **Vídeo:** só o card ativo reproduz (preview `muted`/`playsInline`, em `loop` enquanto está ativo).
  - Perdeu o foco: `pause()` imediato. Fora da faixa ou com a aba oculta: tudo pausado.
  - Carregamento progressivo:
    - posters ao se aproximar da seção;
    - `src` só do card ativo;
    - o próximo baixa apenas metadata;
    - nada carrega no load da página.
  - Toque no card: play/pause. O botão de play aparece se o autoplay for bloqueado ou se a pessoa pausar.
  - Arrastar na horizontal ou tocar nos dots rola até o card correspondente.
- **Fumaça de fundo:** enquanto um resultado reproduz, ela fica parada no quadro atual (sem reiniciar) e volta do mesmo ponto depois.
  - Motivo: com os dois vídeos decodificando juntos, o scroll caía de 60 para 30 fps (Chrome DevTools).
  - Isso é controlado em `Results.tsx`; `HeroBackground.tsx` não mudou.
- **Tela cheia:** abre pelo botão discreto no canto superior direito de cada card ou com um toque no card ativo. Arrastar continua trocando de card.
  - Um único player genérico para todos os resultados. Toca `full` quando o item tem (o 04), senão o próprio vídeo.
  - O 04 continua do mesmo momento: o preview é o trecho 5–12 s do original e a versão completa é 2–14 s (`fullOffset: 3`).
  - O som só entra depois do toque/clique que abre.
  - Desktop/Android: Fullscreen API num overlay preto com o vídeo inteiro (`object-fit: contain`), controles nativos (play/pause/seek/volume) e botão fechar.
  - iPhone (sem fullscreen de elemento): `webkitEnterFullscreen()` no vídeo do player de tela cheia (player nativo), com o overlay por trás como reserva.
  - Sem nenhum dos dois: o mesmo overlay como modal fixo (`100vw × 100dvh`, `z-index` 100, em portal no `<body>`).
  - Ao abrir: o vídeo do card pausa, o da tela cheia continua do mesmo ponto e a página não rola (`html.is-viewing`).
  - Ao fechar (X, Esc ou saída do fullscreen): mesma posição de scroll, mesmo card, e o vídeo do card continua de onde a pessoa parou.
  - Entrar e sair da tela cheia não reconstrói a narrativa (`Landing.tsx` ignora esse resize). Nunca dois vídeos tocam juntos (a fumaça também pausa).
- **prefers-reduced-motion:** sem pin nem transições. Os 3 cards ficam em fluxo normal, sem autoplay, e tocam por toque (um por vez). Toque abre a tela cheia.
- **Menu:** "Orçamento" virou "Resultados" (`#resultados`), porque a seção antiga não existe mais.

**Formulário de orçamento (seção final, `QuoteForm.tsx`)**
- Substitui os botões duplicados de WhatsApp/Instagram. O Instagram fica só como link de apoio no rodapé.
- 4 campos (Nome, Instrumento, Serviço, Descrição curta opcional, até 240 caracteres) e 1 CTA, "Enviar pelo WhatsApp".
- Nome, instrumento e serviço são obrigatórios.
- Sem backend: monta a mensagem e abre `wa.me/<número>?text=` (com `encodeURIComponent`), usando o número de `src/lib/site.ts`.
- **Entrada:** faz parte da timeline principal (scrubbed), numa seção final pinned (`.panel--cta`, `margin-top: -90svh`, `height: 220svh`) que sobrepõe o fim do encerramento.
  - O formulário começa a entrar em `cS + 0,78·cD`, logo depois de o fade do exploded começar (`0,74·cD`): é um crossfade, sem zona morta.
  - Ordem: título/subtítulo, container, campos em stagger, botão por último. Tudo termina em `tCta + 0,12·vh`.
  - O pin só libera em `tCta + 0,3·vh`, com o formulário completo. Depois o rodapé (`.block--footer`) entra em fluxo normal.
  - O encerramento continua ancorado no fim do `#orcamento`, nos mesmos px de antes.
  - O link "Contato" usa `scroll-margin-top` para chegar já com o formulário visível.
- Um campo em foco (teclado virtual) não dispara reconstrução da narrativa.

**Vídeo de fumaça (camada 0, `HeroBackground.tsx`)**
- Fonte: `../hero animado/c.mp4` (720×1280, 24 fps, 8 s). Se um dia existir `01_BACKGROUND_FLOW/smoke_background_loop.mp4`, ele tem prioridade.
- `npm run assets` reprocessa o vídeo:
  - escurece as cores com um multiplicador de 0,38 (`VIDEO_DARKEN`);
  - faz um loop sem emenda: os últimos 2 s fazem crossfade com os 2 primeiros (`VIDEO_LOOP_XFADE`), e o loop fica com 6 s;
  - remove a trilha de áudio, aplica `+faststart` e gera o poster a partir do 1º quadro do loop final.
- O vídeo fica sobre o fallback estático, com `object-fit: cover`, `muted autoplay loop playsInline preload="metadata"` e `pointer-events: none`.
- Não tem nenhum vínculo com o GSAP/ScrollTrigger.
- Se o vídeo falhar (inclusive antes da hidratação), ele é removido e o fallback estático aparece.
- Pausa com a aba oculta e com `prefers-reduced-motion` (fica o poster).
- `.hero-bg` usa `isolation: isolate`: o z-index do vídeo só vale contra o fallback, e a camada 0 inteira fica atrás das peças e da UI.

### Tratamentos nos assets (feitos no build; os originais ficam intactos)

**Halo preto removido do alfa**
- Os PNGs "clean" ainda trazem uma borda de preto puro grudada (foi reprovada no teste de fundo magenta).
- O script zera o alfa só do preto (max RGB ≤ 16) conectado ao transparente: 67.125 px, todos com brilho ≤ 16.
- O RGB não é alterado.

**Costura entre recortes (`*_seam.webp`)**
- Os layers são polígonos que dividem uma única imagem, e braço e corpo atravessam vários deles. Flutuando de forma independente, as frestas abriam faixas escuras.
- Cada peça ganha uma margem de 28 px com fade, feita de pixels do próprio master. Alinhada, é invisível. Ela some na peça ativa, para não arrastar uma faixa-fantasma.

**Glow:** `focus_glow_soft.svg` é rasterizado uma vez, com o mesmo gradiente, para não ser re-rasterizado a cada zoom.

### Timeline e performance
- Timeline única: `scrub: 0.55` e `ease: "none"`. 1 unidade de tempo = 1 px de scroll, determinística e reversível.
- Tweens em `fromTo` explícito, pré-inicializados no carregamento.
- `.part-float` tem `will-change: transform`. Sem isso, o primeiro zoom re-rasterizava as 9 peças (frames de ~1 s).
- `.part-pointer` só tem `will-change` em ponteiro fino (mouse). No touch seriam 9 camadas ociosas.
- **Camada de vida (`living.ts`)**, com as constantes em `LIVING`:
  - uma escrita de transform por wrapper;
  - parallax suavizado no próprio ticker, sem recriar 18 tweens por evento;
  - peças ativas pré-calculadas por foco;
  - `scrollY` em cache lido no evento de scroll. Lido dentro do tick, ele forçava recálculo de estilo de 0,3–0,8 ms por frame, medido.
- **Medição** (Chrome DevTools, build de produção, 390×844, CPU 4×), frames > 20 ms:

  | Cenário | Antes | Depois |
  |---|---|---|
  | Parado no foco de Regulagem | 25% | 12% |
  | Parado no foco de Manutenção | 38% | 14–17% |
  | Desktop com mouse, intro | 33% | 4–6% |
  | Desktop com mouse, Regulagem | 83% | 36–40% |

  - Em foco parado (1×), o tick da vida caiu de ~82 para ~2 ms/s e o Paint de 7 para 0 ms/s.
- **Reduced motion:** sem flutuação nem mouse; estados aplicados sem animação.
- **Backups:** `_backup/hero-v2-pre-final/`, `_backup/hero-final-pre-live/`, `_backup/pre-resultados/`, `_backup/pre-setas-perf/`, `_backup/pre-fullscreen/` e `_backup/pre-resultado04/` (fora da compilação).

## Limitações conhecidas (assets)

- O storyboard mostra uma foto que não está no pacote: luthier trabalhando (frame 04). Usei o close da própria guitarra no lugar dela.
- A logo é um recorte provisório da referência de identidade (`logo-mark.webp`). Substituir pelo SVG oficial.
