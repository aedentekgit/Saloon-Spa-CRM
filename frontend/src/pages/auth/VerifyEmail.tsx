import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, ArrowRight, Sparkles } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';
import { withBase } from '../../utils/assetPath';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Verification token is missing');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/users/verify/${token}`);
        const data = await response.json();

        if (response.ok) {
          setMessage(data.message || 'Email verified successfully');
          notify('success', 'Verified', data.message || 'Email verified successfully');
        } else {
          setError(data.message || 'Unable to verify email');
        }
      } catch (err) {
        setError('Connection failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[1.75rem] sm:rounded-[3rem] shadow-none flex flex-col lg:flex-row min-h-[460px] sm:min-h-[600px] border-2 sm:border-[4px] border-zen-stone/30">
        <div className="hidden lg:block w-1/2 p-3 relative">
          <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-inner">
            <img
              src={withBase('/login-bg.png')}
              alt="Sanctuary"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 lg:p-16 relative">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="space-y-3">
              <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Verify account.</h1>
              <p className="text-sm font-medium text-zen-brown/40 italic mt-2">Confirm your email to unlock access</p>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-12 h-12 border-4 border-zen-brown border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[11px] font-bold text-zen-brown/35 uppercase tracking-widest">Verifying</p>
                </div>
              ) : error ? (
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-2xl">
                  {error}
                </div>
              ) : (
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 p-4 rounded-2xl">
                  {message}
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-4 bg-zen-sand hover:opacity-90 text-white text-[13px] font-bold shadow-none rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  Continue to sign in
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </div>

              <div className="pt-4">
                <div className="bg-zen-cream border border-zen-stone/60 rounded-full py-2.5 px-6 mx-auto w-max shadow-none">
                  <p className="text-[8px] font-bold text-zen-brown/35 uppercase tracking-widest flex items-center gap-3">
                    <MailCheck size={10} /> Email confirmation
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] font-bold text-zen-brown/35">
                  Need another link? <Link to="/forgot-password" className="text-zen-sand hover:underline">Resend</Link>
                </p>
              </div>

              <div className="pt-4">
                <div className="bg-zen-cream border border-zen-stone/60 rounded-full py-2.5 px-6 mx-auto w-max shadow-none">
                  <p className="text-[8px] font-bold text-zen-brown/35 uppercase tracking-widest flex items-center gap-3">
                    <Sparkles size={10} /> Secure identity check
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
