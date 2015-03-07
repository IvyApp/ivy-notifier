import Ember from 'ember';

export default Ember.ObjectController.extend({
  labelClass: Ember.computed(function() {
    var state = this.get('state');
    var labelClassMap = this.get('labelClassMap');
    return labelClassMap[state];
  }).property('state'),

  labelClassMap: {
    'created': 'label-info',
    'errored': 'label-danger',
    'failed': 'label-danger',
    'passed': 'label-success',
    'received': 'label-default',
    'started': 'label-warning'
  }
});
