const express = require('express');
const cors = require('cors');
const { Permit } = require('permitio');
const couchbase = require('couchbase');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['POST'], 
    allowedHeaders: ['Content-Type'], 
  }));

// Initialize Permit client
const permit = new Permit({
    token: process.env.PERMIT_SDK_TOKEN,
    pdp: "https://cloudpdp.api.permit.io"
});

let cluster;

// Function to parse N1QL query
function parseN1QLQuery(query) {
    const selectRegex = /SELECT\s+(.+?)\s+FROM/i;
    const fromRegex = /FROM\s+(.+?)(\s+WHERE|\s*$)/i;
    const whereRegex = /WHERE\s+(.+)/i;

    const selectMatch = query.match(selectRegex);
    const fromMatch = query.match(fromRegex);
    const whereMatch = query.match(whereRegex);

    const selectClause = selectMatch ? selectMatch[1].trim() : '';
    const fromClause = fromMatch ? fromMatch[1].trim() : '';
    const whereClause = whereMatch ? whereMatch[1].trim() : '';

    return { selectClause, fromClause, whereClause };
}

// Function to check permissions using Permit.io
async function checkPermissions(user, action, resource) {
    try {
        const allowed = await permit.check(user, action, resource);
        return allowed;
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
}

// Function to modify query based on permissions
async function modifyQueryBasedOnPermissions(selectClause, fromClause, whereClause, user) {
    const allowed = await checkPermissions(user, 'read', fromClause);
    if (!allowed) {
        throw new Error('User does not have permission to access this resource');
    }

    const columns = selectClause.split(',').map(col => col.trim());
    const allowedColumns = [];

    for (const column of columns) {
        const columnAllowed = await checkPermissions(user, 'read', `${fromClause}.${column}`);
        if (columnAllowed) {
            allowedColumns.push(column);
        }
    }

    const modifiedSelectClause = allowedColumns.join(', ');
    let modifiedQuery = `SELECT ${modifiedSelectClause} FROM ${fromClause}`;
    if (whereClause) {
        modifiedQuery += ` WHERE ${whereClause}`;
    }

    return modifiedQuery;
}

// Main function to handle N1QL query
async function handleN1QLQuery(query, user) {
    const { selectClause, fromClause, whereClause } = parseN1QLQuery(query);

    console.log('selectClause', selectClause);

    try {
        const modifiedQuery = await modifyQueryBasedOnPermissions(selectClause, fromClause, whereClause, user);
        console.log('Modified query:', modifiedQuery);

        // Execute the modified query
        const result = await cluster.query(modifiedQuery);
        return result.rows;

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

// Middleware to parse JSON bodies
app.use(express.json());

// Route to handle N1QL queries
app.post('/query', async (req, res) => {
    const { query, user } = req.body;

    if (!query || !user) {
        return res.status(400).json({ error: 'Query and user are required' });
    }

    try {
        const results = await handleN1QLQuery(query, user);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connect to Couchbase and start the server
async function startServer() {
    const clusterConnStr = 'couchbases://cb.6gj2r4ygxyjrfcgf.cloud.couchbase.com';
    const username = 'shivay1';
    const password = 'Shivay1234!';
    const bucketName = 'travel-sample';

    try {
        cluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
            configProfile: 'wanDevelopment',
        });

        const bucket = cluster.bucket(bucketName);
        const collection = bucket.defaultCollection();

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error connecting to Couchbase:', error);
        process.exit(1);
    }
}

startServer();