import React, { useState } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../api';
import { Copy, Check } from 'lucide-react';

interface UsernameGateProps {
  onLogin: (username: string) => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function UsernameGate({ onLogin, showNotification }: UsernameGateProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'token'>('input');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    try {
      // Direct call to verify. Backend handles checking if user exists 
      // and generates a token if they are new or not yet verified.
      const res = await apiFetch('/accounts/verify', {
        method: 'POST',
        body: JSON.stringify({ username })
      });

      if (res.status === 'verified' || res.status === 'already_registered') {
        onLogin(username);
      } else if (res.status === 'pending' && res.token) {
        setToken(res.token);
        setStep('token');
      } else {
        setErrorMsg(res.message || 'Verification is required to continue.');
      }
    } catch (err: any) {
      const error = err.data?.error || err.data?.message || '';
      
      if (err.status === 409 || error === 'already_registered_to_another_operator') {
        setErrorMsg('This username is registered with another operator.');
      } else if (err.status === 404 || error === 'reddit_account_not_found') {
        setErrorMsg('Reddit account not found. Please check your spelling.');
      } else if (error === 'not_eligible') {
        setErrorMsg('Account not eligible. Requirements: 100+ Post/Comment Karma & 10+ days old.');
      } else {
        setErrorMsg(error || 'Failed to connect to verification server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/accounts/verify', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      
      if (res.status === 'verified') {
        showNotification('Account verified! Welcome.', 'success');
        onLogin(username);
      } else {
        setErrorMsg('Token not found in your bio yet. Make sure you saved your Reddit profile and try again.');
      }
    } catch (err: any) {
      if (err.status === 400) {
        setErrorMsg(err.data?.message || 'Token not found in your bio yet. Make sure you saved your Reddit profile and try again.');
      } else if (err.data?.error === 'not_eligible') {
        setErrorMsg(`Your account doesn't meet the requirements yet. ${err.data.post_karma ? `Post Karma: ${err.data.post_karma}` : ''}`);
      } else {
        setErrorMsg(err.data?.message || 'Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    showNotification('Copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          {import.meta.env.VITE_OPERATOR_NAME || 'Redwire Operator'}
        </h1>

        {step === 'input' ? (
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Enter your Reddit username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. CyberFalcon847"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div> : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Your verification token</h2>
              <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 border border-slate-700">
                <span className="font-mono text-xl text-indigo-400">{token}</span>
                <button 
                  onClick={copyToken}
                  className="text-slate-400 hover:text-white transition-colors p-2"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="text-sm text-slate-300 space-y-2">
              <p>Add this token to your Reddit profile's "About" section, then click Verify below.</p>
              <p className="text-slate-500 text-xs">How to do this: reddit.com/settings &gt; Profile &gt; About &gt; paste token &gt; Save</p>
            </div>

            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div> : "I've added it — Verify"}
            </button>
            
            <button
              onClick={() => setStep('input')}
              className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../api';
import { Copy, Check } from 'lucide-react';

interface UsernameGateProps {
  onLogin: (username: string) => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function UsernameGate({ onLogin, showNotification }: UsernameGateProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'token'>('input');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    try {
      // Direct call to verify. Backend handles checking if user exists 
      // and generates a token if they are new or not yet verified.
      const res = await apiFetch('/accounts/verify', {
        method: 'POST',
        body: JSON.stringify({ username })
      });

      if (res.status === 'verified' || res.status === 'already_registered') {
        onLogin(username);
      } else if (res.status === 'pending' && res.token) {
        setToken(res.token);
        setStep('token');
      } else {
        setErrorMsg(res.message || 'Verification is required to continue.');
      }
    } catch (err: any) {
      const error = err.data?.error || err.data?.message || '';
      
      if (err.status === 409 || error === 'already_registered_to_another_operator') {
        setErrorMsg('This username is registered with another operator.');
      } else if (err.status === 404 || error === 'reddit_account_not_found') {
        setErrorMsg('Reddit account not found. Please check your spelling.');
      } else if (error === 'not_eligible') {
        setErrorMsg('Account not eligible. Requirements: 100+ Post/Comment Karma & 10+ days old.');
      } else {
        setErrorMsg(error || 'Failed to connect to verification server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/accounts/verify', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      
      if (res.status === 'verified') {
        showNotification('Account verified! Welcome.', 'success');
        onLogin(username);
      } else {
        setErrorMsg('Token not found in your bio yet. Make sure you saved your Reddit profile and try again.');
      }
    } catch (err: any) {
      if (err.status === 400) {
        setErrorMsg(err.data?.message || 'Token not found in your bio yet. Make sure you saved your Reddit profile and try again.');
      } else if (err.data?.error === 'not_eligible') {
        setErrorMsg(`Your account doesn't meet the requirements yet. ${err.data.post_karma ? `Post Karma: ${err.data.post_karma}` : ''}`);
      } else {
        setErrorMsg(err.data?.message || 'Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    showNotification('Copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          {import.meta.env.VITE_OPERATOR_NAME || 'Redwire Operator'}
        </h1>

        {step === 'input' ? (
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Enter your Reddit username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. CyberFalcon847"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div> : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Your verification token</h2>
              <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 border border-slate-700">
                <span className="font-mono text-xl text-indigo-400">{token}</span>
                <button 
                  onClick={copyToken}
                  className="text-slate-400 hover:text-white transition-colors p-2"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="text-sm text-slate-300 space-y-2">
              <p>Add this token to your Reddit profile's "About" section, then click Verify below.</p>
              <p className="text-slate-500 text-xs">How to do this: reddit.com/settings &gt; Profile &gt; About &gt; paste token &gt; Save</p>
            </div>

            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div> : "I've added it — Verify"}
            </button>
            
            <button
              onClick={() => setStep('input')}
              className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
