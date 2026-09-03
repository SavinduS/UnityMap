# 🛠️ UnityMap Backend Service

Node.js, Express, and MongoDB backend service for UnityMap.

## 📁 Environment Setup (`.env`)

The database connection parameters are defined in `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<db_user>:<db_password>@cluster0.ue1tazd.mongodb.net/UnityMap?appName=Cluster0
DB_NAME=UnityMap
```

> ⚠️ Never commit `.env` containing credentials to version control. Reference `.env.example` as a template.

## 🚀 How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Test MongoDB Connection
```bash
npm run test:db
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```
