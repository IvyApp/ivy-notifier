import ApplicationSerializer from './application';

export default ApplicationSerializer.extend({
  normalize: function(type, hash) {
    delete hash['author_email'];
    delete hash['author_name'];
    delete hash['branch'];
    delete hash['committed_at'];
    delete hash['committer_email'];
    delete hash['committer_name'];
    delete hash['compare_url'];
    delete hash['duration'];
    delete hash['event_type'];
    delete hash['finished_at'];
    delete hash['job_ids'];
    delete hash['message'];
    delete hash['number'];
    delete hash['pull_request'];
    delete hash['pull_request_number'];
    delete hash['pull_request_title'];
    delete hash['started_at'];

    return this._super(type, hash);
  }
});
