/* global BaseManager */
/* eslint-disable class-methods-use-this, no-param-reassign, no-return-assign */
class CommunicationManager extends BaseManager {
  constructor() {
    super();
    this.conversations = this.getInitialConversations();
    this.callLog = this.getInitialCallLog();
    this.notifications = this.getInitialNotifications();
    this.users = [];
    this.activeConversation = null;
    this.attachments = [];
    this.emojis = [
      '😀',
      '😊',
      '👍',
      '❤️',
      '🎉',
      '🔥',
      '💯',
      '✅',
      '⭐',
      '🚀',
      '💼',
      '📊',
      '📋',
      '💰',
      '🏷️',
      '📦',
    ];
    this.init();
  }

  async init() {
    await this.loadUsers();
    this.setupEventListeners();
    this.renderConversationList();
    this.renderCallLog();
    this.renderNotifications();
    this.updateDashboardStats();
    this.checkForAnnouncements();
  }

  async loadUsers() {
    try {
      const response = await fetch('http://localhost:5000/api/users');
      if (response.ok) {
        this.users = await response.json();
        console.log('Loaded users:', this.users.length);
      }
    } catch (error) {
      console.log('Backend not available, using default users');
      this.users = [
        {
          _id: '1', username: 'admin', fullName: 'Admin User', role: 'admin',
        },
        {
          _id: '2', username: 'john_manager', fullName: 'John Manager', role: 'manager',
        },
        {
          _id: '3',
          username: 'sarah_attendant',
          fullName: 'Sarah Attendant',
          role: 'pump_attendant',
        },
      ];
    }
    this.populateRecipientDropdown();
  }

