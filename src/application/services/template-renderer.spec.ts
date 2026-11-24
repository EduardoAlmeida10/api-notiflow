import { TemplateRenderer, TemplateVariablesError } from './template-renderer';

describe('TemplateRenderer', () => {
  const renderer = new TemplateRenderer();

  it('preenche assunto e corpo, inclusive variáveis repetidas e com espaços', () => {
    expect(
      renderer.render(
        {
          subject: 'Olá, {{ nome }}!',
          body: '{{nome}}, pedido {{numero}} de {{nome}}.',
        },
        { nome: 'Luis', numero: 42 },
      ),
    ).toEqual({ subject: 'Olá, Luis!', body: 'Luis, pedido 42 de Luis.' });
  });

  it('preserva textos sem variáveis e aceita valores falsos ou vazios', () => {
    expect(
      renderer.render(
        { subject: 'Sem variáveis', body: '{{zero}}/{{ativo}}/{{vazio}}' },
        { zero: 0, ativo: false, vazio: '' },
      ),
    ).toEqual({ subject: 'Sem variáveis', body: '0/false/' });
  });

  it('rejeita e identifica todas as variáveis ausentes ou inválidas', () => {
    try {
      renderer.render(
        { subject: '{{nome}} e {{nome}}', body: '{{pedido}} e {{nulo}}' },
        { nulo: null },
      );
      throw new Error('Deveria rejeitar dados incompletos');
    } catch (error) {
      expect(error).toBeInstanceOf(TemplateVariablesError);
      expect((error as TemplateVariablesError).variables).toEqual([
        'nome',
        'pedido',
        'nulo',
      ]);
    }
  });

  it.each([undefined, {}, [], NaN, Infinity])(
    'rejeita valor não suportado: %p',
    (value) => {
      expect(() =>
        renderer.render({ subject: '{{valor}}', body: '' }, { valor: value }),
      ).toThrow(TemplateVariablesError);
    },
  );

  it('não usa propriedades herdadas como dados da notificação', () => {
    const data: Record<string, unknown> = Object.create({
      nome: 'herdado',
    }) as Record<string, unknown>;
    expect(() =>
      renderer.render({ subject: '{{nome}}', body: '' }, data),
    ).toThrow(TemplateVariablesError);
  });

  it('não interpreta variáveis contidas dentro dos valores', () => {
    expect(
      renderer.render({ subject: '{{nome}}', body: '' }, { nome: '{{outro}}' })
        .subject,
    ).toBe('{{outro}}');
  });
});
