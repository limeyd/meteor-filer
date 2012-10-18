Package.describe({
  summary: "A Multipart form handler for Meteor"
});

Package.on_use(function (api) {
  api.use(['underscore','node-modules'], 'server');
  api.add_files('filer.js','server');
});
