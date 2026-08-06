import assert from "node:assert/strict";
import test from "node:test";
import { ImageValidationError, sha256Hex, validateStaticImage } from "../supabase/functions/_shared/image-validator.ts";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==", "base64");

function webp(chunks) {
  const parts = [];
  for (const [name, data] of chunks) {
    const header = Buffer.alloc(8); header.write(name, 0, "ascii"); header.writeUInt32LE(data.length, 4);
    parts.push(header, data, ...(data.length & 1 ? [Buffer.from([0])] : []));
  }
  const body = Buffer.concat([Buffer.from("WEBP"), ...parts]);
  const header = Buffer.alloc(8); header.write("RIFF", 0, "ascii"); header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

const webpLossless = webp([["VP8L", Buffer.from([0x2f, 0, 0, 0, 0])]]);

function rejects(bytes, mime, code) {
  assert.throws(() => validateStaticImage(bytes, mime), (error) => error instanceof ImageValidationError && error.code === code);
}

test("static JPEG, PNG, and WebP pass with trusted dimensions", () => {
  assert.deepEqual(validateStaticImage(jpeg, "image/jpeg"), { detectedMime: "image/jpeg", width: 1, height: 1 });
  assert.deepEqual(validateStaticImage(png, "image/png"), { detectedMime: "image/png", width: 1, height: 1 });
  assert.deepEqual(validateStaticImage(webpLossless, "image/webp"), { detectedMime: "image/webp", width: 1, height: 1 });
});

test("declared MIME cannot override magic bytes", () => rejects(png, "image/jpeg", "mime_mismatch"));

test("appended polyglot bytes are rejected for every accepted format", () => {
  for (const [bytes, mime] of [[jpeg, "image/jpeg"], [png, "image/png"], [webpLossless, "image/webp"]]) {
    rejects(Buffer.concat([bytes, Buffer.from("<svg onload=alert(1)>")]), mime, "malformed_image");
  }
});

test("animated WebP flags are rejected", () => {
  const vp8x = Buffer.from([0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  rejects(webp([["VP8X", vp8x], ["VP8L", Buffer.from([0x2f, 0, 0, 0, 0])]]), "image/webp", "animated_image_rejected");
});

test("oversized pixel dimensions fail before persistence", () => {
  const widthMinusOne = 8192;
  const payload = Buffer.from([0x2f, widthMinusOne & 0xff, (widthMinusOne >> 8) & 0x3f, 0, 0]);
  rejects(webp([["VP8L", payload]]), "image/webp", "image_dimensions_exceeded");
});

test("truncated image structures are rejected", () => rejects(png.subarray(0, 20), "image/png", "malformed_image"));

test("image hashes are stable without exposing the bytes", async () => {
  assert.equal(await sha256Hex(png), await sha256Hex(Buffer.from(png)));
  assert.match(await sha256Hex(png), /^[0-9a-f]{64}$/);
});
