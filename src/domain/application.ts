export class Application {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly apiKeyHash: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
