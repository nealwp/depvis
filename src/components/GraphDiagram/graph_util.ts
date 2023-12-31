import simplur from 'simplur';
import Module from '../../Module.js';
import { getModule } from '../../ModuleCache.js';

const FONT = 'Roboto Condensed, sans-serif';

export type DependencyKey =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

type DependencyEntry = {
  name: string;
};

type Dependency = {
  module: Module;
};

type GraphModuleInfo = {
  module: Module;
  level: number;
  upstream: Set<Dependency>;
  downstream: Set<Dependency>;
};

export type GraphState = {
  // Map of module key -> module info
  modules: Map<string, GraphModuleInfo>;

  entryModules: Set<Module>;
};

function getDependencyEntries(module: Module) {
  const depEntries = new Set<DependencyEntry>();
  const deps = module.dependencies;

  // Get entries, adding type to each entry
  for (const name of deps) {
      depEntries.add({name});
  }

  return depEntries;
}

/**
 * Fetch the module dependency tree for a given query.
 */
export async function getGraphForQuery(
  query: string[],
  dependencyTypes: Set<DependencyKey>,
  moduleFilter: (m: Module) => boolean,
) {
  const graphState: GraphState = {
    modules: new Map(),
    entryModules: new Set(),
  };

  async function _visit(
    module: Module[] | Module,
    level = 0,
    walk = true,
  ): Promise<GraphModuleInfo | void> {
    if (!module) return Promise.reject(Error('Undefined module'));

    // Array?  Apply to each element
    if (Array.isArray(module)) {
      await Promise.all(module.map(m => _visit(m, level)));
      return;
    }

    let info: GraphModuleInfo | undefined = graphState.modules.get(module.key);
    if (info) {
      return info;
    }

    // Create object that captures info about how this module fits in the dependency graph
    info = {
      module,
      level,
      upstream: new Set(),
      downstream: new Set(),
    };
    graphState.modules.set(module.key, info);

    if (!walk) return info;

    // Get dependency entries
    const downstreamEntries = moduleFilter(module)
      ? getDependencyEntries(module)
      : new Set<DependencyEntry>();

    // Walk downstream dependencies
    await Promise.allSettled(
      [...downstreamEntries].map(async ({ name }) => {
        const downstreamModule = getModule(name);

        // Don't walk peerDependencies
        const moduleInfo = await _visit(
          downstreamModule,
          level + 1,
        );

        moduleInfo?.upstream.add({ module });
        info?.downstream.add({ module: downstreamModule });
      }),
    );

    return info;
  }

  // Walk dependencies of each module in the query
  return Promise.allSettled(
    query.map(async moduleKey => {
      const m = await getModule(moduleKey);
      graphState.entryModules.add(m);
      return m && _visit(m);
    }),
  ).then(() => graphState);
}

function dotEscape(str: string) {
  return str.replace(/"/g, '\\"');
}

// Compose directed graph document (GraphViz notation)
export function composeDOT(graph: Map<string, GraphModuleInfo>) {
  // Sort modules by [level, key]
  const entries = [...graph.entries()];
  entries.sort(([aKey, a], [bKey, b]) => {
    if (a.level != b.level) {
      return a.level - b.level;
    } else {
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    }
  });

  const nodes = ['\n// Nodes & per-node styling'];
  const edges = ['\n// Edges & per-edge styling'];

  for (const [, { module, level, downstream }] of entries) {
    nodes.push(`"${dotEscape(module.key)}"${level == 0 ? ' [root=true]' : ''}`);
    if (!downstream) continue;
    for (const { module: dependency } of downstream) {
      edges.push(`"${dotEscape(module.key)}" -> "${dependency}" [color=black]`);
    }
  }

  const titleParts = entries
    .filter(([, m]) => m.level == 0)
    .map(([, m]) => dotEscape(m.module.name));

  const MAX_PARTS = 3;
  if (titleParts.length > MAX_PARTS) {
    titleParts.splice(
      MAX_PARTS,
      Infinity,
      simplur` and ${titleParts.length - MAX_PARTS} other module[|s]`,
    );
  }

  return [
    'digraph {',
    'rankdir="LR"',
    'labelloc="t"',
    `label="${titleParts.join(', ')}"`,
    '// Default styles',
    `graph [fontsize=16 fontname="${FONT}"]`,
    `node [shape=box style=rounded fontname="${FONT}" fontsize=11 height=0 width=0 margin=.04]`,
    `edge [fontsize=10, fontname="${FONT}" splines="polyline"]`,
    '',
  ]
    .concat(nodes)
    .concat(edges)
    .concat(
      graph.size > 1
        ? `{rank=same; ${[...graph.values()]
            .filter(info => info.level == 0)
            .map(info => `"${info.module}"`)
            .join('; ')};}`
        : '',
    )
    .concat('}')
    .join('\n');
}

export function gatherSelectionInfo(
  graphState: GraphState,
  selectedModules: IterableIterator<Module>,
) {
  // Gather *string* identifiers used to identify the various DOM elements that
  // represent the selection
  const selectedKeys = new Set<string>();
  const upstreamEdgeKeys = new Set<string>();
  const upstreamModuleKeys = new Set<string>();
  const downstreamEdgeKeys = new Set<string>();
  const downstreamModuleKeys = new Set<string>();

  function _visitUpstream(fromModule: Module, visited = new Set<Module>()) {
    if (visited.has(fromModule)) return;
    visited.add(fromModule);

    const info = graphState.modules.get(fromModule.key);
    if (!info) return;

    for (const { module } of info.upstream) {
      upstreamModuleKeys.add(module.key);
      upstreamEdgeKeys.add(`${module.key}->${fromModule.key}`);
      _visitUpstream(module, visited);
    }
  }

  function _visitDownstream(fromModule: Module, visited = new Set<Module>()) {
    if (visited.has(fromModule)) return;
    visited.add(fromModule);

    const info = graphState.modules.get(fromModule.key);
    if (!info) return;

    for (const { module } of info.downstream) {
      downstreamModuleKeys.add(module.key);
      downstreamEdgeKeys.add(`${fromModule.key}->${module.key}`);
      _visitDownstream(module, visited);
    }
  }

  for (const selectedModule of selectedModules) {
    selectedKeys.add(selectedModule.key);
    _visitUpstream(selectedModule);
    _visitDownstream(selectedModule);
  }

  return {
    selectedKeys,
    upstreamEdgeKeys,
    upstreamModuleKeys,
    downstreamEdgeKeys,
    downstreamModuleKeys,
  };
}

// Use color-mix to blend two colors in HSL space
export function hslFor(perc: number) {
  return `hsl(${Math.round(perc * 120)}, 80%, var(--bg-L))`;
}
