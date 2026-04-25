// src/components/CodePreview.tsx

"use client";

import { useEffect, useMemo, useState } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Code, Eye, ExternalLink, Play, RefreshCw, SplitSquareVertical, Zap } from 'lucide-react';

import { codeExecutor } from '@/lib/code-executor';
import { useAppStore } from '@/lib/store';

type PreviewMode = 'code' | 'preview' | 'split';
type ReactPreviewMode = 'message' | 'sandbox';

const REACT_EXTENSIONS = new Set(['jsx', 'tsx']);
const MARKUP_EXTENSIONS = new Set(['html', 'htm']);

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const isRelativeProjectPath = (value: string) => {
  if (!value) return false;
  if (value.startsWith('/')) return false;
  if (value.startsWith('#')) return false;
  if (value.startsWith('//')) return false;
  if (ABSOLUTE_URL_PATTERN.test(value)) return false;
  return true;
};

const normalizeProjectPath = (baseFilePath: string, targetPath: string) => {
  const cleanTarget = targetPath.split('#')[0]?.split('?')[0] ?? '';
  const baseSegments = baseFilePath.split('/').slice(0, -1);
  const targetSegments = cleanTarget.split('/');
  const merged = [...baseSegments, ...targetSegments];
  const normalized: string[] = [];

  for (const segment of merged) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (normalized.length > 0) {
        normalized.pop();
      }
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join('/');
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const inlineHtmlLocalAssets = (
  htmlContent: string,
  htmlFilePath: string,
  files: Array<{ path: string; content: string }>,
) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const fileMap = new Map(files.map((file) => [file.path, file.content]));
  const missingFiles = new Set<string>();

  const stylesheetLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
  for (const link of stylesheetLinks) {
    const href = link.getAttribute('href')?.trim() ?? '';
    if (!isRelativeProjectPath(href) || isHttpUrl(href)) {
      continue;
    }

    const resolvedPath = normalizeProjectPath(htmlFilePath, href);
    const cssContent = fileMap.get(resolvedPath);

    if (cssContent === undefined) {
      missingFiles.add(resolvedPath);
      continue;
    }

    const styleElement = doc.createElement('style');
    styleElement.setAttribute('data-inlined-from', resolvedPath);
    styleElement.textContent = cssContent;
    link.replaceWith(styleElement);
  }

  const scripts = Array.from(doc.querySelectorAll('script[src]'));
  for (const script of scripts) {
    const src = script.getAttribute('src')?.trim() ?? '';
    if (!isRelativeProjectPath(src) || isHttpUrl(src)) {
      continue;
    }

    const resolvedPath = normalizeProjectPath(htmlFilePath, src);
    const scriptContent = fileMap.get(resolvedPath);

    if (scriptContent === undefined) {
      missingFiles.add(resolvedPath);
      continue;
    }

    const inlineScript = doc.createElement('script');
    inlineScript.setAttribute('data-inlined-from', resolvedPath);
    inlineScript.textContent = scriptContent;
    script.replaceWith(inlineScript);
  }

  if (missingFiles.size > 0) {
    const warning = doc.createElement('div');
    warning.setAttribute('role', 'alert');
    warning.setAttribute(
      'style',
      'position:sticky;top:0;z-index:9999;margin:0;padding:10px 12px;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fdba74;font:500 12px/1.4 "Segoe UI",sans-serif;',
    );
    warning.innerHTML = `<strong>Preview warning:</strong> Missing local asset${missingFiles.size > 1 ? 's' : ''}: ${Array.from(
      missingFiles,
    )
      .map((filePath) => `<code>${escapeHtml(filePath)}</code>`)
      .join(', ')}`;

    if (doc.body.firstChild) {
      doc.body.insertBefore(warning, doc.body.firstChild);
    } else {
      doc.body.appendChild(warning);
    }
  }

  return '<!doctype html>\n' + doc.documentElement.outerHTML;
};

