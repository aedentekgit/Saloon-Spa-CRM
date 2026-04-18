import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { PublicSettingsProvider } from './usePublicSettings';

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <PublicSettingsProvider>
      <div className="min-h-screen bg-zen-cream font-sans selection:bg-zen-sand selection:text-white">
        <PublicNavbar />
        <main className="animate-in fade-in duration-700 pt-20">
          {children}
        </main>
        <PublicFooter />
      </div>
    </PublicSettingsProvider>
  );
};

export default PublicLayout;
