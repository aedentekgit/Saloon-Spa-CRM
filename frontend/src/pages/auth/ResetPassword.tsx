import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { notify } from '../../components/shared/ZenNotification';
import { withBase } from '../../utils/assetPath';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token is missing or invalid');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/resetpassword/${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        notify('success', 'Password updated', data.message || 'You can now sign in with your new password.');
        navigate('/login');
      } else {
        setError(data.message || 'Unable to reset password');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-3">
              <h1 className="text-[2.75rem] font-black text-zen-brown tracking-tight leading-none">Create new key.</h1>
              <p className="text-sm font-medium text-zen-brown/40 italic mt-2">Set a fresh password for your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 p-4 rounded-2xl text-center">
                  {error}
                </div>
              )}

              {!token && (
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 p-4 rounded-2xl text-center">
                  Reset token is missing from the link.
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30 hover:text-zen-sand transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-zen-cream text-zen-brown text-sm font-bold placeholder:text-zen-brown/30 placeholder:font-medium px-6 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-zen-sand/30 transition-all border border-zen-stone/60"
                    required
                    minLength={6}
                  />
                  <Lock size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zen-brown/30" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-4 bg-zen-sand hover:opacity-90 disabled:opacity-50 text-white text-[13px] font-bold shadow-none rounded-3xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  {loading ? 'Processing...' : 'Update password'}
                  {!loading && <ArrowRight size={16} className="ml-2" />}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] font-bold text-zen-brown/35">
                  Back to <Link to="/login" className="text-zen-sand hover:underline">sign in</Link>
                </p>
              </div>

              <div className="pt-4">
                <div className="bg-zen-cream border border-zen-stone/60 rounded-full py-2.5 px-6 mx-auto w-max shadow-none">
                  <p className="text-[8px] font-bold text-zen-brown/35 uppercase tracking-widest flex items-center gap-3">
                    <Sparkles size={10} /> Protected recovery
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

export default ResetPassword;
