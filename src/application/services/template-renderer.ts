export class TemplateVariablesError extends Error {
  constructor(public readonly variables: string[]) {
    super(`Variáveis ausentes ou inválidas: ${variables.join(', ')}`);
    this.name = 'TemplateVariablesError';
  }
}

export interface RenderedTemplate {
  subject: string;
  body: string;
}

/** Preenche referências no formato {{nome}} com valores escalares fornecidos. */
export class TemplateRenderer {
  render(
    template: { subject: string; body: string },
    data: Record<string, unknown>,
  ): RenderedTemplate {
    const variables = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;
    const missing = new Set<string>();

    const replace = (text: string): string =>
      text.replace(variables, (_match, key: string) => {
        const value: unknown = Object.hasOwn(data, key) ? data[key] : undefined;
        if (
          typeof value !== 'string' &&
          typeof value !== 'number' &&
          typeof value !== 'boolean'
        ) {
          missing.add(key);
          return _match;
        }
        if (typeof value === 'number' && !Number.isFinite(value)) {
          missing.add(key);
          return _match;
        }
        return String(value);
      });

    const subject = replace(template.subject);
    const body = replace(template.body);

    if (missing.size > 0) {
      throw new TemplateVariablesError([...missing]);
    }
    return { subject, body };
  }
}
