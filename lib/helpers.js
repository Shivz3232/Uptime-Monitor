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
    } else {
        callback('Given parameters were missing or invalid')
    }
}

// Get the string content of a template
helpers.getTemplate = function (templateName, data, callback) {
    // Validate the input parameters
    templateName = typeof (templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof (data) == 'object' && data !== null ? data : {};
    if (templateName && data) {
        const templateDir = path.join(__dirname, '/../templates/');
        fs.readFile(templateDir + templateName + '.html', 'utf-8', function (err, str) {
            if (!err && str && str.length > 0) {
                // Do interpolation on the string
                let finalString = helpers.interpolate(str, data);
                callback(false, finalString);
            } else {
                callback('No template could be found');
            }
        });
    } else {
        callback('A valid template name was not specifed');
    }
}

// Add the universal header and footer to the a string, and pass provided data object to the head and footer for interpolation
helpers.addUniversalTemplates = function (str, data, callback) {
    // Validate the input parameters
    str = typeof (str) == 'string' && str.length > 0 ? str : '';
    data = typeof (data) == 'object' && data !== null ? data : {};

    // Get the header
    helpers.getTemplate('_header', data, function(err, headerString) {
        if (!err && headerString) {
            // Get the footer
            helpers.getTemplate('_footer', data, function(err, footerString) {
                if (!err && footerString) {
                    // Add them all together
                    let fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback('Could not find hte footer template');
                }
            })
        } else {
            callback('Coudl not find the header template');
        }
    })
}

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function (str, data) {
    // Validate the input parameters
    str = typeof (str) == 'string' && str.length > 0 ? str : '';
    data = typeof (data) == 'object' && data !== null ? data : {};

    // Add the template globals to the data object, prepending their key name with "global"
    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }

    // For each key in hte data object, insert its value into the string at the corresponding place holder
    for (let key in data) {
        if (data.hasOwnProperty(key) && typeof (data[key]) == 'string') {
            let replace = data[key];
            let find = '{' + key + '}';
            str = str.replace(find, replace);
        }
    }
    return str;
}

// Get the contents of a static (public) asset
helpers.getStaticAsset = function (fileName, callback) {
    fileName = typeof (fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if (fileName) {
        let publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir + fileName, function (err, data) {
            if (!err && data) {
                callback(false, data)
            } else {
                callback('No file could be found');
            }
        })
    } else {
        callback('A valid file name was not specified');
    }
}


// Export the module
module.exports = helpers;