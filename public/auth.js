// The hardcoded admin password
const ADMIN_PASSWORD = 'adminpass';

// Handle form submission
document.getElementById('auth-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('error-message');

  // Check if password is correct
  if (password === ADMIN_PASSWORD) {

    // Store authentication status in localstorage
    localStorage.setItem("isAuthenticated", "true");
    window.location.href = "staff.html";

    // Redirect to staff page
    window.location.href = 'staff.html';
  } else {
    // Show error message
    errorMessage.style.display = 'block';

    // Clear password field
    document.getElementById('password').value = '';

    // Hide error message after 3 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 3000);
  }
});