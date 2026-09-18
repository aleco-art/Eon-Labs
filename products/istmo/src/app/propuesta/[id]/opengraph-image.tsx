import { ImageResponse } from "next/og";
import { excerpt, sharePhoto, shareData } from "@/lib/share";
import { siteName } from "@/lib/site";

// The card WhatsApp, Instagram and the rest show when someone pastes a proposal link.
export const alt = "Propuesta ciudadana en Istmo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BLUE = "#0b3d8c";
const RED = "#d21034";
const INK = "#0f1d33";
const MUTED = "#56637b";
const LINE = "#e1e6ef";

// Brand type, fetched once per instance. If the CDN is slow the card still renders in the default face.
const font = (weight: number) =>
  fetch(`https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5/files/dm-sans-latin-${weight}-normal.woff`, {
    signal: AbortSignal.timeout(3000),
  })
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
const fonts = Promise.all([font(400), font(800)]);

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("es-PA")} ${n === 1 ? one : many}`;

function Mark() {
  // Same four quarters as the logo in the top bar.
  return (
    <svg width="44" height="44" viewBox="0 0 32 32">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#fff" stroke={LINE} />
      <path d="M16 1h7a8 8 0 0 1 8 8v7H16z" fill={RED} />
      <path d="M1 16h15v15H9a8 8 0 0 1-8-8z" fill={BLUE} />
      <path d="m8.5 4.6 1 3h3.1l-2.5 1.8.9 3-2.5-1.8L6 12.4l.9-3-2.5-1.8h3.1z" fill={BLUE} />
      <path d="m23.5 19.6 1 3h3.1l-2.5 1.8.9 3-2.5-1.8-2.5 1.8.9-3-2.5-1.8h3.1z" fill={RED} />
    </svg>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, photo, [regular, bold]] = await Promise.all([shareData(id), sharePhoto(id), fonts]);
  const name = siteName();
  const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://istmoapp.digital").host;
  const options = {
    ...size,
    fonts: [
      ...(regular ? [{ name: "DM Sans", data: regular, weight: 400 as const, style: "normal" as const }] : []),
      ...(bold ? [{ name: "DM Sans", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ],
  };

  // A hidden or missing proposal gets the plain brand card, never an error image.
  if (!data)
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fff", fontFamily: "DM Sans" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mark />
            <span style={{ fontSize: 44, fontWeight: 800, color: BLUE }}>{name.toLowerCase()}</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 52, fontWeight: 800, color: INK }}>Propuestas ciudadanas para Panamá</div>
        </div>
      ),
      options,
    );

  const p = data.proposal;
  const title = p.title.length > 110 ? p.title.slice(0, p.title.lastIndexOf(" ", 107)) + "…" : p.title;
  const titleSize = title.length > 80 ? 46 : title.length > 50 ? 54 : 62;
  const goal = p.signature_goal ?? 0;
  const showSignatures = p.signatures_enabled || p.signature_count > 0;
  const progress = goal ? Math.min(1, p.signature_count / goal) : 0;
  // Without a photo the first lines of the body fill the space, but only as much as fits
  // above the signature block: a bar and a long title leave room for less.
  const excerptMax = (showSignatures ? (goal ? 80 : 105) : 150) - (title.length > 50 ? 25 : 0);
  // Zeros make a new proposal look abandoned when shared, so only what it already has is shown.
  const support = [
    p.like_count ? plural(p.like_count, "apoyo", "apoyos") : "",
    p.comment_count ? plural(p.comment_count, "comentario", "comentarios") : "",
    p.reshare_count ? plural(p.reshare_count, "republicación", "republicaciones") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", fontFamily: "DM Sans", color: INK }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 10, display: "flex" }}>
          <div style={{ width: "50%", height: "100%", background: BLUE }} />
          <div style={{ width: "50%", height: "100%", background: RED }} />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "58px 56px 48px 64px", minWidth: 0 }}>
          <div style={{ display: "flex", flexShrink: 0, fontSize: 22, fontWeight: 800, letterSpacing: 2, color: RED }}>
            {`PROPUESTA CIUDADANA · ${p.category.toUpperCase()}`}
          </div>
          <div style={{ display: "flex", flexShrink: 0, marginTop: 18, fontSize: titleSize, fontWeight: 800, lineHeight: 1.12, color: INK }}>{title}</div>
          <div style={{ display: "flex", flexShrink: 0, marginTop: 16, fontSize: 26, color: MUTED }}>
            {`${data.place}${p.profiles?.name ? " · por " + p.profiles.name : ""}`}
          </div>
          {!photo && (
            <div style={{ display: "flex", flexShrink: 0, marginTop: 22, marginBottom: 18, fontSize: 30, lineHeight: 1.4, color: INK, maxWidth: 1000 }}>
              {excerpt(p.body, excerptMax)}
            </div>
          )}

          <div style={{ flex: 1, display: "flex" }} />

          {showSignatures ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: RED }}>{p.signature_count.toLocaleString("es-PA")}</span>
                <span style={{ fontSize: 28, color: INK }}>
                  {`${p.signature_count === 1 ? "firma" : "firmas"}${goal ? " de " + goal.toLocaleString("es-PA") : ""}`}
                </span>
              </div>
              {goal > 0 && (
                <div style={{ display: "flex", marginTop: 12, width: "100%", height: 18, borderRadius: 9, background: "#fdecef" }}>
                  <div style={{ width: `${Math.max(progress * 100, 3)}%`, height: "100%", borderRadius: 9, background: RED }} />
                </div>
              )}
              {support && <div style={{ display: "flex", marginTop: 14, fontSize: 22, color: MUTED }}>{support}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 28, fontWeight: support ? 400 : 800, color: support ? INK : BLUE }}>
              {support || "Sé de las primeras personas en apoyarla"}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30 }}>
            <Mark />
            <span style={{ fontSize: 30, fontWeight: 800, color: BLUE }}>{name.toLowerCase()}</span>
            <span style={{ fontSize: 22, color: MUTED, marginLeft: 8 }}>
              {`${showSignatures ? "Apóyala y fírmala" : "Apóyala"} en ${host}`}
            </span>
          </div>
        </div>

        {photo && (
          <div style={{ width: 430, height: "100%", display: "flex", paddingTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the image generator, not the browser */}
            <img src={photo} alt="" width={430} height={620} style={{ width: 430, height: 620, objectFit: "cover" }} />
          </div>
        )}
      </div>
    ),
    options,
  );
}
