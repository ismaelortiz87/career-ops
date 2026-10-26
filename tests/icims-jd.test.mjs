// tests/icims-jd.test.mjs — unit coverage for the iCIMS JD path in
// browser-extract.mjs. The live fetch is exercised separately (an iCIMS board
// can change shape at any time, so a network assertion here would be a flaky
// test rather than a check of this code).
import { pass, fail } from './helpers.mjs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { ROOT } from './helpers.mjs';

console.log('\nbrowser-extract.mjs (iCIMS JD path)');

try {
  const mod = await import(pathToFileURL(join(ROOT, 'browser-extract.mjs')).href);
  const { icimsIframeUrl, stripIcimsChrome } = mod;

  // ── icimsIframeUrl: the rewrite that makes the body readable at all ──
  const bare = 'https://careers-en-nortal.icims.com/jobs/6645/senior-platform-engineer/job';
  const rewritten = icimsIframeUrl(bare);
  if (rewritten === `${bare}?in_iframe=1`) pass('icimsIframeUrl rewrites a bare posting URL to in_iframe=1');
  else fail(`icimsIframeUrl bare => ${rewritten}`);

  const trailing = icimsIframeUrl(`${bare}/`);
  if (trailing === `${bare}/?in_iframe=1`) pass('icimsIframeUrl keeps a trailing slash and still rewrites');
  else fail(`icimsIframeUrl trailing => ${trailing}`);

  // Existing query params survive; a stale in_iframe is overwritten, never
  // duplicated (searchParams.set, not append).
  const withQuery = icimsIframeUrl(`${bare}?in_iframe=0&width=1180`);
  if (withQuery === `${bare}?in_iframe=1&width=1180`) pass('icimsIframeUrl replaces an existing in_iframe value');
  else fail(`icimsIframeUrl query => ${withQuery}`);

  if (icimsIframeUrl('https://careers-en-nortal.icims.com/jobs/6645/job') ===
      'https://careers-en-nortal.icims.com/jobs/6645/job?in_iframe=1') {
    pass('icimsIframeUrl accepts the city-less /jobs/{id}/job form');
  } else {
    fail(`icimsIframeUrl city-less => ${icimsIframeUrl('https://careers-en-nortal.icims.com/jobs/6645/job')}`);
  }

  // ── icimsIframeUrl: everything that must NOT be rewritten ──
  const rejected = [
    ['http URL', 'http://careers-en-nortal.icims.com/jobs/6645/job'],
    ['non-iCIMS host', 'https://jobs.example.com/jobs/6645/job'],
    ['lookalike host', 'https://evil-icims.com/jobs/6645/job'],
    ['suffix lookalike', 'https://icims.com.evil.net/jobs/6645/job'],
    ['non-posting path', 'https://careers-en-nortal.icims.com/jobs/6645/apply'],
    ['listing path', 'https://careers-en-nortal.icims.com/jobs/search?ss=1'],
    ['non-numeric id', 'https://careers-en-nortal.icims.com/jobs/abc/job'],
    ['garbage', 'not a url'],
    ['empty', ''],
    ['null', null],
  ];
  const leaked = rejected.filter(([, u]) => icimsIframeUrl(u) !== null);
  if (leaked.length === 0) pass(`icimsIframeUrl rejects all ${rejected.length} non-posting inputs`);
  else fail(`icimsIframeUrl leaked => ${leaked.map(([n]) => n).join(', ')}`);

  // ── stripIcimsChrome: portal chrome out, posting body in ──
  const shell = [
    'Senior Platform Engineer in | Careers at Ukraine',
    'Please Enable Cookies to Continue',
    'Returning Candidate?',
    'Log back in!',
    'Senior Platform Engineer',
    'Posted Date',
    '1 week ago(19/10/2026 08:13)',
    'Job ID',
    '2026-6645',
  ].join('\n');
  const stripped = stripIcimsChrome(shell);
  if (stripped.startsWith('Senior Platform Engineer\nPosted Date') && !stripped.includes('Log back in!')) {
    pass('stripIcimsChrome removes the cookie/sign-in preamble');
  } else {
    fail(`stripIcimsChrome => ${JSON.stringify(stripped.slice(0, 80))}`);
  }

  // A body with no chrome at all must pass through untouched — "no marker"
  // means the page was already the posting, not that there is nothing to keep.
  const plain = 'Job ID\n2026-1\nOverview\nWe are looking for an engineer.';
  if (stripIcimsChrome(plain) === plain) pass('stripIcimsChrome leaves a chrome-free body intact');
  else fail(`stripIcimsChrome plain => ${JSON.stringify(stripIcimsChrome(plain))}`);

  // Empty / nullish input must not throw.
  if (stripIcimsChrome('') === '' && stripIcimsChrome(null) === '' && stripIcimsChrome(undefined) === '') {
    pass('stripIcimsChrome tolerates empty and nullish input');
  } else {
    fail('stripIcimsChrome did not return "" for empty/nullish input');
  }
} catch (e) {
  fail(`icims-jd tests crashed: ${e.message}`);
}
