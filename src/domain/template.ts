export class Template {
  constructor(
    public readonly id: string,
    public readonly applicationId: string,
    public readonly name: string,
    public readonly subject: string,
    public readonly body: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
