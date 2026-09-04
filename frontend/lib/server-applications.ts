import { redirect } from "next/navigation";
import type {
  ApplicationDto,
  ApplicationResponseDto,
  CursorPageDto,
  ApplicationListItemDto,
} from "@insurance/contracts";
import { authenticatedFetch } from "./server-auth";
export async function applicationList() {
  const r = await authenticatedFetch("/api/v1/me/applications");
  if (r.status === 401) redirect("/login");
  if (!r.ok) throw new Error("Unable to load applications.");
  return (await r.json()) as CursorPageDto<ApplicationListItemDto>;
}
export async function applicationDetail(id: string) {
  const r = await authenticatedFetch(`/api/v1/me/applications/${id}`);
  if (r.status === 401) redirect("/login");
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Unable to load application.");
  return (await r.json()) as ApplicationResponseDto;
}
