import ApplicationSerializer from './application';

export default ApplicationSerializer.extend({
  normalize: function(type, hash) {
    delete hash['author_email'];
    delete hash['author_name'];
    delete hash['committed_at'];
    delete hash['committer_email'];

    return this._super(type, hash);
  }
});
