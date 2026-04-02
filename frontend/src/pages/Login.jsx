import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-banner">
                <div className="auth-banner-content">
                    <h1 className="auth-banner-title">Take Control<br />Of Your Finances.</h1>
                    <p className="auth-banner-text">Track your daily expenses, monitor your spending patterns, and save for your future with ExpenseTracker.</p>
                </div>
            </div>
            <div className="auth-form-container">
                <div className="auth-card">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                        <LogIn size={48} />
                    </div>
                    <h2 className="auth-title">Welcome Back</h2>
                    <p className="auth-subtitle">Login to your account to track expenses</p>
                    {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your email"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.875rem' }}>Login</button>
                    </form>
                    <p className="text-center mt-4 text-muted">
                        Don't have an account? <Link to="/register" className="text-primary" style={{ fontWeight: 'bold' }}>Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
