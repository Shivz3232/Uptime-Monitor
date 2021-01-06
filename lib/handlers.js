/*
 *   These are the requets handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
var handlers = {};

// Ping handler
handlers.ping = function (data, callback) {
    callback(200);
};

// Not found handler
handlers.notFound = function (data, callback) {
    callback(404);
};

/*
 *  HTML Handlers
 *
 */

//  Index Handler
handlers.index = function (data, callback) {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Read in a template as a string
        helpers.getTemplate('index', function (err, str) {
            if (!err && str) {
                callback(200, str, 'html');
            } else {
                callback(500, undefined, 'html');
            }
        });
    } else {
        callback(405, undefined, 'html');
    }
};

/*
 *  JSON API Handlers
 *
 */

// Users handler
handlers.users = function (data, callback) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        // 405 indicates method not allowed
        callback(405)
    }
};

// Container for user submethods
handlers._users = {};

// User - Post
// Required data: First Name, Last Name, Phone, Password, tosAgreement
// optional data: none
handlers._users.post = function (data, callback) {
    // Check if all the fields are filled out
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, function (err, data) {
            if (err) {
                // Hash the password
                const hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': tosAgreement
                    };

                    // Store the user
                    _data.create('users', phone, userObject, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, {
                                'Error': 'Could not create new user'
                            })
                        }
                    })
                } else {
                    callback(500, {
                        'Error': 'Could not hash the user\'s password'
                    });
                }
            } else {
                // User already exists
                callback(400, {
                    'Error': 'A user with that phone number already exists'
                });
            }
        });
    } else {
        callback(400, {
            'Error': 'Missing required fields'
        });
    }
};

// User - Get
// Required data: phone
// Optional data: none
handlers._users.get = function (data, callback) {
    // Check if the provied phone number is valid
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the given phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (err, data) {
                    if (!err && data) {
                        // Remove the hashed password form the user object before returning it to the requester
                        delete data['hashedPassword'];
                        callback(200, data);
                    } else {
                        callback(400)
                    }
                });
            } else {
                callback(403, {
                    'Error': 'Missing or Invalid token.'
                });
            }
        })
    } else {
        callback(400, {
            'Error': 'Missing requred field'
        });
    }
};

// User - Put
// Required data: phone
// Optional data: firstName, lastName, password (at least on must be specified)
handlers._users.put = function (data, callback) {
    // Check for the required field
    const phone = typeof (data.payload.phone) == 'string' ? data.payload.phone.trim() : false;

    // Check for the optional fields
    const firstName = typeof (data.payload.firstName) == 'string' ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' ? data.payload.lastName.trim() : false;
    const password = typeof (data.payload.password) == 'string' ? data.payload.password.trim() : false;

    // Error if the phone is invalid
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Error if nothing is there to update
                if (firstName || lastName || password) {
                    // Lookup the user
                    _data.read('users', phone, function (err, userData) {
                        if (!err && userData) {
                            // Update the fields necessary
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, {
                                        'Error': 'Could not update the user'
                                    });
                                }
                            });
                        } else {
                            callback(400, {
                                'Error': 'The specified user doesn\'t exist'
                            });
                        }
                    })
                } else {
                    callback(400, {
                        'Error': 'Missing fields to update'
                    });
                }
            } else {
                callback(403, {
                    'Error': 'Missing or Invalid token.'
                });
            }
        });
    } else {
        callback(400, {
            'Error': 'Missing required field'
        });
    }
};

// User - Delete
// Required fields: phone
handlers._users.delete = function (data, callback) {
    // Check if the phone number is valid
    const phone = typeof (data.queryStringObject.phone) == 'string' ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, function (err, userData) {
                    if (!err && userData) {
                        _data.delete('users', phone, function (err) {
                            if (!err) {
								// Delete each of the checks created by the user
								const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
								const checksToDelete = userChecks.length;
								if (checksToDelete > 0) {
									let checksDeletd = 0;
									let deletionError = false;

									// Loop through the checks
									userChecks.forEach(function(checkID) {
										// Delete the check
										_data.delete('checks', checkID, function (err) {
											if (err) {
												deletionError = true;
											}
											checksDeletd++;
											if (checksDeletd == checksToDelete) {
												if (!deletionError) {
													callback(200);
												} else {
													callback(500, {'Error': 'Errors encountered while deleting all the checks'});
												}
											}
											
										})
									})
								}else {
									callback(200);
								}
                            } else {
                                callback(500, {
                                    'Error': 'Could not delete the specified user'
                                })
                            }
                        });
                    } else {
                        callback(400, {
                            'Error': 'Could not find the specified user'
                        })
                    }
                });
            } else {
                callback(403, {
                    'Error': 'Missing or Invalid token.'
                });
            }
        });
    } else {
        callback(400, {
            'Error': 'Missing required fields'
        });
    }
};

