import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/users/forgotpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        notify('success', 'Email sent', data.message || 'Check your inbox for reset instructions.');
      } else {
        setError(data.message || 'Unable to send reset email');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zen-cream flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row min-h-[600px] border-[4px] border-zen-stone/30">
        <div className="hidden lg:block w-1/2 p-3 relative">
          <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-inner">
            <img
              src="/login-bg.png"
              alt="Sanctuary"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-3">
              <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Reset access.</h1>
              <p className="text-sm font-medium text-zen-brown/40 italic mt-2">We’ll send recovery instructions to your email</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-2xl text-center">
                  {error}
                </div>
              )}

              {sent && (
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 p-4 rounded-2xl text-center">
                  If the email exists, a reset link has been sent.
                </div>
              )}

              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Mail id"
                  className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                  required
                />
                <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-zen-sand hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.12)] rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  {loading ? 'Processing...' : 'Send reset link'}
                  {!loading && <ArrowRight size={16} className="ml-2" />}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] font-bold text-zen-brown/35">
                  Remembered it? <Link to="/login" className="text-zen-sand hover:underline">Sign in</Link>
                </p>
              </div>

              <div className="pt-4">
                <div className="bg-zen-cream border border-zen-stone/60 rounded-full py-2.5 px-6 mx-auto w-max shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <p className="text-[8px] font-bold text-zen-brown/35 uppercase tracking-widest flex items-center gap-3">
                    <Sparkles size={10} /> Secure account recovery
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
