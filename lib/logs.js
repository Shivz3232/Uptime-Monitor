/*
 *  Library to store and rotate logs
 */

//  Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory for the logs folder
lib.baseDir = path.join(__dirname + '/../.logs/');

// Append the string to file. Create the file if it doesn't exist
lib.append = function(file, str, callback) {
    // Open the file for appending
    fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing the file that was being appended');
                        }
                    })
                } else {
                    callback('Error appending to the file');
                }
            })
        } else {
            callback('Could not open the file for appending');
        }
    })
}

// List all the logs, and optionally include the compressed logs
lib.list = function(includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, function(err, data) {
        if (!err && data && data.length) {
            const trimmedFileNames = [];
            data.forEach(function(fileName) {
                // add the .log files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                // Add on the .gz files
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });

            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logID, newFileID, callback) {
    const sourceFile = logID + '.log';
    const destFile = newFileID + '.gz.b64';
    
    // Read the source file
    fs.readFile(lib.baseDir + sourceFile, 'utf-8', function(err, inputString) {
        if (!err && inputString) {
            // Compress the data using gzip
            zlib.gzip(inputString, function(err, buffer) {
                if (!err) {
                    // Send the data to the destination file
                    fs.open(lib.baseDir + destFile, 'wx', function(err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            // Write to the destination file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if (!err) {
                                    // Close the destination file
                                    fs.close(fileDescriptor, function(err) {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    });
};

// Decompress the contents of a .gz.base64 file into a string variable
lib.decompress = function (fileID, callback) {
    const fileName = fileID + '.gz.b64'
    fs.readFile(lib.baseDir + fileName, 'utf-8', function(err, str) {
        if (!err && str) {
            // Decompress the data
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if (!err && outputBuffer) {
                    // Callback
                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// Truncate a log file
lib.truncate = function(logID, callback) {
    fs.truncate(lib.baseDir + logID + '.log', 0, function(err) {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
};

// Export the module
module.exports = lib;