// Tokens
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405)
    }
};

// Container for all the token methods
handlers._tokens = {};

// Tokens-post
// Required data: Phone, passowrd
// Optionla data: none
handlers._tokens.post = function (data, callback) {
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        // Look up the user who matches that phone number
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                // Hash the sent password and compare it with the password stored in the userData
                // Hash the password
                const hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // If valid create a new token with a random name. Set expiration date to 1 hour in the future
                    const tokenID = helpers.createRandomString(20);
                    if (tokenID) {
                        const expires = Date.now() + 3600000;
                        const tokenObject = {
                            'phone': phone,
                            'tokenID': tokenID,
                            'expires': expires
                        };

                        // Store the token
                        _data.create('tokens', tokenID, tokenObject, function (err) {
                            if (!err) {
                                callback(200, tokenObject);
                            } else {
                                callback(400, {
                                    'Error': 'Could not create the new token'
                                });
                            }
                        });
                    } else {
                        callback(500, {'Error': 'Couldn\'t create a token'});
                    }
                } else {
                    callback(400, {
                        'Error': 'Password did not match the specified user\'s password.'
                    });
                }
            } else {
                callback(400, {
                    'Error': 'Could not find the specified user'
                })
            }
        })
    } else {
        callback(400, {
            'Error': 'Missing required fields'
        });
    }
};

// Tokens-get
// Required data: token id
// Optional data: none
handlers._tokens.get = function (data, callback) {
    // Check if the provied token id is valid
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404)
            }
        });
    } else {
        callback(400, {
            'Error': 'Missing requred field'
        });
    }
};

// Tokens-put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
    const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend ? true : false;
    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err, tokenData) {
                // Check to make sure that the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 3600000;

                    // Store the new token data
                    _data.update('tokens', id, tokenData, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, {
                                'Error': 'Could not update the token expiration'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        'Error': 'The token has already expired.'
                    });
                }
            } else {
                callback(400, {
                    'Error': 'Token data does not exist.'
                });
            }
        })
    } else {
        callback(400, {
            'Error': 'Missing required field(s) or field(s) are invalid'
        })
    }
};

// Tokens-delete
// Require data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
    // Check if the token id is valid
    const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Lookup the user
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {
                            'Error': 'Could not delete the specified token'
                        })
                    }
                });
            } else {
                callback(400, {
                    'Error': 'Could not find the specified token'
                })
            }
        });
    } else {
        callback(400, {'Error': 'Missing or improperly formated fields'});
    }
};

// Vefrify if a given token id is valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
        if (!err && tokenData) {
            // Chekc that the token is for the given user and not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    })
};

handlers.checks = function(data, callback) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405)
    }
};

// Container for all the ckecks methods
handlers._checks = {};

// Checks - POST
// Required data: protocol, url, method, success code, timeout
// Optional data: none
handlers._checks.post = function(data, callback) {
    // Validata the inputs
    const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) >= 0 ? data.payload.protocol : false;
    const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim(): false;
    const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) >= 0 ? data.payload.method : false;
    const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5? data.payload.timeoutSeconds : false;
    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Lookup the user phone from the token
        _data.read('tokens', token, function(err, tokenData) {
            if (!err && tokenData) {
                const userPhone = tokenData.phone;
                
                // Lookup the user data
                _data.read('users', userPhone, function(err, userData) {
                    if (!err && userData) {
                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array? userData.checks : [];

						// Verify the user has lesser number of ckecks than the max-checks-per-user
                        if (userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            const checkID = helpers.createRandomString(20);

                            // Create the check object
                            const checkObject = {
                                "id": checkID,
                                "userPhone": userPhone,
                                "protocol": protocol,
                                "url": url,
                                "method": method,
                                "successCodes": successCodes,
                                "timeoutSeconds": timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks', checkID, checkObject, function (err) {
                                if (!err) {
                                    // Add the check ID to the user object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkID);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, function(err) {
                                        if (!err) {
                                            // Return the data about the new check
                                            callback(200, checkObject);
                                        }else {
                                            callback(500, {'Error': 'Could not update the user with the new check'})
                                        }
                                    })
                                }else {
                                    callback(500, {'Error': 'Could not create the new check.'});
                                }
                            })
                        }else {
                            callback(400, {'Error': 'The user already has the max number of checks ('+config.maxChecks+')'});
                        }
                    }else {
                        callback(403);
                    }
                })
            }else {
                callback(403);
            }
        })
    } else {
        callback(400, {'Error': 'Missing required inputs or inputs are invalid'});
    }
};

