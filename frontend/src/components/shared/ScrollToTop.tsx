import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — resets the window scroll position to (0, 0)
 * every time the route pathname changes.
 * Place this inside <Router> so it has access to the location context.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset window scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Reset specific scrollable containers used in the CRM
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    const pageContainers = document.querySelectorAll('.page-container');
    pageContainers.forEach(el => {
      el.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
