// src/lib/code-executor.ts

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs: string[];
  exitCode?: number;
}

interface ExecutionContext {
  files: { [path: string]: string };
  entryPoint: string;
  dependencies?: { [name: string]: string };
}

type SandboxMessage = {
  type: 'sandbox-ready' | 'sandbox-log' | 'sandbox-result';
  payload?: {
    level?: 'log' | 'warn' | 'error' | 'info';
    message?: string;
    success?: boolean;
    output?: string;
    error?: string;
    logs?: string[];
  };
};

class CodeExecutor {
  private worker: Worker | null = null;
  private executionTimeout = 5000; // 5 seconds

  private async invokeProjectAction(action: 'test' | 'lint' | 'build', payload: Record<string, unknown>): Promise<ExecutionResult> {
    const response = await fetch('/api/project/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });

    const result = await response.json();
    return {
      success: Boolean(result.success),
      output: result.output || '',
      error: result.error,
      logs: Array.isArray(result.logs) ? result.logs : [],
      exitCode: typeof result.exitCode === 'number' ? result.exitCode : undefined,
    };
  }

  // Универсальный запуск JS в изолированном sandbox iframe
  private runInSandbox(code: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.src = '/sandbox/runner.html';

      const logs: string[] = [];
      const expectedOrigin = window.location.origin;
      let settled = false;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        iframe.removeEventListener('load', onLoad);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      const finish = (result: ExecutionResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve(result);
      };

      const onMessage = (event: MessageEvent<SandboxMessage>) => {
        // Проверяем источник события: только наш iframe
        if (event.source !== iframe.contentWindow) return;

        // Для sandbox без allow-same-origin origin может быть "null"
        const isExpectedOrigin = event.origin === expectedOrigin || event.origin === 'null';
        if (!isExpectedOrigin) return;

        const message = event.data;
        if (!message || typeof message !== 'object') return;

        if (message.type === 'sandbox-log' && message.payload?.message) {
          const level = message.payload.level ? `[${message.payload.level.toUpperCase()}] ` : '';
          logs.push(`${level}${message.payload.message}`);
          return;
        }

        if (message.type === 'sandbox-result') {
          finish({
            success: Boolean(message.payload?.success),
            output: message.payload?.output || '',
            error: message.payload?.error,
            logs: message.payload?.logs?.length ? message.payload.logs : logs,
          });
        }
      };

      const onLoad = () => {
        iframe.contentWindow?.postMessage(
          {
            type: 'execute-javascript',
            payload: { code },
          },
          expectedOrigin
        );
      };

      const timeoutId = window.setTimeout(() => {
        finish({
          success: false,
          output: '',
          error: `Execution timed out after ${this.executionTimeout}ms`,
          logs,
        });
      }, this.executionTimeout);

      window.addEventListener('message', onMessage);
      iframe.addEventListener('load', onLoad);
      document.body.appendChild(iframe);
    });
  }

  // Безопасное выполнение JavaScript через sandboxed iframe
  async executeJavaScript(code: string, _context: ExecutionContext): Promise<ExecutionResult> {
    return this.runInSandbox(code);
  }

  // Безопасное выполнение HTML/CSS/JS через sandboxed iframe
  async executeHTML(html: string, css?: string, js?: string): Promise<ExecutionResult> {
    const escapedHtml = JSON.stringify(html || '');
    const escapedCss = JSON.stringify(css || '');
    const escapedJs = JSON.stringify(js || '');

    const wrappedCode = `
      (function () {
        const html = ${escapedHtml};
        const css = ${escapedCss};
        const js = ${escapedJs};

        document.open();
        document.write(
          '<!doctype html><html><head><meta charset="utf-8"><style>' +
            css +
          '</style></head><body>' +
            html +
          '</body></html>'
        );
        document.close();

        if (js && js.trim().length > 0) {
          (0, eval)(js);
        }

        return 'HTML rendered successfully in sandbox';
      })();
    `;

    return this.runInSandbox(wrappedCode);
  }

  // Execute TypeScript (compile to JS and then execute)
  async executeTypeScript(code: string, context: ExecutionContext): Promise<ExecutionResult> {
    // For now, treat as JavaScript - in production you'd want TypeScript compilation
    return this.executeJavaScript(code, context);
  }

  // Execute based on file type
  async executeCode(code: string, filePath: string, context: ExecutionContext = { files: {}, entryPoint: filePath }): Promise<ExecutionResult> {
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js':
      case 'mjs':
        return this.executeJavaScript(code, context);

      case 'ts':
      case 'tsx':
        return this.executeTypeScript(code, context);

      case 'html':
        return this.executeHTML(code);

      case 'css':
        return this.executeHTML('<div>CSS Preview</div>', code);

      default:
        return {
          success: true,
          output: `Preview for ${extension?.toUpperCase()} file`,
          logs: [`File type: ${extension}`]
        };
    }
  }

  // Run tests for a project
  async runTests(projectPath: string): Promise<ExecutionResult> {
    return this.invokeProjectAction('test', { projectPath });
  }

  // Lint code
  async lintCode(code: string, filePath: string, projectPath?: string): Promise<ExecutionResult> {
    return this.invokeProjectAction('lint', { code, filePath, projectPath });
  }

  // Build project
  async buildProject(projectPath: string): Promise<ExecutionResult> {
    return this.invokeProjectAction('build', { projectPath });
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const codeExecutor = new CodeExecutor();