// Checks - GET
// Required data: ID
// Optional data: none
handlers._checks.get = function(data, callback) {
	// Check if the provied phone number is valid
	const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
	if (id) {
		// Lookup the check
		_data.read('checks', id, function(err, checkData) {
			if (!err && checkData) {
				// Get the token from the headers
				const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

				// Verify that the given token is valid and belongs to the user who created the check
				handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
					if (tokenIsValid) {
						callback(200, checkData);
					} else {
						callback(403, {
							'Error': 'Missing required token in header, or the token in invalid'
						});
					}
				})
			}else {
				callback(403, {'Error': 'Could not find the check'});
			}
		});
	} else {
		callback(400, {
			'Error': 'Missing requred field'
		});
	}
};

// Checks - PUT
// Required data: ID
// Optional data: protocol, url, method, timeout seconds, success codes (One must be present)
handlers._checks.put = function (data, callback) {
	// Check for the required field
	const id = typeof (data.payload.id) == 'string' ? data.payload.id.trim() : false;

	// Check for the optional fields
	// Validata the inputs
	const protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) >= 0 ? data.payload.protocol : false;
	const url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	const method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) >= 0 ? data.payload.method : false;
	const successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	const timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
	if (id) {
		// Chekc to make sure one or more of the optional fields are present
		if(protocol || url || method || successCodes || timeoutSeconds) {
			// Lookup the check
			_data.read('checks', id, function(err, checkData) {
				if (!err && checkData) {
					// Get the token from the headers
					const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

					// Verify that the given token is valid and belongs to the user who created the check
					handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
						if (tokenIsValid) {
							// Update the check where necessary
							if(protocol) {
								checkData.protocol = protocol;
							}
							if(url) {
								checkData.url = url;
							}
							if(successCodes) {
								checkData.successCodes = successCodes;
							}
							if(method) {
								checkData.method = method;
							}
							if(timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds;
							}

							// Store the updates
							_data.update('checks', id, checkData, function(err) {
								if (!err) {
									callback(200);
								} else {
									callback(500, {'Error': 'Could not update the check'});
								}
							})
						} else {
							callback(403, {'Error': 'Missing or invalid token'});
						}
					});
				} else {
					callback(400, {'Error': 'Check ID does not exist'});
				}
			});
		} else {
			callback(400, {'Error': 'Missign fields to update'});
		}
	} else {
		callback(400, {'Error': 'Missing required fields'});
	}
};

// Checks - DELETS
// Require data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
	// Check if the id number is valid
	const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
	if (id) {
		// Lookup the check
		_data.read('checks', id, function(err, checkData) {
			if(!err && checkData) {
				// Get the token from the headers
				const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

				handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
					if (tokenIsValid) {
						// Delete the check data
						_data.delete('checks', id, function(err) {
							if (!err) {
								// Lookup the user
								_data.read('users', checkData.userPhone, function (err, userData) {
									if (!err && userData) {
										const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

										//Remove the delete check from their list of checks
										const checkPosition = userChecks.indexOf(id);
										if (checkPosition >=  0) {
											userChecks.splice(checkPosition, 1);

											// Re-save the user data
											_data.update('users', checkData.userPhone, userData, function (err) {
												if (!err) {
													callback(200);
												} else {
													callback(500, {
														'Error': 'Could not update the user'
													});
												}
											});
										} else {
											callback(500, {'Error': 'Could not find the check on the user\'s object'})
										}
									} else {
										callback(500, {
											'Error': 'Could not find the user who created the check'
										})
									}
								});
							}else {
								callback(500, {'Error': 'Could not delte the check data'});
							}
						})
					} else {
						callback(403, {
							'Error': 'Missing or Invalid token.'
						});
					}
				});
			}else {
				callback(400, {'Error': 'The specified check ID does not exist'});
			}
		})
	} else {
		callback(400, {
			'Error': 'Missing required fields'
		});
	}
};


module.exports = handlers;