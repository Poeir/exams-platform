const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const activeLevel = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;
const pretty = process.env.NODE_ENV !== 'production';

function emit(level, message, fields) {
  if (LEVELS[level] < activeLevel) return;
  const entry = { time: new Date().toISOString(), level, message, ...fields };
  const line = pretty
    ? `[${entry.time}] ${level.toUpperCase()} ${message}${fields ? ' ' + JSON.stringify(fields) : ''}`
    : JSON.stringify(entry);
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const logger = {
  debug: (message, fields) => emit('debug', message, fields),
  info: (message, fields) => emit('info', message, fields),
  warn: (message, fields) => emit('warn', message, fields),
  error: (message, fields) => emit('error', message, fields),
};
