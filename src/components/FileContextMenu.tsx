'use client';

import { type ComponentType, useEffect, useRef } from 'react';
import { Copy, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react';

interface FileContextMenuProps {
  x: number;
  y: number;
  nodeType: 'file' | 'directory';
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onClose: () => void;
}

interface MenuItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  danger?: boolean;
}

export function FileContextMenu({
  x,
  y,
  nodeType,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  onClose,
}: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items: Array<MenuItem | null> = [
    ...(nodeType === 'directory'
      ? [
          { icon: FilePlus, label: 'New File', action: onNewFile },
          { icon: FolderPlus, label: 'New Folder', action: onNewFolder },
          null,
        ]
      : []),
    { icon: Pencil, label: 'Rename', action: onRename },
    { icon: Copy, label: 'Copy Path', action: onCopyPath },
    null,
    { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      className="min-w-40 rounded-lg border border-neutral-700 bg-neutral-900/95 py-1 shadow-xl backdrop-blur-sm"
    >
      {items.map((item, index) => {
        if (!item) {
          return <div key={`divider-${index}`} className="my-1 h-px bg-neutral-700" />;
        }

        const Icon = item.icon;

        return (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-neutral-800 ${
              item.danger ? 'text-red-400 hover:text-red-300' : 'text-neutral-300 hover:text-neutral-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
