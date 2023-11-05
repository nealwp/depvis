import { getModuleKey } from './module_util.js';

export default class Module {
  name: string;
  label: string;
  dependencies: string[];

  constructor(name: string, label: string, dependencies: string[]) {
    if (!name) {
      throw new Error(`Package name is required`);
    }
    this.dependencies = dependencies;
    this.name = name;
    this.label = label;
  }

  get key() {
    return getModuleKey(this.name);
  }

  getShareableLink() {
    const json = JSON.stringify(this.name);
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    hashParams.set('package_json', json);
    url.hash = hashParams.toString();
    return url;
  }

  get repository() {
    // TODO: Handle non-github repositories
    const { repository } = this.name;
    if (typeof repository == 'string') return repository;
    return repository?.url;
  }

  get githubPath() {
    const { homepage, bugs } = this.name;

    const url = this.repository ?? homepage ?? bugs?.url;

    return url ? parseGithubPath(url) : undefined;
  }

  toString() {
    return this.key;
  }

  toJSON() {
    return this.name;
  }
}

function parseGithubPath(s: string) {
  const match = /github.com\/([^/]+\/[^/?#]+)?/.test(s) && RegExp.$1;
  if (!match) return undefined;
  return match?.replace?.(/\.git$/, '');
}
