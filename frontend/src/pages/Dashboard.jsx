import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { IndianRupee, LogOut, PlusCircle, TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react';

export default function Dashboard() {
    const { user, logout, api } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('debit');
    const [category, setCategory] = useState('Food');

    const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Salary', 'Freelance', 'Other'];

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await api.get('/expenses');
            setExpenses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!title || !amount) return;
        try {
            const res = await api.post('/expenses', {
                title,
                amount: Number(amount),
                type,
                category
            });
            setExpenses([res.data, ...expenses]);
            setTitle('');
            setAmount('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/expenses/${id}`);
            setExpenses(expenses.filter(ex => ex._id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const totalCredit = expenses.filter(e => e.type === 'credit').reduce((acc, curr) => acc + curr.amount, 0);
    const totalDebit = expenses.filter(e => e.type === 'debit').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalCredit - totalDebit;

    const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="dashboard-layout">
            <header className="header">
                <div className="logo">
                    <Wallet size={32} />
                    ExpenseTracker
                </div>
                <div className="nav-links">
                    <span>Welcome, {user?.name}</span>
                    <button onClick={logout} className="btn" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.5rem 1rem' }}>
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Overview</h1>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wallet size={16} /> Total Balance
                        </h3>
                        <p className="stat-value">{formatINR(balance)}</p>
                    </div>
                    <div className="stat-card" style={{ borderColor: 'var(--success)', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                            <TrendingUp size={16} /> Total Credit
                        </h3>
                        <p className="stat-value text-success">{formatINR(totalCredit)}</p>
                    </div>
                    <div className="stat-card" style={{ borderColor: 'var(--danger)', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(239, 68, 68, 0.05) 100%)' }}>
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                            <TrendingDown size={16} /> Total Debit
                        </h3>
                        <p className="stat-value text-danger">{formatINR(totalDebit)}</p>
                    </div>
                </div>

                <div className="content-grid">
                    <div className="card">
                        <h2 className="card-title">Add New Transaction</h2>
                        <form onSubmit={handleAddExpense}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Name" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (₹)</label>
                                <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="debit">Debit (Expense)</option>
                                    <option value="credit">Credit (Income)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                <PlusCircle size={20} style={{ marginRight: '0.5rem' }} /> Add Transaction
                            </button>
                        </form>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Recent Transactions</h2>
                        {expenses.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No transactions found. Start adding some!</p>
                        ) : (
                            <div className="expense-list">
                                {expenses.map(expense => (
                                    <div key={expense._id} className="expense-item" style={{ borderLeft: `4px solid ${expense.type === 'credit' ? 'var(--success)' : 'var(--danger)'}` }}>
                                        <div className="expense-info">
                                            <span className="expense-title">{expense.title}</span>
                                            <span className="expense-category">{expense.category}</span>
                                            <span className="expense-meta">{new Date(expense.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="expense-amount">
                                            <span style={{ color: expense.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                                                {expense.type === 'credit' ? '+' : '-'}{formatINR(expense.amount)}
                                            </span>
                                            <button className="delete-btn" onClick={() => handleDelete(expense._id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
