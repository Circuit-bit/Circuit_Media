const moduleSource = "export const env = {};";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { url: `data:text/javascript,${encodeURIComponent(moduleSource)}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
