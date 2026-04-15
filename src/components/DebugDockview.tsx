'use client';

import { useEffect, useRef } from 'react';
import { DockviewReact, DockviewReadyEvent } from 'dockview';

export default function DebugDockview() {
  const apiRef = useRef<any>(null);

  const onReady = (event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    
    const panels = [
      { id: 'files', title: '📁 Files', component: 'files' },
      { id: 'editor', title: '✏️ Editor', component: 'editor' },
      { id: 'chat', title: '💬 AI Chat', component: 'chat' },
      { id: 'plan', title: '🎯 Dev Plan', component: 'plan' },
    ];

    panels.forEach(panel => {
      event.api.addPanel({
        id: panel.id,
        component: panel.component,
        title: panel.title,
        position: { referencePanel: event.api.panels[0], direction: 'right' },
      });
    });

    // Log valid layout structure
    console.log('VALID LAYOUT:', JSON.stringify(event.api.toJSON(), null, 2));
  };

  return (
    <div style={{ height: '100vh' }}>
      <DockviewReact
        className="dockview-theme-dark h-full"
        components={{
          files: () => <div>Files</div>,
          editor: () => <div>Editor</div>,
          chat: () => <div>Chat</div>,
          plan: () => <div>Plan</div>,
        }}
        onReady={onReady}
      />
    </div>
  );
}
