import { notFound, redirect } from "next/navigation";
import type {
  AdminApplicationDetailDto,
  AdminApplicationListItemDto,
  AdminProfileResponseDto,
} from "@insurance/contracts";
import { authenticatedFetch } from "./server-auth";
async function adminFetch(path: string) {
  const response = await authenticatedFetch(path);
  if (response.status === 401) redirect("/login");
  if (response.status === 403) redirect("/products");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Unable to load administration data.");
  return response;
}
export async function adminApplications() {
  return (await (await adminFetch("/api/v1/admin/applications")).json()) as {
    items: AdminApplicationListItemDto[];
  };
}
export async function adminApplication(id: string) {
  return (await (
    await adminFetch(`/api/v1/admin/applications/${id}`)
  ).json()) as AdminApplicationDetailDto;
}
export async function adminProfile(userId: string) {
  return (await (
    await adminFetch(`/api/v1/admin/users/${userId}/profile`)
  ).json()) as AdminProfileResponseDto;
}
