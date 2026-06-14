# Mini ERP System

An Odoo-inspired, full-stack enterprise resource planning (ERP) system customized for furniture manufacturing business models (e.g., *Shiv Furniture Works*). It features rich role-based authentication, real-time inventory management, sales and purchase order workflows, Bill of Materials (BoM) configuration, manufacturing execution, audit logging, and WebSockets-based updates.

---

## 🚀 Key Features

*   **Enforced Role-Based Access Controls (RBAC)**: Supports roles with specific views and privileges:
    *   *Admin* (Universal access)
    *   *Business Owner* (Universal overview & auditing)
    *   *Sales User* (Sales order processing)
    *   *Purchase User* (Vendors & procurement)
    *   *Manufacturing User* (BOM & manufacturing execution)
    *   *Inventory Manager* (Stock management & ledger auditing)
*   **Visual Manual Authentication**: Structured login requiring manual role selection in tandem with username and password verification.
*   **Inventory Stock & Ledger**: Detailed real-time tracking of products, reserved quantities, and free-to-use stock. Includes a read-only immutable *Stock Ledger* auditing every movement.
*   **Sales & Purchase Workflows**: Manage complete lifecycles from raising purchase/sales orders to executing delivery and receiving items.
*   **Bill of Materials (BoM) & Manufacturing Orders**: Build hierarchical recipes for finished goods, generate production orders, and automatically calculate and deduct raw component inventory upon order confirmation.
*   **Audit Logging**: Track administrative and business operations securely.
*   **Real-time Alerts**: Built-in WebSocket notifications for cross-role collaboration.

---

## 📂 Project Structure

```text
Mini_ERP_SYSTEM/
├── client/                 # Frontend React client (Vite, TailwindCSS)
│   ├── src/
│   │   ├── components/     # Shared layout/design components
│   │   ├── context/        # Auth, socket, and toast contexts
│   │   ├── pages/          # Feature pages (Sales, BoM, Stock, etc.)
│   │   └── services/       # API connection client
│   └── .env.example        # Frontend env variables template
│
└── server/                 # Backend Node.js API server (Express, MongoDB)
    ├── config/             # DB connection, Socket.io, and seeding scripts
    ├── controllers/        # Business logic controllers
    ├── middleware/         # Auth, role-checking, and error handling
    ├── models/             # Mongoose schemas (User, Product, StockLedger, etc.)
    ├── routes/             # REST API routes
    └── .env.example        # Server env variables template
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a remote URI string)

### 1. Clone & Install Dependencies
Run the installation script from the root directory to set up both client and server:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy the template files to `.env` in both folders and customize the parameters:

#### Server Configuration
Create `server/.env`:
```bash
cp server/.env.example server/.env
```
*(Configure `PORT`, `MONGO_URI`, and `JWT_SECRET` inside the file)*

#### Client Configuration
Create `client/.env`:
```bash
cp client/.env.example client/.env
```
*(Configure `VITE_API_URL` and `VITE_WS_URL` to match your server connection endpoint)*

### 3. Seed Database
Load the initial demo products, component recipes, and default user accounts:
```bash
npm run seed
```

### 4. Start Development Servers
Spin up both the client and server concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to access the ERP dashboard.

---

## 🔐 Default Credentials
You can log in manually with the following username/password combinations:

| Username | Password | Enforced Selected Role |
| :--- | :--- | :--- |
| `admin` | `password123` | `Admin` |
| `sales` | `password123` | `Sales User` |
| `purchase` | `password123` | `Purchase User` |
| `manufacturing` | `password123` | `Manufacturing User` |
| `inventory` | `password123` | `Inventory Manager` |
| `owner` | `password123` | `Business Owner` |

---

## 📝 Technologies Used
- **Frontend**: React, Vite, Tailwind CSS, Lucide icons, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT authentication, Socket.io.
