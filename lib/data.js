/*
 *   Library for storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)  
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data');

// Write data to file
lib.create = function (dir, file, data, callback) {
    // Open the file for writing
    fs.open(path.join(lib.baseDir, '/' + dir + '/') + file + '.json', 'wx', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert everything to String
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
}

// Read data from a file
lib.read = function (dir, file, callback) {
    fs.readFile(path.join(lib.baseDir, '/' + dir + '/') + file + '.json', 'utf8', function (err, data) {
        if (!err) {
            const parsedData = helpers.parseJSONToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
};

// Updatae the existing data
lib.update = function (dir, file, data, callback) {
    fs.open(path.join(lib.baseDir, '/' + dir + '/') + file + '.json', 'r+', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert everuthing to a string
            const stringData = JSON.stringify(data);

            // Clear the contents of the file
            fs.ftruncate(fileDescriptor, function (err) {
                if (!err) {
                    // Write the new data to the file
                    fs.writeFile(fileDescriptor, stringData, function (err) {
                        if (!err) {
                            fs.close(fileDescriptor, function (err) {
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
    });
};

// Delete a file
lib.delete = function (dir, file, callback) {
    // Unlink the file
    fs.unlink(path.join(lib.baseDir, '/' + dir + '/') + file + '.json', function (err) {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    })
}

// List all the files in a directory
lib.list = function(dir, callback) {
    fs.readdir(lib.baseDir + '/' + dir + '/', function (err, data) {
        if (!err && data && data.length > 0) {
            const trimmedFilenames = [];
            data.forEach(function(fileName) {
                trimmedFilenames.push(fileName.replace('.json', ''))
            });
            callback(false, trimmedFilenames)
        }else {
            callback(err, data)
        }
    })
}

// Export the module
module.exports = lib;