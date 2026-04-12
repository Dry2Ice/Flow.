// src/components/DiffViewer.tsx

'use client';

import { X } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useAppStore } from '@/lib/store';

export function DiffViewer() {
  const { currentDiff, setDiffViewerOpen, setCurrentDiff } = useAppStore();

  if (!currentDiff) return null;

  const handleClose = () => {
    setDiffViewerOpen(false);
    setCurrentDiff(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-200">
            Changes: {currentDiff.filePath}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          <ReactDiffViewer
            oldValue={currentDiff.oldContent}
            newValue={currentDiff.newContent}
            splitView={true}
            useDarkTheme={true}
            disableWordDiff={false}
          />
        </div>
      </div>
    </div>
  );
}