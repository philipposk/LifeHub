import path from "node:path";
import os from "node:os";

/**
 * Vault root resolution. Override with VAULT_ROOT env var.
 * Defaults to ~/SecondBrain/vault.
 */
export function vaultRoot(): string {
  return process.env.VAULT_ROOT || path.join(os.homedir(), "SecondBrain", "vault");
}

/** Reject paths that escape the vault root. */
export function safeJoin(rel: string): string {
  const root = vaultRoot();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error(`vault path escape: ${rel}`);
  }
  return abs;
}
