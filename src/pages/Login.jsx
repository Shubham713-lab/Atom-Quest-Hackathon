import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Target, AlertCircle, Eye, EyeOff, CheckCircle2, TrendingUp, Shield } from 'lucide-react';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Wait for the AuthContext to fully update user state before navigating
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await register(email, password, name, role);
      } else {
        await login(email, password);
      }
      // Note: We don't manually navigate here. We wait for the useEffect above to trigger
      // once the AuthContext finishes fetching user roles and updates the global user state.
    } catch (err) {
      // Make Firebase errors more user-friendly
      const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.code === 'auth/email-already-in-use'
        ? 'This email is already registered. Please sign in.'
        : err.message || 'Authentication failed';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      
      {/* Left Panel - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Logo & Intro */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <Target className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-white tracking-tight">GoalPortal</span>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 space-y-8 max-w-lg mt-20">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Enterprise Goal Setting <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
              Made Effortless.
            </span>
          </h1>
          
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Align Your Workforce</h3>
                <p className="text-primary-100 text-sm mt-1 leading-relaxed">Drive organizational success by seamlessly aligning employee objectives with top-level Shared KPIs.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                <Shield className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Enforced Compliance</h3>
                <p className="text-primary-100 text-sm mt-1 leading-relaxed">Strict quarterly check-in windows, audit trails, and rule-based escalation tracking built right in.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                <TrendingUp className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Real-Time Analytics</h3>
                <p className="text-primary-100 text-sm mt-1 leading-relaxed">Instantly visualize goal distributions and organizational performance trajectories.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="relative z-10 mt-auto text-primary-200 text-sm font-medium">
          Built for the <strong className="text-white">Atom Quest Hackathon</strong>
        </div>
      </div>

      {/* Right Panel - Login/Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50 lg:bg-white relative">
        {/* Mobile Logo Header */}
        <div className="absolute top-8 left-8 flex lg:hidden items-center gap-2">
          <div className="p-2 bg-primary-600 rounded-lg shadow-md">
            <Target className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 tracking-tight">GoalPortal</span>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              {isRegistering 
                ? 'Join your organization\'s goal tracking platform.' 
                : 'Enter your credentials to access your dashboard.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm flex items-start gap-3 rounded-xl border border-red-200 text-red-800 text-sm shadow-sm animate-in zoom-in-95 duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <strong className="block font-semibold mb-0.5">Authentication Error</strong>
                {error}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 lg:shadow-none lg:p-0 lg:bg-transparent lg:border-none">
            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering && (
                <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none text-gray-900 font-medium placeholder-gray-400"
                      placeholder="e.g., Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">System Role</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none text-gray-900 font-medium appearance-none"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="EMPLOYEE">Employee (Goal Creator)</option>
                        <option value="MANAGER">Manager (Goal Reviewer)</option>
                        <option value="ADMIN">Admin (System Config)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none text-gray-900 font-medium placeholder-gray-400"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 outline-none text-gray-900 font-medium placeholder-gray-400 pr-12"
                    placeholder={isRegistering ? 'Must be at least 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex items-center justify-center py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary-600/30 active:scale-[0.98]"
              >
                {loading
                  ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {isRegistering ? 'Creating Account...' : 'Authenticating...'}
                    </div>
                  )
                  : (isRegistering ? 'Create Account' : 'Sign In')
                }
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                {isRegistering ? 'Already have an account?' : 'Don\'t have an account?'}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                  className="ml-2 text-primary-600 hover:text-primary-800 font-bold transition-colors focus:outline-none focus:underline"
                >
                  {isRegistering ? 'Sign in instead' : 'Create one now'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
