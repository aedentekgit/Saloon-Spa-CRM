import React from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { motion } from 'motion/react';

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans selection:bg-zen-sand selection:text-white">
      <PublicNavbar />
      <main className="animate-in fade-in duration-700 pt-32 lg:pt-40">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
