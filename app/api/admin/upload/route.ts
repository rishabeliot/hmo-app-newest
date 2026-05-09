import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get("hmo_jwt")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin via Express
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const authRes = await fetch(`${apiUrl}/admin/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (authRes.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (authRes.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "hmo-events" }, (error, res) => {
        if (error || !res) reject(error ?? new Error("Upload failed"));
        else resolve(res as { secure_url: string });
      })
      .end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
