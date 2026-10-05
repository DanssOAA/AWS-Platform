import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/** A single mounted panel, promoted to the browser's modal top layer when expanded. */
export function ExpandablePanel({ label, children }: {
  label: string;
  children: (controls: ReactNode, expanded: boolean) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  function toggle() {
    const element = dialog.current;
    if (!element) return;
    element.close();
    if (expanded) element.show();
    else element.showModal();
    setExpanded(!expanded);
    button.current?.focus();
  }

  return <dialog ref={dialog} open aria-label={label} role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined}
    onCancel={event => { event.preventDefault(); if (expanded) toggle(); }}
    className={`expandable-panel ${expanded ? 'is-expanded' : ''}`}>
    {children(<button ref={button} type="button" onClick={toggle} aria-label={expanded ? `Reducir ${label}` : `Ampliar ${label}`} className="editor-control">
      {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
    </button>, expanded)}
  </dialog>;
}
