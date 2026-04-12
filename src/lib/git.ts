// src/lib/git.ts

import simpleGit, { SimpleGit } from 'simple-git';

class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async initRepo(path: string) {
    try {
      await this.git.cwd(path);
      await this.git.init();
      return true;
    } catch (error) {
      console.error('Failed to initialize git repo:', error);
      return false;
    }
  }

  async addAll(path: string) {
    try {
      await this.git.cwd(path);
      await this.git.add('.');
      return true;
    } catch (error) {
      console.error('Failed to add files:', error);
      return false;
    }
  }

  async commit(path: string, message: string) {
    try {
      await this.git.cwd(path);
      await this.git.commit(message);
      return true;
    } catch (error) {
      console.error('Failed to commit:', error);
      return false;
    }
  }

  async getStatus(path: string) {
    try {
      await this.git.cwd(path);
      const status = await this.git.status();
      return status;
    } catch (error) {
      console.error('Failed to get status:', error);
      return null;
    }
  }

  async getLog(path: string, limit = 10) {
    try {
      await this.git.cwd(path);
      const log = await this.git.log({ '--oneline': null, n: limit });
      return log.all;
    } catch (error) {
      console.error('Failed to get log:', error);
      return [];
    }
  }

  async checkout(path: string, commitHash: string) {
    try {
      await this.git.cwd(path);
      await this.git.checkout(commitHash);
      return true;
    } catch (error) {
      console.error('Failed to checkout:', error);
      return false;
    }
  }
}

export const gitService = new GitService();