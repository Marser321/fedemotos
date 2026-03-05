import { createClient, type ClientOptions } from "@insforge/sdk";
import { getRequiredEnv } from "./env";

const publicConfig: ClientOptions = {
  baseUrl: getRequiredEnv("NEXT_PUBLIC_INSFORGE_URL"),
  anonKey: getRequiredEnv("NEXT_PUBLIC_INSFORGE_ANON_KEY"),
};

export const insforgePublic = createClient(publicConfig);

let insforgeServiceSingleton:
  | ReturnType<typeof createClient>
  | undefined = undefined;

export function getInsforgeServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("getInsforgeServiceClient solo se puede usar del lado servidor");
  }

  if (insforgeServiceSingleton) {
    return insforgeServiceSingleton;
  }

  const serviceConfig: ClientOptions = {
    baseUrl: getRequiredEnv("NEXT_PUBLIC_INSFORGE_URL"),
    anonKey: getRequiredEnv("INSFORGE_SERVICE_ROLE_KEY"),
  };

  insforgeServiceSingleton = createClient(serviceConfig);
  return insforgeServiceSingleton;
}
