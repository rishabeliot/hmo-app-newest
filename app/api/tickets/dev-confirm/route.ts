import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("hmo_jwt")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const body = await req.json();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/tickets/dev-confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[dev-confirm proxy] fetch failed:", err);
    return NextResponse.json({ error: "API unreachable" }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ error: `API error (${res.status})` }, { status: 502 });
  }

  return NextResponse.json(data, { status: res.status });
}
