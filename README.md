# Filer

Filer is a simple but effective multipart form handler for Meteor.
It utilizes Formidable to parse the supplied form;

The assumption is that requests will be sent with ajaxPosts therefore json
objects are return on completion, failure or permission denied.
See Filer.RespBody for the format.

##Example Usage:

*Basic: uses the default options*

    Filer.register();

*Custom:*

    var options = {uploadDir:'./public/'}
    var filer = new Filer(options);
    filer.events({
        'file':function(field,value){// do something},
        'FileBegin': function(name,file){// do something}
        });
    filer.allow(function(){
        if(Meteor.userId()){
        return true;
        }
        return false;
        });
    filer.register('/upload');

*Exposed formidable options:* See [Formidable Docs]https://github.com/felixge/node-formidable/blob/master/Readme.md#formidableincomingform
for more details

Defaults:

    encoding = 'utf-8';
    uploadDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();
    keepExtensions = false;
    maxFieldsSize = 2 * 1024 * 1024;
    hash = false;

## Working Example:

[Coming Soon]


## License

Filer is licensed under the MIT license.

## Credits

[Felix Geisendörfer](http://twitter.com/felixge) for his awesome
[formidable](https://github.com/felixge/node-formidable) form parser

[possibilities](https://github.com/possibilities) for
[node-modules](https://github.com/possibilities/meteor-node-modules)

[oortcloud](https://github.com/oortcloud) guys for
[meteorite](https://github.com/oortcloud/meteorite) an installer & smart package
manager for Meteor

