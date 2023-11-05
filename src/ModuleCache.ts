import { PackageJson, Packument, PackumentVersion } from '@npm/types';
import Module from './Module.js';
import {
  getNPMPackument,
} from './PackumentCache.js';
import fetchJSON from './fetchJSON.js';
import {
  getModuleKey,
  isHttpModule,
  parseModuleKey,
  resolveModule,
} from './module_util.js';

export const REGISTRY_BASE_URL = 'https://registry.npmjs.org';

export type QueryType = 'exact' | 'name' | 'license' | 'maintainer';

function selectVersion(
  packument: Packument,
  targetVersion: string = 'latest',
): PackumentVersion | undefined {
  let selectedVersion: string | undefined;

  // If version matches a dist-tag (e.g. "latest", "best", etc), use that
  const distVersion = packument['dist-tags']?.[targetVersion];
  if (distVersion) {
    selectedVersion = distVersion;
  } else {
    // Find highest matching version
    for (const version of Object.keys(packument.versions)) {
      if (!semverSatisfies(version, targetVersion)) continue;
      if (!selectedVersion || semverGt(version, selectedVersion)) {
        selectedVersion = version;
      }
    }
  }

  return packument.versions[selectedVersion ?? ''];
}

async function fetchModuleFromNPM(
  moduleName: string,
  version?: string,
): Promise<Module> {
  const packument = await getNPMPackument(moduleName);

  if (!packument) {
    throw new Error(`Could not find ${moduleName} module`);
  }

  // Match best version from manifest
  const packumentVersion = packument && selectVersion(packument, version);

  if (!packumentVersion) {
    throw new Error(`${moduleName} does not have a version ${version}`);
  }

  return new Module(packumentVersion, packument);
}

async function fetchModuleFromURL(urlString: string) {
  const url = new URL(urlString);

  // TODO: We should probably be fetching github content via their REST API, but
  // that makes this code much more github-specific.  So, for now, we just do
  // some URL-messaging to pull from the "raw" URL
  if (/\.?github.com$/.test(url.host)) {
    url.host = 'raw.githubusercontent.com';
    url.pathname = url.pathname.replace('/blob', '');
  }
  const pkg: PackageJson = await fetchJSON<PackageJson>(url);

  if (!pkg.name) pkg.name = url.toString();

  return new Module(pkg as PackumentVersion);
}

// Note: This method should not throw!  Errors should be returned as part of a
// stub module
export function getModule(moduleKey: string): Module {
  if (!moduleKey) throw Error('Undefined module name');

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

    const {name, label, dependencies}  = exampleData.filter(module => module.name === moduleKey)[0]
    return new Module(name, label, dependencies)
}

/**
 * Convenience method for getting loaded modules by some criteria.
 */
export function queryModuleCache(queryType: QueryType, queryValue: string) {
  const results = new Map<string, Module>();

  if (!queryType || !queryValue) return results;

  for (const { module } of moduleCache.values()) {
    if (!module) continue;

    switch (queryType) {
      case 'exact':
        if (module.key === queryValue) results.set(module.key, module);
        break;
      case 'name':
        if (module.name === queryValue) results.set(module.key, module);
        break;
    }
  }

  return results;
}

const PACKAGE_WHITELIST: (keyof PackageJson)[] = [
  'author',
  'dependencies',
  'devDependencies',
  'license',
  'name',
  'peerDependencies',
  'version',
];

export function sanitizePackageKeys(pkg: PackageJson) {
  const sanitized: PackageJson = {} as PackageJson;

  for (const key of PACKAGE_WHITELIST) {
    if (key in pkg) (sanitized[key] as unknown) = pkg[key];
  }

  return sanitized;
}
