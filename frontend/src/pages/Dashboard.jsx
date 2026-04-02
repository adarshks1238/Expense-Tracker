import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { IndianRupee, LogOut, PlusCircle, TrendingUp, TrendingDown, Wallet, Trash2, Edit2, UserX, User } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

export default function Dashboard() {
    const { user, logout, api } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ categorySummary: [], monthlySummary: [] });
    const [categories, setCategories] = useState([]);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('debit');
    const [category, setCategory] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, catRes, sumRes] = await Promise.all([
                api.get('/expenses'),
                api.get('/categories'),
                api.get('/expenses/summary')
            ]);
            setExpenses(expRes.data);
            setCategories(catRes.data);
            
            // Default categories if nothing exists
            if (catRes.data.length === 0) {
               const defaultCategories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Salary', 'Other'];
               for (let cat of defaultCategories) {
                   await api.post('/categories', { name: cat });
               }
               const updatedCats = await api.get('/categories');
               setCategories(updatedCats.data);
               setCategory(updatedCats.data[0].name);
            } else if (!category) {
                setCategory(catRes.data[0].name);
            }
            
            setSummary(sumRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddOrEditExpense = async (e) => {
        e.preventDefault();
        if (!amount || !category) return;
        try {
            if (editingId) {
                const res = await api.put(`/expenses/${editingId}`, {
                    amount: Number(amount),
                    type,
                    category
                });
                setExpenses(expenses.map(ex => ex._id === editingId ? res.data : ex));
                setEditingId(null);
            } else {
                const res = await api.post('/expenses', {
                    amount: Number(amount),
                    type,
                    category
                });
                // Fetch data to re-sort newly added expenses
                const expRes = await api.get('/expenses');
                setExpenses(expRes.data);
            }
            setAmount('');
            
            // Refresh summary
            const sumRes = await api.get('/expenses/summary');
            setSummary(sumRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEditClick = (expense) => {
        setEditingId(expense._id);
        setAmount(expense.amount);
        setType(expense.type);
        setCategory(expense.category);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/expenses/${id}`);
            setExpenses(expenses.filter(ex => ex._id !== id));
            // Refresh summary
            const sumRes = await api.get('/expenses/summary');
            setSummary(sumRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName) return;
        try {
            const res = await api.post('/categories', { name: newCategoryName });
            setCategories([...categories, res.data]);
            setCategory(res.data.name);
            setNewCategoryName('');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert("Category already exists!");
            }
            console.error(error);
        }
    };

    const handleDeleteCategory = async (id, e) => {
        e.preventDefault();
        try {
            await api.delete(`/categories/${id}`);
            setCategories(categories.filter(c => c._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteProfile = async () => {
        if (window.confirm("WARNING: Are you sure you want to permanently delete your profile? All your expenses and categories will be lost forever. This cannot be undone.")) {
            try {
                await api.delete('/auth/me');
                logout(); // Logout user after deleting profile
            } catch (err) {
                console.error(err);
                alert("Failed to delete profile.");
            }
        }
    };

    const totalCredit = expenses.filter(e => e.type === 'credit').reduce((acc, curr) => acc + curr.amount, 0);
    const totalDebit = expenses.filter(e => e.type === 'debit').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalCredit - totalDebit;

    const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    // Chart Data
    const pieData = {
        labels: summary.categorySummary.map(s => s._id),
        datasets: [
            {
                data: summary.categorySummary.map(s => s.total),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8A2BE2'
                ],
            },
        ],
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const debitByMonth = summary.monthlySummary.filter(s => s._id.type === 'debit');

    const lineData = {
        labels: debitByMonth.map(s => `${monthNames[s._id.month - 1]} ${s._id.year}`),
        datasets: [
            {
                label: 'Monthly Expenses',
                data: debitByMonth.map(s => s.total),
                fill: false,
                borderColor: '#EF4444',
                tension: 0.1
            }
        ]
    };

    return (
        <div className="dashboard-layout">
            <header className="header">
                <div className="logo">
                    <Wallet size={32} />
                    ExpenseTracker
                </div>
                <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ textTransform: 'capitalize', marginRight: '1rem' }}>Welcome, {user?.name}</span>
                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)} 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--btn-text)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s', transform: dropdownOpen ? 'scale(0.95)' : 'scale(1)' }}
                            title="Profile Options"
                        >
                            <User size={20} />
                        </button>
                        
                        {dropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '160px', zIndex: 10, overflow: 'hidden' }}>
                                <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', border: 'none', background: 'transparent', color: 'var(--text-light)', cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Logout
                                </button>
                                <button onClick={handleDeleteProfile} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <UserX size={16} style={{ marginRight: '0.5rem' }} /> Delete Profile
                                </button>
                            </div>
                        )}
                    </div>
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

                {/* Charts Section */}
                <div className="content-grid" style={{ marginBottom: '2rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                         <h2 className="card-title">Expenses by Category</h2>
                         {summary.categorySummary.length > 0 ? 
                             <div style={{ width: '100%', maxWidth: '300px', height: '300px', position: 'relative' }}><Pie data={pieData} options={{ maintainAspectRatio: false }} /></div> 
                             : <p style={{ color: 'var(--text-muted)' }}>No expenses to chart.</p>}
                    </div>
                    <div className="card" style={{ overflow: 'hidden' }}>
                         <h2 className="card-title">Monthly Trends</h2>
                         {debitByMonth.length > 0 ? 
                             <div style={{ height: '300px', width: '100%', position: 'relative' }}><Line data={lineData} options={{ maintainAspectRatio: false }} /></div> 
                             : <p style={{ color: 'var(--text-muted)' }}>No monthly trend available.</p>}
                    </div>
                </div>

                <div className="content-grid">
                    <div className="card">
                        <h2 className="card-title">{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                        <form onSubmit={handleAddOrEditExpense}>
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
                                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} required>
                                    <option value="" disabled>Select category</option>
                                    {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                                {editingId ? <Edit2 size={20} style={{ marginRight: '0.5rem' }} /> : <PlusCircle size={20} style={{ marginRight: '0.5rem' }} />} 
                                {editingId ? 'Update Transaction' : 'Add Transaction'}
                            </button>
                            {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setAmount(''); }} className="btn" style={{ marginTop: '0.5rem', width: '100%', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>
                                    Cancel Edit
                                </button>
                            )}
                        </form>

                        <hr style={{ borderColor: 'var(--border)', margin: '2rem 0' }} />

                        <h2 className="card-title">Manage Categories</h2>
                        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                             <input type="text" className="form-input" style={{ flex: 1, minWidth: '150px' }} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category" required />
                             <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Add</button>
                        </form>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {categories.map(cat => (
                                <span key={cat._id} style={{ background: 'var(--bg-body)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                                    {cat.name}
                                    <button onClick={(e) => handleDeleteCategory(cat._id, e)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>&times;</button>
                                </span>
                            ))}
                        </div>
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
                                            <span className="expense-title">{expense.category}</span>
                                            <span className="expense-meta">
                                                {expense.type === 'credit' ? 'Income' : 'Expense'} • {new Date(expense.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="expense-amount" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ color: expense.type === 'credit' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {expense.type === 'credit' ? '+' : '-'}{formatINR(expense.amount)}
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="delete-btn" style={{ color: 'var(--text-muted)' }} onClick={() => handleEditClick(expense)}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className="delete-btn" onClick={() => handleDelete(expense._id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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
