export const MEDIA_IMAGE_VALIDATOR_VERSION = "relic-static-image-v1";
export const MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_IMAGE_MAX_EDGE = 8192;
export const MEDIA_IMAGE_MAX_PIXELS = 32_000_000;

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

export class ImageValidationError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function fail(code: string): never {
  throw new ImageValidationError(code);
}

function dimensions(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) fail("malformed_image");
  if (width > MEDIA_IMAGE_MAX_EDGE || height > MEDIA_IMAGE_MAX_EDGE || width * height > MEDIA_IMAGE_MAX_PIXELS) {
    fail("image_dimensions_exceeded");
  }
  return { width, height };
}

function u32be(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function u32le(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array, start: number, end: number) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let value = n;
      for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      crcTable[n] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePng(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value)) fail("mime_mismatch");
  if (bytes.length < 45) fail("malformed_image");
  let offset = 8;
  let width = 0;
  let height = 0;
  let sawData = false;
  let sawEnd = false;
  let chunkIndex = 0;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail("malformed_image");
    const length = u32be(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (length > MEDIA_IMAGE_MAX_BYTES || dataEnd + 4 > bytes.length) fail("malformed_image");
    if (crc32(bytes, offset + 4, dataEnd) !== u32be(bytes, dataEnd)) fail("malformed_image");
    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) fail("malformed_image");
      width = u32be(bytes, dataStart);
      height = u32be(bytes, dataStart + 4);
      if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] > 1) fail("malformed_image");
    } else if (type === "IHDR") fail("malformed_image");
    if (type === "acTL" || type === "fcTL" || type === "fdAT") fail("animated_image_rejected");
    if (type === "IDAT") sawData = true;
    if (type === "IEND") {
      if (length !== 0 || !sawData || dataEnd + 4 !== bytes.length) fail("malformed_image");
      sawEnd = true;
    }
    if (type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90 && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type)) fail("malformed_image");
    offset = dataEnd + 4;
    chunkIndex += 1;
  }
  if (!sawEnd) fail("malformed_image");
  return dimensions(width, height);
}

function parseJpeg(bytes: Uint8Array) {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8) fail("mime_mismatch");
  let offset = 2;
  let width = 0;
  let height = 0;
  let sawFrame = false;
  let sawScan = false;
  let inScan = false;
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset < bytes.length) {
    if (!inScan && bytes[offset] !== 0xff) fail("malformed_image");
    if (inScan) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
      if (offset >= bytes.length) fail("malformed_image");
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) fail("malformed_image");
    const marker = bytes[offset++];
    if (inScan && (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7))) continue;
    inScan = false;
    if (marker === 0xd9) {
      if (!sawFrame || !sawScan || offset !== bytes.length) fail("malformed_image");
      return dimensions(width, height);
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) fail("malformed_image");
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) fail("malformed_image");
    if (frameMarkers.has(marker)) {
      if (sawFrame || length < 8) fail("malformed_image");
      height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      sawFrame = true;
    }
    if (marker === 0xda) {
      sawScan = true;
      inScan = true;
    }
    offset += length;
  }
  fail("malformed_image");
}

function parseWebp(bytes: Uint8Array) {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") fail("mime_mismatch");
  if (u32le(bytes, 4) !== bytes.length - 8) fail("malformed_image");
  let offset = 12;
  let width = 0;
  let height = 0;
  let imagePayloads = 0;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail("malformed_image");
    const type = ascii(bytes, offset, 4);
    const length = u32le(bytes, offset + 4);
    const start = offset + 8;
    const end = start + length;
    const paddedEnd = end + (length & 1);
    if (end > bytes.length || paddedEnd > bytes.length) fail("malformed_image");
    if (type === "ANIM" || type === "ANMF") fail("animated_image_rejected");
    if (type === "VP8X") {
      if (length !== 10 || (bytes[start] & 0x02) !== 0) fail(length === 10 ? "animated_image_rejected" : "malformed_image");
      width = 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16);
      height = 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16);
    } else if (type === "VP8 ") {
      if (length < 10 || bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a) fail("malformed_image");
      width = (bytes[start + 6] | (bytes[start + 7] << 8)) & 0x3fff;
      height = (bytes[start + 8] | (bytes[start + 9] << 8)) & 0x3fff;
      imagePayloads += 1;
    } else if (type === "VP8L") {
      if (length < 5 || bytes[start] !== 0x2f) fail("malformed_image");
      width = 1 + bytes[start + 1] + ((bytes[start + 2] & 0x3f) << 8);
      height = 1 + (bytes[start + 2] >> 6) + (bytes[start + 3] << 2) + ((bytes[start + 4] & 0x0f) << 10);
      imagePayloads += 1;
    }
    offset = paddedEnd;
  }
  if (offset !== bytes.length || imagePayloads !== 1) fail("malformed_image");
  return dimensions(width, height);
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function validateStaticImage(bytes: Uint8Array, declaredMime: string) {
  if (bytes.byteLength < 16) fail("malformed_image");
  if (bytes.byteLength > MEDIA_IMAGE_MAX_BYTES) fail("image_size_exceeded");
  let detectedMime: SupportedImageMime;
  let result: { width: number; height: number };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    detectedMime = "image/jpeg";
    result = parseJpeg(bytes);
  } else if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    detectedMime = "image/png";
    result = parsePng(bytes);
  } else if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    detectedMime = "image/webp";
    result = parseWebp(bytes);
  } else fail("mime_mismatch");
  if (declaredMime !== detectedMime) fail("mime_mismatch");
  return { detectedMime, ...result };
}
