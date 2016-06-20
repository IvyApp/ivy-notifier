/*jshint node:true*/
module.exports = {
  normalizeEntityName: function() {
  },

  afterInstall: function(options) {
    return this.addBowerPackageToProject('pusher', '^3.1.0');
  }
};
