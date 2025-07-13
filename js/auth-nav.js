// js/auth-nav.js
console.log('auth-nav.js script loaded');

// Test sessionStorage
console.log('All sessionStorage items:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  console.log(key + ':', sessionStorage.getItem(key));
}

// Function to update login/logout button
function updateLoginButton() {
  console.log('updateLoginButton called');
  const loginNavBtn = document.getElementById('loginNavBtn');
  console.log('loginNavBtn found:', !!loginNavBtn);
  
  if (!loginNavBtn) {
    console.log('No loginNavBtn found, exiting');
    return;
  }

  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  const userEmail = sessionStorage.getItem('userEmail');
  console.log('isLoggedIn:', isLoggedIn);
  console.log('userEmail:', userEmail);
  
  if (isLoggedIn) {
    console.log('User is logged in, changing to logout');
    loginNavBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    loginNavBtn.href = "#";
    loginNavBtn.onclick = (e) => {
      e.preventDefault();
      console.log('Logout clicked');
      sessionStorage.clear();
      window.location.href = '/index.html';
    };
  } else {
    console.log('User is not logged in, keeping as login');
    loginNavBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    loginNavBtn.href = '/login.html';
    loginNavBtn.onclick = null;
  }
}

// Run immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLoginButton);
} else {
  updateLoginButton();
}

// Also run after a short delay to ensure everything is loaded
setTimeout(updateLoginButton, 100); 