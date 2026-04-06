const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const ITXT_TYPE = new Uint8Array([105, 84, 88, 116]); // "iTXt"
const IEND_TYPE = new Uint8Array([73, 69, 78, 68]); // "IEND"

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crc32Table = makeCrc32Table();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob returned null"));
    }, "image/png");
  });
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function buildItxtChunk(keyword: string, text: string): Uint8Array {
  const keywordBytes = encodeUtf8(keyword);
  const textBytes = encodeUtf8(text);

  // keyword\0 + compressionFlag(0) + compressionMethod(0) + languageTag\0 + translatedKeyword\0 + text
  const dataLength =
    keywordBytes.length + 1 + 1 + 1 + 1 + 1 + textBytes.length;

  // 4 (length) + 4 (type) + data + 4 (crc)
  const chunk = new Uint8Array(4 + 4 + dataLength + 4);
  const view = new DataView(chunk.buffer);

  view.setUint32(0, dataLength);
  chunk.set(ITXT_TYPE, 4);

  let offset = 8;
  chunk.set(keywordBytes, offset);
  offset += keywordBytes.length;
  chunk[offset++] = 0; // null terminator for keyword
  chunk[offset++] = 0; // compression flag
  chunk[offset++] = 0; // compression method
  chunk[offset++] = 0; // language tag (empty, null-terminated)
  chunk[offset++] = 0; // translated keyword (empty, null-terminated)
  chunk.set(textBytes, offset);

  const crcData = chunk.slice(4, 4 + 4 + dataLength);
  const crc = crc32(crcData);
  view.setUint32(4 + 4 + dataLength, crc);

  return chunk;
}

export async function encodePngWithItxt(
  canvas: HTMLCanvasElement,
  keyword: string,
  text: string,
): Promise<Blob> {
  const blob = await canvasToBlob(canvas);
  const buffer = await blob.arrayBuffer();
  const original = new Uint8Array(buffer);

  const itxtChunk = buildItxtChunk(keyword, text);

  // IEND is always the last chunk: 4 (length=0) + 4 (IEND) + 4 (crc) = 12 bytes
  const iendStart = original.length - 12;

  const result = new Uint8Array(original.length + itxtChunk.length);
  result.set(original.subarray(0, iendStart), 0);
  result.set(itxtChunk, iendStart);
  result.set(original.subarray(iendStart), iendStart + itxtChunk.length);

  return new Blob([result], { type: "image/png" });
}

export function decodePngItxt(
  buffer: ArrayBuffer,
  keyword: string,
): string | null {
  const data = new Uint8Array(buffer);

  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return null;
  }

  let offset = 8;
  const view = new DataView(buffer);
  const keywordBytes = encodeUtf8(keyword);

  while (offset + 8 <= data.length) {
    const chunkLength = view.getUint32(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;

    if (
      data[typeStart] === ITXT_TYPE[0] &&
      data[typeStart + 1] === ITXT_TYPE[1] &&
      data[typeStart + 2] === ITXT_TYPE[2] &&
      data[typeStart + 3] === ITXT_TYPE[3]
    ) {
      let keyEnd = dataStart;
      while (keyEnd < dataStart + chunkLength && data[keyEnd] !== 0) keyEnd++;

      const chunkKeyword = data.subarray(dataStart, keyEnd);

      if (
        chunkKeyword.length === keywordBytes.length &&
        chunkKeyword.every((b, i) => b === keywordBytes[i])
      ) {
        // Skip: null + compressionFlag + compressionMethod
        let pos = keyEnd + 1 + 1 + 1;

        // Skip language tag (null-terminated)
        while (pos < dataStart + chunkLength && data[pos] !== 0) pos++;
        pos++;

        // Skip translated keyword (null-terminated)
        while (pos < dataStart + chunkLength && data[pos] !== 0) pos++;
        pos++;

        const textBytes = data.subarray(pos, dataStart + chunkLength);
        return decodeUtf8(textBytes);
      }
    }

    if (
      data[typeStart] === IEND_TYPE[0] &&
      data[typeStart + 1] === IEND_TYPE[1] &&
      data[typeStart + 2] === IEND_TYPE[2] &&
      data[typeStart + 3] === IEND_TYPE[3]
    ) {
      break;
    }

    // 4 (length) + 4 (type) + chunkLength (data) + 4 (crc)
    offset += 4 + 4 + chunkLength + 4;
  }

  return null;
}
