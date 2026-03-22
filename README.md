# 💳 SecureWallet

**SecureWallet** is a full-stack digital wallet application built using:

- **Core Java (Backend)** — No database, no frameworks  
- **React Native with Expo (Frontend)**  
- **REST API architecture**  
- **Local in-memory data storage**

The application allows users to:
- Register and log in securely using a PIN  
- Add money from a simulated bank balance  
- Withdraw money back to the bank  
- Transfer money to other users  
- View transaction history  
- Log out safely  
- Use the app smoothly across different device sizes  
This project focuses on **logic, networking, state management, and UI consistency**, without relying on external databases or backend frameworks.

---

# 🚀 Features
## 🔐 Authentication
- User registration with **username + 6-digit PIN**
- Secure login
- Persistent login using **local storage**
- Logout functionality

---

## 💰 Wallet Operations
- Add money from bank balance
- Withdraw money back to bank
- Send money to other users
- Real-time wallet balance updates

---

## 📜 Transactions
- Complete transaction history
- Filters for:
  - Add Money
  - Withdraw
  - Transfers
- Clear success / failure status indicators

---

## 📱 User Experience
- Responsive UI (**phones & tablets**)
- Safe Area support
- Keyboard-aware screens (inputs never hidden)
- Haptic feedback
- Animated transitions
- Clean dark theme UI

---

# 🧠 Architecture Overview
## Backend
- Written in **pure Core Java**
- Uses **Java’s built-in HTTP server**
- Stores users, balances, and transactions **in memory**
- No database (data resets when server restarts)
- REST-style API endpoints

---

## Frontend
- Built using **Expo + React Native**
- Uses **Expo Router** for navigation
- State managed via **React Context**
- Network requests handled using **Fetch API**
- Environment variables used for backend URL

---

# 📂 Environment Configuration (.env)

The `.env` file is already present in the frontend folder.

You only need to edit it before running the app on your own device.

## Example `.env` file:

```env
# 💳 SecureWallet — Setup & Running Guide

## 🔧 Environment Configuration

Create a `.env` file in the frontend directory and add:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8080/api
```

### ⚠️ Important Notes

* Replace `YOUR_LOCAL_IP` with your laptop’s local IP address
  Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:8080/api
```

* ❌ **Do NOT use** `localhost`
* ❌ **Do NOT use** `127.0.0.1`
* ✅ Your **phone and laptop must be on the same Wi-Fi network**

---

# ▶️ How to Run the Project

You need **two terminals**:

* Terminal 1 → Backend
* Terminal 2 → Frontend

---

# 🟦 Terminal 1 — Backend (Core Java)

Navigate to the backend folder:

```bash
cd backend
```

Compile the backend server:

```bash
javac WalletServer.java
```

Start the backend:

```bash
java WalletServer
```

### ✅ Expected Output

```
Wallet Server started
Base URL: http://0.0.0.0:8080
```

This confirms the backend is running successfully.

---

# 🟩 Terminal 2 — Frontend (Expo / React Native)

Navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies (first time only):

```bash
npm install
```

Start the Expo server (clear cache):

```bash
npx expo start -c --lan
```

Open **Expo Go** on your phone and scan the QR code.

---

# 📶 Network Requirements (Very Important)

* Phone and laptop must be on the **same Wi-Fi network**
* Backend must be running **before scanning the QR code**
* `.env` file must contain the **correct local IP**

### If you see a blue error screen:

Stop Expo
Restart backend

Run:

```bash
npx expo start -c
```

---

# 🧪 Testing Flow (Recommended)
Follow this sequence to test the application:
1. Start backend
2. Start frontend
3. Register a new user
4. Log in
5. Add money
6. Send money to another user
7. Withdraw money
8. View transaction history
9. Log out

---

# ⚠️ Important Limitations
* ❌ No database is used
* 📦 All data is stored **in memory**

Restarting the backend clears:
* Users
* Wallet balances
* Transaction history

This is **intentional** and part of the project design.

---

# 🛠 Technologies Used

## Backend
* Java (Core)
* Java HTTP Server
* JSON Handling
* REST API Principles

## Frontend
* React Native
* Expo
* Expo Router
* Context API
* AsyncStorage
* Linear Gradients
* Lucide Icons
* Haptics API

---

# 📱 UI & Responsiveness
* Consistent layout across devices
* Max-width containers prevent tablet stretching
* Scaled fonts and spacing
* Keyboard-safe inputs
* SafeAreaView usage
* No UI distortion on different screen sizes

---

# ✅ Final Notes
This project demonstrates:
* Full-stack integration **without frameworks**
* Clean separation of frontend and backend
* Real-world wallet logic
* Strong UI/UX discipline
* Network-based mobile development
