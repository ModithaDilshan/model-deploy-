// Authentication Modal
const AuthModal = {
  isOpen: false,
  mode: 'login', // 'login' or 'register'

  show() {
    this.isOpen = true;
    this.render();
  },

  hide() {
    this.isOpen = false;
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
  },

  switchMode(mode) {
    this.mode = mode;
    this.render();
  },

  render() {
    // Remove existing modal if any
    const existingModal = document.getElementById('authModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-overlay"></div>
      <div class="auth-modal-content">
        <button class="auth-modal-close">&times;</button>
        
        <div class="auth-modal-header">
          <h2>${this.mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>${this.mode === 'login' ? 'Login to continue building' : 'Sign up to get started'}</p>
        </div>

        <form id="authForm" class="auth-form">
          ${this.mode === 'register' ? `
            <div class="form-group">
              <label for="authName">Name (optional)</label>
              <input type="text" id="authName" placeholder="Your name">
            </div>
          ` : ''}
          
          <div class="form-group">
            <label for="authEmail">Email</label>
            <input type="email" id="authEmail" placeholder="your@email.com" required>
          </div>

          <div class="form-group">
            <label for="authPassword">Password</label>
            <input type="password" id="authPassword" placeholder="••••••••" required minlength="6">
          </div>

          <div id="authError" class="auth-error" style="display: none;"></div>

          <button type="submit" class="auth-submit-btn">
            ${this.mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <div class="auth-switch">
          ${this.mode === 'login' 
            ? `Don't have an account? <a href="#" id="switchToRegister">Register</a>`
            : `Already have an account? <a href="#" id="switchToLogin">Login</a>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachEventListeners();

    // Focus on email input
    setTimeout(() => {
      const emailInput = document.getElementById('authEmail');
      if (emailInput) emailInput.focus();
    }, 100);
  },

  attachEventListeners() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    // Close button
    const closeBtn = modal.querySelector('.auth-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Overlay click
    const overlay = modal.querySelector('.auth-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.hide());
    }

    // Form submit
    const form = document.getElementById('authForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Mode switch
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
      switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchMode('register');
      });
    }

    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchMode('login');
      });
    }
  },

  async handleSubmit() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const nameInput = document.getElementById('authName');
    const errorDiv = document.getElementById('authError');
    const submitBtn = document.querySelector('.auth-submit-btn');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput ? nameInput.value.trim() : '';

    // Basic validation
    if (!email || !password) {
      this.showError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    // Disable submit button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = this.mode === 'login' ? 'Logging in...' : 'Registering...';
    }

    try {
      const endpoint = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = this.mode === 'login' 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Success! Store token and navigate to builder
      window.AppState.setAuth(data.token, data.user);
      this.hide();
      window.AppState.navigateTo('builder');
    } catch (error) {
      console.error('Auth error:', error);
      this.showError(error.message || 'Authentication failed');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = this.mode === 'login' ? 'Login' : 'Register';
      }
    }
  },

  showError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  },

  hideError() {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }
};

// Export to window
window.AuthModal = AuthModal;
