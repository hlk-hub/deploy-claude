let currentPostId = null;
let currentEditPostId = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  attachEventListeners();
  loadPostsList();
});

function initializeApp() {
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.remove('active');
    });
  });

  // Modal background click to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Navigation links
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.getAttribute('data-page');
      PageManager.showPage(pageName);
      if (pageName === 'list') {
        loadPostsList();
      } else if (pageName === 'create') {
        resetPostForm();
      }
      PageManager.scrollToTop();
    });
  });
}

function attachEventListeners() {
  // List Page
  document.getElementById('createPostBtn')?.addEventListener('click', () => {
    PageManager.showPage('create');
    resetPostForm();
    PageManager.scrollToTop();
  });

  // Create/Edit Page
  document.getElementById('postForm')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
    PageManager.showPage('list');
    loadPostsList();
  });

  // Detail Page
  document.getElementById('editPostBtn')?.addEventListener('click', () => {
    if (currentPostId) {
      loadPostForEdit(currentPostId);
    }
  });

  document.getElementById('deletePostBtn')?.addEventListener('click', () => {
    if (currentPostId) {
      UIUtils.showConfirmDialog(
        '이 게시글을 삭제하시겠습니까?',
        () => deletePost(currentPostId),
        null
      );
    }
  });

  document.getElementById('backToListBtn')?.addEventListener('click', () => {
    PageManager.showPage('list');
    loadPostsList();
  });

  // Comment
  document.getElementById('commentForm')?.addEventListener('submit', handleCommentSubmit);
}

