Package.describe({
  summary: "A Multipart form handler for Meteor"
});

Npm.depends({formidable:"1.0.14"});

Package.on_use(function (api) {
  api.export('Filer', 'server');
  api.use(['underscore','webapp'], 'server');
  api.add_files('filer.js','server');
});
