import { BasicEmblem } from "@/app/api/emblem/_components/basic-emblem";
import { DEFAULT_BASIC_EMBLEM_TEXTS } from "@/lib/emblems";
import {
  DEFAULT_SIZES,
  makeEmblem,
  processTrailingPart,
} from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  text: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const combinations: RouteParams[] = [];

  for (const text of DEFAULT_BASIC_EMBLEM_TEXTS) {
    combinations.push({ text });
    combinations.push({ text: `${text}.png` });

    for (const size of DEFAULT_SIZES) {
      combinations.push({ text: `${text}.png@w${size}` });
    }
  }

  return combinations;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { text } = await params;

  const { content: finalText, isPng: png, width } = processTrailingPart(text);

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

  const output = await makeEmblem(<BasicEmblem text={finalText} />, png, width);

  return new Response(
    typeof output === "string" ? output : (output.buffer as ArrayBuffer),
    {
      headers: {
        "Content-Type": png ? "image/png" : "image/svg+xml",
      },
    },
  );
}
