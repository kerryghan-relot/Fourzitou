import { auth } from "@/auth";
import { readFile } from "fs/promises";
import { join, extname, normalize, resolve } from "path";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const filename = path.join("/");

  // Prevent path traversal
  const abs = resolve(join(UPLOAD_DIR, filename));
  if (!abs.startsWith(resolve(UPLOAD_DIR))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readFile(abs);
    const ext = extname(filename).replace(".", "").toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
