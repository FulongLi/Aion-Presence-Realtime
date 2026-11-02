/**
 * Server settings that were renamed with the product (SCF Presence Realtime → Aion Presence Realtime). The AION_ name
 * is read first; the old SCF_ name still works, so an existing deployment keeps its configuration.
 */
export type RenamedSetting = "VOICE_BACKEND" | "ALLOWED_ORIGINS" | "SAFETY_ID_SALT";

export function setting(env: Record<string, string | undefined>, name: RenamedSetting): string | undefined {
  return env[`AION_${name}`]?.trim() || env[`SCF_${name}`]?.trim() || undefined;
}
