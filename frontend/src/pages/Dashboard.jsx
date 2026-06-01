import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Moon, Sun, IndianRupee, LogOut, PlusCircle, TrendingUp, TrendingDown, Wallet, Trash2, Edit2, UserX, User, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


export default function Dashboard() {
    const { user, logout, api } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ categorySummary: [], monthlySummary: [] });
    const [categories, setCategories] = useState([]);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('debit');
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Account');
    const [editingId, setEditingId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [transactionFilter, setTransactionFilter] = useState('All');
    const [showCategories, setShowCategories] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);

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
                    category,
                    paymentMethod
                });
                setExpenses(expenses.map(ex => ex._id === editingId ? res.data : ex));
                setEditingId(null);
            } else {
                const res = await api.post('/expenses', {
                    amount: Number(amount),
                    type,
                    category,
                    paymentMethod
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
        setPaymentMethod(expense.paymentMethod || 'Account');
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

    const accountExpenses = expenses.filter(e => e.paymentMethod === 'Account' || !e.paymentMethod);
    const accountCredit = accountExpenses.filter(e => e.type === 'credit').reduce((acc, curr) => acc + curr.amount, 0);
    const accountDebit = accountExpenses.filter(e => e.type === 'debit').reduce((acc, curr) => acc + curr.amount, 0);
    const accountBalance = accountCredit - accountDebit;

    const cashExpenses = expenses.filter(e => e.paymentMethod === 'Cash');
    const cashCredit = cashExpenses.filter(e => e.type === 'credit').reduce((acc, curr) => acc + curr.amount, 0);
    const cashDebit = cashExpenses.filter(e => e.type === 'debit').reduce((acc, curr) => acc + curr.amount, 0);
    const cashBalance = cashCredit - cashDebit;

    const totalCredit = accountCredit + cashCredit;
    const totalDebit = accountDebit + cashDebit;
    const balance = accountBalance + cashBalance;

    const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    const formatPDFMoney = (val) => 'Rs. ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text('Expense Tracker - Financial Report', 14, 22);

        doc.setFontSize(14);
        doc.text(`Generated For: ${user?.name || 'User'}`, 14, 34);

        doc.setFontSize(12);
        doc.text('--- Overview ---', 14, 44);
        doc.text(`Total Net Worth: ${formatPDFMoney(balance)}`, 14, 52);
        doc.text(`Account Balance: ${formatPDFMoney(accountBalance)}`, 14, 60);
        doc.text(`Cash in Hand: ${formatPDFMoney(cashBalance)}`, 14, 68);
        doc.text(`Total Credit: ${formatPDFMoney(totalCredit)}`, 14, 76);
        doc.text(`Total Debit: ${formatPDFMoney(totalDebit)}`, 14, 84);

        // Category Summary Table
        doc.text('--- Expenses by Category ---', 14, 96);
        const categoryData = summary.categorySummary.map(s => [
            s._id, formatPDFMoney(s.total)
        ]);
        autoTable(doc, {
            startY: 100,
            head: [['Category', 'Total Spent']],
            body: categoryData,
        });

        // Monthly Summary Table
        let finalY = doc.lastAutoTable.finalY || 120;
        doc.text('--- Monthly Expenses Trend ---', 14, finalY + 10);
        const monthNamesPDF = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = summary.monthlySummary.filter(s => s._id.type === 'debit').map(s => [
            `${monthNamesPDF[s._id.month - 1]} ${s._id.year}`, formatPDFMoney(s.total)
        ]);
        autoTable(doc, {
            startY: finalY + 14,
            head: [['Month', 'Total Spent']],
            body: monthlyData,
        });

        // All Transactions Table
        finalY = doc.lastAutoTable.finalY || finalY + 30;

        // Add a new page if the table will overflow the first page or is drawn too close to bottom
        if (finalY > 250) {
            doc.addPage();
            finalY = 10;
        }

        doc.text('--- Full Transaction History ---', 14, finalY + 10);

        const tableData = expenses.map(expense => [
            new Date(expense.date).toLocaleDateString(),
            expense.category,
            expense.type === 'credit' ? 'Income' : 'Expense',
            expense.paymentMethod || 'Account',
            formatPDFMoney(expense.amount)
        ]);

        autoTable(doc, {
            startY: finalY + 14,
            head: [['Date', 'Category', 'Type', 'Method', 'Amount']],
            body: tableData,
        });

        doc.save(`${user?.name || 'My'}_Expense_Report.pdf`);
    };

    const filteredTransactions = expenses.filter(expense => {
        if (transactionFilter === 'All') return true;
        if (transactionFilter === 'Cash') return expense.paymentMethod === 'Cash';
        if (transactionFilter === 'Account') return expense.paymentMethod === 'Account' || !expense.paymentMethod;
        if (transactionFilter === 'Income') return expense.type === 'credit';
        if (transactionFilter === 'Expense') return expense.type === 'debit';
        return true;
    });

    // Calculate monthly expense by category breakdown
    const monthlyCategoryBreakdown = {};
    expenses.forEach(exp => {
        if (exp.type !== 'debit') return;
        
        const dateObj = new Date(exp.date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth(); // 0-11
        
        const key = `${year}-${month}`;
        if (!monthlyCategoryBreakdown[key]) {
            monthlyCategoryBreakdown[key] = {
                year,
                month,
                total: 0,
                categories: {}
            };
        }
        
        const catName = exp.category || 'Other';
        monthlyCategoryBreakdown[key].categories[catName] = (monthlyCategoryBreakdown[key].categories[catName] || 0) + exp.amount;
        monthlyCategoryBreakdown[key].total += exp.amount;
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const sortedMonthsBreakdown = Object.values(monthlyCategoryBreakdown).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    return (
        <div className="dashboard-layout">
            <header className="header">
                <div className="logo">
                    <Wallet size={32} />
                    ExpenseTracker
                </div>
                <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={toggleTheme}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--border)', cursor: 'pointer', marginRight: '1rem', transition: 'background-color 0.2s' }}
                        title="Toggle Theme"
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
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

                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card" style={{ borderColor: 'var(--primary)', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                            <Wallet size={16} /> Account Balance
                        </h3>
                        <p className="stat-value" style={{ color: 'var(--primary)' }}>{formatINR(accountBalance)}</p>
                    </div>
                    <div className="stat-card" style={{ borderColor: '#F59E0B', background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.05) 100%)' }}>
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B' }}>
                            <IndianRupee size={16} /> Cash in Hand
                        </h3>
                        <p className="stat-value" style={{ color: '#F59E0B' }}>{formatINR(cashBalance)}</p>
                    </div>
                    <div className="stat-card">
                        <h3 className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wallet size={16} /> Total Net Worth
                        </h3>
                        <p className="stat-value">{formatINR(balance)}</p>
                    </div>
                </div>


                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                    <div className="stat-card" style={{ padding: '1rem', borderColor: 'var(--success)' }}>
                        <h3 className="stat-title" style={{ color: 'var(--success)', fontSize: '0.75rem', margin: 0 }}>Total Credit</h3>
                        <p className="stat-value text-success" style={{ fontSize: '1.25rem' }}>{formatINR(totalCredit)}</p>
                    </div>
                    <div className="stat-card" style={{ padding: '1rem', borderColor: 'var(--danger)' }}>
                        <h3 className="stat-title" style={{ color: 'var(--danger)', fontSize: '0.75rem', margin: 0 }}>Total Debit</h3>
                        <p className="stat-value text-danger" style={{ fontSize: '1.25rem' }}>{formatINR(totalDebit)}</p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 className="card-title">{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
                    <form onSubmit={handleAddOrEditExpense}>
                        <div className="form-group">
                            <label className="form-label">Amount (₹)</label>
                            <input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" required />
                        </div>
                        <div className="form-group form-grid">
                            <div>
                                <label className="form-label">Type</label>
                                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="debit">Debit (Expense)</option>
                                    <option value="credit">Credit (Income)</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Method</label>
                                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="Account">Account (Bank/Card)</option>
                                    <option value="Cash">Cash in Hand</option>
                                </select>
                            </div>
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

                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowCategories(!showCategories)}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '0.5rem 0' }}
                        >
                            <h2 className="card-title" style={{ margin: 0, padding: 0, border: 'none' }}>Manage Categories</h2>
                            {showCategories ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>

                        {showCategories && (
                            <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
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
                        )}
                    </div>
                </div>
                {/* Monthly Expenses breakdown by category (Value-based cards) */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 className="card-title">Monthly Expenses by Category</h2>
                    {sortedMonthsBreakdown.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No expenses recorded yet.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {sortedMonthsBreakdown.map(monthData => (
                                <div 
                                    key={`${monthData.year}-${monthData.month}`} 
                                    style={{ 
                                        background: 'var(--bg-dark)', 
                                        borderRadius: '0.75rem', 
                                        padding: '1.25rem', 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-light)' }}>
                                            {monthNames[monthData.month]} {monthData.year}
                                        </span>
                                        <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1rem', background: 'rgba(220, 38, 38, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                                            {formatINR(monthData.total)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {Object.entries(monthData.categories)
                                            .sort((a, b) => b[1] - a[1]) // Sort categories by expense amount descending
                                            .map(([catName, catAmount]) => {
                                                const percent = ((catAmount / monthData.total) * 100).toFixed(0);
                                                return (
                                                    <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                                                {catName}
                                                            </span>
                                                            <span style={{ fontWeight: '600', color: 'var(--text-light)' }}>
                                                                {formatINR(catAmount)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>({percent}%)</span>
                                                            </span>
                                                        </div>
                                                        <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--danger)', borderRadius: '2px' }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="transaction-header" style={{ marginBottom: showTransactions ? '1.5rem' : '0', paddingBottom: showTransactions ? '0.75rem' : '0', borderBottom: showTransactions ? '1px solid var(--border)' : 'none' }}>
                        <button
                            type="button"
                            onClick={() => setShowTransactions(!showTransactions)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: 0 }}
                        >
                            <h2 className="card-title" style={{ margin: 0, padding: 0, border: 'none' }}>Recent Transactions</h2>
                            {showTransactions ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <select
                                    className="form-select"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', width: 'auto' }}
                                    value={transactionFilter}
                                    onChange={(e) => setTransactionFilter(e.target.value)}
                                >
                                    <option value="All">All...</option>
                                    <option value="Cash">Cash Only</option>
                                    <option value="Account">Acct Only</option>
                                    <option value="Income">Income</option>
                                    <option value="Expense">Expense</option>
                                </select>
                                <button onClick={generatePDF} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }} title="Download Summary PDF">
                                    <Download size={16} /> PDF
                                </button>
                            </div>
                        </div>

                        {showTransactions && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                {filteredTransactions.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No transactions found for the applied filter.</p>
                                ) : (
                                    <div className="expense-list">
                                        {filteredTransactions.map(expense => (
                                            <div key={expense._id} className="expense-item" style={{ borderLeft: `4px solid ${expense.type === 'credit' ? 'var(--success)' : 'var(--danger)'}` }}>
                                                <div className="expense-info">
                                                    <span className="expense-title">{expense.category}</span>
                                                    <span className="expense-meta">
                                                        {expense.type === 'credit' ? 'Income' : 'Expense'} • {expense.paymentMethod || 'Account'} • {new Date(expense.date).toLocaleDateString()}
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
                        )}
                </div>
            </main>
        </div>
    );
}
