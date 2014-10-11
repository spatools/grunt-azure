module.exports = function (grunt) {

    grunt.initConfig({

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

        clean: {
            download: 'tests/download/**'
        }

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['clean', 'azure-blob-upload']);
};