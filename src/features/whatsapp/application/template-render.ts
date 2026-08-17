import type { WhatsAppVars } from "../domain";

const TOKEN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Replace `{var}` tokens with their values. Unknown tokens are left
 * untouched so a typo'd template still sends readable text.
 */
export function renderTemplate(template: string, vars: WhatsAppVars): string {
  return template.replace(TOKEN, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : value;
  });
}

/** List the `{var}` tokens present in a template, in order of appearance. */
export function templateTokens(template: string): string[] {
  const found: string[] = [];
  for (const match of template.matchAll(TOKEN)) {
    found.push(match[1]);
  }
  return found;
}
