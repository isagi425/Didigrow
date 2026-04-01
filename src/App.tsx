  import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import UsernameGate from './components/UsernameGate';
import TaskBoard from './components/TaskBoard';
import ClaimView from './components/ClaimView';
import HistoryView from './components/HistoryView';
import EarningsView from './components/EarningsView';
import BottomNav from './components/BottomNav';
import Notification, { NotificationType } from './components/Notification';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [view, setView] = useState<string>('board');
  const [activeClaim, setActiveClaim] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; type: NotificationType } | null>(null);

  useEffect(() => {
    document.title = import.meta.env.VITE_OPERATOR_NAME || 'Redwire Operator';
    const storedUser = localStorage.getItem('redwire_username');
    if (storedUser) setUsername(storedUser);

    const storedClaim = localStorage.getItem('redwire_active_claim');
    if (storedClaim) {
      try {
        const claim = JSON.parse(storedClaim);
        if (new Date(claim.expires_at).getTime() > new Date().getTime()) {
          setActiveClaim(claim);
          setView('claim');
        } else {
          localStorage.removeItem('redwire_active_claim');
        }
      } catch {}
    }
  }, []);

  const handleLogin = (user: string) => {
    localStorage.setItem('redwire_username', user);
    setUsername(user);
    setView(activeClaim ? 'claim' : 'board');
  };

  const handleLogout = () => {
    localStorage.removeItem('redwire_username');
    localStorage.removeItem('redwire_active_claim');
    setUsername(null);
    setActiveClaim(null);
    setView('board');
  };

  const showNotification = (msg: string, type: NotificationType) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClaimSuccess = (claimData: any) => {
    setActiveClaim(claimData);
    localStorage.setItem('redwire_active_claim', JSON.stringify(claimData));
    setView('claim');
  };

  const handleClearClaim = () => {
    setActiveClaim(null);
    localStorage.removeItem('redwire_active_claim');
  };

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-full max-w-sm p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl">
          <h1 className="text-xl font-bold text-center mb-4">
            {import.meta.env.VITE_OPERATOR_NAME || 'Redwire Operator'}
          </h1>

          <UsernameGate onLogin={handleLogin} showNotification={showNotification} />
        </div>

        <AnimatePresence>
          {notification && (
            <Notification
              message={notification.msg}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">

      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <h1 className="text-lg font-bold text-white tracking-wide">
            {import.meta.env.VITE_OPERATOR_NAME || 'Redwire Operator'}
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">u/{username}</span>

            <button
              onClick={handleLogout}
              className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 shadow-lg">
          {view === 'board' && (
            <TaskBoard username={username} onClaimSuccess={handleClaimSuccess} showNotification={showNotification} />
          )}

          {view === 'claim' && activeClaim && (
            <ClaimView claim={activeClaim} onClearClaim={handleClearClaim} showNotification={showNotification} setView={setView} />
          )}

          {view === 'history' && (
            <HistoryView showNotification={showNotification} />
          )}

          {view === 'earnings' && (
            <EarningsView username={username} showNotification={showNotification} />
          )}
        </div>

      </main>

      {/* NAV */}
      <div className="bg-slate-950/80 backdrop-blur-md border-t border-slate-800">
        <BottomNav currentView={view} setView={setView} hasActiveClaim={!!activeClaim} />
      </div>

      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.msg}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}      
