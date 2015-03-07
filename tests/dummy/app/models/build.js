import DS from 'ember-data';

export default DS.Model.extend({
  commit: DS.belongsTo('commit'),
  repository: DS.belongsTo('repository'),
  state: DS.attr('string')
});
