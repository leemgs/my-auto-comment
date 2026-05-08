const { runBot } = require('./bot');

const mode = process.argv[2] || 'comment';

runBot(mode).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
