import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

export default function Register() {
    const [name, setName] = useState('');
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [idStatus, setIdStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
    const { register } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const checkUserId = async (id) => {
        if (!/^[a-zA-Z0-9_]{4,15}$/.test(id)) {
            setIdStatus('invalid');
            return;
        }
        setIdStatus('checking');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/check-userid', { userId: id });
            setIdStatus(res.data.available ? 'available' : 'taken');
        } catch (err) {
            setIdStatus(null);
        }
    };

    const handleIdChange = (e) => {
        const val = e.target.value;
        setUserId(val);
        if (val.length >= 4) {
            checkUserId(val);
        } else {
            setIdStatus(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (idStatus === 'taken' || idStatus === 'invalid') {
            setError('Please provide a valid and available User ID');
            return;
        }
        try {
            await register(name, userId, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        }
    };

    return (
        <div className="auth-layout" style={{ position: 'relative' }}>
            <button
                onClick={toggleTheme}
                style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', color: 'var(--text-light)', border: '1px solid var(--border)', cursor: 'pointer', zIndex: 10 }}
                title="Toggle Theme"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="auth-banner">
                <div className="auth-banner-content">
                    <h1 className="auth-banner-title">Start Your<br />Journey.</h1>
                    <p className="auth-banner-text">Join thousands of users who are already managing their money smarter and growing their savings.</p>
                </div>
            </div>
            <div className="auth-form-container">
                <div className="auth-card">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary)' }}>
                        <UserPlus size={48} />
                    </div>
                    <h2 className="auth-title">Create Account</h2>
                    <p className="auth-subtitle">Get started tracking your daily expenses</p>
                    {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">User ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={userId}
                                onChange={handleIdChange}
                                required
                                placeholder="e.g. Name123" />
                            {idStatus === 'checking' && <small style={{ color: 'gray' }}>Checking availability...</small>}
                            {idStatus === 'available' && <small style={{ color: 'green' }}>✓ User ID is available</small>}
                            {idStatus === 'taken' && <small style={{ color: 'red' }}>✗ User ID is already taken</small>}
                            {idStatus === 'invalid' && <small style={{ color: 'red' }}>✗ Must be 4-15 chars (letters, numbers, _)</small>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Create a strong password"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.875rem' }}>Sign Up</button>
                    </form>
                    <p className="text-center mt-4 text-muted">
                        Already have an account? <Link to="/login" className="text-primary" style={{ fontWeight: 'bold' }}>Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
