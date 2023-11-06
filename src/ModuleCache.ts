import Module from './Module.js';

export const REGISTRY_BASE_URL = 'https://registry.npmjs.org';

export type QueryType = 'exact' 

export const exampleData = [
    { name: "service-a", label: "Service A", dependencies: ["service-b", "service-c", "service-d", "service-e", "service-f", "service-h"] },
    { name: "service-b", label: "Service B", dependencies: ["database-1"] },
    { name: "service-c", label: "Service C", dependencies: ["database-1", "library-1", "library-2"] },
    { name: "service-d", label: "Service D", dependencies: ["database-1"] },
    { name: "library-1", label: "Library 1", dependencies: [] },
    { name: "library-2", label: "Library 2", dependencies: [] },
    { name: "library-3", label: "Library 3", dependencies: [] },
    { name: "service-e", label: "Service E", dependencies: ["service-f", "database-1"] },
    { name: "service-f", label: "Service F", dependencies: ["library-3", "message-broker"] },
    { name: "service-g", label: "Service G", dependencies: ["message-broker", "database-1"] },
    { name: "service-h", label: "Service H", dependencies: ["service-g", "service-j", "service-k", "database-1"] },
    { name: "service-i", label: "Service I", dependencies: ["service-j", "service-k", "database-1"] },
    { name: "service-j", label: "Service J", dependencies: ["service-k", "database-1"] },
    { name: "service-k", label: "Service K", dependencies: ["database-1"] },
    { name: "message-broker", label: "Message Broker", dependencies: [] },
    { name: "database-1", label: "Database 1", dependencies: [] },
]

export function getModule(moduleKey: string): Module {
    if (!moduleKey) throw Error('Undefined module name');

    const {name, label, dependencies}  = exampleData.filter(module => module.name === moduleKey)[0]
    return new Module(name, label, dependencies)
}

export function queryModules(queryValue: string) {
  const results = new Map<string, Module>();

  if (!queryValue) return results;

  for (const module of exampleData.values()) {
    if (!module) continue;

    const m = new Module(module.name, module.label, module.dependencies)
    if (module.name === queryValue) results.set(module.name, m);
  }

  return results;
}

