export interface Tool {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  execute: (input: unknown) => Promise<unknown>;
}

export class ToolOrchestrator {
  constructor(private readonly tools: Tool[]) {}

  getToolDefinitions(): unknown[] {
    return this.tools.map((t) => t.definition);
  }

  async executeTool(name: string, input: unknown): Promise<unknown> {
    const tool = this.tools.find((t) => t.definition.function.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(input);
  }
}