const normalizePreviewUrl = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const createCssPreviewDocument = (css: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        background: linear-gradient(160deg, #f8fafc, #e2e8f0);
        color: #0f172a;
      }
      .stage {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .card {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: white;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }
      .btn {
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        background: #2563eb;
        color: white;
      }
      .tag {
        display: inline-flex;
        border-radius: 999px;
        padding: 4px 10px;
        background: #dbeafe;
        color: #1d4ed8;
      }
      ${css}
    </style>
  </head>
  <body>
    <section class="stage">
      <article class="card">
        <h2>Card title</h2>
        <p>Demo paragraph for quickly validating typography, spacing, borders and backgrounds.</p>
        <button class="btn">Primary action</button>
      </article>
      <article class="card">
        <span class="tag">Badge</span>
        <ul>
          <li>List item one</li>
          <li>List item two</li>
        </ul>
      </article>
    </section>
  </body>
</html>`;

const createPreviewBridgeScript = (channelId: string) => `
  <script>
    (() => {
      const channelId = ${JSON.stringify(channelId)};
      const send = (type, payload = {}) => {
        window.parent.postMessage(
          {
            source: 'code-preview',
            channelId,
            type,
            ...payload,
          },
          '*',
        );
      };

      window.addEventListener('error', (event) => {
        send('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason =
          event.reason instanceof Error
            ? event.reason.message
            : typeof event.reason === 'string'
              ? event.reason
              : JSON.stringify(event.reason);
        send('error', { message: 'Unhandled rejection: ' + reason });
      });

      const originalConsoleError = console.error.bind(console);
      console.error = (...args) => {
        send('console-error', {
          message: args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
        });
        originalConsoleError(...args);
      };
    })();
  </script>
`;

const injectPreviewBridge = (html: string, channelId: string) => {
  const bridgeScript = createPreviewBridgeScript(channelId);
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n${bridgeScript}`);
  }

  return html.replace(/<html([^>]*)>/i, `<html$1>\n<head>${bridgeScript}</head>`);
};

const createReactSandboxDocument = (source: string, isTsx: boolean, channelId: string) => {
  const safeSource = source.replaceAll('</script>', '<\\/script>');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body, #root { height: 100%; margin: 0; }
      body {
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: #fff;
      }
    </style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    ${createPreviewBridgeScript(channelId)}
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel" data-presets="${isTsx ? 'typescript,react' : 'react'}">
      ${safeSource}

      const __Component =
        typeof App !== 'undefined'
          ? App
          : typeof window.App !== 'undefined'
            ? window.App
            : null;

      if (__Component) {
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(__Component));
      } else {
        document.getElementById('root').innerHTML =
          '<div style="padding:16px;font-family:monospace;color:#b91c1c;">Компонент App не найден. Экспортируйте/объявите App для sandbox preview.</div>';
      }
    </script>
  </body>
