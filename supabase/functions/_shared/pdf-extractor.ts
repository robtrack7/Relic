export const PDF_EXTRACTOR_VERSION = "pdfjs-5.4.149/relic-1";
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_MAX_PAGES = 100;
export const PDF_MAX_CHARACTERS = 500_000;
export const PDF_TIMEOUT_MS = 15_000;

export type PdfFailureCode =
  | "mime_mismatch"
  | "malformed_pdf"
  | "encrypted_pdf"
  | "active_content_rejected"
  | "embedded_file_rejected"
  | "page_limit_exceeded"
  | "character_limit_exceeded"
  | "processing_timeout"
  | "no_extractable_text"
  | "extractor_unavailable";

export class PdfExtractionError extends Error {
  constructor(readonly code: PdfFailureCode, readonly terminal = true) {
    super(code);
    this.name = "PdfExtractionError";
  }
}

type MatrixInit = RelicDOMMatrix | number[] | { a?: number; b?: number; c?: number; d?: number; e?: number; f?: number };

class RelicDOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  readonly is2D = true;
  constructor(init?: MatrixInit) {
    if (Array.isArray(init)) [this.a,this.b,this.c,this.d,this.e,this.f] = init.slice(0,6).map(Number) as [number,number,number,number,number,number];
    else if (init) [this.a,this.b,this.c,this.d,this.e,this.f] = [init.a ?? 1,init.b ?? 0,init.c ?? 0,init.d ?? 1,init.e ?? 0,init.f ?? 0];
  }
  private set(value: RelicDOMMatrix) { [this.a,this.b,this.c,this.d,this.e,this.f]=[value.a,value.b,value.c,value.d,value.e,value.f]; return this; }
  multiply(other: MatrixInit) {
    const m = new RelicDOMMatrix(other);
    return new RelicDOMMatrix([
      this.a*m.a+this.c*m.b, this.b*m.a+this.d*m.b,
      this.a*m.c+this.c*m.d, this.b*m.c+this.d*m.d,
      this.a*m.e+this.c*m.f+this.e, this.b*m.e+this.d*m.f+this.f,
    ]);
  }
  multiplySelf(other: MatrixInit) { return this.set(this.multiply(other)); }
  preMultiplySelf(other: MatrixInit) { return this.set(new RelicDOMMatrix(other).multiply(this)); }
  translate(tx=0,ty=0) { return this.multiply([1,0,0,1,tx,ty]); }
  translateSelf(tx=0,ty=0) { return this.set(this.translate(tx,ty)); }
  scale(scaleX=1,scaleY=scaleX) { return this.multiply([scaleX,0,0,scaleY,0,0]); }
  scaleSelf(scaleX=1,scaleY=scaleX) { return this.set(this.scale(scaleX,scaleY)); }
  rotate(angle=0) { const r=angle*Math.PI/180; const cos=Math.cos(r); const sin=Math.sin(r); return this.multiply([cos,sin,-sin,cos,0,0]); }
  rotateSelf(angle=0) { return this.set(this.rotate(angle)); }
  inverse() { const det=this.a*this.d-this.b*this.c; if(!det) return new RelicDOMMatrix([NaN,NaN,NaN,NaN,NaN,NaN]); return new RelicDOMMatrix([this.d/det,-this.b/det,-this.c/det,this.a/det,(this.c*this.f-this.d*this.e)/det,(this.b*this.e-this.a*this.f)/det]); }
  invertSelf() { return this.set(this.inverse()); }
  transformPoint(point: {x?:number;y?:number}) { const x=point.x??0; const y=point.y??0; return {x:this.a*x+this.c*y+this.e,y:this.b*x+this.d*y+this.f,z:0,w:1}; }
  toFloat32Array() { return new Float32Array([this.a,this.b,0,0,this.c,this.d,0,0,0,0,1,0,this.e,this.f,0,1]); }
  toFloat64Array() { return new Float64Array(this.toFloat32Array()); }
}

function installPdfJsServerPolyfills() {
  if (!("DOMMatrix" in globalThis)) Object.defineProperty(globalThis,"DOMMatrix",{value:RelicDOMMatrix,writable:false});
  if (!("Path2D" in globalThis)) Object.defineProperty(globalThis,"Path2D",{value:class RelicPath2D {},writable:false});
  if (!("ImageData" in globalThis)) Object.defineProperty(globalThis,"ImageData",{value:class RelicImageData {
    data: Uint8ClampedArray; width: number; height: number;
    constructor(data: Uint8ClampedArray,width:number,height?:number){this.data=data;this.width=width;this.height=height??Math.floor(data.length/(width*4));}
  },writable:false});
}

