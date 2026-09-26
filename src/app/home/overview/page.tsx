import { redirect } from "next/navigation";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** The overview lives at /home; keep old /home/overview links working. */
export default async function OverviewRedirect(props: PageProps) {
  const params = (await props.searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/home${query.size ? `?${query}` : ""}`);
}
