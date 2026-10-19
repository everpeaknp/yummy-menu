"use client";

import { useEffect, useRef } from 'react';

const activeDialogs: HTMLElement[] = [];
let savedOverflow = '';

export function useDialog(open: boolean, onClose: () => void, historyKey?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const marker = historyKey ? `${historyKey}-${Date.now()}` : null;
    if (marker) {
      const url = new URL(window.location.href);
      url.searchParams.set('dialog', historyKey!);
      window.history.pushState({ ...window.history.state, yummyDialog: marker }, '', url);
    }
    const popstate = () => { if (marker && window.history.state?.yummyDialog !== marker) close.current(); };
    if (marker) window.addEventListener('popstate', popstate);
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!activeDialogs.length) savedOverflow = document.body.style.overflow;
    activeDialogs.push(node);
    document.body.style.overflow = 'hidden';
    const inertElements: [HTMLElement, boolean][] = [];
    let branch: HTMLElement = node;
    while (branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          inertElements.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    const controls = () => Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    node.tabIndex = -1;
    (controls()[0] || node).focus();
    const keepFocus = (event: FocusEvent) => {
      if (activeDialogs[activeDialogs.length - 1] === node && !node.contains(event.target as Node)) (controls()[0] || node).focus();
    };
    const keydown = (event: KeyboardEvent) => {
      if (activeDialogs[activeDialogs.length - 1] !== node) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = controls(); const first = elements[0]; const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', keepFocus);
    return () => {
      const index = activeDialogs.indexOf(node);
      if (index !== -1) activeDialogs.splice(index, 1);
      if (!activeDialogs.length) document.body.style.overflow = savedOverflow;
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', keepFocus);
      if (marker) {
        window.removeEventListener('popstate', popstate);
        if (window.history.state?.yummyDialog === marker) window.history.back();
      }
      for (const [element, wasInert] of inertElements) element.inert = wasInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, historyKey]);
  return ref;
}