let pdfJsPromise: Promise<{
  getDocument: (options: Record<string, unknown>) => { promise: Promise<any>; destroy(): Promise<void> };
  GlobalWorkerOptions: { workerSrc: string };
}> | null = null;
function loadPdfJs() {
  installPdfJsServerPolyfills();
  pdfJsPromise ??= Promise.all([
    import("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/legacy/build/pdf.min.mjs"),
    import("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/legacy/build/pdf.worker.min.mjs"),
  ]).then(([module, worker]) => {
    Object.defineProperty(globalThis,"pdfjsWorker",{value:worker,configurable:true});
    module.GlobalWorkerOptions.workerSrc = "relic-vendored-pdf-worker";
    return module;
  }) as typeof pdfJsPromise;
  return pdfJsPromise;
}

function fail(code: PdfFailureCode, terminal = true): never {
  throw new PdfExtractionError(code, terminal);
}

function inspectContainer(bytes: Uint8Array) {
  if (bytes.byteLength < 8 || bytes.byteLength > PDF_MAX_BYTES) fail("malformed_pdf");
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.byteLength, 1024)));
  if (!header.startsWith("%PDF-")) fail("mime_mismatch");
  const trailer = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.byteLength - 2048)));
  if (!trailer.includes("%%EOF")) fail("malformed_pdf");

  const container = new TextDecoder("latin1").decode(bytes);
  const eof = container.lastIndexOf("%%EOF");
  if (eof < 0 || /[^\x00\x09\x0a\x0c\x0d\x20]/.test(container.slice(eof + 5))) fail("malformed_pdf");
  if (/\/Encrypt\b/.test(container)) fail("encrypted_pdf");
  if (/\/(?:JavaScript|JS|OpenAction|AA|Launch|RichMedia|XFA)\b/.test(container)) fail("active_content_rejected");
  if (/\/(?:EmbeddedFile|Filespec)\b/.test(container)) fail("embedded_file_rejected");
}

function bounded<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) fail("processing_timeout", false);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new PdfExtractionError("processing_timeout", false)), remaining)),
  ]);
}

function normalizePageText(items: unknown[]) {
  const fragments: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || typeof item.str !== "string") continue;
    const clean = item.str.normalize("NFKC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
    if (clean) fragments.push(clean);
    if ("hasEOL" in item && item.hasEOL === true) fragments.push("\n");
    else fragments.push(" ");
  }
  return fragments.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractPdfText(bytes: Uint8Array) {
  inspectContainer(bytes);
  const deadline = Date.now() + PDF_TIMEOUT_MS;
  const { getDocument } = await bounded(loadPdfJs(), deadline);
  const task = getDocument({
    data: bytes,
    disableFontFace: true,
    isEvalSupported: false,
    maxImageSize: 16_000_000,
    stopAtErrors: true,
    useSystemFonts: false,
    useWorkerFetch: false,
  });
  try {
    const document = await bounded(task.promise, deadline).catch((error: unknown) => {
      if (error instanceof PdfExtractionError) throw error;
      const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
      const message = error && typeof error === "object" && "message" in error ? String(error.message).slice(0, 180) : "";
      console.error(JSON.stringify({ event: "pdf_extractor_open_failed", name, message }));
      if (name === "PasswordException") fail("encrypted_pdf");
      fail("malformed_pdf");
    });
    if (document.numPages < 1) fail("no_extractable_text");
    if (document.numPages > PDF_MAX_PAGES) fail("page_limit_exceeded");

    const attachments = await bounded(Promise.resolve(document.getAttachments()), deadline).catch(() => null);
    if (attachments && Object.keys(attachments).length > 0) fail("embedded_file_rejected");
    const javascript = typeof document.getJavaScript === "function"
      ? await bounded(Promise.resolve(document.getJavaScript()), deadline).catch(() => [])
      : [];
    if (Array.isArray(javascript) && javascript.some((value) => typeof value === "string" && value.trim())) fail("active_content_rejected");

    const pages: string[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await bounded(document.getPage(pageNumber), deadline);
      const content = await bounded(page.getTextContent({ disableCombineTextItems: false }), deadline);
      const text = normalizePageText(Array.isArray(content.items) ? content.items : []);
      pages.push(text);
      characters += text.length + (pageNumber > 1 ? 2 : 0);
      if (characters > PDF_MAX_CHARACTERS) fail("character_limit_exceeded");
      page.cleanup();
    }
    const text = pages.join("\n\n").trim();
    if (!text) fail("no_extractable_text");
    return { text, pageCount: document.numPages, extractedCharacters: text.length };
  } catch (error) {
    if (error instanceof PdfExtractionError) throw error;
    fail("extractor_unavailable", false);
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}