</html>`;
};

export function CodePreview() {
  const { openFiles, activeFile, addLog, activeSessionId } = useAppStore();

  const [previewMode, setPreviewMode] = useState<PreviewMode>('code');
  const [reactPreviewMode, setReactPreviewMode] = useState<ReactPreviewMode>('message');
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrlInput, setPreviewUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [allowTrustedSameOrigin, setAllowTrustedSameOrigin] = useState(false);

  const currentFile = openFiles.find((file) => file.path === activeFile);

  const extension = useMemo(() => currentFile?.path.split('.').pop()?.toLowerCase() ?? '', [currentFile]);
  const isHtmlFile = MARKUP_EXTENSIONS.has(extension);
  const isCssFile = extension === 'css';
  const isReactFile = REACT_EXTENSIONS.has(extension);
  const previewChannelId = `${currentFile?.path ?? 'none'}:${refreshNonce}:${reactPreviewMode}`;

  useEffect(() => {
    if (!currentFile) {
      setPreviewContent('');
      return;
    }

    if (isHtmlFile && previewMode === 'code') {
      setPreviewMode('preview');
    }

    if (previewMode !== 'code' || isHtmlFile || isCssFile || isReactFile) {
      void generatePreview(currentFile);
      return;
    }

    setPreviewContent(currentFile.content);
  }, [currentFile, previewMode, reactPreviewMode, refreshNonce, isHtmlFile, isCssFile, isReactFile]);

  useEffect(() => {
    if (!currentFile || !autoRefresh || previewMode === 'code') return;

    void generatePreview(currentFile);
  }, [currentFile?.content, autoRefresh, previewMode, reactPreviewMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        setRefreshNonce((value) => value + 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const generatePreview = async (file: { path: string; content: string }) => {
    setIsLoading(true);
    try {
      if (isHtmlFile) {
        const html = inlineHtmlLocalAssets(file.content, file.path, openFiles);
        setPreviewContent(injectPreviewBridge(html, previewChannelId));
      } else if (isCssFile) {
        const cssDoc = createCssPreviewDocument(file.content);
        setPreviewContent(injectPreviewBridge(cssDoc, previewChannelId));
      } else if (isReactFile) {
        if (reactPreviewMode === 'sandbox') {
          setPreviewContent(createReactSandboxDocument(file.content, extension === 'tsx', previewChannelId));
        } else {
          setPreviewContent(
            "React-компоненты требуют компиляции. Используйте 'Run' для запуска через сервер, или откройте localhost:3000 в браузере",
          );
        }
      } else if (extension === 'json') {
        try {
          const parsed = JSON.parse(file.content);
          setPreviewContent(JSON.stringify(parsed, null, 2));
        } catch {
          setPreviewContent(file.content);
        }
      } else {
        setPreviewContent(file.content);
      }
    } catch (error) {
      setPreviewContent(`Error generating preview: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object' || event.data.source !== 'code-preview') {
        return;
      }

      if (event.data.channelId !== previewChannelId) {
        return;
      }

      if (event.data.type === 'error' || event.data.type === 'console-error') {
        addLog({
          id: crypto.randomUUID(),
          sessionId: activeSessionId,
          timestamp: new Date(),
          type: 'error',
          message: `Preview error: ${event.data.message ?? 'Unknown preview error'}`,
          details: [event.data.filename, event.data.lineno, event.data.colno].filter(Boolean).join(':'),
          source: 'program_run',
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeSessionId, addLog, previewChannelId]);

  const htmlPreviewSandboxPolicy =
    // Scripts are required for interactive examples and runtime errors surfaced via postMessage.
    // Forms are allowed so demos that submit in-frame still behave naturally.
    'allow-scripts allow-forms';

  const reactSandboxPolicy =
    // React sandbox runs Babel + React in-frame, so scripts are mandatory.
    // Forms remain enabled for controlled/uncontrolled form interaction tests.
    'allow-scripts allow-forms';

  const urlPreviewSandboxPolicy = allowTrustedSameOrigin
    ? // Dedicated "trusted origin" mode for dev servers that require same-origin APIs (cookies, storage, service workers).
      // This increases iframe privileges and is intentionally behind an explicit user toggle.
      'allow-scripts allow-forms allow-same-origin'
    : // Default least-privilege policy for arbitrary URLs.
      // Keeps script execution and form UX, but denies same-origin escalation by default.
      'allow-scripts allow-forms';

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!previewContent) return;

    const previewBlob = new Blob([previewContent], { type: 'text/html' });
    const previewBlobUrl = URL.createObjectURL(previewBlob);
    window.open(previewBlobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(previewBlobUrl), 3000);
  };

  const runCode = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const result = await codeExecutor.executeCode(currentFile.content, currentFile.path, {
        files: { [currentFile.path]: currentFile.content },
        entryPoint: currentFile.path,
      });

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `Code executed successfully: ${currentFile.path}`
          : `Code execution failed: ${result.error || 'Unknown error'}`,
        details: result.logs.join('\n'),
        source: 'program_run',
      });

      if (result.success) {
        if (currentFile.path.endsWith('.html')) {
          setPreviewContent(result.output);
        } else {
          setPreviewContent(
            `// Execution Results for ${currentFile.path}\n\n${result.output}\n\n// Console Output:\n${result.logs.map((log) => `// ${log}`).join('\n')}`,
          );
        }
      } else {
        setPreviewContent(
          `// Execution Error in ${currentFile.path}\n\nError: ${result.error}\n\n// Console Output:\n${result.logs.map((log) => `// ${log}`).join('\n')}`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      setPreviewContent(`// Execution Error in ${currentFile?.path}\n\n${errorMessage}`);

      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'error',
        message: `Code execution failed: ${currentFile?.path}`,
        details: errorMessage,
        source: 'program_run',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewPane = () => {
    if (previewUrl) {
      return (
        <iframe
          key={`${previewUrl}-${refreshNonce}`}
          src={previewUrl}
          className="h-full w-full border-0 bg-white"
          title="Dev Server Preview"
          sandbox={urlPreviewSandboxPolicy}
        />
      );
    }

    if (isHtmlFile || isCssFile || (isReactFile && reactPreviewMode === 'sandbox')) {
      return (
        <iframe
          key={`${currentFile?.path}-${refreshNonce}`}
          srcDoc={previewContent}
          className="h-full w-full border-0 bg-white"
          title="Code Preview"
          sandbox={isReactFile && reactPreviewMode === 'sandbox' ? reactSandboxPolicy : htmlPreviewSandboxPolicy}
        />
      );
    }

    return (
      <pre className="font-mono text-xs text-neutral-300 whitespace-pre-wrap rounded-md border border-neutral-800/80 bg-neutral-950/60 p-3">
        {previewContent}
      </pre>
    );
  };

  return (
    <div className="flex h-full flex-col bg-neutral-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">Preview</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPreviewMode('code')}
            className={`rounded-md p-1.5 transition-colors ${
              previewMode === 'code' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
            title="Code View"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPreviewMode('preview')}
            className={`rounded-md p-1.5 transition-colors ${
              previewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
            title="Preview View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPreviewMode('split')}
            className={`rounded-md p-1.5 transition-colors ${
              previewMode === 'split' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
            }`}
            title="Split View"
          >
            <SplitSquareVertical className="h-4 w-4" />
          </button>

          {isReactFile && (
            <button
              onClick={() => setReactPreviewMode((mode) => (mode === 'sandbox' ? 'message' : 'sandbox'))}
              className={`rounded-md p-1.5 transition-colors ${
                reactPreviewMode === 'sandbox'
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-300'
              }`}
              title="Toggle React Sandbox"
            >
              <Zap className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setRefreshNonce((value) => value + 1)}
            className="rounded-md p-1.5 text-sky-300 transition-colors hover:bg-sky-500/10 hover:text-sky-200"
            title="Refresh (F5)"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAutoRefresh((value) => !value)}
            className={`rounded-md px-2 py-1 text-[11px] ${
              autoRefresh ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
            title="Auto-refresh"
          >
            Auto
          </button>
          <button
            onClick={openInNewTab}
            className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            title="Открыть в новой вкладке"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={runCode}
            disabled={isLoading}
            className="rounded-md p-1.5 text-emerald-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-200 disabled:text-neutral-500"
            title="Run Code"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="border-b border-neutral-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={previewUrlInput}
            onChange={(event) => setPreviewUrlInput(event.target.value)}
            placeholder="localhost:3000"
            className="h-8 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 text-xs text-neutral-200 outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setPreviewUrl(normalizePreviewUrl(previewUrlInput))}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white"
          >
            Open URL
          </button>
          <button
            onClick={() => {
              setPreviewUrl('');
              setPreviewUrlInput('');
              setAllowTrustedSameOrigin(false);
            }}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
          >
            Clear
          </button>
          {previewUrl && (
            <button
              onClick={() => setAllowTrustedSameOrigin((enabled) => !enabled)}
              className={`rounded-md px-2 py-1 text-xs ${
                allowTrustedSameOrigin
                  ? 'border border-amber-500/70 bg-amber-500/10 text-amber-200'
                  : 'border border-neutral-700 text-neutral-300'
              }`}
              title="Toggle trusted same-origin mode for previews that require cookie/storage APIs"
            >
              {allowTrustedSameOrigin ? 'Trusted Origin: On' : 'Trusted Origin: Off'}
            </button>
          )}
        </div>
        {previewUrl && allowTrustedSameOrigin && (
          <p className="mt-2 text-[11px] text-amber-300">
            Warning: trusted mode enables <code>allow-same-origin</code> for this iframe. Use only for known dev
            servers that need cookie/storage or same-origin browser APIs.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {currentFile ? (
          previewMode === 'split' ? (
            <Allotment defaultSizes={[50, 50]}>
              <Allotment.Pane minSize={240}>
                <pre className="h-full overflow-auto whitespace-pre-wrap rounded-md border border-neutral-800/80 bg-neutral-950/60 p-3 font-mono text-xs text-neutral-300">
                  {currentFile.content}
                </pre>
              </Allotment.Pane>
              <Allotment.Pane minSize={240}>
                <div className="h-full overflow-auto">{renderPreviewPane()}</div>
              </Allotment.Pane>
            </Allotment>
          ) : previewMode === 'code' ? (
            <pre className="h-full overflow-auto whitespace-pre-wrap rounded-md border border-neutral-800/80 bg-neutral-950/60 p-3 font-mono text-xs text-neutral-300">
              {previewContent}
            </pre>
          ) : (
            <div className="h-full overflow-auto">{renderPreviewPane()}</div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-500">
            <div className="text-center">
              <div className="mb-4 text-4xl">👁️</div>
              <p>Select a file to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
