module.exports = function (grunt) {

    grunt.initConfig({
        
        //#region Blob

        "azure-blob-upload": {
            options: {
                serviceOptions: "UseDevelopmentStorage=true;",
                container: "testcontainer",
            },
                
            simple: {
                src: 'tests/upload/**',
                dest: 'TestPrefix/',
                options: {
                    containerDelete: true,
                },
            },
            expand: {
                expand: true,
                cwd: "tests/upload/spa",
                src: "./**",
                dest: "Prefix/"
            },
            nodest: {
                expand: true,
                cwd: "tests/upload",
                src: "./**"
            }
        },
        
        "azure-blob-download": {
            options: {
                serviceOptions: "UseDevelopmentStorage=true;",
                container: "testcontainer",
            },
            
            simple: {
                dest: "tests/download/simple/"
            },
            prefix: {
                src: "Prefix/",
                dest: "tests/download/prefix/"
            },
            forced: {
                options: {
                    removePrefix: false
                },
                
                prefix: "Prefix/",
                dest: "tests/download/forced/"
            },
            prefixoptions: {
                options: {
                    prefix: "TestPrefix/",
                },
                
                dest: "tests/download/options/"
            }
        },
        
        //#endregion
        
        //#region Queue
        
        "azure-queue-enqueue": {
            options: {
                serviceOptions: "UseDevelopmentStorage=true;",
                queue: "testqueue",
            },
            
            simple: {
                options: {
                    message: "I'm a basic message"
                }
            },
            json: {
                options: {
                    message: {
                        prop: "value",
                        complex: {
                            test: "test"
                        }
                    }
                }
            },
            files: {
                src: "tests/queue/*"
            }
        },
        
        "azure-queue-dequeue": {
            options: {
                serviceOptions: "UseDevelopmentStorage=true;",
                queue: "testqueue",
            },
            
            simple: {
                actions: function (work) {
                    console.log(work);
                }
            },
            async: {
                actions: [
                    function (work, callback) {
                        console.log(work, "waiting, 5 sec");
                        setTimeout(callback, 5000);
                    },
                    function (work) {
                        console.log(work, "sync");
                    },
                ]
            },
            list: {
                options: {
                    peekOnly: true,
                    numOfMessages: 32
                }
            },
            files: {
                dest: "tests/queuebackup/"
            }
        },
        
        "azure-queue-clear": {
            options: {
                serviceOptions: "UseDevelopmentStorage=true;",
            },
            
            simple: {
                options: {
                    queue: "testqueue"
                }
            }
        },
        
        //#endregion

        clean: {
            download: 'tests/download/**',
            queue: 'tests/queuebackup/**'
        }

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadTasks('tasks');

    grunt.registerTask("azure-blob", ["azure-blob-upload", "azure-blob-download"]);
    grunt.registerTask("azure-queue", ["azure-queue-enqueue", "azure-queue-dequeue", "azure-queue-clear"]);

    grunt.registerTask('default', ['clean', 'azure-blob', 'azure-queue']);
};