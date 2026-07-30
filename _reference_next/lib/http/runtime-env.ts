import { env as cloudflareEnvironment } from "cloudflare:workers";

type RuntimeEnvironment = Record<string, unknown>;

const runtimeKey = "__DEVICESCOPE_SERVER_RUNTIME_ENV__";

type RuntimeGlobal = typeof globalThis & {
  [runtimeKey]?: RuntimeEnvironment;
};

export function setServerRuntimeEnvironment(environment: RuntimeEnvironment) {
  (globalThis as RuntimeGlobal)[runtimeKey] = environment;
}

export function serverEnvironment(name: string): string | undefined {
  const bindingValue = (cloudflareEnvironment as RuntimeEnvironment)[name];
  if (typeof bindingValue === "string" && bindingValue) return bindingValue;
  const runtimeValue = (globalThis as RuntimeGlobal)[runtimeKey]?.[name];
  if (typeof runtimeValue === "string" && runtimeValue) return runtimeValue;
  const buildValue = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return buildValue || undefined;
}
