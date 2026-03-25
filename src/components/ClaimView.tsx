import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Copy, Check } from 'lucide-react';

const RejectionModal: React.FC<{ isOpen: boolean, onClose: () => void, onSubmit: (reason: string) => void }> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-red-900/50 rounded-lg p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Reject Task</h3>
        <p className="text-red-400 text-xs mb-4 font-bold">Explain your reason in detail. Rejecting tasks without a proper reason may lead to suspension.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason..." className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white text-sm mb-4" rows={3} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm font-bold px-3 py-2 rounded hover:bg-slate-800">Cancel</button>
          <button type="button" onClick={(e) => { e.preventDefault(); onSubmit(reason); }} disabled={reason.length < 5} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50 transition-colors">Confirm Rejection</button>
        </div>
      </div>
    </div>
  )
}

interface ClaimViewProps {
  claim: any;
  onClearClaim: () => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'warning') => void;
  setView: (view: string) => void;
}

export default function ClaimView({ claim, onClearClaim, showNotification, setView }: ClaimViewProps) {
  const [postUrl, setPostUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const expiresAt = claim.expiresAt || new Date(claim.expires_at).getTime();
      const now = new Date().getTime();
      const distance = expiresAt - now;

      if (distance < 0) {
        setExpired(true);
        setTimeLeft('00:00');
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [claim.expires_at, claim.expiresAt]);

  const handleRejectConfirm = async (reason: string) => {
    setShowRejectModal(false);
    try {
      await apiFetch('/v1/reject', {
        method: 'POST',
        body: JSON.stringify({ claim_id: claim.claim_id, reason })
      });
      showNotification('Task rejected successfully', 'success');
      onClearClaim();
      setView('board');
    } catch (err: any) {
      showNotification(err.data?.message || 'Failed to reject task', 'error');
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showNotification('Copied!', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.startsWith('https://reddit.com/') && !postUrl.startsWith('https://www.reddit.com/')) {
      showNotification('URL must be a direct link to your Reddit post starting with https://reddit.com/', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/submit', {
        method: 'POST',
        body: JSON.stringify({ claim_id: claim.claim_id, post_url: postUrl })
      });
      showNotification(`Submitted! Your post is being verified. You'll earn $${Number(claim.payout).toFixed(2)} once cleared.`, 'success');
      onClearClaim();
      setView('history');
    } catch (err: any) {
      showNotification(err.data?.message || 'Failed to submit post URL', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64">
        <h3 className="text-red-400 font-bold text-lg mb-2">Claim expired</h3>
        <p className="text-slate-400 text-sm mb-6">You did not submit the post URL in time.</p>
        <button
          onClick={() => {
            onClearClaim();
            setView('board');
          }}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Back to board
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <RejectionModal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} onSubmit={handleRejectConfirm} />
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10 -mx-4 px-4 mb-4">
        <div>
          <h2 className="font-bold text-white">Active Task: r/{claim.subreddit}</h2>
          <div className="font-mono text-indigo-400 text-sm">Expires in: {timeLeft}</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
          <span className="text-xl font-mono font-bold text-green-400">${Number(claim.payout).toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-yellow-900/20 border-b border-yellow-700/30 p-3 flex gap-3 items-center justify-center -mx-4 px-4 mb-6">
        <p className="text-yellow-400 text-xs text-center font-medium">
          Keep the post live for at least 2 weeks after it clears. Removing it early may result in suspension.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-900/30 p-3 rounded border border-slate-700/30">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-800/50 pb-1">Submission Requirements</h4>
            <div className="space-y-3">
              {claim.verificationPeriodDays > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Verify Time</span>
                  <span className="text-xs font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded">{claim.verificationPeriodDays} Days</span>
                </div>
              )}
              {claim.flair && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Flair</span>
                  <span className="bg-slate-700 text-white text-xs px-2 py-0.5 rounded border border-slate-600 font-mono">{claim.flair}</span>
                </div>
              )}
              {claim.image_url && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-400">Asset</span>
                  <a href={claim.image_url} target="_blank" rel="noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                    View Image
                  </a>
                </div>
              )}
              {claim.nsfw && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Safety</span>
                  <span className="text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded">NSFW Tag Required</span>
                </div>
              )}
              {claim.first_comment && (
                <div className="block pt-2 border-t border-slate-800/50 mt-2">
                  <span className="text-xs text-slate-400 block mb-1">Required First Comment</span>
                  <code className="text-xs text-slate-300 bg-slate-950 p-2 rounded block w-full break-words border border-slate-800">{claim.first_comment}</code>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Post Title</label>
              <button onClick={() => handleCopy(claim.post_content?.title || '', 'title')} className="text-slate-400 hover:text-white">
                {copiedField === 'title' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              readOnly
              value={claim.post_content?.title || ''}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none resize-none h-20"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Post Body</label>
              <button onClick={() => handleCopy(claim.post_content?.body || '', 'body')} className="text-slate-400 hover:text-white">
                {copiedField === 'body' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              readOnly
              value={claim.post_content?.body || ''}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none resize-y min-h-[150px]"
            />
          </div>
        </div>

        <div className="space-y-6">
          {(claim.post_content?.note || claim.note_to_poster || claim.post_content?.note_to_poster) && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions</label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap">
                {claim.post_content?.note || claim.note_to_poster || claim.post_content?.note_to_poster}
              </div>
            </div>
          )}

          {claim.post_content?.hooks && claim.post_content.hooks.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hooks</label>
              <div className="space-y-2">
                {claim.post_content.hooks.map((hook: string, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-300 truncate mr-2">{hook}</span>
                    <button onClick={() => handleCopy(hook, `hook-${i}`)} className="text-slate-400 hover:text-white shrink-0">
                      {copiedField === `hook-${i}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr className="border-slate-800" />

          <form onSubmit={handleSubmit}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Submit Your Post URL</label>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://reddit.com/r/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors mb-3"
              required
            />
            <button
              type="submit"
              disabled={loading || !postUrl.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div> : 'Submit Post'}
            </button>
            <p className="text-slate-500 text-xs mt-2 text-center">URL must be a direct link to your Reddit post</p>
          </form>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <button onClick={() => setShowRejectModal(true)} className="py-2 px-3 rounded text-xs font-bold border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors">Reject Task</button>
            <button onClick={() => window.open(claim.targetPostUrl || `https://www.reddit.com/r/${claim.subreddit.replace('r/', '')}/`, 'RedditPost', 'width=850,height=700')} className="py-2 px-3 rounded text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"><span>🚀</span> Open Reddit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
