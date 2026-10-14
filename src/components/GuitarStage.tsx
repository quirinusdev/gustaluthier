import { CANVAS, FOCUS_ZONES, HERO_MEDIA, LAYER_ORDER, SEAM_BOX, layerCenter, type ServiceId } from "@/lib/scene";
import HeroBackground from "./HeroBackground";
import { asset } from "@/lib/base";

const L = asset("/assets/hero-live");
const SERVICES: ServiceId[] = ["regulagem", "manutencao", "customizacao"];
const GLOW_R = 240; // raio do focus_glow_soft no canvas (≈ 94 px de tela no hero mobile)

/**
 * Stage do hero — LIVE v3 (Gusta_Hero_Exploded_LIVE_Assets_v3), camadas do spec:
 *  0  fundo independente (vídeo do Flow quando existir; senão fallback estático) — não segue o scroll
 *  1  rig/câmera: núcleo + 8 peças com alfa real. Cada peça tem 3 wrappers com UMA responsabilidade:
 *       .part-scroll  → GSAP/ScrollTrigger aprovado (ênfase do foco)
 *       .part-float   → microflutuação contínua
 *       .part-pointer → parallax do mouse (desktop)
 *  2  glow da peça ativa (dentro da própria peça, atrás da imagem)
 *  3  hotspot (focus_ring) + seta (linha + ponta de focus_arrow), só transform/opacity
 *  4  textos/UI (no fluxo da página, acima do stage)
 * Não existe nenhuma outra guitarra no stage: ao fim do exploded resta só o fundo animado + formulário.
 */
export default function GuitarStage() {
  return (
    <div className="stage" aria-hidden="true">
      <div className="stage-inner">
        <HeroBackground video={HERO_MEDIA.video} />

        {/* .exploded-stage: guitarra/peças + setas + hotspots. Sai inteiro num fade limpo antes do formulário. */}
        <div className="exploded-stage">
        <div className="rig" style={{ width: CANVAS.w, height: CANVAS.h }}>
          {LAYER_ORDER.map((id, i) => {
            const c = layerCenter(id);
            const glows = SERVICES.flatMap((s) => FOCUS_ZONES[s].filter((z) => z.layer === id).map((z) => ({ s, at: z.at })));
            return (
              <div key={id} className="part-scroll" data-layer={id} style={{ zIndex: i + 1 }}>
                <div className="part-float" data-float={id} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
                  <div className="part-pointer" data-pointer={id}>
                    {glows.map((g) => (
                      <img
                        key={g.s}
                        className="focus-glow"
                        data-glow={g.s}
                        src={`${L}/focus_glow_soft.webp`}
                        style={{ left: g.at.x - GLOW_R, top: g.at.y - GLOW_R, width: GLOW_R * 2, height: GLOW_R * 2 }}
                        alt=""
                      />
                    ))}
                    {/* costura: pixels do próprio master além do recorte (fade); cobre as frestas da microflutuação */}
                    <img
                      className="part-seam"
                      data-seam={id}
                      src={`${L}/${id}_seam.webp`}
                      style={{ left: SEAM_BOX[id][0], top: SEAM_BOX[id][1], width: SEAM_BOX[id][2] - SEAM_BOX[id][0], height: SEAM_BOX[id][3] - SEAM_BOX[id][1] }}
                      alt=""
                      decoding="async"
                    />
                    <img className="part-image" data-image={id} src={`${L}/${id}.webp`} alt="" decoding="async" fetchPriority={i < 3 ? "high" : undefined} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="dim" />
        <div className="shade shade-top" />
        <div className="shade shade-bottom" />
        <div className="shade shade-full" />
        <div className="vignette" />
        <div className="grain" />
        <div className="exploded-stage exploded-ui">
        {/* seta: só transforms (sem SVG/layout por frame). A âncora fica na borda do card e gira para o hotspot;
            a linha "desenha" do hotspot até o card (scaleX) e a ponta (focus_arrow.svg) aponta para a peça. */}
        {SERVICES.map((id) => (
          <div key={id} className="leader" data-line={id}>
            <div className="leader-len"><div className="leader-draw" /></div>
            <div className="leader-head"><img src={`${L}/focus_arrow.svg`} alt="" /></div>
          </div>
        ))}
        {SERVICES.map((id) => (
          <div key={id} className="hotspot" data-hotspot={id}>
            <div className="hotspot-follow" data-hotspot-follow={id}>
              <img src={`${L}/focus_ring.svg`} alt="" />
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
