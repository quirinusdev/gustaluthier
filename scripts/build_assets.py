"""
Gera os derivados web a partir dos pacotes oficiais (que NUNCA são alterados). Só o que o site usa:

- base (../Gusta_Luthieria_Assets_v1): grain, vinheta e a marca "G" (provisória até o SVG oficial)
- hero LIVE v3 (../Gusta_Hero_Exploded_LIVE_Assets_v3): layers, costuras, glow, UI do foco, vídeo de fumaça
- resultados (../Gusta_Resultados_Assets_v1): vídeos e posters, copiados sem alteração
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "Gusta_Luthieria_Assets_v1"
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

def main():
    meta = {}
    # grain: tile de 256px (é repetido via background-repeat)
    Image.open(SRC / "04_fx/grain_subtle.png").convert("RGBA").crop((0, 0, 256, 256)).save(
        OUT / "fx-grain_subtle.webp", "WEBP", quality=70, method=6)
    Image.open(SRC / "04_fx/vignette_black.png").convert("RGBA").resize((470, 836), Image.LANCZOS).save(
        OUT / "fx-vignette.webp", "WEBP", quality=80, method=6)

    # Marca "G": recorte + chave de luminância para remover o fundo escuro texturizado
    logo = Image.open(SRC / "06_brand/logo_reference_crop.png").convert("RGBA")
    mark = logo.crop((60, 14, 190, 148))
    px = mark.load()
    for y in range(mark.height):
        for x in range(mark.width):
            r, g, b, a = px[x, y]
            lum = max(r, g, b)
            alpha = max(0, min(255, int((lum - 48) * 255 / 70)))
            px[x, y] = (r, g, b, alpha)
    mark = mark.crop(mark.getchannel("A").getbbox())
    mark.save(OUT / "logo-mark.webp", "WEBP", quality=92, method=6)
    meta["logo"] = {"w": mark.width, "h": mark.height}

    print(json.dumps(meta, indent=1))
    for f in sorted(OUT.iterdir()):
        print(f.name, f.stat().st_size // 1024, "KB")


# ---------------------------------------------------------------------------
# HERO LIVE v3 — fonte oficial: Gusta_Hero_Exploded_LIVE_Assets_v3 (não alterada; pasta aninhada do zip)
# ---------------------------------------------------------------------------
LIVE_SRC = ROOT.parent / "Gusta_Hero_Exploded_LIVE_Assets_v3" / "Gusta_Hero_Exploded_LIVE_Assets_v3"
LIVE_OUT = OUT / "hero-live"


def _defringe_mask(fg, thr=16, depth=20):
    """Máscara do preto de recorte grudado nas bordas (QA 'fundo magenta' do spec v3).
    Cresce a partir do transparente, 1px por iteração, só por pixels com max(rgb) <= thr.
    Calculada na COMPOSIÇÃO GLOBAL: bordas internas entre layers vizinhos não são tocadas."""
    import numpy as np
    from PIL import ImageFilter
    a = np.array(fg.getchannel("A"))
    dark = np.array(fg.convert("RGB")).max(-1) <= thr
    removed = a == 0
    for _ in range(depth):
        grown = np.array(Image.fromarray((removed * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 0
        new = grown & dark & ~removed
        if not new.any():
            break
        removed |= new
    return removed & (a > 0)


SEAM_BLEED = 28  # px do canvas
VIDEO_DARKEN = 0.38     # multiplicador de cor do vídeo de fumaça (fundo bem escuro)
VIDEO_LOOP_XFADE = 2.0  # s de crossfade fim→início (esconde o corte do loop)


def _seam_bleed_alpha(own, glob, k=SEAM_BLEED):
    """Alfa da costura: 1 junto ao recorte → 0 a k px, só onde a composição global tem objeto."""
    import numpy as np
    from PIL import ImageFilter
    dist = np.zeros(own.shape, np.float32)
    cur = Image.fromarray((own * 255).astype("uint8"))
    prev = own.copy()
    for d in range(1, k + 1):
        cur = cur.filter(ImageFilter.MaxFilter(3))
        now = np.array(cur) > 0
        dist[now & ~prev] = d
        prev = now
    a = np.where((dist > 0) & glob, 1.0 - (dist - 1) / k, 0.0)
    return a.astype(np.float32)


def hero_live():
    """Layers transparentes (canvas inteiro 941x1672, sem recorte), WebP lossless.
    Única alteração: alfa=0 no preto de recorte conectado ao transparente (RGB intacto).
    Gera src/lib/hero-live.json (bbox por layer + disponibilidade do vídeo do Flow)."""
    import json, shutil, subprocess
    import numpy as np
    LIVE_OUT.mkdir(parents=True, exist_ok=True)
    layers = sorted((LIVE_SRC / "02_LAYERS_FULL_CANVAS").glob("*_clean.png"))
    imgs = {p.stem.replace("_clean", ""): Image.open(p).convert("RGBA") for p in layers}

    glob_fg = Image.new("RGBA", (941, 1672), (0, 0, 0, 0))
    for im in imgs.values():
        glob_fg.alpha_composite(im)
    kill = _defringe_mask(glob_fg)
    meta = {"canvas": {"w": 941, "h": 1672}, "layers": {}, "defringe": {"thr": 16, "depth": 20, "pixels": int(kill.sum())},
            "seamBleed": SEAM_BLEED}
    for im in imgs.values():
        a = np.array(im.getchannel("A")); a[kill] = 0; im.putalpha(Image.fromarray(a))
    glob_fg = Image.new("RGBA", (941, 1672), (0, 0, 0, 0))
    for im in imgs.values():
        glob_fg.alpha_composite(im)
    g_rgba = np.array(glob_fg).astype(np.float32)

    for name, im in imgs.items():
        own = np.array(im).astype(np.float32)
        bleed_a = _seam_bleed_alpha(own[..., 3] > 0, g_rgba[..., 3] > 0)
        # costura: fora do próprio recorte, pixels do PRÓPRIO master (composição global), com fade linear.
        # Alinhado = pixels idênticos aos do vizinho (invisível); com flutuação = cobre a fresta.
        # peça pura (alfa real) e costura em arquivo separado: a costura some na peça ativa / montagem
        im.save(LIVE_OUT / f"{name}.webp", "WEBP", lossless=True, method=6)
        seam = np.zeros_like(own)
        m = (own[..., 3] == 0) & (bleed_a > 0)
        seam[m, :3] = g_rgba[m, :3]
        seam[m, 3] = g_rgba[m, 3] * bleed_a[m]
        seam_im = Image.fromarray(seam.round().astype(np.uint8), "RGBA")
        sb = seam_im.getchannel("A").getbbox()
        # recortada na própria área (posição exata gravada no JSON): muito menos raster que o canvas inteiro
        # lossy: é um fade suave (não precisa de lossless) e decodifica bem mais rápido no 1º zoom
        seam_im.crop(sb).save(LIVE_OUT / f"{name}_seam.webp", "WEBP", quality=82, alpha_quality=80, method=6)
        meta.setdefault("seams", {})[name] = list(sb)
        meta["layers"][name] = list(im.getchannel("A").getbbox())  # bbox da peça (sem a costura)

    # a guitarra montada (04_FINAL_ASSEMBLED) não é mais usada: ao fim do exploded fica só o fundo + CTA
    shutil.copyfile(LIVE_SRC / "01_BACKGROUND_FLOW" / "background_static_fallback_1080x1920.jpg", LIVE_OUT / "background_fallback.jpg")
    # focus_glow_soft.svg rasterizado UMA vez (mesmo gradiente radial do SVG: #E61E25 .42 → .18 @35% → 0 @r155/160):
    # como bitmap, o zoom da câmera só reescala a textura (o vetor era re-rasterizado a cada mudança de escala)
    n = 640; c = (n - 1) / 2; yy, xx = np.mgrid[0:n, 0:n]
    t = np.hypot(xx - c, yy - c) / (n * 155 / 320)
    a_ = np.interp(t, [0, 0.35, 1.0], [0.42, 0.18, 0.0]); a_[t > 1] = 0
    g = np.zeros((n, n, 4), np.uint8); g[..., 0], g[..., 1], g[..., 2] = 0xE6, 0x1E, 0x25; g[..., 3] = (a_ * 255).round()
    Image.fromarray(g, "RGBA").save(LIVE_OUT / "focus_glow_soft.webp", "WEBP", quality=90, alpha_quality=90, method=6)
    for svg in ("focus_ring", "focus_arrow"):
        shutil.copyfile(LIVE_SRC / "05_UI_GLOW" / f"{svg}.svg", LIVE_OUT / f"{svg}.svg")

    # Vídeo do Flow: entra sozinho quando existir com o nome contratado (não inventamos outro).
    # Vídeo de fumaça: 1º o nome contratado do Flow; senão o vídeo entregue em "../hero animado/".
    candidates = [LIVE_SRC / "01_BACKGROUND_FLOW" / "smoke_background_loop.mp4",
                  *sorted((ROOT.parent / "hero animado").glob("*.mp4"))]
    video = next((p for p in candidates if p.exists()), None)
    meta["video"] = bool(video)
    meta["videoMobile"] = False
    if video:
        meta["videoSource"] = str(video.relative_to(ROOT.parent)).replace("\\", "/")
        out_mp4 = LIVE_OUT / "smoke_background_loop.mp4"
        try:
            dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                        str(video)], check=True, capture_output=True, text=True).stdout.strip())
            xf = VIDEO_LOOP_XFADE
            dark = f"colorchannelmixer=rr={VIDEO_DARKEN}:gg={VIDEO_DARKEN}:bb={VIDEO_DARKEN}"
            # Loop sem emenda: o trecho [xf, fim] termina em crossfade com o trecho [0, xf] do próprio vídeo.
            # O último quadro passa a ser o quadro "xf" do original = 1º quadro do loop → sem corte ao reiniciar.
            # Escurecimento aplicado na codificação (custo zero em runtime). Sem áudio; moov no início.
            fc = (f"[0:v]trim=start={xf},setpts=PTS-STARTPTS[main];"
                  f"[0:v]trim=end={xf},setpts=PTS-STARTPTS[head];"
                  f"[main][head]xfade=transition=fade:duration={xf}:offset={dur - 2 * xf:.3f},{dark},format=yuv420p[v]")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-filter_complex", fc, "-map", "[v]", "-an",
                            "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-r", "24", "-movflags", "+faststart",
                            str(out_mp4)], check=True, capture_output=True)
            # poster = 1º quadro do loop final (já escurecido): sem salto quando o vídeo começa a tocar
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out_mp4), "-frames:v", "1", "-q:v", "4",
                            str(LIVE_OUT / "smoke_background_poster.jpg")], check=True, capture_output=True)
            meta["videoProcessing"] = {"darken": VIDEO_DARKEN, "loopCrossfadeSec": xf, "loopSec": round(dur - xf, 3)}
        except Exception as e:  # noqa: BLE001
            print("ffmpeg indisponível — vídeo copiado sem otimização:", e)
            shutil.copyfile(video, out_mp4)

    (ROOT / "src" / "lib" / "hero-live.json").write_text(json.dumps(meta, indent=2))
    # mapa oficial de profundidade/flutuação/parallax, usado tal como veio no pacote
    shutil.copyfile(LIVE_SRC / "06_MOTION_MAP" / "living_pieces_motion_map.json", ROOT / "src" / "lib" / "living_pieces_motion_map.json")
    for f in sorted(LIVE_OUT.iterdir()):
        print("hero-live/" + f.name, f.stat().st_size // 1024, "KB")
    print("defringe px:", meta["defringe"]["pixels"], "| vídeo Flow:", meta["video"])


RESULTS_SRC = ROOT.parent / "Gusta_Resultados_Assets_v2" / "Gusta_Resultados_Assets_v2"


def results():
    """Resultados v2: previews dos cards, versão de tela cheia do 04 (01_VIDEOS) e posters (02_POSTERS), sem alteração."""
    import shutil
    out = OUT / "resultados"
    out.mkdir(parents=True, exist_ok=True)
    for f in [*sorted((RESULTS_SRC / "01_VIDEOS").glob("*.mp4")), *sorted((RESULTS_SRC / "02_POSTERS").glob("*.jpg"))]:
        shutil.copyfile(f, out / f.name)
        print("resultados/" + f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    import sys
    if "--live-only" in sys.argv:
        hero_live()
    else:
        main()
        hero_live()
        results()
