export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export interface HealthResponse {
  status: "ok";
  service: "api";
}