  populateRecipientDropdown() {
    const select = this.qs('#composeRecipient');
    if (!select) return;

    select.innerHTML = '<option value="">Select recipient...</option>';
    this.users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user._id || user.id;
      option.textContent = `${user.fullName || user.username} (${user.role})`;
      select.appendChild(option);
    });
  }

  setupEventListeners() {
    // Tab switching
    this.qsa('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Message functionality
    this.qs('#sendBtn')?.addEventListener('click', () => this.sendMessage());
    this.qs('#newMessage')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Typing simulation
    this.qs('#newMessage')?.addEventListener('input', () => this.handleTyping());

    // Notification filters
    this.qsa('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => this.filterNotifications(e.target.dataset.filter));
    });

    // Compose Modal
    this.qs('#composeBtn')?.addEventListener('click', () => this.openComposeModal());
    this.qs('#closeComposeModal')?.addEventListener('click', () => this.closeComposeModal());
    this.qs('#sendMessageBtn')?.addEventListener('click', () => this.sendComposedMessage());
    this.qs('#saveDraftBtn')?.addEventListener('click', () => this.saveDraft());
    this.qs('#composeModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'composeModalOverlay') this.closeComposeModal();
    });

    // Announcement Modal
    this.qs('#announcementBtn')?.addEventListener('click', () => this.openAnnouncementModal());
    this.qs('#closeAnnouncementModal')?.addEventListener('click', () => this.closeAnnouncementModal());
    this.qs('#cancelAnnouncementBtn')?.addEventListener('click', () => this.closeAnnouncementModal());
    this.qs('#postAnnouncementBtn')?.addEventListener('click', () => this.postAnnouncement());
    this.qs('#announcementModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'announcementModalOverlay') this.closeAnnouncementModal();
    });

    // Audience dropdown for announcement
    this.qs('#announcementAudience')?.addEventListener('change', (e) => {
      const branchSelector = this.qs('#branchSelector');
      branchSelector.style.display = e.target.value === 'branch' ? 'block' : 'none';
    });

    // Attachment handling
    const dropzone = this.qs('#attachmentDropzone');
    const attachmentInput = this.qs('#attachmentInput');

    dropzone?.addEventListener('click', () => attachmentInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });
    attachmentInput?.addEventListener('change', (e) => this.handleFiles(e.target.files));

    // Emoji picker
    this.qs('#emojiBtn')?.addEventListener('click', () => this.toggleEmojiPicker());

    // Mark all read
    this.qs('#markAllReadBtn')?.addEventListener('click', () => this.markAllNotificationsRead());

    // Refresh button
    this.qs('#refreshBtn')?.addEventListener('click', () => this.refresh());

    // Message search
    this.qs('#messageSearch')?.addEventListener('input', (e) => this.searchConversations(e.target.value));

    // Message actions
    this.qs('#callContactBtn')?.addEventListener('click', () => this.callCurrentContact());
    this.qs('#videoCallBtn')?.addEventListener('click', () => this.videoCallCurrentContact());
  }

  // ========== COMPOSE MODAL ==========
  openComposeModal() {
    this.qs('#composeModalOverlay').style.display = 'flex';
    this.qs('#composeForm').reset();
    this.attachments = [];
    this.renderAttachments();
  }

  closeComposeModal() {
    this.qs('#composeModalOverlay').style.display = 'none';
  }

  sendComposedMessage() {
    const recipient = this.qs('#composeRecipient').value;
    const subject = this.qs('#composeSubject').value.trim();
    const message = this.qs('#composeMessage').value.trim();
    const priority = this.qs('input[name="priority"]:checked')?.value || 'normal';

    if (!recipient || !subject || !message) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    const recipientUser = this.users.find((u) => (u._id || u.id) === recipient);

    // Create new conversation or add to existing
    const newConversation = {
      id: Date.now().toString(),
      name: recipientUser?.fullName || recipientUser?.username || 'Unknown',
      priority,
      online: Math.random() > 0.5,
      lastMessage: {
        text: message,
        time: new Date().toISOString(),
      },
      unread: false,
      messages: [
        {
          id: Date.now().toString(),
          text: `**${subject}**\n\n${message}`,
          time: new Date().toISOString(),
          sender: 'me',
          read: false,
        },
      ],
    };

    if (this.attachments.length > 0) {
      newConversation.messages[0].attachments = [...this.attachments];
    }

    this.conversations.unshift(newConversation);
    this.renderConversationList();
    this.closeComposeModal();
    this.showNotification(`Message sent to ${newConversation.name}`, 'success');
    this.updateDashboardStats();
  }

  saveDraft() {
    const subject = this.qs('#composeSubject').value.trim();
    if (!subject) {
      this.showNotification('Please add a subject to save draft', 'error');
      return;
    }

    // Save to localStorage
    const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '[]');
    drafts.push({
      id: Date.now(),
      recipient: this.qs('#composeRecipient').value,
      subject,
      message: this.qs('#composeMessage').value,
      priority: this.qs('input[name="priority"]:checked')?.value || 'normal',
      attachments: this.attachments,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('messageDrafts', JSON.stringify(drafts));

    this.closeComposeModal();
    this.showNotification('Draft saved successfully', 'success');
  }

  // ========== ATTACHMENT HANDLING ==========
  handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        this.showNotification(`${file.name} is too large (max 10MB)`, 'error');
        return;
      }
      this.attachments.push({
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type,
      });
    });
    this.renderAttachments();
  }

  renderAttachments() {
    const container = this.qs('#attachmentList');
    if (!container) return;

    container.innerHTML = this.attachments
      .map(
        (att, index) => `
      <div class="attachment-item">
        <i class="fas fa-${this.getFileIcon(att.type)}"></i>
        <span>${att.name} (${att.size})</span>
        <button class="remove-attachment" onclick="communicationManager.removeAttachment(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `,
      )
      .join('');
  }

  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.renderAttachments();
  }

  getFileIcon(mimeType) {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.includes('pdf')) return 'file-pdf';
    if (mimeType?.includes('word')) return 'file-word';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'file-excel';
    return 'file';
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ========== ANNOUNCEMENT MODAL ==========
  openAnnouncementModal() {
    this.qs('#announcementModalOverlay').style.display = 'flex';
    this.qs('#announcementForm').reset();
    this.qs('#branchSelector').style.display = 'none';
  }

  closeAnnouncementModal() {
    this.qs('#announcementModalOverlay').style.display = 'none';
  }

  postAnnouncement() {
    const title = this.qs('#announcementTitle').value.trim();
    const message = this.qs('#announcementMessage').value.trim();
    const audience = this.qs('#announcementAudience').value;
    const priority = this.qs('#announcementPriority').value;
    const isPinned = this.qs('#announcementPin').checked;

    if (!title || !message) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Add to notifications
    const newNotification = {
      id: Date.now().toString(),
      type: priority === 'danger' ? 'urgent' : 'system',
      title: `📢 ${title}`,
      message,
      time: new Date().toISOString(),
      read: false,
      isAnnouncement: true,
      audience,
      isPinned,
    };

    this.notifications.unshift(newNotification);
    this.renderNotifications();
    this.closeAnnouncementModal();
    this.showNotification('Announcement posted successfully', 'success');
    this.updateDashboardStats();

    // Show the announcement badge
    this.showAnnouncementBadge(title, message, priority);
  }

  showAnnouncementBadge(title, message, priority) {
    let badge = this.qs('.announcement-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'announcement-badge';
      document.body.appendChild(badge);
    }

    badge.innerHTML = `
      <div class="announcement-header">
        <span class="announcement-title"><i class="fas fa-bullhorn"></i> ${title}</span>
        <button class="announcement-close" onclick="this.parentElement.parentElement.style.display='none'">&times;</button>
      </div>
      <div class="announcement-message">${message}</div>
    `;

    if (priority === 'danger') {
      badge.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
    } else if (priority === 'warning') {
      badge.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    }

    badge.style.display = 'block';

    // Auto hide after 10 seconds
    setTimeout(() => {
      badge.style.display = 'none';
    }, 10000);
  }

  checkForAnnouncements() {
    // Check for any recent pinned announcements
    const pinnedAnnouncements = this.notifications.filter((n) => n.isPinned && !n.read);
    if (pinnedAnnouncements.length > 0) {
      const latest = pinnedAnnouncements[0];
      setTimeout(() => {
        this.showAnnouncementBadge(latest.title, latest.message, 'warning');
      }, 2000);
    }
  }

  // ========== EMOJI PICKER ==========
  toggleEmojiPicker() {
    let picker = this.qs('.emoji-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.className = 'emoji-picker';
      picker.innerHTML = `
        <div class="emoji-grid">
          ${this.emojis
    .map(
      (emoji) => `
            <button class="emoji-item" onclick="communicationManager.insertEmoji('${emoji}')">${emoji}</button>
          `,
    )
    .join('')}
        </div>
      `;
      this.qs('.message-input').style.position = 'relative';
      this.qs('.message-input').appendChild(picker);
    }
    picker.classList.toggle('show');
  }

  insertEmoji(emoji) {
    const input = this.qs('#newMessage');
    input.value += emoji;
    input.focus();
    this.qs('.emoji-picker')?.classList.remove('show');
  }

  // ========== TYPING INDICATOR ==========
  handleTyping() {
    // Simulate showing typing indicator to other party
    // In real app, this would send a socket event
  }

  showTypingIndicator(name) {
    const indicator = this.qs('#typingIndicator');
    const text = this.qs('#typingText');
    if (indicator && text) {
      text.textContent = `${name} is typing...`;
      indicator.style.display = 'flex';
    }
  }

  hideTypingIndicator() {
    const indicator = this.qs('#typingIndicator');
    if (indicator) indicator.style.display = 'none';
  }

  // ========== CORE MESSAGING ==========
  switchTab(tabName) {
    this.toggleActive(this.qsa('.tab-btn'), this.qs(`[data-tab="${tabName}"]`));
    this.qsa('.tab-content').forEach((content) => (content.style.display = 'none'));
    this.qs(`#${tabName}Tab`).style.display = 'block';
  }

  renderConversationList() {
    const list = document.getElementById('conversationList');
    if (!list) return;

    list.innerHTML = this.conversations
      .map(
        (conv) => `
      <div class="conversation-item ${conv.unread ? 'unread' : ''} ${this.activeConversation?.id === conv.id ? 'active' : ''}" 
           onclick="communicationManager.selectConversation('${conv.id}')">
        <div class="conversation-avatar">
          ${this.getInitials(conv.name)}
          <span class="online-dot ${conv.online ? '' : 'offline'}"></span>
        </div>
        <div class="conversation-details">
          <div class="conversation-name">
            ${conv.name}
            ${conv.priority === 'high' ? '<i class="fas fa-arrow-up priority-icon high"></i>' : ''}
            ${conv.priority === 'urgent' ? '<i class="fas fa-exclamation priority-icon urgent"></i>' : ''}
          </div>
          <div class="conversation-preview">${conv.lastMessage.text.substring(0, 40)}${conv.lastMessage.text.length > 40 ? '...' : ''}</div>
        </div>
        <div class="conversation-meta">
          <div class="conversation-time">${this.formatTime(conv.lastMessage.time)}</div>
          ${conv.unread ? `<span class="unread-badge">${conv.unreadCount || 1}</span>` : ''}
        </div>
      </div>
    `,
      )
      .join('');
  }

  searchConversations(query) {
    const items = this.qsa('.conversation-item');
    const lowerQuery = query.toLowerCase();

    items.forEach((item, index) => {
      const conv = this.conversations[index];
      const matchesName = conv.name.toLowerCase().includes(lowerQuery);
      const matchesMessage = conv.lastMessage.text.toLowerCase().includes(lowerQuery);
      item.style.display = matchesName || matchesMessage || !query ? 'flex' : 'none';
    });
  }

  selectConversation(conversationId) {
    this.activeConversation = this.conversations.find((c) => c.id === conversationId);
    if (this.activeConversation) {
      this.activeConversation.unread = false;
      this.activeConversation.unreadCount = 0;

      // Update header
      document.getElementById('contactName').textContent = this.activeConversation.name;
      const statusEl = document.getElementById('contactStatus');
      if (this.activeConversation.online) {
        statusEl.innerHTML = '<span class="status-online"><i class="fas fa-circle"></i> Online</span>';
      } else {
        statusEl.innerHTML = '<span class="status-offline"><i class="fas fa-circle"></i> Offline</span>';
      }

      // Show message actions
      this.qs('#messageActions').style.display = 'flex';

      this.renderMessages();
      document.getElementById('messageInput').style.display = 'flex';
      this.renderConversationList();
      this.updateDashboardStats();

      // Simulate typing indicator occasionally
      if (Math.random() > 0.7) {
        setTimeout(() => {
          this.showTypingIndicator(this.activeConversation.name);
          setTimeout(() => this.hideTypingIndicator(), 3000);
        }, 2000);
      }
    }
  }

  renderMessages() {
    const messageBody = this.qs('#messageBody');
    if (!this.activeConversation) return;

    messageBody.innerHTML = this.activeConversation.messages
      .map(
        (msg) => `
      <div class="message-item ${msg.sender === 'me' ? 'sent' : 'received'}">
        <div class="message-avatar">${msg.sender === 'me' ? 'Me' : this.getInitials(this.activeConversation.name)}</div>
        <div class="message-bubble">
          <div class="message-text">${msg.text.replace(/\n/g, '<br>')}</div>
          ${
  msg.attachments
    ? `
            <div class="message-attachments">
              ${msg.attachments.map((att) => `<small><i class="fas fa-paperclip"></i> ${att.name}</small>`).join('')}
            </div>
          `
    : ''
}
          <div class="message-meta">
            <span>${this.formatTime(msg.time)}</span>
            ${
  msg.sender === 'me'
    ? `
              <span class="read-status ${msg.read ? 'read' : 'delivered'}">
                <i class="fas fa-${msg.read ? 'check-double' : 'check'}"></i>
              </span>
            `
    : ''
}
          </div>
        </div>
      </div>
    `,
      )
      .join('');

    messageBody.scrollTop = messageBody.scrollHeight;
  }

  sendMessage() {
    const input = document.getElementById('newMessage');
    const messageText = input.value.trim();

    if (messageText && this.activeConversation) {
      const newMessage = {
        id: Date.now().toString(),
        text: messageText,
        time: new Date().toISOString(),
        sender: 'me',
        read: false,
      };

      this.activeConversation.messages.push(newMessage);
      this.activeConversation.lastMessage = newMessage;

      input.value = '';
      this.renderMessages();
      this.renderConversationList();

      // Simulate read receipt after delay
      setTimeout(() => {
        newMessage.read = true;
        this.renderMessages();
      }, 2000);

      // Simulate reply occasionally
      if (Math.random() > 0.6) {
        setTimeout(() => {
          this.showTypingIndicator(this.activeConversation.name);
          setTimeout(() => {
            this.hideTypingIndicator();
            this.receiveMessage(this.activeConversation.id, this.getRandomReply());
          }, 2000);
        }, 3000);
      }
    }
  }

  receiveMessage(conversationId, text) {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const newMessage = {
      id: Date.now().toString(),
      text,
      time: new Date().toISOString(),
      sender: 'contact',
    };

    conv.messages.push(newMessage);
    conv.lastMessage = newMessage;

    if (this.activeConversation?.id === conversationId) {
      this.renderMessages();
    } else {
      conv.unread = true;
      conv.unreadCount = (conv.unreadCount || 0) + 1;
    }

    this.renderConversationList();
    this.updateDashboardStats();
    this.showNotification(`New message from ${conv.name}`, 'info');
  }

  getRandomReply() {
    const replies = [
      'Got it, thanks!',
      "I'll look into that right away.",
      'Sure, no problem.',
      'Thanks for letting me know.',
      "I'll get back to you shortly.",
      'Perfect, that works for me.',
      'Can you provide more details?',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ========== CALL FUNCTIONS ==========
  callCurrentContact() {
    if (this.activeConversation) {
      this.callContact(this.activeConversation.name);
    }
  }

  videoCallCurrentContact() {
    if (this.activeConversation) {
      this.showNotification(`Starting video call with ${this.activeConversation.name}...`, 'info');
    }
  }

  renderCallLog() {
    const tbody = document.getElementById('callLogBody');
    if (!tbody) return;

    tbody.innerHTML = this.callLog
      .map(
        (call) => `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="conversation-avatar me-2" style="width:36px;height:36px;font-size:0.875rem;">
              ${this.getInitials(call.contact)}
            </div>
            <div>
              <strong>${call.contact}</strong>
              <br><small class="text-muted">${call.phone}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-${call.type === 'incoming' ? 'success' : call.type === 'outgoing' ? 'primary' : 'danger'}">
            <i class="fas fa-phone-${call.type === 'incoming' ? 'arrow-down-left' : call.type === 'outgoing' ? 'arrow-up-right' : 'slash'}"></i>
            ${call.type}
          </span>
        </td>
        <td>${call.duration}</td>
        <td>${this.formatDateTime(call.dateTime)}</td>
        <td>
          <span class="badge bg-${call.status === 'completed' ? 'success' : call.status === 'missed' ? 'danger' : 'warning'}">
            ${call.status}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-success" onclick="communicationManager.callContact('${call.contact}')" title="Call Back">
            <i class="fas fa-phone"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="communicationManager.messageContact('${call.contact}')" title="Send Message">
            <i class="fas fa-comment"></i>
          </button>
        </td>
      </tr>
    `,
      )
      .join('');
  }

  // ========== NOTIFICATIONS ==========
  renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    container.innerHTML = this.notifications
      .map(
        (notif) => `
      <div class="notification-item ${notif.read ? '' : 'unread'} ${notif.type === 'urgent' ? 'urgent' : ''}" data-type="${notif.type}">
        <div class="notification-icon ${notif.type}">
          <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">
            ${notif.isPinned ? '<i class="fas fa-thumbtack text-warning me-1"></i>' : ''}
            ${notif.title}
          </div>
          <p class="notification-message">${notif.message}</p>
          <span class="notification-time"><i class="far fa-clock"></i> ${this.formatTime(notif.time)}</span>
        </div>
        <div class="notification-actions">
          ${
  !notif.read
    ? `
            <button class="btn btn-sm btn-outline-primary" onclick="communicationManager.markNotificationRead('${notif.id}')" title="Mark as Read">
              <i class="fas fa-check"></i>
            </button>
          `
    : ''
}
          <button class="btn btn-sm btn-outline-danger" onclick="communicationManager.dismissNotification('${notif.id}')" title="Dismiss">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `,
      )
      .join('');
  }

  filterNotifications(filter) {
    this.toggleActive(this.qsa('.filter-btn'), this.qs(`[data-filter="${filter}"]`));

    this.qsa('.notification-item').forEach((notif) => {
      if (filter === 'all' || notif.dataset.type === filter) {
        notif.style.display = 'flex';
      } else {
        notif.style.display = 'none';
      }
    });
  }

  markNotificationRead(notificationId) {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      this.renderNotifications();
      this.updateDashboardStats();
    }
  }

  markAllNotificationsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.renderNotifications();
    this.updateDashboardStats();
    this.showNotification('All notifications marked as read', 'success');
  }

  dismissNotification(notificationId) {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    this.renderNotifications();
    this.updateDashboardStats();
  }

  getNotificationIcon(type) {
    const icons = {
      system: 'cog',
      sales: 'chart-line',
      tasks: 'tasks',
      urgent: 'exclamation-triangle',
    };
    return icons[type] || 'bell';
  }

  // ========== DASHBOARD STATS ==========
  updateDashboardStats() {
    const unreadMessages = this.conversations.filter((c) => c.unread).length;
    const missedCalls = this.callLog.filter((c) => c.status === 'missed').length;
    const activeChats = this.conversations.length;
    const unreadNotifications = this.notifications.filter((n) => !n.read).length;

    // Update the stats cards
    const cards = this.qsa('.card-body h4.mb-0');
    if (cards.length >= 4) {
      cards[0].textContent = unreadMessages;
      cards[1].textContent = missedCalls;
      cards[2].textContent = activeChats;
      cards[3].textContent = unreadNotifications;
    }
  }

  // ========== UTILITIES ==========
  getInitials(name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  callContact(contact) {
    this.showNotification(`Calling ${contact}...`, 'info');

    // Add to call log
    this.callLog.unshift({
      contact,
      phone: '+256 700 123 456',
      type: 'outgoing',
      duration: '0:00',
      dateTime: new Date().toISOString(),
      status: 'calling',
    });
    this.renderCallLog();
  }

  messageContact(contact) {
    // Find or create conversation
    let conv = this.conversations.find((c) => c.name === contact);
    if (!conv) {
      conv = {
        id: Date.now().toString(),
        name: contact,
        online: Math.random() > 0.5,
        lastMessage: { text: '', time: new Date().toISOString() },
        unread: false,
        messages: [],
      };
      this.conversations.unshift(conv);
      this.renderConversationList();
    }
    this.selectConversation(conv.id);
    this.switchTab('messages');
  }

  refresh() {
    this.showNotification('Refreshing...', 'info');
    this.loadUsers();
    this.renderConversationList();
    this.renderCallLog();
    this.renderNotifications();
    this.updateDashboardStats();
    setTimeout(() => this.showNotification('Refreshed successfully', 'success'), 500);
  }

  // ========== INITIAL DATA ==========
  getInitialConversations() {
    return [
      {
        id: '1',
        name: 'John Manager',
        online: true,
        priority: 'high',
        lastMessage: { text: 'Thanks for the quick response!', time: '2025-01-15T10:30:00Z' },
        unread: true,
        unreadCount: 2,
        messages: [
          {
            id: '1',
            text: 'Hello, I need help with the stock report',
            time: '2025-01-15T10:15:00Z',
            sender: 'contact',
          },
          {
            id: '2',
            text: 'Sure, I can help you with that. What specifically do you need?',
            time: '2025-01-15T10:16:00Z',
            sender: 'me',
            read: true,
          },
          {
            id: '3',
            text: 'I need the monthly summary for Maganjo branch',
            time: '2025-01-15T10:25:00Z',
            sender: 'contact',
          },
          {
            id: '4',
            text: 'Thanks for the quick response!',
            time: '2025-01-15T10:30:00Z',
            sender: 'contact',
          },
        ],
      },
      {
        id: '2',
        name: 'Sarah Attendant',
        online: false,
        priority: 'normal',
        lastMessage: { text: 'The invoice looks good', time: '2025-01-15T09:45:00Z' },
        unread: false,
        messages: [
          {
            id: '1',
            text: 'Can you send me the invoice for customer #1234?',
            time: '2025-01-15T09:30:00Z',
            sender: 'contact',
          },
          {
            id: '2',
            text: 'Sure, sending it now via email',
            time: '2025-01-15T09:35:00Z',
            sender: 'me',
            read: true,
          },
          {
            id: '3',
            text: 'The invoice looks good',
            time: '2025-01-15T09:45:00Z',
            sender: 'contact',
          },
        ],
      },
      {
        id: '3',
        name: 'Mike Supervisor',
        online: true,
        priority: 'urgent',
        lastMessage: { text: 'URGENT: Low fuel alert at Matugga!', time: '2025-01-15T11:00:00Z' },
        unread: true,
        unreadCount: 1,
        messages: [
          {
            id: '1',
            text: 'URGENT: Low fuel alert at Matugga!',
            time: '2025-01-15T11:00:00Z',
            sender: 'contact',
          },
        ],
      },
    ];
  }

  getInitialCallLog() {
    return [
      {
        contact: 'John Manager',
        phone: '+256 700 111 222',
        type: 'incoming',
        duration: '5:32',
        dateTime: '2025-01-15T10:15:00Z',
        status: 'completed',
      },
      {
        contact: 'Sarah Attendant',
        phone: '+256 700 333 444',
        type: 'outgoing',
        duration: '12:45',
        dateTime: '2025-01-15T09:30:00Z',
        status: 'completed',
      },
      {
        contact: 'Mike Supervisor',
        phone: '+256 700 555 666',
        type: 'missed',
        duration: '0:00',
        dateTime: '2025-01-15T08:45:00Z',
        status: 'missed',
      },
      {
        contact: 'Admin',
        phone: '+256 700 000 000',
        type: 'incoming',
        duration: '3:15',
        dateTime: '2025-01-14T16:00:00Z',
        status: 'completed',
      },
    ];
  }

  getInitialNotifications() {
    return [
      {
        id: '1',
        type: 'urgent',
        title: '⚠️ Low Stock Alert',
        message: 'Diesel at Maganjo is below 500L threshold',
        time: '2025-01-15T11:30:00Z',
        read: false,
      },
      {
        id: '2',
        type: 'sales',
        title: 'New Sale Recorded',
        message: 'Sale of UGX 2,500,000 recorded for ABC Corporation',
        time: '2025-01-15T10:30:00Z',
        read: false,
      },
      {
        id: '3',
        type: 'tasks',
        title: 'Task Due Soon',
        message: 'Inventory audit task is due in 2 hours',
        time: '2025-01-15T08:00:00Z',
        read: false,
      },
      {
        id: '4',
        type: 'system',
        title: 'System Backup Complete',
        message: 'Daily backup completed successfully at 2:00 AM',
        time: '2025-01-15T02:00:00Z',
        read: true,
      },
      {
        id: '5',
        type: 'sales',
        title: 'Target Achieved! 🎉',
        message: 'Monthly sales target of UGX 50M has been achieved',
        time: '2025-01-14T18:00:00Z',
        read: true,
      },
    ];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.communicationManager = new CommunicationManager();
});
