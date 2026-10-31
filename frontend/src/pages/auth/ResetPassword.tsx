import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client.ts';
import { checkPasswordStrength } from '../../utils/validation.ts';
import { Lock, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pwdChecks = checkPasswordStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing or invalid reset token. Please request a new link.');
      return;
    }

    if (!pwdChecks.isValid) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The token may be expired or already used.');
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
          Set New Password
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Choose a strong password with letters and special characters
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

          {success ? (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Password Updated!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Your password has been reset successfully. Your temporary token has now expired.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition"
              >
                Proceed to Login
              </button>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                No reset token provided in the URL.
              </div>
              <Link
                to="/forgot-password"
                className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Request a new password reset link
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="••••••••••••"
                  />
                </div>

                {/* Live Password Checklist */}
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-600 mb-1">Requirements:</div>
                  <div className={`flex items-center gap-1.5 ${pwdChecks.hasLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {pwdChecks.hasLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    More than 8 characters (at least 9)
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdChecks.hasUppercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {pwdChecks.hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    At least one uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdChecks.hasLowercase ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {pwdChecks.hasLowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    At least one lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdChecks.hasSpecialChar ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                    {pwdChecks.hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                    At least one special character (!@#$%^&*)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="••••••••••••"
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-xs text-rose-600">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !pwdChecks.isValid || !passwordsMatch}
                className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
              >
                {isLoading ? 'Updating Password...' : 'Save New Password'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

