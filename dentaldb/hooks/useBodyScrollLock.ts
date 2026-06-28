import { useEffect } from 'react';

/**
 * Locks background page scroll while `locked` is true (e.g. while a modal
 * is open). Handles the iOS Safari quirk where `overflow: hidden` alone on
 * `<body>` isn't enough — the page can still rubber-band/scroll underneath
 * a `position: fixed` overlay unless we also pin the body's scroll position.
 *
 * Usage:
 *   useBodyScrollLock(true); // call unconditionally at the top of a modal component
 */
export function useBodyScrollLock(locked: boolean = true) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const originalStyle = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    // Pin body in place so iOS Safari can't scroll/rubber-band the page
    // behind the modal while still allowing the modal's own scroll
    // container (which has its own overflow-y-auto) to scroll normally.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = originalStyle.overflow;
      body.style.position = originalStyle.position;
      body.style.top = originalStyle.top;
      body.style.width = originalStyle.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
