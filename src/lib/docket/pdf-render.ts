import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PAGES = 3;
const RENDER_SCALE = 2;

/** Render the first pages of a PDF to PNG buffers for vision models. */
export async function renderPdfPagesToPng(bytes: Buffer, maxPages = MAX_PAGES): Promise<Buffer[]> {
  const data = new Uint8Array(bytes);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pageCount = Math.min(doc.numPages, maxPages);
  const pages: Buffer[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    pages.push(canvas.toBuffer("image/png"));
  }

  return pages;
}
