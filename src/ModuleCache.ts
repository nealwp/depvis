import { PackageJson, Packument, PackumentVersion } from '@npm/types';
import semverGt from 'semver/functions/gt.js';
import semverSatisfies from 'semver/functions/satisfies.js';
import HttpError from './HttpError.js';
import Module from './Module.js';
import {
  cachePackument,
  getCachedPackument,
  getNPMPackument,
} from './PackumentCache.js';
import PromiseWithResolvers, {
  PromiseWithResolversType,
} from './PromiseWithResolvers.js';
import URLPlus from './URLPlus.js';
import { PARAM_PACKAGES } from './constants.js';
import fetchJSON from './fetchJSON.js';
import { flash } from './flash.js';
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
export async function getModule(moduleKey: string): Promise<Module> {
  if (!moduleKey) throw Error('Undefined module name');

  let [name, version] = parseModuleKey(moduleKey);

  if (isHttpModule(moduleKey)) {
    name = moduleKey;
    version = '';
    // unchanged
  } else {
    [name, version] = resolveModule(name, version);
  }

  moduleKey = getModuleKey(name, version);

  // Fetch module based on type
  if (isHttpModule(moduleKey)) { } else { }

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