async function loadPostsList() {
  const listContainer = document.getElementById('postListContainer');
  UIUtils.showLoading(listContainer);

  try {
    const response = await APIClient.getPosts();
    // API가 배열을 직접 반환하거나 data 속성 안에 배열을 반환할 수 있음
    let posts = [];
    if (Array.isArray(response)) {
      posts = response;
    } else if (response.data && Array.isArray(response.data)) {
      posts = response.data;
    }

    if (posts.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">게시글이 없습니다</div>
          <div class="empty-state-text">첫 번째 게시글을 작성해보세요!</div>
          <button class="btn btn-primary" onclick="PageManager.showPage('create'); resetPostForm(); PageManager.scrollToTop();">
            새 게시글 작성
          </button>
        </div>
      `;
      return;
    }

    const html = posts
      .map(post => {
        const author = post.author || post.authorName;
        const views = post.views !== undefined ? post.views : post.viewCount;
        return `
        <div class="post-item" onclick="viewPost(${post.id})">
          <div class="post-item-header">
            <a href="#" class="post-title" onclick="event.stopPropagation(); viewPost(${post.id});">
              ${escapeHtml(post.title)}
            </a>
          </div>
          <div class="post-meta">
            <span>작성자: ${escapeHtml(author)}</span>
            <span>${UIUtils.formatDate(post.createdAt)}</span>
            <span class="post-views">조회수: ${views}</span>
          </div>
        </div>
      `;
      })
      .join('');

    listContainer.innerHTML = html;
  } catch (error) {
    console.error('Error loading posts:', error);
    listContainer.innerHTML = `
      <div class="alert alert-danger">
        게시글을 불러오는 중 오류가 발생했습니다: ${error.message}
      </div>
    `;
  }
}

async function viewPost(postId) {
  const detailContainer = document.getElementById('postDetailContainer');
  UIUtils.showLoading(detailContainer);
  PageManager.showPage('detail');
  PageManager.scrollToTop();

  try {
    currentPostId = postId;
    const response = await APIClient.getPost(postId);
    const post = response.data || response;

    // 필드명 정규화
    post.author = post.author || post.authorName;
    post.views = post.views !== undefined ? post.views : post.viewCount;

    detailContainer.innerHTML = `
      <div class="post-detail">
        <div class="post-detail-header">
          <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
          <div class="post-detail-meta">
            <div class="post-detail-meta-item">
              <span class="post-detail-meta-label">작성자</span>
              <span class="post-detail-meta-value">${escapeHtml(post.author)}</span>
            </div>
            <div class="post-detail-meta-item">
              <span class="post-detail-meta-label">작성일시</span>
              <span class="post-detail-meta-value">${UIUtils.formatDate(post.createdAt)}</span>
            </div>
            <div class="post-detail-meta-item">
              <span class="post-detail-meta-label">조회수</span>
              <span class="post-detail-meta-value">${post.views}</span>
            </div>
          </div>
        </div>

        <div class="post-detail-content">
          ${escapeHtml(post.content)}
        </div>

        <div class="post-detail-actions" id="postActions">
          <button id="editPostBtn" class="btn btn-primary">수정</button>
          <button id="deletePostBtn" class="btn btn-danger">삭제</button>
          <button id="backToListBtn" class="btn btn-secondary">목록으로</button>
        </div>
      </div>

      <div class="comments-section">
        <h2 class="comments-title">댓글</h2>
        <div id="commentFormContainer" class="comment-form">
          <form id="commentForm" onsubmit="handleCommentSubmit(event)">
            <div class="form-group">
              <label class="form-label">작성자명</label>
              <input
                type="text"
                id="commentAuthor"
                class="form-input"
                maxlength="50"
                required
                placeholder="이름을 입력하세요"
              />
            </div>
            <div class="form-group">
              <label class="form-label">댓글 내용</label>
              <textarea
                id="commentContent"
                class="form-textarea"
                maxlength="500"
                required
                placeholder="댓글을 입력하세요"
                style="min-height: 100px;"
              ></textarea>
            </div>
            <button type="submit" class="btn btn-primary">댓글 작성</button>
          </form>
        </div>

        <ul id="commentList" class="comment-list">
          <!-- Comments will be loaded here -->
        </ul>
      </div>
    `;

    // Re-attach event listeners for dynamic buttons
    const editBtn = document.getElementById('editPostBtn');
    const deleteBtn = document.getElementById('deletePostBtn');
    const backBtn = document.getElementById('backToListBtn');
    const commentForm = document.getElementById('commentForm');

    // Clone elements to remove old listeners
    editBtn.replaceWith(editBtn.cloneNode(true));
    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    backBtn.replaceWith(backBtn.cloneNode(true));
    commentForm.replaceWith(commentForm.cloneNode(true));

    // Re-get references after cloning
    const newEditBtn = document.getElementById('editPostBtn');
    const newDeleteBtn = document.getElementById('deletePostBtn');
    const newBackBtn = document.getElementById('backToListBtn');
    const newCommentForm = document.getElementById('commentForm');

    newEditBtn.addEventListener('click', () => {
      if (currentPostId) {
        loadPostForEdit(currentPostId);
      }
    });

    newDeleteBtn.addEventListener('click', () => {
      if (currentPostId) {
        UIUtils.showConfirmDialog(
          '이 게시글을 삭제하시겠습니까?',
          () => deletePost(currentPostId),
          null
        );
      }
    });

    newBackBtn.addEventListener('click', () => {
      PageManager.showPage('list');
      loadPostsList();
    });

    newCommentForm.addEventListener('submit', handleCommentSubmit);

    // Load comments
    await loadComments(postId);
  } catch (error) {
    console.error('Error loading post:', error);
    detailContainer.innerHTML = `
      <div class="alert alert-danger">
        게시글을 불러오는 중 오류가 발생했습니다: ${error.message}
      </div>
      <button class="btn btn-secondary" onclick="PageManager.showPage('list'); loadPostsList();">목록으로</button>
    `;
  }
}

async function loadComments(postId) {
  const commentList = document.getElementById('commentList');

  try {
    const response = await APIClient.getComments(postId);
    let comments = [];
    if (Array.isArray(response)) {
      comments = response;
    } else if (response.data && Array.isArray(response.data)) {
      comments = response.data;
    }

    if (comments.length === 0) {
      commentList.innerHTML = '<div class="text-center text-muted">댓글이 없습니다</div>';
      return;
    }

    commentList.innerHTML = comments
      .map(comment => {
        const author = comment.author || comment.authorName;
        return `
        <li class="comment-item">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(author)}</span>
            <span class="comment-date">${UIUtils.formatDate(comment.createdAt)}</span>
          </div>
          <div class="comment-content">${escapeHtml(comment.content)}</div>
          <button
            class="btn btn-danger btn-sm comment-delete-btn"
            onclick="deleteComment(${comment.id}, event)"
          >
            삭제
          </button>
        </li>
      `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading comments:', error);
    commentList.innerHTML = `<div class="alert alert-danger">댓글 로드 중 오류: ${error.message}</div>`;
  }
}

async function handleCommentSubmit(event) {
  event.preventDefault();

  const author = document.getElementById('commentAuthor').value.trim();
  const content = document.getElementById('commentContent').value.trim();

  const errors = UIUtils.validateComment(content);
  if (Object.keys(errors).length > 0) {
    UIUtils.showAlert(Object.values(errors)[0], 'danger');
    return;
  }

  if (!author) {
    UIUtils.showAlert('작성자명을 입력하세요', 'danger');
    return;
  }

  try {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '작성 중...';

    await APIClient.createComment(currentPostId, {
      author,
      content,
    });

    UIUtils.showAlert('댓글이 작성되었습니다', 'success');
    document.getElementById('commentAuthor').value = '';
    document.getElementById('commentContent').value = '';
    await loadComments(currentPostId);

    submitBtn.disabled = false;
    submitBtn.textContent = '댓글 작성';
  } catch (error) {
    console.error('Error creating comment:', error);
    UIUtils.showAlert(`댓글 작성 중 오류: ${error.message}`, 'danger');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = '댓글 작성';
  }
}

async function deleteComment(commentId, event) {
  event.preventDefault();

  UIUtils.showConfirmDialog(
    '이 댓글을 삭제하시겠습니까?',
    async () => {
      try {
        await APIClient.deleteComment(commentId);
        UIUtils.showAlert('댓글이 삭제되었습니다', 'success');
        await loadComments(currentPostId);
      } catch (error) {
        console.error('Error deleting comment:', error);
        UIUtils.showAlert(`댓글 삭제 중 오류: ${error.message}`, 'danger');
      }
    },
    null
  );
}

async function loadPostForEdit(postId) {
  try {
    const response = await APIClient.getPost(postId);
    const post = response.data || response;

    currentEditPostId = postId;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postContent').value = post.content;
    document.getElementById('postAuthor').value = post.author;

    document.getElementById('formTitle').textContent = '게시글 수정';
    document.getElementById('submitBtn').textContent = '수정';

    PageManager.showPage('create');
    PageManager.scrollToTop();
  } catch (error) {
    console.error('Error loading post for edit:', error);
    UIUtils.showAlert(`게시글을 불러오는 중 오류가 발생했습니다: ${error.message}`, 'danger');
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = {
    title: document.getElementById('postTitle').value.trim(),
    content: document.getElementById('postContent').value.trim(),
    author: document.getElementById('postAuthor').value.trim(),
  };

  const errors = UIUtils.validateForm(formData);
  if (Object.keys(errors).length > 0) {
    UIUtils.showAlert(Object.values(errors)[0], 'danger');
    return;
  }

  try {
    if (currentEditPostId) {
      await APIClient.updatePost(currentEditPostId, formData);
      UIUtils.showAlert('게시글이 수정되었습니다', 'success');
      currentEditPostId = null;
    } else {
      await APIClient.createPost(formData);
      UIUtils.showAlert('게시글이 작성되었습니다', 'success');
    }

    resetPostForm();
    PageManager.showPage('list');
    await loadPostsList();
    PageManager.scrollToTop();
  } catch (error) {
    console.error('Error submitting form:', error);
    UIUtils.showAlert(`오류가 발생했습니다: ${error.message}`, 'danger');
  }
}

async function deletePost(postId) {
  try {
    await APIClient.deletePost(postId);
    UIUtils.showAlert('게시글이 삭제되었습니다', 'success');
    PageManager.showPage('list');
    await loadPostsList();
    PageManager.scrollToTop();
  } catch (error) {
    console.error('Error deleting post:', error);
    UIUtils.showAlert(`게시글 삭제 중 오류: ${error.message}`, 'danger');
  }
}

function resetPostForm() {
  document.getElementById('postForm').reset();
  document.getElementById('formTitle').textContent = '새 게시글 작성';
  document.getElementById('submitBtn').textContent = '작성';
  currentEditPostId = null;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
