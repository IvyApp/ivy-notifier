(function() {
  function vendorModule() {
    'use strict';

    return { 'default': self['Pusher'] };
  }

  define('pusher', [], vendorModule);
})();
