// Data pipeline with 4-level nested callbacks
// The model must convert this to async/await

const db = require('./db-stub');
const cache = require('./cache-stub');
const enricher = require('./enricher-stub');
const notifier = require('./notifier-stub');

function processPipelineCallback(userId, callback) {
  // Level 1: Fetch user from DB
  db.findUser(userId, function(err, user) {
    if (err) return callback(err, null);
    if (!user) return callback(new Error('User not found'), null);

    // Level 2: Enrich user data from external service
    enricher.enrich(user, function(err, enrichedUser) {
      if (err) return callback(err, null);

      // Level 3: Cache the enriched data
      cache.set(`user:${userId}`, enrichedUser, function(err) {
        if (err) return callback(err, null);

        // Level 4: Send notification
        notifier.notify(enrichedUser.email, 'Profile updated', function(err) {
          if (err) return callback(err, null);
          callback(null, {
            userId: enrichedUser.id,
            status: 'complete',
            cached: true,
            notified: true,
          });
        });
      });
    });
  });
}

module.exports = { processPipelineCallback };
