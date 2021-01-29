/*
 * Create and export configuration variables
 */

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'ENV_NAME': 'Staging',
    'hashingSecret': 'V_z3uPXvQ#V=fUF_',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC9785996247ee756f82370ee16b0ee1ad',
        'authToken': '09d796c9f7b4e7cd456938c718348627',
        'fromPhone': '+18146899967'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'NotARealCompany Inc.',
        'yearCreated': '2021',
        'baseUrl': 'http://localhost:3000/'
    }
};

// Produntion environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'ENV_NAME': 'Production',
    'hashingSecret': 'b25!bNyJbz&#?47W',
    'maxChecks': 5,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'NotARealCompany Inc.',
        'yearCreated': '2021',
        'baseUrl': 'http://localhost:5000/'
    }
};

// Testing environment
environments.testing = {
    'httpPort': 4000,
    'httpsPort': 4001,
    'ENV_NAME': 'Testing',
    'hashingSecret': 'b25!bNyJbz&#?47W',
    'maxChecks': 5,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'NotARealCompany Inc.',
        'yearCreated': '2021',
        'baseUrl': 'http://localhost:4000/'
    }
};

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if the currnet environment is one of the environments defined above, if not, default to staging
const environmentToExport = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;