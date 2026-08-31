class UIUtils {
  static showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.setAttribute('role', 'alert');

    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }

  static showLoading(element) {
    element.innerHTML = '<div class="loading-text"><div class="loading"></div> 로딩 중...</div>';
  }

  static formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  static validateForm(formData) {
    const errors = {};

    if (!formData.title || formData.title.trim() === '') {
      errors.title = '제목을 입력하세요';
    } else if (formData.title.length > 200) {
      errors.title = '제목은 200자 이내여야 합니다';
    }

    if (!formData.content || formData.content.trim() === '') {
      errors.content = '내용을 입력하세요';
    } else if (formData.content.length > 5000) {
      errors.content = '내용은 5000자 이내여야 합니다';
    }

    if (!formData.author || formData.author.trim() === '') {
      errors.author = '작성자명을 입력하세요';
    } else if (formData.author.length > 50) {
      errors.author = '작성자명은 50자 이내여야 합니다';
    }

    return errors;
  }

  static validateComment(content) {
    const errors = {};

    if (!content || content.trim() === '') {
      errors.content = '댓글을 입력하세요';
    } else if (content.length > 500) {
      errors.content = '댓글은 500자 이내여야 합니다';
    }

    return errors;
  }

  static showConfirmDialog(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    messageElement.textContent = message;

    const handleConfirm = () => {
      onConfirm();
      modal.classList.remove('active');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    const handleCancel = () => {
      modal.classList.remove('active');
      if (onCancel) onCancel();
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    modal.classList.add('active');
  }

  static closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  static openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }
}

class PageManager {
  static showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  static scrollToTop() {
    window.scrollTo(0, 0);
  }
}
