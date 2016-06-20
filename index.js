/* jshint node: true */
'use strict';

module.exports = {
  name: 'ivy-notifier',

  included: function(app) {
    app.import(app.bowerDirectory + '/pusher/dist/web/pusher.js');
    app.import('vendor/shims/pusher.js', {
      exports: {
        'pusher': ['default']
      }
    });
  }
};
