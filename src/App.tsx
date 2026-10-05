import { useState, useEffect } from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { Home } from './pages/Home';
import { Share } from './pages/Share';
import { NotFound } from './pages/NotFound';
import { runLocalCleanup, checkSupabaseHealth } from './lib/storage-service';
import type { SupabaseHealth } from './lib/storage-service';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseHealth | null>(null);
  const [dismissBanner, setDismissBanner] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Health check on Supabase connection
  useEffect(() => {
    checkSupabaseHealth().then(status => {
      setSupabaseStatus(status);
    });
  }, []);

  // Periodic cleanup check every 60 seconds
  useEffect(() => {
    runLocalCleanup();
    const interval = setInterval(() => {
      runLocalCleanup();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToShare = (tokenOrCode: string) => {
    navigateTo(`/s/${tokenOrCode}`);
  };

  const handleGoHome = () => {
    navigateTo('/');
  };

  // Route matching
  const renderCurrentView = () => {
    if (currentPath === '/' || currentPath === '') {
      return <Home onNavigateToShare={handleNavigateToShare} />;
    }

    if (currentPath.startsWith('/s/')) {
      const tokenOrCode = currentPath.slice(3).trim();
      if (!tokenOrCode) {
        return <NotFound onGoHome={handleGoHome} />;
      }
      return <Share tokenOrCode={tokenOrCode} onGoHome={handleGoHome} />;
    }

    return <NotFound onGoHome={handleGoHome} />;
  };

  const showSetupBanner =
    supabaseStatus?.isConfigured && !supabaseStatus.isReady && !dismissBanner;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#171717] font-sans">
      {/* Supabase Migration Notice Banner */}
      {showSetupBanner && (
        <div className="bg-[#FEF3C7] border-b border-[#FCD34D] px-4 py-2.5 text-xs text-[#92400E] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
            <span>
              <strong>Supabase Connected:</strong> Run the 30-second SQL setup script to initialize your database table &amp; private storage bucket. Files currently save to local demo storage.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="font-semibold underline hover:text-[#78350F] flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Complete Setup (SQL Script)</span>
            </button>
            <button
              onClick={() => setDismissBanner(true)}
              className="text-[#B45309] hover:text-[#78350F] px-1"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Header
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onGoHome={handleGoHome}
      />

      <main className="flex-1 flex flex-col items-center justify-start">
        {renderCurrentView()}
      </main>

      <Footer />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          // Re-check health after closing setup modal
          checkSupabaseHealth().then(setSupabaseStatus);
        }}
        supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
      />
    </div>
  );
}

export default App;
