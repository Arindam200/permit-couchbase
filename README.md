# Couchbase RBAC Integration with Permit.io 🔐

A demonstration of implementing Role-Based Access Control (RBAC) for Couchbase N1QL queries using Permit.io. This project shows how to build a secure query system that validates user permissions before executing database operations.


## 🛠️ Prerequisites

- Node.js (v14 or higher)
- Couchbase Capella/Server
- Permit.io Account

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Arindam200/permit-couchbase
cd couchbase-permit-rbac
```

### 2. Set Up Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
PERMIT_SDK_TOKEN=your_permit_sdk_token
CB_STRING=your_couchbase_connection_string
CB_USERNAME=your_couchbase_username
CB_PASSWORD=your_couchbase_password
```

### 3. Install Dependencies

Backend server:
```bash
# Install backend dependencies
cd backend
npm install
```
Frontend:
```
# Install frontend dependencies
npm install
```

### 4. Configure Permit.io

1. Create a Permit.io account
2. Set up the following resources:
   - Route
   - Airport
   - Hotel
   - Airline

3. Create the following roles:
   - Traveler
   - Travel Agent
   - Airline Staff
   - Hotel Staff

4. Configure permissions in the Policy Editor

### 5. Run the Application

```bash
# Start the backend server
cd backend
npm start

# Start the frontend application
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
├── backend/
│   ├── server.js          # Express server and main logic
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # Main React component
│   │   └── ...
│   └── package.json
└── README.md
```

## 🔍 Usage

1. Access the frontend application
2. Enter a N1QL query in the query input field
3. Provide a user email address
4. Click "Check Permissions"
5. View the results or permission denial message

Example Query:
```sql
SELECT * FROM `travel-sample` WHERE type = "hotel"
```

## 🔒 Security Features

- Query parsing and validation
- Permission-based query modification
- Role-based access control

## 💬 Support

For questions and support, please join our [Slack community](https://io.permit.io/permitslack).

## 📚 Additional Resources

- [Permit.io Documentation](https://docs.permit.io)
- [Couchbase Documentation](https://docs.couchbase.com)
- [RBAC vs ABAC Guide](https://www.permit.io/blog/rbac-vs-abac)
- [Adding ABAC to Your Application](https://www.permit.io/abac)
