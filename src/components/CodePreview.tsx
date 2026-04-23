// src/components/CodePreview.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Code, Eye, ExternalLink, Play, RefreshCw, SplitSquareVertical, Zap } from 'lucide-react';

import { codeExecutor } from '@/lib/code-executor';
import { useAppStore } from '@/lib/store';

type PreviewMode = 'code' | 'preview' | 'split';
type ReactPreviewMode = 'message' | 'sandbox';

const REACT_EXTENSIONS = new Set(['jsx', 'tsx']);
const MARKUP_EXTENSIONS = new Set(['html', 'htm']);

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

const createReactSandboxDocument = (source: string, isTsx: boolean) => {
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

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('code');
  const [reactPreviewMode, setReactPreviewMode] = useState<ReactPreviewMode>('message');
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrlInput, setPreviewUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const currentFile = openFiles.find((file) => file.path === activeFile);

  const extension = useMemo(() => currentFile?.path.split('.').pop()?.toLowerCase() ?? '', [currentFile]);
  const isHtmlFile = MARKUP_EXTENSIONS.has(extension);
  const isCssFile = extension === 'css';
  const isReactFile = REACT_EXTENSIONS.has(extension);

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
        setPreviewContent(file.content);
      } else if (isCssFile) {
        setPreviewContent(createCssPreviewDocument(file.content));
      } else if (isReactFile) {
        if (reactPreviewMode === 'sandbox') {
          setPreviewContent(createReactSandboxDocument(file.content, extension === 'tsx'));
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

  const handleIframeLoad = () => {
    iframeRef.current?.contentWindow?.addEventListener('error', (event) => {
      addLog({
        id: crypto.randomUUID(),
        sessionId: activeSessionId,
        timestamp: new Date(),
        type: 'error',
        message: `Preview error: ${event.message}`,
        details: `${event.filename}:${event.lineno}:${event.colno}`,
        source: 'program_run',
      });
    });
  };

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
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      );
    }

    if (isHtmlFile || isCssFile || (isReactFile && reactPreviewMode === 'sandbox')) {
      return (
        <iframe
          key={`${currentFile?.path}-${refreshNonce}`}
          ref={iframeRef}
          srcDoc={previewContent}
          onLoad={handleIframeLoad}
          className="h-full w-full border-0 bg-white"
          title="Code Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
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
            }}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
          >
            Clear
          </button>
        </div>
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
