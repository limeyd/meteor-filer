// Filer is a simple but effective multipart middleware wrapper for Meteor.
// Node-Formidable is utilized to parse the supplied request. Requests are
// only processed if they match the registered route are Multipart Post
// requests.
//
// Optional permissions can be added through the allow() method.
//
// An assumption has been made that requests will be ajaxPosts therefore
// json objects are return on completion, failure or permission denied. See
// Filer.RespBody for the format of the data returned.
//
// Example:
//
// Basic: uses the default options
//    Filer.register();
//
// Custom:
//    var options = {uploadDir:'./public/'}
//    var filer = new Filer(options);
//    filer.events({
//      'file':function(field,value){// do something},
//      'FileBegin': function(name,file){// do something}
//      });
//    filer.allow(function(){
//      if(Meteor.userId()){
//        return true;
//      }
//      return false;
//    });
//    filer.register('/upload');

var app,
util = Npm.require('util'),
fs = Npm.require('fs'),
Fiber = Npm.require('fibers'),
path = Npm.require('path'),
formidable = Npm.require('formidable');


if (typeof __meteor_bootstrap__.app !== 'undefined') {
  app = __meteor_bootstrap__.app;
} else {
  app = WebApp.connectHandlers;
}

// @param Object options
Filer = function(/* OPTIONAL */options){
  var self = this;

  self.files = {};
  self.fields = {};
  self._events = {};

  // only alow certain options
  self._options = (options && _.pick(options,
                                     'hash',
                                     'maxFieldsSize',
                                     'keepExtensions',
                                     'encoding',
                                     'uploadDir')) || {};

}

// Creates and registers and new Filer
//
// @param String route
// @return Filer
Filer.register = function(/* OPTIONAL */route) {
  var filer = new Filer();
  filer.register(route);
  return filer;
}

// Saves a list of Formidable events
// These events get applied to the formidable form prior to parsing. This can
// be called multiple times. Any subsequent call can overwrite previously
// registered events.
//
// @param Object {String:Name, Function:callback} events
Filer.prototype.events = function(events){
  _.extend(this._events, events);
}

// Saves the Permission callback
// The callback called during each request cycle.
//
// @param Function callback - should return a boolean
Filer.prototype.allow = function(callback){
  if( !_.isFunction(callback)){
    throw new Error('Allow must either be function that returns a boolean');
  }
  this._allow = callback;
}

// Saves a list of Formidable events
// These events get apply the the formidable form prior to parsing
//
// @param Object request - connect request object
// @return String e.g.: "multipart/form-data'
var contentType = function(request){
  var str = request.headers['content-type'] || '';
  return str.split(';')[0];
}

// Registers filer middleware
//
// @param String route // path to map this middleware to
// @param Function callback // called once form on completion
Filer.prototype.register = function(/* OPTIONAL */route, callback ) {
  var self = this;

  // add default to undefined route
  route = route || '/upload';

  // add middleware to connect
  app.use(function(request, response, next){
    // ignore invalid paths
    if(request.url !== route) return next();

    // ignore non POST requests
    if(request.method !== 'POST') return next();

    // ignore non Multipart posts
    if('multipart/form-data' !== contentType(request)) return next();

    // Check for Permission
    if ( self._allow && !self._allow() ){

      // create Permission Denied response body
      var body = Filer.PermissionBody(false);

      // return response
      return response.end(body.stringify());
    }

    // create formidable form per request
    var form = new formidable.IncomingForm();

    // apply options to form
    _.extend(form, self._options);

    form.on('field', function(field, value){
      // store fields value on Filer instance
      self.fields[field] = value;
    })
    .on('file', function(field,file){
      // store fields value on Filer instance
      self.files[field] = file;
    })
    .on('error',function(err){
      // XXX how should we handle this
      console.log('err:',err);
    });

    // Customize the response.end()
    form.on('end', function(){
      var success;

      // Check for custom end for RespBody
      if( _.isFunction(self._events.end) ){
        success = self._events.end.call(null, response);
      }else{
        success = new Filer.SuccessBody();
      }

      // check for success boolean true
      if(_.isBoolean(success)){
        if(success){
          // create success response body
          success = new Filer.SuccessBody();
        }else{
          // create failed response body
          success = new Filer.FailedBody();
        }
      }else if( !(success instanceof Filer.RespBody) ){
        throw new Error('Success must be either a boolean or Filer.RespBody!');
      }

      // send response
      return response.end(success.stringify());
    });

    // attach custom listeners excluding end
    _.each(self._events, function(value, key, list){
      if(key !== 'end') form.on(key, value);
    });

    if(callback){
      var cb = callback;  
      callback = function(err,fields,files){
        Fiber(function(){
          cb(err,fields,files);
        }).run();
      }
    }
    // parse the damn form already
    form.parse(request, callback);
  });
}


/*****************************************************************************/
// Filer - RespBody / SuccessBody / FailedBody / PermissionBody
/*****************************************************************************/

// Standardized Responsebody to be sent back to the client
// on completion, faliure or error
//
// @param Boolean value - denotes true:success or false:faliure
// @param String message - for user consumption
// @param Object meta - extends the functionality of a RespBody
// @return RespBody
Filer.RespBody = function(value, /* Optional */message, meta ){
  var self = this;

  // assign or apply defaults
  self.value =  value || false;
  self.message = message || '';
  // attach meta data
  _.extend(self, meta);
  return self;
}

// Call JSON stringify on self
//
// @return JSON version
Filer.RespBody.prototype.stringify = function(){
  return JSON.stringify(this);
}

// Creates a preformatted Success Response Body
//
// @param Object meta - see Filer.RespBody
// @return RespBody
Filer.SuccessBody = function(/* OPTIONAL */ meta){
  return new Filer.RespBody(true, 'Success',meta);
}

// Creates a preformatted Failed Response Body
//
// @param Object meta - see Filer.RespBody
// @return RespBody
Filer.FailedBody = function(/* OPTIONAL */ meta){
  return new Filer.RespBody(true, 'Failed', meta);
}

// Creates a preformatted Permission Response Body
//
// @param Object value - see Filer.RespBody
// @param Object message - see Filer.RespBody
// @param Object meta - see Filer.RespBody
// @return RespBody
Filer.PermissionBody = function(value,/* OPTIONAL */ message, meta){
  // apply default message base on value
  message = message || value?"Permission Granted!":"Permission Denied";
  return new Filer.RespBody(value, message, meta);
}
