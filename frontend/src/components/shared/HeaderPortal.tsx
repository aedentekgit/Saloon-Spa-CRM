import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const HeaderPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('navbar-middle-content');
    if (el) setTarget(el);
  }, []);

  if (!target) return null;

  return createPortal(children, target);
};
