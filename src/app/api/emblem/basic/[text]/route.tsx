import { BasicEmblem } from "@/app/api/emblem/_components/basic-emblem";
import { makeEmblem } from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  text: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const defaultTexts = [
    "New Sensei",
    "Schale's Sensei",
    "Welcome",
    "Hello",
    "A pleasure to meet you",
  ];

  return [
    ...defaultTexts.map((text) => ({ text })),
    ...defaultTexts.map((text) => ({ text: `${text}.png` })),
  ];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { text } = await params;

  const finalText = text.endsWith(".png") ? text.slice(0, -4) : text;

  if (!finalText || finalText.length > 40) {
    return NextResponse.json(
      {
        error: "Text must be between 1 and 40 characters.",
      },
      {
        status: 400,
      },
    );
  }

  const png = text.endsWith(".png");

  const output = await makeEmblem(<BasicEmblem text={finalText} />, png);

  return new Response(
    typeof output === "string" ? output : (output.buffer as ArrayBuffer),
    {
      headers: {
        "Content-Type": png ? "image/png" : "image/svg+xml",
      },
    },
  );
}
