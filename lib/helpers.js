/*
 *   Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJSONToObject = function (str) {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (err) {
        return err;
    }
};

// Create a string of random alpha numeric values of a given length
helpers.createRandomString = function (strLength) {
    strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the characters that could go into the string
        const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

        // Start the final string
        let str = '';
        for (let i = 0; i < strLength; i++) {
            // Get a random character from the possibleCharacter string
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            // Append this random character to the final string
            str += randomCharacter;
        }

        // Return the final string
        return str;
    } else {
        return false;
    }
};

// Send SMS via Twilio  
helpers.sendTwilioSms = function(phone, msg, callback) {
    // Validate paratmeters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof (msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if (phone && msg) {
        // Cofigure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+91'+phone,
            'Body': msg
        };

        // Stirgify the payload
        const stringPayload = querystring.stringify(payload);

        // Configure the https request
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-length': Buffer.byteLength(stringPayload)
            }
        };

        // Intantiate the request object
        const req = https.request(requestDetails, function(res) {
    
            // Grab the status of the response
            const status = res.statusCode;
            // Callback successfull if the request went through
            if (status == 200 || status == 201) {
                callback(false);
            }else {
                callback('Status code returned was '+ status);
            }
        });

        // Bind the error event so it dosen't get thrown
        req.on('error', function(err) {
            callback(err);
        });

        // Add the payload
        req.write(stringPayload);

        // req.end
        req.end();
    }else {
        callback('Given parameters were missing or invalid')
    }
}

// Get the string content of a template
helpers.getTemplate = function (templateName, callback) {
    templateName = typeof (templateName) == 'string' && templateName.length > 0 ? templateName : false;
    if (templateName) {
        const templateDir = path.join(__dirname, '/../templates/');
        fs.readFile(templateDir + templateName + '.html', 'utf-8', function (err, str) {
            if (!err && str && str.length > 0) {
                callback(false, str);
            } else {
                callback('No template could be found');
            }
        })
    } else {
        callback('A valid template name was not specifed');
    }
}

// Export the module
module.exports = helpers;