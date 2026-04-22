// src/lib/execution-manager.ts

class ExecutionManager {
  private controllers = new Map<string, AbortController>();

  createController(jobId: string): AbortController {
    const existing = this.controllers.get(jobId);
    if (existing) {
      return existing;
    }

    const controller = new AbortController();
    this.controllers.set(jobId, controller);
    return controller;
  }

  getController(jobId: string): AbortController | undefined {
    return this.controllers.get(jobId);
  }

  cancel(jobId: string): boolean {
    const controller = this.controllers.get(jobId);
    if (!controller) {
      return false;
    }

    controller.abort();
    this.controllers.delete(jobId);
    return true;
  }

  abort(jobId: string): boolean {
    return this.cancel(jobId);
  }

  clear(jobId: string) {
    this.controllers.delete(jobId);
  }
}

export const executionManager = new ExecutionManager();
