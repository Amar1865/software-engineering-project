
if (sessionStorage.getItem("loggedIn") === "yes") {
  location.replace("app.html");
}

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  if (username === "") { error.textContent = "Enter your username."; return; }
  if (password.length < 4) { error.textContent = "Password must be at least 4 characters."; return; }

  sessionStorage.setItem("loggedIn", "yes");   // remember the login for this browser tab
  location.replace("app.html");                // open the main page
});