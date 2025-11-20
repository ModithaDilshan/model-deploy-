// Landing page view
const LandingView = {
  render(container) {
    container.innerHTML = `
      <div class="landing-page">
        <div class="landing-header">
          <button id="headerLoginBtn" class="header-login-btn">Login</button>
        </div>
        
        <div class="landing-content">
          <h1 class="landing-title">gg.play</h1>
          <p class="landing-tagline">BUILD YOUR METAVERSE IN NO TIME</p>
          <button id="buildNowBtn" class="build-now-btn">Build Now</button>
          
          <div class="social-icons">
            <a href="#" class="social-icon" aria-label="Twitter">T</a>
            <a href="#" class="social-icon" aria-label="LinkedIn">L</a>
            <a href="#" class="social-icon" aria-label="Contact">C</a>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  },

  attachEventListeners() {
    const buildNowBtn = document.getElementById('buildNowBtn');
    const headerLoginBtn = document.getElementById('headerLoginBtn');

    if (buildNowBtn) {
      buildNowBtn.addEventListener('click', () => {
        window.AuthModal.show();
      });
    }

    if (headerLoginBtn) {
      headerLoginBtn.addEventListener('click', () => {
        window.AuthModal.show();
      });
    }
  }
};

// Export to window
window.LandingView = LandingView;
