/*jshint node:true*/
module.exports = {
  normalizeEntityName: function() {
  },

  afterInstall: function(options) {
    return this.addBowerPackagesToProject([
      { name: 'ember-cli-shims', target: '~0.1.2' },
      { name: 'pusher', target: '^3.1.0' }
    ]);
  }
};
