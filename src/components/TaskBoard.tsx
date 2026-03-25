import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { apiFetch } from '../api';
import { Campaign } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { Inbox } from 'lucide-react';

interface TaskBoardProps {
  username: string;
  onClaimSuccess: (claimData: any) => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function TaskBoard({ username, onClaimSuccess, showNotification }: TaskBoardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const data = await apiFetch('/campaigns');
      // Assume data is array or { campaigns: [] }
      setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
    } catch (err) {
      showNotification('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (campaignId: string, subreddit: string) => {
    setClaimingId(`${campaignId}-${subreddit}`);
    try {
      const res = await apiFetch('/claim', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaignId, username, subreddit })
      });
      
      const campaign = campaigns.find(c => c.id === campaignId);
      const enrichedClaim = {
        ...campaign,
        ...res,
        post_content: res.post_content || campaign?.post_content,
        campaign_id: campaignId
      };
      
      onClaimSuccess(enrichedClaim);
    } catch (err: any) {
      if (err.data?.error === 'no_slots_available') {
        showNotification('This slot was just taken. Try another.', 'error');
        fetchCampaigns(); // refresh
      } else {
        showNotification(err.data?.message || 'Failed to claim task', 'error');
      }
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64">
        <Inbox className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-slate-400 font-bold text-lg">No tasks available</h3>
        <p className="text-slate-600 text-sm mt-2">Check back later for new opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {campaigns.map((camp, i) => (
        <motion.div
          key={camp.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 relative overflow-hidden transition-all hover:border-slate-600 hover:shadow-xl hover:shadow-black/50"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-white text-lg truncate pr-4">
              {camp.subreddits.length === 1 ? `r/${camp.subreddits[0]}` : 'Multiple Subreddits'}
            </h3>
            <div className="flex flex-col items-end shrink-0">
              <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
                <span className="text-xl font-mono font-bold text-green-400">${Number(camp.payout).toFixed(2)}</span>
              </div>
              <span className={`text-[10px] mt-1 font-medium ${camp.available_slots === 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                {camp.available_slots} slot{camp.available_slots !== 1 ? 's' : ''} left
              </span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-400">
              {camp.tier}
            </span>
            <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase text-slate-400">
              {camp.interaction_type}
            </span>
          </div>

          <div className="mb-5">
            <h4 className="text-white font-medium mb-1">{camp.post_content?.title}</h4>
            <p className="text-slate-400 text-xs line-clamp-3">{camp.post_content?.body}</p>
          </div>

          {camp.subreddits.length === 1 ? (
            <button
              onClick={() => handleClaim(camp.id, camp.subreddits[0])}
              disabled={claimingId !== null}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {claimingId === `${camp.id}-${camp.subreddits[0]}` ? (
                <div className="animate-spin border-white border-t-transparent rounded-full w-5 h-5 border-2"></div>
              ) : (
                'Claim Task'
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {camp.subreddits.map(sub => (
                <button
                  key={sub}
                  onClick={() => handleClaim(camp.id, sub)}
                  disabled={claimingId !== null}
                  className="bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500 rounded-md p-2 text-left transition-colors text-xs font-bold text-white flex justify-between items-center"
                >
                  <span>r/{sub}</span>
                  {claimingId === `${camp.id}-${sub}` && (
                    <div className="animate-spin border-white border-t-transparent rounded-full w-3 h-3 border-2"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
