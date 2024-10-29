
const express = require('express');
const cors = require('cors');
const { Permit } = require('permitio');
const couchbase = require('couchbase');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

class QueryParser {
    // static parseQuery(query) {
    //     // Basic regex patterns for SQL operations
    //     const patterns = {
    //         select: /^\s*SELECT\s+(?:(?!FROM).)*\s+FROM\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
    //         update: /^\s*UPDATE\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
    //         delete: /^\s*DELETE\s+FROM\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
    //         insert: /^\s*INSERT\s+INTO\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i
    //     };

    //     // Determine operation type and extract resource
    //     let operation = '';
    //     let resource = '';

    //     if (patterns.select.test(query)) {
    //         operation = 'read';
    //         const matches = query.match(patterns.select);
    //         resource = matches[3] || matches[2] || matches[1]; // Get the most specific part
    //     } else if (patterns.update.test(query)) {
    //         operation = 'update';
    //         const matches = query.match(patterns.update);
    //         resource = matches[3] || matches[2] || matches[1];
    //     } else if (patterns.delete.test(query)) {
    //         operation = 'delete';
    //         const matches = query.match(patterns.delete);
    //         resource = matches[3] || matches[2] || matches[1];
    //     } else if (patterns.insert.test(query)) {
    //         operation = 'create';
    //         const matches = query.match(patterns.insert);
    //         resource = matches[3] || matches[2] || matches[1];
    //     }

    //     if (!operation || !resource) {
    //         throw new Error('Unable to parse query operation or resource');
    //     }

    //     return {
    //         query,
    //         permission: operation,
    //         resource: resource.toLowerCase()
    //     };
    // }
    static parseQuery(query) {
        // Extract resource from SELECT statement (word before the dot)
        const selectResourcePattern = /SELECT\s+(\w+)\./i;
        
        // Basic regex patterns for SQL operations
        const patterns = {
            select: /^\s*SELECT\s+(?:(?!FROM).)*\s+FROM\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
            update: /^\s*UPDATE\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
            delete: /^\s*DELETE\s+FROM\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i,
            insert: /^\s*INSERT\s+INTO\s+[`]?(\w+)[`]?(?:\.`?(\w+)`?)?(?:\.`?(\w+)`?)?/i
        };

        // Determine operation type and extract resource
        let operation = '';
        let resource = '';

        if (patterns.select.test(query)) {
            operation = 'read';
            const resourceMatch = query.match(selectResourcePattern);
            if (resourceMatch && resourceMatch[1]) {
                resource = resourceMatch[1];
            } else {
                throw new Error('Unable to parse resource from SELECT statement');
            }
        } else if (patterns.update.test(query)) {
            operation = 'update';
            const matches = query.match(patterns.update);
            resource = matches[3] || matches[2] || matches[1];
        } else if (patterns.delete.test(query)) {
            operation = 'delete';
            const matches = query.match(patterns.delete);
            resource = matches[3] || matches[2] || matches[1];
        } else if (patterns.insert.test(query)) {
            operation = 'create';
            const matches = query.match(patterns.insert);
            resource = matches[3] || matches[2] || matches[1];
        }

        if (!operation || !resource) {
            throw new Error('Unable to parse query operation or resource');
        }

        return {
            query,
            permission: operation,
            resource: resource.toLowerCase()
        };
    }

    static validateQuery(query) {
        // Basic security validation
        const disallowedPatterns = [
            /;.*;/i,                 // Multiple statements
            /--/,                    // SQL comments
            /\/\*/,                  // Block comments
            /xp_/i,                  // Extended stored procedures
            /EXECUTE\s+sp_/i,        // Stored procedure execution
            /EXEC\s+sp_/i,           // Stored procedure execution
            /INTO\s+OUTFILE/i,       // File operations
            /LOAD_FILE/i,            // File operations
        ];

        for (const pattern of disallowedPatterns) {
            if (pattern.test(query)) {
                throw new Error('Query contains potentially harmful patterns');
            }
        }

        return true;
    }
}

class TravelQueryChecker {
    constructor() {
        this.permit = new Permit({
            token: process.env.PERMIT_SDK_TOKEN,
            pdp: "https://cloudpdp.api.permit.io"
        });
        
        this.clusterConnStr = 'couchbases://cb.6gj2r4ygxyjrfcgf.cloud.couchbase.com';
        this.username = 'shivay1';
        this.password = 'Shivay1234!';
        this.bucketName = 'travel-sample';
    }

    async init() {
        try {
            this.cluster = await couchbase.connect(this.clusterConnStr, {
                username: this.username,
                password: this.password,
                configProfile: 'wanDevelopment',
            });
            
            this.bucket = this.cluster.bucket(this.bucketName);
            this.collection = this.bucket.defaultCollection();
            console.log('Connected to Couchbase Capella');
        } catch (error) {
            console.error('Couchbase connection error:', error);
            throw error;
        }
    }

    async checkQueryPermission(userId, queryConfig) {
        if (!queryConfig) {
            return { permitted: false, error: 'Invalid query configuration' };
        }

        try {
            const permitted = await this.permit.check(
                String(userId),
                queryConfig.permission,
                {
                    type: queryConfig.resource,
                    tenant: "default"
                }
            );

            return {
                permitted,
                query: queryConfig.query,
                permission: queryConfig.permission,
                resource: queryConfig.resource
            };
        } catch (error) {
            console.error('Permission check error:', error);
            return { permitted: false, error: error.message };
        }
    }

    async executeQuery(userId, rawQuery, params = []) {
        try {
            // Validate query for security
            QueryParser.validateQuery(rawQuery);

            // Parse the query to get permission and resource
            const queryConfig = QueryParser.parseQuery(rawQuery);
            console.log('Parsed query config:', queryConfig);

            const permissionCheck = await this.checkQueryPermission(userId, queryConfig);
            
            if (!permissionCheck.permitted) {
                return { 
                    status: 'not-permitted',
                    error: `User ${userId} is not permitted to execute ${queryConfig.permission} on ${queryConfig.resource}`
                };
            }

            const options = { parameters: params };
            const result = await this.cluster.query(rawQuery, options);
            return { 
                status: 'permitted',
                success: true, 
                results: result.rows,
                metadata: {
                    metrics: result.metrics,
                    profile: result.profile
                }
            };
        } catch (error) {
            console.error('Query execution error:', error);
            return { 
                status: 'error',
                error: error.message 
            };
        }
    }
}

// Initialize the query checker
let queryChecker;

// Routes
app.post('/query', async (req, res) => {
    const { userId, query, params } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'userId and query are required' });
    }

    try {
        const result = await queryChecker.executeQuery(userId, query, params);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/check-permission', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'userId and query are required' });
    }

    try {
        const queryConfig = QueryParser.parseQuery(query);
        const result = await queryChecker.checkQueryPermission(userId, queryConfig);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
async function startServer() {
    try {
        queryChecker = new TravelQueryChecker();
        await queryChecker.init();

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    if (queryChecker && queryChecker.cluster) {
        await queryChecker.cluster.close();
    }
    process.exit(0);
});

startServer();
