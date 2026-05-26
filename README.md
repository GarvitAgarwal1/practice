# She Can Foundation

A beautifully designed, custom full-stack website built for the She Can Foundation. It features a modern, responsive user interface with a custom pink/white theme and a fully functional backend system for authentication and securely receiving contact messages.

## ✨ Features

* **Modern UI**: Clean, glassmorphism-inspired design with responsive layouts and custom typography (Outfit font).
* **Authentication System**: Secure user sign-up and login using built-in Node.js crypto hashing and session management.
* **Smart UI States**: The contact form is dynamically locked behind a translucent overlay for unauthenticated users, seamlessly unlocking upon login.
* **Dynamic Forms**: Auto-expanding message textareas that gracefully handle large inputs with maximum height constraints.
* **Rate Limiting**: Backend logic strictly enforces a 1-message-per-day rule tied to the user's authenticated account to prevent spam.

## 🛠 Tech Stack

Built natively without heavy external frameworks to ensure maximum performance and simplicity:

* **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+)
* **Backend**: Node.js (Built-in `http`, `fs`, `path`, and `crypto` modules)
* **Database**: SQLite (Node v22.5+ built-in `node:sqlite`)

## 🚀 Running Locally

Because this project utilizes the brand-new built-in SQLite engine, there are no external NPM dependencies to install!

1. Ensure you have Node.js (v22.5.0 or newer) installed on your machine.
2. Open your terminal in the project directory.
3. Start the server:
   ```bash
   node server.js
   ```
4. Open your web browser and navigate to: [http://localhost:3000](http://localhost:3000)

## 🔒 Security

* User passwords are mathematically hashed with a unique salt using `pbkdf2Sync` before being stored in the database.
* The local SQLite database (`database.sqlite`) is explicitly ignored by Git to prevent sensitive user data from being uploaded to public repositories.
