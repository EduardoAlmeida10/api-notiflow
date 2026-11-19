# Contribuindo com o Notiflow

Obrigado por contribuir com o **Notiflow**, um serviço reutilizável de notificações por e-mail desenvolvido com NestJS, TypeScript, PostgreSQL, Prisma e processamento assíncrono com Redis/BullMQ.

Este guia estabelece um fluxo simples para colaborar no projeto e manter o código organizado.

## 1. Antes de começar

Tenha instalados:

- Git;
- Node.js compatível com o Prisma 7 (recomendado Node.js 22.12+);
- npm;
- Docker e Docker Compose, para os serviços de infraestrutura.

Clone o repositório, instale as dependências e configure o ambiente conforme o `README.md`:

```bash
git clone <URL_DO_REPOSITORIO>
cd <DIRETORIO_DO_PROJETO>
npm install
```

Configure o `.env` com base no `.env.example`, se disponível. **Nunca faça commit de arquivos `.env`, API Keys reais, senhas ou credenciais SMTP.**

## 2. Organização da arquitetura

O projeto segue **arquitetura hexagonal (Ports and Adapters)**:

- `src/domain/`: entidades e regras de domínio;
- `src/application/use-cases/`: casos de uso;
- `src/application/ports/`: interfaces de persistência e serviços externos;
- `src/adapters/inbound/`: endpoints HTTP, DTOs e autenticação;
- `src/adapters/outbound/`: implementação das portas;
- `src/composition/`: módulos e injeção de dependências;
- `src/infrastructure/`: configuração de infraestrutura;
- `test/`: testes de integração e objetos simulados.

**Regra principal:** os casos de uso devem depender de interfaces, não diretamente de NestJS, Prisma, Redis, BullMQ ou SMTP.

## 3. Fluxo de desenvolvimento

1. Atualize a branch principal:

   ```bash
   git switch main
   git pull origin main
   ```

2. Crie uma branch para a tarefa:

   ```bash
   git switch -c feat/nome-da-funcionalidade
   ```

3. Implemente a alteração, respeitando a arquitetura e adicionando testes quando necessário.
4. Execute as verificações locais.
5. Faça commits pequenos e abra um Pull Request para `main`.

### Padrão de branches

- `feat/descricao`: nova funcionalidade;
- `fix/descricao`: correção de defeito;
- `test/descricao`: adição ou ajuste de testes;
- `docs/descricao`: documentação;
- `refactor/descricao`: refatoração sem mudança de comportamento.

### Padrão de commits

Utilize mensagens **em português**, preferencialmente seguindo Conventional Commits:

```text
feat: implementa adaptador de fila com BullMQ
fix: corrige tratamento de falha no envio
test: adiciona testes de processamento de notificacoes
docs: atualiza instrucoes de execucao
```

## 4. Testes e qualidade

Antes de abrir um PR, execute:

```bash
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

Testes de integração podem exigir PostgreSQL e variáveis de ambiente configuradas. Utilize um **banco exclusivo para testes**, nunca o banco de produção.

Ao alterar o processamento assíncrono, teste também cenários de falha, reprocessamento e possíveis duplicidades. Os testes com fila simulada não substituem os testes de integração real com Redis e worker.

## 5. Pull Requests

Todo PR deve conter:

- **Objetivo:** qual problema ou funcionalidade foi abordado;
- **Alterações:** principais arquivos ou componentes modificados;
- **Como testar:** comandos e cenários validados;

Antes de solicitar revisão:

- Verifique se o código compila e se os testes relevantes passam;
- Confirme que a branch não inclui arquivos temporários ou credenciais;
- Evite mudanças não relacionadas à tarefa;
- Avise o outro responsável quando alterar contratos compartilhados.

**Não faça push diretamente na `main`.** As alterações devem ser integradas por Pull Request após revisão.

## 6. Cuidados com a mensageria

- A API registra a notificação antes de solicitar o enfileiramento;
- O worker deve receber o `notificationId`, recuperar os dados necessários e registrar o resultado do processamento;
- Falhas de conexão com Redis podem produzir um resultado incerto de publicação;
- O envio de e-mail não deve ser tratado como concluído apenas porque a API retornou `202 Accepted`;
- Idempotência e recuperação confiável de publicações pendentes são melhorias previstas no planejamento do projeto.

Em caso de dúvida sobre uma decisão arquitetural, discuta a proposta antes de alterar contratos ou responsabilidades entre módulos.
