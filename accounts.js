// Accounts page script
(function(){
    // Utilities
    function qs(id){ return document.getElementById(id); }

    // Storage keys
    const USERS_KEY = 'users';
    const TRANSACTIONS_KEY = 'transactions';
    const ACTIVITY_KEY = 'activityLog';
    const CURRENT_USER_KEY = 'currentUser';

    // State
    let users = [];
    let transactions = [];
    let activityLog = [];
    let currentUser = null;
    let editingTxId = null;

    // Init
    document.addEventListener('DOMContentLoaded', init);

    function init(){
        loadUsers(); seedDefaultUsersIfNeeded();
        loadTransactions(); loadActivityLog(); loadCurrentUser();
        bindUI(); renderAll();
    }

    // ----- Load / Save -----
    function loadUsers(){ try{ users = JSON.parse(localStorage.getItem(USERS_KEY)) || []; }catch(e){ users = []; } }
    function saveUsers(){ localStorage.setItem(USERS_KEY, JSON.stringify(users || [])); }
    function seedDefaultUsersIfNeeded(){ if(!users || users.length===0){ users = [{username:'admin',password:'admin',role:'admin'},{username:'manager',password:'manager',role:'manager'},{username:'cashier',password:'cashier',role:'cashier'}]; saveUsers(); } }

    function loadTransactions(){ try{ transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || []; }catch(e){ transactions = []; } }
    function saveTransactions(){ localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions || [])); }

    function loadActivityLog(){ try{ activityLog = JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || []; }catch(e){ activityLog = []; } }
    function saveActivityLog(){ localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLog || [])); }

    function loadCurrentUser(){ try{ currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); }catch(e){ currentUser = null; } updateProfileUI(); }
    function saveCurrentUser(){ localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser)); updateProfileUI(); }
    function clearCurrentUser(){ localStorage.removeItem(CURRENT_USER_KEY); currentUser = null; updateProfileUI(); }

    // ----- UI binding -----
    function bindUI(){
        // Page controls
        qs('addTransactionBtn').addEventListener('click', ()=> showAddTransactionModal());
        qs('exportCsvBtn').addEventListener('click', exportTransactionsCsv);
        qs('searchTransaction').addEventListener('input', renderTransactions);
        qs('filterType').addEventListener('change', renderTransactions);
        qs('filterFrom').addEventListener('change', renderTransactions);
        qs('filterTo').addEventListener('change', renderTransactions);

        // Modal controls
        qs('closeTransactionModal').addEventListener('click', hideTransactionModal);
        qs('cancelTransaction').addEventListener('click', hideTransactionModal);
        qs('transactionForm').addEventListener('submit', (e)=>{ e.preventDefault(); handleTransactionSubmit(); });

        // Login controls
        qs('loginBtn').addEventListener('click', ()=> { if(currentUser) { clearCurrentUser(); addActivity('logout', {user: 'anonymous'}); renderAll(); } else { showLoginModal(); } });
        qs('closeLoginModal').addEventListener('click', hideLoginModal);
        qs('cancelLogin').addEventListener('click', hideLoginModal);
        qs('loginFormLocal').addEventListener('submit', (e)=>{ e.preventDefault(); handleLocalLogin(); });

        // Activity
        qs('viewActivityBtn').addEventListener('click', showActivityLog);
        qs('closeActivityModal').addEventListener('click', hideActivityLog);
        qs('exportActivityBtn').addEventListener('click', exportActivityCsv);
        qs('clearActivityBtn').addEventListener('click', clearActivityLog);
        qs('activitySearch').addEventListener('input', renderActivityList);
        qs('activityFrom').addEventListener('change', renderActivityList);
        qs('activityTo').addEventListener('change', renderActivityList);

        // When page loads, set date default on modal
        qs('transactionDate').value = (new Date()).toISOString().slice(0,10);
    }

    // ----- Render -----
    function renderAll(){ renderTransactions(); updateAccountTotals(); updateProfileUI(); }

    function updateAccountTotals(){
        const income = transactions.filter(t=>t.type==='sale').reduce((s,t)=> s+(t.amount||0),0);
        const expenses = transactions.filter(t=>t.type==='expense' || t.type==='procurement').reduce((s,t)=> s+(t.amount||0),0);
        const net = income - expenses;
        const cash = transactions.filter(t=>t.account==='cash').reduce((s,t)=> s+(t.amount||0),0);
        qs('totalIncome').textContent = `$${income.toLocaleString()}`;
        qs('totalExpenses').textContent = `$${expenses.toLocaleString()}`;
        qs('netProfit').textContent = `$${net.toLocaleString()}`;
        qs('cashBalance').textContent = `$${cash.toLocaleString()}`;
    }

    function renderTransactions(){
        const tbody = qs('transactionsTableBody');
        if(!tbody) return;
        const search = (qs('searchTransaction').value||'').toLowerCase();
        const type = qs('filterType').value;
        const from = qs('filterFrom').value;
        const to = qs('filterTo').value;

        let list = transactions.slice();
        if(type) list = list.filter(t=>t.type===type);
        if(search) list = list.filter(t=> (t.description||'').toLowerCase().includes(search));
        if(from) list = list.filter(t=> t.date >= from);
        if(to) list = list.filter(t=> t.date <= to);

        if(list.length===0){ tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; opacity:0.7;">No transactions found</td></tr>`; return; }

        const canEdit = currentUser && (currentUser.role==='admin' || currentUser.role==='manager');

        tbody.innerHTML = list.map(t=> `
            <tr data-id="${t.id}">
                <td>${t.date}</td>
                <td>${t.type}</td>
                <td>$${(t.amount||0).toLocaleString()}</td>
                <td>${t.account}</td>
                <td>${t.description||''}</td>
                <td>${t.user||''}</td>
                <td>${canEdit ? `<button class="btn-primary small edit" data-id="${t.id}"><i class="fas fa-edit"></i></button> <button class="btn-secondary small delete" data-id="${t.id}"><i class="fas fa-trash"></i></button>` : '<span style="opacity:0.6">No permission</span>'}</td>
            </tr>
        `).join('');

        if(canEdit){
            tbody.querySelectorAll('.delete').forEach(btn=> btn.addEventListener('click', e=> { const id = e.target.closest('button').dataset.id; deleteTransaction(id); }));
            tbody.querySelectorAll('.edit').forEach(btn=> btn.addEventListener('click', e=> { const id = e.target.closest('button').dataset.id; showAddTransactionModal(id); }));
        }
    }

    // ----- Transaction modal & actions -----
    function showAddTransactionModal(editId){
        editingTxId = editId || null;
        qs('transactionModalTitle').textContent = editId ? 'Edit Transaction' : 'Add Transaction';
        qs('transactionForm').reset();
        qs('transactionDate').value = (new Date()).toISOString().slice(0,10);
        if(editId){ const tx = transactions.find(t=>t.id===editId); if(tx){ qs('transactionType').value = tx.type; qs('transactionAmount').value = tx.amount; qs('transactionAccount').value = tx.account||'cash'; qs('transactionDescription').value = tx.description||''; qs('transactionDate').value = tx.date; }}
        qs('transactionModal').classList.remove('hidden'); document.body.style.overflow='hidden';
    }
    function hideTransactionModal(){ qs('transactionModal').classList.add('hidden'); document.body.style.overflow='auto'; editingTxId = null; }

    function handleTransactionSubmit(){
        const type = qs('transactionType').value;
        const amount = parseFloat(qs('transactionAmount').value) || 0;
        const account = qs('transactionAccount').value;
        const desc = qs('transactionDescription').value.trim();
        const date = qs('transactionDate').value;
        if(!date){ alert('Please enter date'); return; }

        if(editingTxId){
            const idx = transactions.findIndex(t=>t.id===editingTxId);
            if(idx!==-1){ transactions[idx] = { ...transactions[idx], type, amount, account, description: desc, date, user: (currentUser && currentUser.username) || transactions[idx].user }; addActivity('update-transaction', {id: transactions[idx].id}); }
        } else {
            const tx = { id: Date.now().toString(), date, type, amount, account, description: desc, user: (currentUser && currentUser.username) || 'System' };
            transactions.unshift(tx); addActivity('add-transaction', {id: tx.id});
        }
        saveTransactions(); hideTransactionModal(); renderTransactions(); updateAccountTotals();
    }

    function deleteTransaction(id){ if(!currentUser || (currentUser.role!=='admin' && currentUser.role!=='manager')){ alert('You do not have permission to delete'); return; } if(!confirm('Delete transaction?')) return; transactions = transactions.filter(t=>t.id!==id); saveTransactions(); addActivity('delete-transaction',{id}); renderTransactions(); updateAccountTotals(); }

    // ----- Login -----
    function showLoginModal(){ qs('loginModal').classList.remove('hidden'); document.body.style.overflow='hidden'; }
    function hideLoginModal(){ qs('loginModal').classList.add('hidden'); document.body.style.overflow='auto'; }
    function handleLocalLogin(){ const u = qs('loginUsername').value.trim(); const p = qs('loginPassword').value.trim(); const user = users.find(x=>x.username===u && x.password===p); if(!user){ alert('Invalid credentials'); return; } currentUser = { username: user.username, role: user.role }; saveCurrentUser(); addActivity('login',{user: user.username}); hideLoginModal(); renderAll(); }

    function updateProfileUI(){ qs('profileRole').textContent = currentUser ? currentUser.role.toUpperCase() : 'Guest'; qs('profileName').textContent = currentUser ? currentUser.username : 'Not logged in'; qs('loginBtn').innerHTML = currentUser ? '<i class="fas fa-sign-out-alt"></i>' : '<i class="fas fa-sign-in-alt"></i>'; }

    // ----- Activity -----
    function addActivity(action, data){ const entry = { id: Date.now().toString(), action, data: data||{}, user: (currentUser && currentUser.username) || data?.user || 'System', timestamp: new Date().toISOString() }; activityLog.unshift(entry); saveActivityLog(); }

    function showActivityLog(){ if(!currentUser || currentUser.role!=='admin'){ alert('Only admins can view activity logs'); return; } qs('activityModal').classList.remove('hidden'); document.body.style.overflow='hidden'; renderActivityList(); }
    function hideActivityLog(){ qs('activityModal').classList.add('hidden'); document.body.style.overflow='auto'; }
    function renderActivityList(){ const container = qs('activityList'); if(!container) return; const search = (qs('activitySearch').value||'').toLowerCase(); const from = qs('activityFrom').value; const to = qs('activityTo').value; let list = activityLog.slice(); if(from) list = list.filter(a => a.timestamp >= from); if(to) list = list.filter(a=> a.timestamp <= (new Date(to).toISOString())); if(search) list = list.filter(a=> (`${a.action} ${JSON.stringify(a.data||{})} ${a.user}`).toLowerCase().includes(search)); if(list.length===0){ container.innerHTML = '<div style="text-align:center; opacity:0.7; padding:1rem">No activities found</div>'; return; } container.innerHTML = list.map(a=> `<div style="padding:0.5rem; border-bottom:1px solid #eee;"><div style="font-weight:600">${a.action}</div><div style="color:#6b7280; font-size:0.9rem">${a.user} • ${new Date(a.timestamp).toLocaleString()}</div><div style="margin-top:0.25rem; font-size:0.9rem">${JSON.stringify(a.data)}</div></div>`).join(''); }
    function clearActivityLog(){ if(!currentUser || currentUser.role!=='admin'){ alert('Only admins can clear activity log'); return; } if(!confirm('Clear activity log?')) return; activityLog = []; saveActivityLog(); addActivity('clear-activity-log',{}); renderActivityList(); }

    function exportActivityCsv(){ const rows = [['ID','Action','User','Timestamp','Data']]; activityLog.forEach(a=> rows.push([a.id,a.action,a.user,a.timestamp,JSON.stringify(a.data||{})])); const csv = rows.map(r=> r.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `activity_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

    // ----- Export transactions -----
    function exportTransactionsCsv(){ const rows = [['Date','Type','Amount','Account','Description','User']]; transactions.forEach(t=> rows.push([t.date,t.type,t.amount,t.account,(t.description||'').replace(/\n/g,' '),t.user||''])); const csv = rows.map(r=> r.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

    // Expose global logout for inline onclick handlers
    window.handleGlobalLogout = function(e) {
        if (e) e.preventDefault();
        clearCurrentUser();
        addActivity('logout', {user: currentUser ? currentUser.username : 'Unknown'});
        window.location.href = 'index.html';
    };

})();