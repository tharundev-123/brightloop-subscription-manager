import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.ts';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [devEmailPreviewUrl, setDevEmailPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetUrl(null);
    setDevEmailPreviewUrl(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(res.data.message);
      if (res.data.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
      if (res.data.devEmailPreviewUrl) {
        setDevEmailPreviewUrl(res.data.devEmailPreviewUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-200">
            B
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset Your Password
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Enter your email to receive a single-use expiring reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200/80">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-700 font-medium">{error}</div>
            </div>
          )}

          {successMessage ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800 leading-relaxed font-medium">
                  {successMessage}
                </div>
              </div>

              {/* Dev Helper Box */}
              {(devResetUrl || devEmailPreviewUrl) && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <span>🛠️ Dev Test Inbox & Direct Link:</span>
                  </div>
                  {devResetUrl && (
                    <div>
                      <span className="text-slate-500 block">Direct Reset Link:</span>
                      <a
                        href={devResetUrl}
                        className="text-indigo-600 font-semibold underline break-all hover:text-indigo-800"
                      >
                        {devResetUrl}
                      </a>
                    </div>
                  )}
                  {devEmailPreviewUrl && (
                    <div className="pt-1">
                      <a
                        href={devEmailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-700 font-medium hover:underline"
                      >
                        Open Ethereal Webmail Preview <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Account Email</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {isLoading ? 'Dispatching Reset Email...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

