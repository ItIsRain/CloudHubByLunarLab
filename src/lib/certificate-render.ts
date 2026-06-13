import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type Color,
} from "pdf-lib";

/**
 * Fetch a Cloudinary-hosted template PDF as a byte buffer.
 *
 * Bounded by a hard timeout so a network hiccup can't stall a bulk send for
 * minutes. The byte cap (15MB) is more generous than the upload route's 10MB
 * limit to give a small safety margin for re-uploaded files.
 */
export async function fetchTemplatePdfBytes(url: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Template PDF fetch failed: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 15 * 1024 * 1024) {
      throw new Error("Template PDF too large (>15MB)");
    }
    return new Uint8Array(buf);
  } finally {
    clearTimeout(t);
  }
}

type NameBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  fontWeight: "normal" | "bold";
  alignment: "left" | "center" | "right";
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
};

function hexToColor(hex: string): Color {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(expanded, 16);
  if (Number.isNaN(num)) return rgb(0, 0, 0);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  return rgb(r, g, b);
}

function pickFont(
  doc: PDFDocument,
  family: NameBox["fontFamily"],
  weight: NameBox["fontWeight"]
): Promise<PDFFont> {
  const isBold = weight === "bold";
  switch (family) {
    case "TimesRoman":
      return doc.embedFont(isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman);
    case "Courier":
      return doc.embedFont(isBold ? StandardFonts.CourierBold : StandardFonts.Courier);
    case "Helvetica":
    default:
      return doc.embedFont(isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  }
}

/**
 * Render the recipient's name onto the template PDF and return the resulting
 * bytes. Coordinates from the editor are stored in PDF-points with origin at
 * the top-left so users can drag the box where they SEE the name on the page;
 * pdf-lib uses bottom-left origin so we flip Y here at draw time.
 *
 * Text auto-shrinks if it would overflow the box width — this matters a lot
 * for certificates because names vary in length from "Bo" to longer multi-word
 * names with diacritics, and a fixed font size would clip the wider ones.
 */
export async function renderCertificatePdf(args: {
  baseBytes: Uint8Array;
  name: string;
  pageWidth: number;
  pageHeight: number;
  nameBox: Record<string, unknown>;
}): Promise<Uint8Array> {
  const { baseBytes, name, pageHeight, nameBox } = args;

  // `pdf-lib` mutates the loaded document, so we hand it a *copy* of the
  // template bytes each time. Without this, recipient N+1 would inherit
  // recipient N's name baked into the same in-memory document.
  const docBytes = baseBytes.slice();
  const doc = await PDFDocument.load(docBytes);

  const pages = doc.getPages();
  if (pages.length === 0) {
    throw new Error("Template PDF has no pages");
  }
  const page = pages[0];

  const x = Number(nameBox.x) || 0;
  const yTopLeft = Number(nameBox.y) || 0;
  const boxWidth = Number(nameBox.width) || 200;
  const boxHeight = Number(nameBox.height) || 40;
  const requestedSize = Number(nameBox.fontSize) || 28;
  const fontColor = typeof nameBox.fontColor === "string" ? nameBox.fontColor : "#111111";
  const fontWeight = (nameBox.fontWeight === "bold" ? "bold" : "normal") as NameBox["fontWeight"];
  const alignment = (["left", "center", "right"].includes(nameBox.alignment as string)
    ? nameBox.alignment
    : "center") as NameBox["alignment"];
  const fontFamily = (["Helvetica", "TimesRoman", "Courier"].includes(nameBox.fontFamily as string)
    ? nameBox.fontFamily
    : "Helvetica") as NameBox["fontFamily"];

  const font = await pickFont(doc, fontFamily, fontWeight);

  // Strip control chars that some pdf-lib font encoders trip on, and clamp
  // anything ludicrously long so we don't burn a megabyte of text.
  const displayName = name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120) || "Participant";

  // Auto-shrink so we never overflow the chosen box width.
  let fontSize = requestedSize;
  const MIN_SIZE = 8;
  while (fontSize > MIN_SIZE && font.widthOfTextAtSize(displayName, fontSize) > boxWidth) {
    fontSize -= 1;
  }
  const textWidth = font.widthOfTextAtSize(displayName, fontSize);

  // Horizontal position
  let drawX: number;
  if (alignment === "left") drawX = x;
  else if (alignment === "right") drawX = x + boxWidth - textWidth;
  else drawX = x + (boxWidth - textWidth) / 2;

  // Vertical centering: pdf-lib draws from the baseline. Convert the
  // editor's top-left Y to pdf-lib's bottom-left Y, then add an offset
  // so the text is visually centered within the box.
  // Approximate the visual baseline-to-top distance as ~80% of the font's
  // ascender (font.heightAtSize already includes ascender+descender).
  const fontHeight = font.heightAtSize(fontSize);
  const boxTopY = pageHeight - yTopLeft;             // pdf-lib coord, box top
  const boxBottomY = boxTopY - boxHeight;            // pdf-lib coord, box bottom
  const drawY = boxBottomY + (boxHeight - fontHeight) / 2 + fontHeight * 0.22;

  page.drawText(displayName, {
    x: drawX,
    y: drawY,
    size: fontSize,
    font,
    color: hexToColor(fontColor),
  });

  return doc.save();
}
