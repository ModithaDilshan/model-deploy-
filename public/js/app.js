// App state management
const AppState = {
  currentView: 'landing',
  isAuthenticated: false,
  user: null,
  token: null,

  init() {
    // Check if user has a stored token
    this.token = localStorage.getItem('authToken');
    if (this.token) {
      this.verifyToken();
    } else {
      this.render();
    }
  },

  async verifyToken() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = true;
        this.user = data.user;
        this.currentView = 'builder';
      } else {
        // Token invalid, clear it
        localStorage.removeItem('authToken');
        this.token = null;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('authToken');
      this.token = null;
    }
    this.render();
  },

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;
    localStorage.setItem('authToken', token);
  },

  logout() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    localStorage.removeItem('authToken');
    this.navigateTo('landing');
  },

  navigateTo(view) {
    this.currentView = view;
    this.render();
  },

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    // Clear current content
    app.innerHTML = '';

    // Render appropriate view
    switch (this.currentView) {
      case 'landing':
        window.LandingView.render(app);
        break;
      case 'builder':
        if (this.isAuthenticated) {
          window.BuilderView.render(app);
        } else {
          this.currentView = 'landing';
          window.LandingView.render(app);
        }
        break;
      default:
        window.LandingView.render(app);
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
});

// Export to window for global access
window.AppState = AppState;
