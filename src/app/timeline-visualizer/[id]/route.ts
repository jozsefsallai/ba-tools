import { redirect } from "next/navigation";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;
  return redirect(`/timelines/${id}`);
}
