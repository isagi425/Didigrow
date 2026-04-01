// SAME IMPORTS (unchanged)
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

      if (err.status === 409 || error.includes('already_registered')) {
        setErrorMsg('This username is registered with another operator.');
      } else if (err.status === 404 || error === 'reddit_account_not_found') {
        setErrorMsg('Reddit account not found.');
      } else if (error === 'not_eligible') {
        setErrorMsg('Account not eligible (karma/age issue).');
      } else {
        setErrorMsg(error || 'Verification failed.');
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

      if (res.status === 'verified' || res.status === 'already_registered') {
        showNotification('Account verified!', 'success');
        onLogin(username);
      } else {
        setErrorMsg('Token not found in bio yet.');
      }
    } catch (err: any) {
      setErrorMsg('Verification failed.');
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
    <div className="min-h-screen flex items-center justify-center bg-[#050816] relative overflow-hidden text-white px-4">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute w-[500px] h-[500px] bg-purple-600 opacity-20 blur-3xl rounded-full top-[-150px] left-[-150px]"></div>
      <div className="absolute w-[400px] h-[400px] bg-blue-600 opacity-20 blur-3xl rounded-full bottom-[-150px] right-[-150px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
      >

        {/* TITLE */}
        <h1 className="text-3xl font-bold text-center mb-2">
          ⚡ Nexora
        </h1>

        <p className="text-center text-gray-400 text-sm mb-6">
          Connect your Reddit account to start earning
        </p>

        {step === 'input' ? (
          <form onSubmit={handleContinue} className="space-y-4">

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Reddit username"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:border-purple-500 outline-none text-white placeholder-gray-400"
              required
            />

            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 transition transform shadow-lg flex justify-center"
            >
              {loading ? (
                <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div>
              ) : (
                'Verify & Continue 🚀'
              )}
            </button>

          </form>
        ) : (
          <div className="space-y-5">

            <div>
              <p className="text-sm text-gray-400 mb-2">Copy this token</p>

              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <span className="font-mono text-purple-400">{token}</span>

                <button onClick={copyToken}>
                  {copied ? <Check className="text-green-400" /> : <Copy />}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Paste this in your Reddit bio → save → then click verify
            </p>

            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-105 transition transform shadow-lg flex justify-center"
            >
              {loading ? "..." : "Verify Now ✅"}
            </button>

            <button
              onClick={() => setStep('input')}
              className="w-full text-gray-500 text-sm hover:text-gray-300"
            >
              Back
            </button>

          </div>
        )}

      </motion.div>
    </div>
  );
}
