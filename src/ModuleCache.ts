import Module from './Module.js';

export const REGISTRY_BASE_URL = 'https://registry.npmjs.org';

export type QueryType = 'exact' | 'name' | 'license' | 'maintainer';

const exampleData = [
    { name: "service-a", label: "Service A", dependencies: ["service-b", "service-c", "service-d"] },
    { name: "service-b", label: "Service B", dependencies: ["service-c", "service-d", "service-e"] },
    { name: "service-c", label: "Service C", dependencies: ["service-d", "service-e", "service-f"] },
    { name: "service-d", label: "Service D", dependencies: ["service-e", "service-f", "service-g"] },
    { name: "service-e", label: "Service E", dependencies: ["service-f", "service-g", "service-h"] },
    { name: "service-f", label: "Service F", dependencies: ["service-g", "service-h", "service-i"] },
    { name: "service-g", label: "Service G", dependencies: ["service-h", "service-i", "service-j"] },
    { name: "service-h", label: "Service H", dependencies: ["service-i", "service-j", "service-k"] },
    { name: "service-i", label: "Service I", dependencies: ["service-j", "service-k", "database"] },
    { name: "service-j", label: "Service J", dependencies: ["service-k", "database"] },
    { name: "service-k", label: "Service K", dependencies: ["database"] },
    { name: "database", label: "Database", dependencies: [] },
]

export function getModule(moduleKey: string): Module {
    if (!moduleKey) throw Error('Undefined module name');

    const {name, label, dependencies}  = exampleData.filter(module => module.name === moduleKey)[0]
    return new Module(name, label, dependencies)
}

export function queryModuleCache(queryType: QueryType, queryValue: string) {
  const results = new Map<string, Module>();

  if (!queryType || !queryValue) return results;

  for (const module of exampleData.values()) {
    if (!module) continue;

    const m = new Module(module.name, module.label, module.dependencies)
    switch (queryType) {
      case 'exact':
        if (module.name === queryValue) results.set(module.name, m);
        break;
      case 'name':
        if (module.name === queryValue) results.set(module.name, m);
        break;
    }
  }

  return results;
}

