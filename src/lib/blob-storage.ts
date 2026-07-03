import { head, put } from "@vercel/blob";

const PREFIX = process.env.BLOB_PREFIX || "1977demol";

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

function blobPath(filename: string): string {
  return `${PREFIX}/data/${filename}`;
}

export async function readBlobText(filename: string): Promise<string | null> {
  if (!isBlobConfigured()) return null;

  try {
    const meta = await head(blobPath(filename), {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function writeBlobText(filename: string, content: string): Promise<void> {
  if (!isBlobConfigured()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  await put(blobPath(filename), content, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}
