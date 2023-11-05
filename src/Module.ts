import { getModuleKey } from './module_util.js';

export default class Module {
  name: string;
  label: string;
  dependencies: string[];

  constructor(name: string, label: string, dependencies: string[]) {
    if (!name) {
      throw new Error(`name is required`);
    }
    this.dependencies = dependencies;
    this.name = name;
    this.label = label;
  }

  get key() {
    return getModuleKey(this.name);
  }

  toString() {
    return this.key;
  }

  toJSON() {
    return this.name;
  }
}

