/* global BaseManager */
/* eslint-disable class-methods-use-this, no-restricted-globals, prefer-destructuring */
class TaskManager extends BaseManager {
  constructor() {
    super();
    this.apiBase = 'http://localhost:5000/api';
    this.tasks = [];
    this.currentEditId = null;
    this.activityLog = this.loadActivityLog();
  }

  loadCurrentUser() {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      this.currentUser = user || { username: 'User' };
    } catch {
      this.currentUser = { username: 'User' };
    }
  }

  async init() {
    this.loadCurrentUser();
    try {
      // Debug: Check if button exists and is visible
      const addBtn = document.getElementById('addTaskBtn');
      if (addBtn) {
        const rect = addBtn.getBoundingClientRect();
        console.log('Button found:', {
          text: addBtn.textContent,
          visible: rect.width > 0 && rect.height > 0,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          computed: window.getComputedStyle(addBtn).display,
          parent: addBtn.parentElement?.classList.toString(),
        });
      } else {
        console.error('Button NOT found in DOM');
      }

      this.setupEventListeners();

      // Safety: clear any stale modal backdrops that might block clicks
      document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    } catch (err) {
      console.error('Error setting up event listeners:', err);
    }

    try {
      await this.loadTasks();
    } catch (err) {
      console.error('Error loading tasks:', err);
      this.tasks = this.loadTasksFromStorage();
    }

    try {
      await this.loadAssignees();
    } catch (err) {
      console.error('Error loading assignees:', err);
    }

    try {
      this.renderTasksTable();
      this.updateDashboard();
      this.populateFilters();
      this.setDefaultDates();
      this.renderActivityLog();

      // Auto-check overdue every 60s
      setInterval(() => this.checkOverdueTasks(true), 60000);
    } catch (err) {
      console.error('Error rendering UI:', err);
    }
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');

    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) {
      // Add multiple event types to ensure click is captured
      addBtn.addEventListener('click', (e) => {
        console.log('Add Task button CLICKED', e);
        this.showAddForm();
      });
      addBtn.addEventListener('pointerdown', (e) => {
        console.log('Add Task button POINTERDOWN', e);
      });
      // Also add inline onclick as fallback
      addBtn.onclick = (e) => {
        console.log('Add Task button onclick fallback', e);
        this.showAddForm();
      };
      console.log('✓ Add Task button listener attached', addBtn);
    } else {
      console.error('✗ Add Task button not found', document.getElementById('addTaskBtn'));
    }

    const cancelBtn = document.getElementById('cancelTaskBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        console.log('Cancel button clicked');
        this.hideForm();
      });
      console.log('✓ Cancel button listener attached');
    } else {
      console.error('✗ Cancel button not found');
    }

    const form = document.getElementById('taskForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('Form submitted');
        this.handleSubmit(e);
      });
      console.log('✓ Form submit listener attached');
    } else {
      console.error('✗ Task form not found');
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterTasks());
      console.log('✓ Status filter listener attached');
    }

    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.filterTasks());
      console.log('✓ Priority filter listener attached');
    }

    const searchInput = document.getElementById('searchTasks');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterTasks());
      console.log('✓ Search listener attached');
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.filterTasks());
      console.log('✓ Category filter listener attached');
    }

    const assigneeFilter = document.getElementById('assigneeFilter');
    if (assigneeFilter) {
      assigneeFilter.addEventListener('change', () => this.filterTasks());
      console.log('✓ Assignee filter listener attached');
    }

    const calendarBtn = document.getElementById('calendarViewBtn');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => this.showCalendar());
      console.log('✓ Calendar button listener attached');
    }

    // Custom modal close buttons
    const closeCalendarModal = document.getElementById('closeCalendarModal');
    if (closeCalendarModal) {
      closeCalendarModal.addEventListener('click', () => this.closeCalendarModal());
    }
    const closeCalendarModalBtn = document.getElementById('closeCalendarModalBtn');
    if (closeCalendarModalBtn) {
      closeCalendarModalBtn.addEventListener('click', () => this.closeCalendarModal());
    }
    // Close on overlay click
    const calendarOverlay = document.getElementById('calendarModalOverlay');
    if (calendarOverlay) {
      calendarOverlay.addEventListener('click', (e) => {
        if (e.target === calendarOverlay) this.closeCalendarModal();
      });
    }

    console.log('Event listeners setup complete');
  }

  showAddForm() {
    console.log('showAddForm called - THIS SHOULD APPEAR IN CONSOLE');
    const formSection = document.getElementById('taskFormSection');
    if (formSection) {
      console.log('Form section found, setting display to block');
      formSection.style.display = 'block';
      console.log('✓ Form section displayed - check if you see form now');
    } else {
      console.error('✗ Task form section not found - SERIOUS ERROR');
    }

    const heading = document.querySelector('#taskFormSection h2');
    if (heading) {
      heading.textContent = 'Add New Task';
      console.log('✓ Heading updated');
    } else {
      console.warn('Form section heading not found');
    }
    this.currentEditId = null;
    console.log('Form is now ready to use');
  }

  hideForm() {
    document.getElementById('taskFormSection').style.display = 'none';
    document.getElementById('taskForm').reset();
    this.setDefaultDates();
  }

  setDefaultDates() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 7);

    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
  }

  async loadTasks() {
    try {
      const res = await fetch(`${this.apiBase}/tasks`, { timeout: 5000 });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      this.tasks = data.map((t) => this.normalizeTask(t));
      console.log(`Loaded ${this.tasks.length} tasks from API`);
    } catch (err) {
      console.warn('Falling back to local tasks', err);
      this.tasks = this.loadTasksFromStorage();
    }
  }

  async loadAssignees() {
    try {
      const res = await fetch(`${this.apiBase}/users`, { timeout: 5000 });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const users = await res.json();
      const assignedToSelect = document.getElementById('assignedTo');
      if (assignedToSelect) {
        const options = users
          .map(
            (u) => `<option value="${u.username || u.name || u.email}">${u.username || u.name || u.email}</option>`,
          )
          .join('');
        assignedToSelect.innerHTML = options;
        console.log(`Loaded ${users.length} assignees from API`);
      }
    } catch (err) {
      console.warn('Could not load assignees from API', err);
    }
  }

  normalizeTask(task) {
    return {
      ...task,
      id: task._id || task.id,
      description: task.description || '',
      assignedTo: task.assignedTo || task.assignee || 'Unassigned',
    };
  }

  async handleSubmit(e) {
    e.preventDefault();

    const startDate = new Date(document.getElementById('startDate').value);
    const dueDate = new Date(document.getElementById('dueDate').value);

    if (dueDate <= startDate) {
      this.showNotification('Due date must be after start date', 'danger');
      return;
    }

    const oldAssignee = this.currentEditId
      ? this.tasks.find((t) => t.id === this.currentEditId)?.assignedTo
      : null;
    const newAssignee = document.getElementById('assignedTo').value;

    const taskData = {
      title: document.getElementById('taskTitle').value,
      priority: document.getElementById('taskPriority').value,
      assignedTo: newAssignee,
      category: document.getElementById('taskCategory').value,
      startDate: document.getElementById('startDate').value,
      dueDate: document.getElementById('dueDate').value,
      description: document.getElementById('taskDescription').value,
      status: this.currentEditId
        ? this.tasks.find((t) => t.id === this.currentEditId)?.status || 'pending'
        : 'pending',
    };

    // Track assignment change for notification
    if (oldAssignee && oldAssignee !== newAssignee) {
      taskData._assignmentChange = { from: oldAssignee, to: newAssignee };
    }

    if (this.currentEditId) {
      await this.saveTask(this.currentEditId, taskData, 'update');
    } else {
      await this.saveTask(null, taskData, 'create');
    }

    this.hideForm();
  }

  async saveTask(taskId, taskData, action) {
    console.log(`saveTask called: action=${action}, taskId=${taskId}`);
    try {
      // Track assignment change before removing metadata
      const assignmentChange = taskData._assignmentChange;
      const displayAssignee = taskData.assignedTo;

      // Map frontend fields to backend schema (taskId, no startDate, etc.)
      const payload = {
        taskId: taskId || `TSK-${Date.now()}`,
        title: taskData.title,
        description: taskData.description,
        assignedTo: taskData.assignedTo,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        category: taskData.category,
        notes: taskData.description, // Backend uses notes field
        createdBy: this.currentUser?.username || 'User',
      };

      const method = taskId ? 'PUT' : 'POST';
      const url = taskId ? `${this.apiBase}/tasks/${taskId}` : `${this.apiBase}/tasks`;

      console.log(`Sending ${method} request to ${url}`, payload);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log(`Response status: ${res.status}`);

      if (!res.ok) throw new Error(`Failed to ${action} task`);
      const saved = await res.json();
      console.log('Saved task response:', saved);
      const normalized = this.normalizeTask(saved);

      if (taskId) {
        const index = this.tasks.findIndex((t) => t.id === taskId);
        this.tasks[index] = normalized;

        // Enhanced notification for updates with assignment changes
        if (assignmentChange) {
          this.showNotification(`Task updated • reassigned to ${assignmentChange.to}`, 'success');
        } else {
          this.showNotification('Task updated successfully', 'success');
        }
        this.logActivity('task-updated', normalized);
      } else {
        this.tasks.unshift(normalized);
        this.showNotification(`Task created • assigned to ${displayAssignee}`, 'success');
        this.logActivity('task-created', normalized);
      }

      this.renderTasksTable();
      this.updateDashboard();
      this.populateFilters();
    } catch (err) {
      console.error(`Error ${action}ing task:`, err);
      this.showNotification(`Failed to ${action} task`, 'danger');
      // Fallback: update local storage
      if (taskId) {
        const index = this.tasks.findIndex((t) => t.id === taskId);
        if (index >= 0) this.tasks[index] = { ...this.tasks[index], ...taskData };
      } else {
        this.tasks.unshift({ id: Date.now().toString(), ...taskData });
      }
      this.saveTasksToStorage();
    }
  }

  async updateTaskStatus(taskId, newStatus) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      // Backend uses POST /:id/complete for completion; for other statuses, use PUT
      let url; let method; let
        body;

      if (newStatus === 'completed') {
        url = `${this.apiBase}/tasks/${taskId}/complete`;
        method = 'POST';
        body = JSON.stringify({});
      } else {
        url = `${this.apiBase}/tasks/${taskId}`;
        method = 'PUT';
        body = JSON.stringify({ status: newStatus });
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) throw new Error('Failed to update task status');
      const updated = await res.json();
      const normalized = this.normalizeTask(updated);

      const index = this.tasks.findIndex((t) => t.id === taskId);
      this.tasks[index] = normalized;

      this.logActivity(`task-${newStatus}`, normalized);
      this.renderTasksTable();
      this.updateDashboard();
      this.showNotification(`Task marked as ${newStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      this.showNotification('Failed to update task status', 'danger');
      // Fallback: update locally
      task.status = newStatus;
      if (newStatus === 'completed') {
        task.completedAt = new Date().toISOString();
      }
      this.saveTasksToStorage();
      this.renderTasksTable();
      this.updateDashboard();
    }
  }

  editTask(taskId) {
    console.log('editTask called for:', taskId);
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      this.currentEditId = taskId;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('assignedTo').value = task.assignedTo;
      document.getElementById('taskCategory').value = task.category;
      document.getElementById('startDate').value = task.startDate;
      document.getElementById('dueDate').value = task.dueDate;
      document.getElementById('taskDescription').value = task.description;

      const heading = document.querySelector('#taskFormSection h2');
      if (heading) {
        heading.textContent = 'Edit Task';
      }
      document.getElementById('taskFormSection').style.display = 'block';
      console.log('✓ Form opened for editing');
    } else {
      console.error('✗ Task not found:', taskId);
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`${this.apiBase}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');

      this.tasks = this.tasks.filter((task) => task.id !== taskId);
      this.logActivity('task-deleted', { id: taskId });
      this.renderTasksTable();
      this.updateDashboard();
      this.populateFilters();
      this.showNotification('Task deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting task:', err);
      this.showNotification('Failed to delete task', 'danger');
      // Fallback: delete locally
      this.tasks = this.tasks.filter((task) => task.id !== taskId);
      this.saveTasksToStorage();
      this.renderTasksTable();
      this.updateDashboard();
      this.populateFilters();
    }
  }

  getTaskStatus(task) {
    const today = new Date();
    const dueDate = new Date(task.dueDate);

    if (task.status === 'completed') return { class: 'completed', text: 'Completed' };
    if (task.status === 'in-progress') return { class: 'in-progress', text: 'In Progress' };
    if (dueDate < today && task.status !== 'completed') return { class: 'overdue', text: 'Overdue' };
    return { class: 'pending', text: 'Pending' };
  }

  getPriorityClass(priority) {
    const classes = {
      urgent: 'priority-urgent',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return classes[priority] || 'priority-medium';
  }

  renderTasksTable() {
    const tbody = document.getElementById('tasksTableBody');
    this.checkOverdueTasks();
    const filteredTasks = this.getFilteredTasks();

    tbody.innerHTML = filteredTasks
      .map((task) => {
        const status = this.getTaskStatus(task);
        const priorityClass = this.getPriorityClass(task.priority);
        const desc = (task.description || '').substring(0, 50);

        return `
                <tr>
                    <td>
                        <div class="task-title">${task.title}</div>
                <div class="task-description">${desc}...</div>
                    </td>
                    <td>${task.assignedTo}</td>
                    <td><span class="badge ${priorityClass}">${task.priority.toUpperCase()}</span></td>
                    <td>${task.category}</td>
                    <td>${this.formatDate(task.dueDate)}</td>
                    <td><span class="badge ${status.class}">${status.text}</span></td>
                    <td>
                        ${
  task.status === 'pending'
    ? `<button class="btn btn-sm btn-outline-success" onclick="taskManager.updateTaskStatus('${task.id}', 'in-progress')" title="Start Task">
                                <i class="fas fa-play"></i>
                            </button>`
    : ''
}
                        ${
  task.status === 'in-progress'
    ? `<button class="btn btn-sm btn-outline-success" onclick="taskManager.updateTaskStatus('${task.id}', 'completed')" title="Complete Task">
                                <i class="fas fa-check"></i>
                            </button>`
    : ''
}
                        <button class="btn btn-sm btn-outline-primary" onclick="taskManager.editTask('${task.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="taskManager.deleteTask('${task.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
      })
      .join('');
  }

  getFilteredTasks() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const assigneeFilter = document.getElementById('assigneeFilter')?.value || '';
    const searchTerm = document.getElementById('searchTasks').value.toLowerCase();

    return this.tasks.filter((task) => {
      const status = this.getTaskStatus(task);
      const matchesStatus = !statusFilter || status.class === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      const matchesCategory = !categoryFilter || task.category === categoryFilter;
      const matchesAssignee = !assigneeFilter || task.assignedTo === assigneeFilter;
      const matchesSearch = !searchTerm
        || task.title.toLowerCase().includes(searchTerm)
        || task.description.toLowerCase().includes(searchTerm)
        || task.assignedTo.toLowerCase().includes(searchTerm);

      return (
        matchesStatus && matchesPriority && matchesCategory && matchesAssignee && matchesSearch
      );
    });
  }

  filterTasks() {
    this.renderTasksTable();
    this.updateDashboard();
  }

  checkOverdueTasks() {
    const today = new Date();
    let updated = false;
    let overdueCount = 0;
    this.tasks.forEach((task) => {
      if (task.status !== 'completed' && task.status !== 'overdue') {
        const due = new Date(task.dueDate);
        if (due < today) {
          task.status = 'overdue';
          updated = true;
          overdueCount += 1;
          this.logActivity('task-overdue', task);
          // Try to sync to backend
          this.syncOverdueStatus(task.id, 'overdue').catch((err) => console.warn('Could not sync overdue status:', err));
        }
      }
    });
    if (updated) {
      this.saveTasksToStorage();
      this.updateDashboard();
      // Show a warning notification for newly overdue tasks
      if (overdueCount === 1) {
        this.showNotification('⚠️ 1 task is now overdue', 'warning');
      } else if (overdueCount > 1) {
        this.showNotification(`⚠️ ${overdueCount} tasks are now overdue`, 'warning');
      }
    }
  }

  async syncOverdueStatus(taskId, status) {
    try {
      // Use PUT endpoint for overdue status (backend doesn't have special overdue endpoint)
      const res = await fetch(`${this.apiBase}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Sync failed');
    } catch (err) {
      console.warn('Overdue status sync failed, continuing with local update', err);
    }
  }

  populateFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const assigneeFilter = document.getElementById('assigneeFilter');

    if (!categoryFilter || !assigneeFilter) return;

    const categories = [''].concat([...new Set(this.tasks.map((t) => t.category))]);
    const assignees = [''].concat([...new Set(this.tasks.map((t) => t.assignedTo))]);

    categoryFilter.innerHTML = categories
      .map(
        (c) => `<option value="${c}">${c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All Categories'}</option>`,
      )
      .join('');

    assigneeFilter.innerHTML = assignees
      .map((a) => `<option value="${a}">${a || 'All Assignees'}</option>`)
      .join('');
  }

  updateDashboard() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => this.getTaskStatus(t).class === 'completed').length;
    const inProgress = this.tasks.filter(
      (t) => this.getTaskStatus(t).class === 'in-progress',
    ).length;
    const overdue = this.tasks.filter((t) => this.getTaskStatus(t).class === 'overdue').length;

    const completedPct = total ? Math.round((completed / total) * 100) : 0;
    const inProgressPct = total ? Math.round((inProgress / total) * 100) : 0;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('totalTasksCount', total);
    setText('completedTasksCount', completed);
    setText('completedTasksPct', `${completedPct}%`);
    setText('inProgressTasksCount', inProgress);
    setText('inProgressTasksPct', `${inProgressPct}%`);
    setText('overdueTasksCount', overdue);
  }

  showCalendar() {
    const calendarList = document.getElementById('calendarList');
    const calendarOverlay = document.getElementById('calendarModalOverlay');
    if (!calendarList || !calendarOverlay) {
      console.warn('Calendar elements not found');
      return;
    }

    const tasksByDate = [...this.tasks].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate),
    );
    calendarList.innerHTML = tasksByDate
      .map((task) => {
        const status = this.getTaskStatus(task);
        return `
          <div class="calendar-item">
            <div>
              <div class="calendar-title">${task.title}</div>
              <div class="calendar-dates">${this.formatDate(task.startDate)} → ${this.formatDate(task.dueDate)}</div>
              <div class="calendar-meta">${task.assignedTo} • ${task.category}</div>
            </div>
            <span class="badge ${status.class}">${status.text}</span>
          </div>
        `;
      })
      .join('');

    // Show custom modal
    calendarOverlay.style.display = 'flex';
    console.log('✓ Calendar modal opened');
  }

  closeCalendarModal() {
    const calendarOverlay = document.getElementById('calendarModalOverlay');
    if (calendarOverlay) {
      calendarOverlay.style.display = 'none';
    }
  }

  logActivity(action, task) {
    const entry = {
      id: Date.now().toString(),
      action,
      taskId: task.id,
      title: task.title,
      user: this.currentUser?.username || 'System',
      timestamp: new Date().toISOString(),
    };
    this.activityLog.unshift(entry);
    this.activityLog = this.activityLog.slice(0, 50);
    this.saveActivityLog();
    this.renderActivityLog();
  }

  renderActivityLog() {
    const container = document.getElementById('taskActivityLog');
    if (!container) return;
    container.innerHTML = this.activityLog
      .map(
        (log) => `<div class="activity-entry"><span>${this.formatDate(log.timestamp)}</span> - <strong>${log.action}</strong> (${log.title || log.taskId})</div>`,
      )
      .join('');
  }

  loadTasksFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem('tasks') || '[]');
      if (stored.length) return stored;
    } catch (e) {
      console.warn('Could not read tasks from storage', e);
    }
    return this.getInitialTasks();
  }

  saveTasksToStorage() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }

  loadActivityLog() {
    try {
      return JSON.parse(localStorage.getItem('taskActivityLog') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveActivityLog() {
    localStorage.setItem('taskActivityLog', JSON.stringify(this.activityLog));
  }

  getInitialTasks() {
    return [
      {
        id: '1',
        title: 'Update inventory system',
        priority: 'high',
        assignedTo: 'John Smith',
        category: 'development',
        startDate: '2025-12-10',
        dueDate: '2025-12-15',
        description: 'Update the inventory management system with new features',
        status: 'in-progress',
      },
      {
        id: '2',
        title: 'Prepare monthly sales report',
        priority: 'medium',
        assignedTo: 'Sarah Johnson',
        category: 'sales',
        startDate: '2025-12-12',
        dueDate: '2025-12-20',
        description: 'Compile and analyze monthly sales data for presentation',
        status: 'pending',
      },
      {
        id: '3',
        title: 'Customer follow-up calls',
        priority: 'urgent',
        assignedTo: 'Mike Davis',
        category: 'support',
        startDate: '2025-12-08',
        dueDate: '2025-12-10',
        description: 'Follow up with customers who had support tickets',
        status: 'overdue',
      },
    ];
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.taskManager = new TaskManager();
  await window.taskManager.init();
});
