import { useState, useEffect } from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HowItWorksModal } from './components/HowItWorksModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { DeveloperModal } from './components/DeveloperModal';
import { ContactModal } from './components/ContactModal';
import { PrivacyModal } from './components/PrivacyModal';
import { TermsModal } from './components/TermsModal';
import { Home } from './pages/Home';
import { Share } from './pages/Share';
import { NotFound } from './pages/NotFound';
import {
  runLocalCleanup,
  runSupabaseAutoPurge,
  checkSupabaseHealth,
} from './lib/storage-service';
import { pingAllSupabaseNodes } from './lib/supabase-pool';
import type { SupabaseHealth } from './lib/storage-service';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isDeveloperOpen, setIsDeveloperOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Dedicated, separate modals for each page / section (no mixed tabs)
  const [isContactOpen, setIsContactOpen] = useState(() => window.location.pathname === '/contact');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(() => window.location.pathname === '/privacy');
  const [isTermsOpen, setIsTermsOpen] = useState(() => window.location.pathname === '/terms');

  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseHealth | null>(null);
  const [dismissBanner, setDismissBanner] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      setIsContactOpen(path === '/contact');
      setIsPrivacyOpen(path === '/privacy');
      setIsTermsOpen(path === '/terms');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Health check on Supabase connection
  useEffect(() => {
    checkSupabaseHealth().then((status) => {
      setSupabaseStatus(status);
    });
  }, []);

  // Periodic cleanup check & Anti-Pause Keep-Alive Ping:
  // 1. Purges expired files from local storage & Supabase
  // 2. Pings ALL configured Supabase nodes to register active traffic and prevent 7-day auto-pause!
  useEffect(() => {
    runLocalCleanup();
    runSupabaseAutoPurge();
    pingAllSupabaseNodes();

    const interval = setInterval(() => {
      runLocalCleanup();
      runSupabaseAutoPurge();
      pingAllSupabaseNodes();
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

  // Separate Modal Open Handlers (Zero Mixed Tabs)
  const handleOpenContact = () => {
    setIsContactOpen(true);
    window.history.pushState({}, '', '/contact');
    setCurrentPath('/contact');
  };

  const handleCloseContact = () => {
    setIsContactOpen(false);
    if (window.location.pathname === '/contact') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  const handleOpenPrivacy = () => {
    setIsPrivacyOpen(true);
    window.history.pushState({}, '', '/privacy');
    setCurrentPath('/privacy');
  };

  const handleClosePrivacy = () => {
    setIsPrivacyOpen(false);
    if (window.location.pathname === '/privacy') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  const handleOpenTerms = () => {
    setIsTermsOpen(true);
    window.history.pushState({}, '', '/terms');
    setCurrentPath('/terms');
  };

  const handleCloseTerms = () => {
    setIsTermsOpen(false);
    if (window.location.pathname === '/terms') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }
  };

  // Route matching
  const renderCurrentView = () => {
    if (
      currentPath === '/' ||
      currentPath === '' ||
      ['/privacy', '/terms', '/contact'].includes(currentPath)
    ) {
      return (
        <Home
          onNavigateToShare={handleNavigateToShare}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        />
      );
    }

    if (currentPath.startsWith('/s/')) {
      const cleanPath = currentPath
        .slice(3)
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '')
        .trim();
      const rawToken = decodeURIComponent(cleanPath);
      if (!rawToken) {
        return <NotFound onGoHome={handleGoHome} />;
      }
      return <Share tokenOrCode={rawToken} onGoHome={handleGoHome} />;
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

      {/* Brand Header with Developer Profile & Contact */}
      <Header
        onOpenDeveloper={() => setIsDeveloperOpen(true)}
        onOpenContact={handleOpenContact}
        onGoHome={handleGoHome}
      />

      <main className="flex-1 flex flex-col items-center justify-start">
        {renderCurrentView()}
      </main>

      {/* Footer with How It Works, Developer credit, Privacy, Terms, Contact */}
      <Footer
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenDeveloper={() => setIsDeveloperOpen(true)}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
        onOpenContact={handleOpenContact}
      />

      {/* Developer Profile Modal (shivagopi) */}
      <DeveloperModal
        isOpen={isDeveloperOpen}
        onClose={() => setIsDeveloperOpen(false)}
        onOpenContact={handleOpenContact}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Dedicated Separate Popups (Zero Mixed Tabs) */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={handleCloseContact}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={handleClosePrivacy}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={handleCloseTerms}
      />

      {/* Supabase Setup Modal */}
      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          checkSupabaseHealth().then(setSupabaseStatus);
        }}
        supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
      />
    </div>
  );
}

export default App;
