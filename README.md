# grunt-azure [![NPM version](https://badge.fury.io/js/grunt-azure.png)](http://badge.fury.io/js/grunt-azure)

[Grunt][grunt] Azure - Allows to use Windows Azure Storage Blobs / Tables / Queues inside Grunt.

## Getting Started

Install this grunt plugin next to your project's gruntfile with: `npm install grunt-azure --save-dev`

Then add this line to your project's `Gruntfile.js` :

```javascript
grunt.loadNpmTasks('grunt-azure');
```

Then specify your config: ([more informations][doc-options])

```javascript
grunt.initConfig({
```

Uploading Blob : ([more informations][blob-upload-options])

```javascript
    'azure-blob-upload': {
        dist: {
            options: {
                serviceOptions: '{connectionstring}',
                container: 'testcontainer'
            },

            src: 'local/folder/**',
            dest: 'remote/prefix/'
        }
    }
```

Downloading Blob : ([more informations][blob-download-options])

```javascript
	'azure-blob-download': {
		dist: {
			options: {
		        serviceOptions: '{connectionstring}',
		        container: 'testcontainer'
			},

		    src: 'remote/prefix/',
		    dest: 'local/folder/'
		}
	}
```

[grunt]: https://github.com/gruntjs/grunt
[blob-upload-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Upload-Options
[blob-download-options]: https://github.com/spatools/grunt-azure/wiki/Blob-Download-Options

## Release History
* 0.1.0 Initial Release (Include blob download / upload)
* 0.1.1 Add Queue tasks (enqueue, dequeue, clear)
