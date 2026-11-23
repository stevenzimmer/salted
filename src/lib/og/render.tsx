import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { imageUrl } from "@/components/cms/image";
import { shareImageSize, type ShareCard } from "./cards";

// Satori renders independently of the storefront stylesheet.
const cream = "#faf3e7";
const charcoal = "#292521";
const copperInk = "#945c39";
const photoWidth = 630;
const photoHeight = 630;
const fontFiles = [
  { family: "Lora", weight: 400, file: "Lora-Regular.ttf" },
  { family: "Lora", weight: 600, file: "Lora-SemiBold.ttf" },
  {
    family: "Barlow Condensed",
    weight: 600,
    file: "BarlowCondensed-SemiBold.ttf",
  },
] as const;

async function loadPhoto(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (response.ok && response.headers.get("content-type") === "image/jpeg") {
      return `data:image/jpeg;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    }
  } catch {
    // A temporary CDN failure falls back to the card's text layout.
  }
}

function CardArtwork({
  card,
  logo,
  photo,
}: {
  card: ShareCard;
  logo: string;
  photo?: string;
}) {
  const home = card.kind === "home";
  const logoWidth = home ? 410 : 250;
  const copyBlock = {
    display: "block",
    width: photo ? "100%" : "auto",
    maxWidth: "100%",
    wordBreak: "break-word",
  } as const;

  // The bitmap renderer consumes embedded images directly.
  /* eslint-disable @next/next/no-img-element */
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "48px 0px 48px 52px",
        gap: 48,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: cream,
        color: charcoal,
      }}
    >
      <div
        style={{
          display: "flex",
          width: photo ? 470 : 860,
          flexDirection: "column",
          alignItems: photo ? "flex-start" : "center",
          textAlign: photo ? "left" : "center",
        }}
      >
        <img
          src={logo}
          alt=""
          width={logoWidth}
          height={Math.round((logoWidth * 230) / 589)}
        />
        {home && card.tagline && (
          <div
            style={{
              ...copyBlock,
              marginTop: 24,
              marginBottom: 24,
              fontFamily: "Barlow Condensed",
              fontWeight: 600,
              fontSize: 33,
              lineHeight: 1.15,
              lineClamp: 3,
              letterSpacing: "0.12em",
              color: copperInk,
            }}
          >
            {card.tagline.toLowerCase()}
          </div>
        )}
        {!home && card.title && (
          <div
            style={{
              ...copyBlock,
              marginTop: 25,
              fontFamily: "Lora",
              fontWeight: 600,
              fontSize: 54,
              lineHeight: 1.08,
              lineClamp: 3,
              letterSpacing: "-0.045em",
            }}
          >
            {card.title.toLowerCase()}
          </div>
        )}
        {home && card.eyebrow && (
          <div
            style={{
              ...copyBlock,
              marginBottom: 12,
              fontFamily: "Barlow Condensed",
              fontWeight: 600,
              fontSize: 23,
              lineHeight: 1.2,
              lineClamp: 2,
              letterSpacing: "0.07em",
              color: copperInk,
            }}
          >
            {card.eyebrow.toLowerCase()}
          </div>
        )}
        {!home && card.price && (
          <div
            style={{
              ...copyBlock,
              marginTop: 18,
              fontFamily: "Barlow Condensed",
              fontWeight: 600,
              fontSize: 31,
              lineHeight: 1.1,
              lineClamp: 1,
              color: copperInk,
            }}
          >
            {card.price.toLowerCase()}
          </div>
        )}
        {!home && card.description && (
          <div
            style={{
              ...copyBlock,
              marginTop: 18,
              fontFamily: "Lora",
              fontSize: 25,
              lineHeight: 1.35,
              lineClamp: 4,
            }}
          >
            {card.description}
          </div>
        )}
      </div>
      {photo && (
        <img src={photo} alt="" width={photoWidth} height={photoHeight} />
      )}
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}

export async function renderShareCard(card: ShareCard): Promise<Response> {
  const photoUrl = imageUrl(
    card.photo,
    photoWidth,
    photoWidth / photoHeight,
    "jpg",
  );
  const [wordmark, fonts, photo] = await Promise.all([
    readFile(join(process.cwd(), "public/images/brand/hero-wordmark.png")),
    Promise.all(
      fontFiles.map(async ({ family, weight, file }) => ({
        name: family,
        weight,
        data: await readFile(join(process.cwd(), "src/lib/og/assets", file)),
      })),
    ),
    photoUrl ? loadPhoto(photoUrl) : undefined,
  ]);
  const logo = `data:image/png;base64,${wordmark.toString("base64")}`;
  const shareOptions = { ...shareImageSize, fonts };

  async function render(photo?: string) {
    const rendered = new ImageResponse(
      <CardArtwork card={card} logo={logo} photo={photo} />,
      shareOptions,
    );
    const bytes = await rendered.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          photoUrl && !photo ? "no-store" : "public, max-age=0, s-maxage=300",
      },
    });
  }

  try {
    return await render(photo);
  } catch (error) {
    if (!photo) throw error;
    return render();
  }
}
