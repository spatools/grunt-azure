/*
 * grunt-azure
 * https://github.com/spatools/grunt-azure
 * Copyright (c) 2014 SPA Tools
 * Code below is licensed under MIT License
 *
 * Permission is hereby granted, free of charge, to any person 
 * obtaining a copy of this software and associated documentation 
 * files (the "Software"), to deal in the Software without restriction, 
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be 
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR 
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION 
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

module.exports = function (grunt) {
    var _ = grunt.util._,
        fs = require("fs"),
        async = require("async"),
        path = require("path"),

        filesystem = require("../lib/filesystem");
    
    //#region Private Methods
    
    function ensureMessage(message) {
        if (typeof message !== "string") {
            message = JSON.stringify(message);
        }

        return message;
    }
    
    function createQueue(service, params, callback) {
        service.createQueueIfNotExists(params.queue, params.queueOptions, function (err, created) {
            if (created) {
                grunt.verbose.writeln("Queue '" + params.queue + "' created !");
            }
            
            callback(err, created);
        });
    }
    
    function enqueue(service, message, params, callback) {
        service.createMessage(params.queue, message, params.messageProperties, function (err, result) {
            if (!err) {
                grunt.verbose.writeln("Message successfully enqueued in to '" + params.queue + "' Queue.");
                grunt.verbose.writeln(message);
                grunt.verbose.writeln("----------------------------");
            }

            callback(err, result);
        });
    }
    
    function dequeue(service, params, callback) {
        var options = { numOfMessages: params.numOfMessages, peekOnly: params.peekOnly };
        if (!options.peekOnly) {
            options.visibilityTimeout = params.visibilityTimeout;
        }

        service.getMessages(params.queue, options, function (err, results) {
            if (!err) {
                grunt.verbose.writeln(params.numOfMessages + " message(s) successfully dequeued from '" + params.queue + "' Queue.");
            }
            
            callback(err, results);
        });
    }
    
    function clear(service, params, callback) {
        service.clearMessages(params.queue, function (err) {
            if (!err) {
                grunt.verbose.writeln("All messages successfully cleared from '" + params.queue + "' Queue.");
            }
            
            callback(err);
        });
    }
    
    function deleteMessage(service, message, params, callback) {
        console.log(message);
        service.deleteMessage(params.queue, message.messageid, message.popreceipt, function (err) {
            if (!err) {
                grunt.verbose.writeln("Message '" + message.messageid + "' successfully deleted from '" + params.queue + "' Queue.");
            }
            
            callback(err);
        });
    }
    
    function saveMessage(message, dest) {
        var msgPath = path.join(dest, message.messageid + ".json");
        grunt.file.write(msgPath, JSON.stringify(message));
    }
    
    function createActions(actions) {
        actions = actions || [];
        
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        
        return actions.map(function (action) {
            if (typeof action === "string") {
                return function () { grunt.task.run(action); };
            }
            
            return action;
        });
    }
    
    function executeActions(service, message, actions, params, callback) {
        async.eachSeries(
            actions, 
            function (action, cb) {
                try {
                    if (action.length > 1) {
                        action(message, cb);
                    }
                    else {
                        action(message);
                        cb();
                    }
                }
                catch (err) {
                    cb(err);
                }
            },
            function (err) {
                if (err) {
                    callback(err);
                    return;
                }
            
                if (params.peekOnly) {
                    callback();
                }
                else {
                    deleteMessage(service, message, params, callback);
                }
            });
    }

    //#endregion
    
    //#region Enqueue

    grunt.registerMultiTask('azure-queue-enqueue', "Azure Queue Enqueue - Allow to enqueue message into Windows Azure Storage Queues", function () {
        var azure = require("azure"),

            done = this.async(),
            params = this.options({
                serviceOptions: [],
                queue: null,
                queueOptions: {},
                messageProperties: {},
                message: null,
                messages: [],
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.queue) {
            grunt.log.error().error("Please provide at least a queue parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var service = azure.createQueueService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]()),
            messages = [];
        
        if (params.message) {
            messages.push(ensureMessage(params.message));
        }
        
        if (params.messages && params.messages.length) {
            params.messages.forEach(function (message) {
                messages.push(ensureMessage(message));
            });
        }
        
        if (this.files && this.files.length) {
            this.files.forEach(function (file) {
                file.src.forEach(function (src) {
                    messages.push(grunt.file.read(src));
                });
            });
        }
        
        async.series(
            [
                function (callback) { createQueue(service, params, callback); },
                function (callback) {
                    async.mapSeries(
                        messages,
                        function (message, cb) {
                            enqueue(service, message, params, cb);
                        },
                        function (err, results) {
                            if (err) {
                                grunt.log.error()
                                        .error("An error occured while trying to enqueue message to Windows Azure !")
                                        .error(err);
                    
                                callback(err);
                                return;
                            }

                            grunt.log.ok(results.length + " messages(s) enqueued to Windows Azure Queue !");
                            callback();
                        });
                }
            ], 
            function (err) {
                if (err) {
                    done(false);
                    return;
                }
            
                done();
            });
    });
    
    //#endregion
    
    //#region Dequeue

    grunt.registerMultiTask('azure-queue-dequeue', "Azure Queue Dequeue - Allow to dequeue and process messages from Windows Azure Storage Queues", function () {
        var azure = require("azure"),

            done = this.async(),
            params = this.options({
                serviceOptions: [],
                queue: null,
                queueOptions: {},
                numOfMessages: 1,
                peekOnly: false,
                visibilityTimeout: 5,
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.queue) {
            grunt.log.error().error("Please provide at least a queue parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var service = azure.createQueueService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]()),
            actions = createActions(this.data.actions), dest = this.data.dest;
        
        async.seq(
            function (callback) { createQueue(service, params, callback); },
            function (created, callback) { dequeue(service, params, callback); },
            function (messages, callback) {
            
                async.eachSeries(
                    messages,
                    function (message, cb) {
                        if (dest) {
                            saveMessage(message, dest);
                        }

                        executeActions(service, message, actions, params, cb); 
                    },
                    function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        grunt.log.ok(messages.length + " messages(s) dequeued to Windows Azure Queue !");
                        callback();
                    });
            }
        )(function (err) {
            if (err) {
                grunt.log.error()
                        .error("An Error occured while trying to dequeue Windows Azure Queue !")
                        .error(err);

                done(false);
                return;
            }
            
            done();
        });
    });

    //#endregion
    
    //#region Clear

    grunt.registerMultiTask('azure-queue-clear', "Azure Queue Clear - Clear all messages from Windows Azure Storage Queues", function () {
        var azure = require("azure"),

            done = this.async(),
            params = this.options({
                serviceOptions: [],
                queue: null,
                queueOptions: {},
                retryFilter: "ExponentialRetryPolicyFilter"
            });
        
        if (!params.queue) {
            grunt.log.error().error("Please provide at least a queue parameter !");
            return done(false);
        }
        
        if (typeof params.serviceOptions === "string") {
            params.serviceOptions = [params.serviceOptions];
        }
        
        var service = azure.createQueueService.apply(azure, params.serviceOptions).withFilter(new azure[params.retryFilter]()),
            actions = createActions(this.data.actions), dest = this.data.dest;
        
        async.seq(
            function (callback) { createQueue(service, params, callback); },
            function (created, callback) { clear(service, params, callback); }
        )(function (err) {
            if (err) {
                grunt.log.error()
                        .error("An Error occured while trying to clear Windows Azure Queue !")
                        .error(err);

                done(false);
                return;
            }
            
            grunt.log.ok("All messages successfully cleared from '" + params.queue + "' Queue.");
            done();
        });
    });

    //#endregion
};
