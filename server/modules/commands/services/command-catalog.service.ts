/** Used by commands routes to expose only actions implemented for the selected provider. */
export const commandCatalogService = {
  additional(provider: string) {
    if (provider !== 'codex') return [];
    return [
      { name: '/plan', description: 'Plan before making changes', execution: 'mode', acceptsArguments: false },
      { name: '/goal', description: 'Set a goal; status, pause, resume or clear', execution: 'runtime', acceptsArguments: true },
      { name: '/review', description: 'Review uncommitted changes or a specific target', execution: 'runtime', acceptsArguments: false },
      { name: '/compact', description: 'Compact the conversation context', execution: 'runtime', acceptsArguments: false },
      { name: '/steer', description: 'Send instructions to the current running turn', execution: 'control', acceptsArguments: true },
      ...['skills', 'apps', 'mcp', 'automations', 'voice', 'artifacts', 'agents'].map((kind) => ({ name: `/${kind}`, description: `Browse available ${kind}`, execution: 'discovery', acceptsArguments: false })),
      ...['image', 'research', 'browser'].map((kind) => ({ name: `/${kind}`, description: `Start a ${kind} task`, execution: 'runtime', acceptsArguments: true })),
    ].map(({ execution, acceptsArguments, ...command }) => ({
      ...command, namespace: 'builtin', metadata: { type: 'builtin', execution, acceptsArguments },
    }));
  },
};
