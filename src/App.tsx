import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HowItWorksModal } from './components/HowItWorksModal';
import { Home } from './pages/Home';
import { Share } from './pages/Share';
import { NotFound } from './pages/NotFound';
import { runLocalCleanup } from './lib/storage-service';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#171717] font-sans">
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
    </div>
  );
}

export default App;
