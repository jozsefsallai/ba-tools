import { NextResponse } from "next/server";
import { BasicEmblem } from "@/app/api/emblem/_components/basic-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import { makeEmblem, processTrailingPart } from "@/lib/emblems.server";

type RouteParams = {
  text: string;
};

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  },
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

  return createEmblemResponse(output, png);
}
