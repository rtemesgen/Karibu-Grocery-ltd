/* eslint-disable class-methods-use-this */
(function utilsModule() {
  class BaseManager {
    qs(selector, root = document) {
      return root.querySelector(selector);
    }

    qsa(selector, root = document) {
      return Array.from(root.querySelectorAll(selector));
    }

    onReady(callback) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
      } else {
        callback();
      }
    }

    toggleActive(elements, activeElement, className = 'active') {
      elements.forEach((el) => el.classList.remove(className));
      if (activeElement) {
        activeElement.classList.add(className);
      }
    }

    formatTime(timestamp) {
      return BaseManager.formatTime(timestamp);
    }

    formatDateTime(timestamp) {
      return BaseManager.formatDateTime(timestamp);
    }

    formatDate(dateString) {
      return BaseManager.formatDate(dateString);
    }

    showNotification(message, type = 'info') {
      return BaseManager.showNotification(message, type);
    }

    loadFromStorage(key, defaultValue = null) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
      } catch (e) {
        console.warn(`Failed to load ${key}`, e);
        return defaultValue;
      }
    }

    saveToStorage(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn(`Failed to save ${key}`, e);
        return false;
      }
    }

    static formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    static formatDateTime(timestamp) {
      return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    static formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    static showNotification(message, type = 'info') {
      const icons = {
        success: 'check',
        error: 'times',
        warning: 'exclamation',
        info: 'info',
      };
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i> ${message}`;
      document.body.appendChild(notification);
      setTimeout(() => notification.classList.add('show'), 100);
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 3000);
    }
  }

  window.BaseManager = BaseManager;
  window.utils = {
    formatTime: BaseManager.formatTime,
    formatDateTime: BaseManager.formatDateTime,
    formatDate: BaseManager.formatDate,
    showNotification: BaseManager.showNotification,
  };
}());
