// Fetch GUARD token distribution + BlastPad pool 791 staking positions
// Run: node fetch_distribution.js

const https = require('https');

function post(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch(e) { reject(new Error('JSON parse error: ' + buf.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getAllScopes() {
  const scopes = [];
  let lower = '';
  let page = 0;
  while (true) {
    const res = await post('proton.eosusa.io', '/v1/chain/get_table_by_scope', {
      code: 'simpletoken', table: 'accounts', limit: 1000,
      lower_bound: lower, upper_bound: ''
    });
    if (!res.rows || res.rows.length === 0) break;
    res.rows.forEach(r => scopes.push(r.scope));
    page++;
    process.stderr.write(`  scopes page ${page}: ${scopes.length} total\n`);
    if (!res.more || res.more === '' || res.more === false) break;
    lower = res.more;  // 'more' contains the next lower_bound on this node
    await sleep(100);
  }
  return scopes;
}

async function getGuardBalance(account) {
  try {
    const res = await post('proton.eosusa.io', '/v1/chain/get_table_rows', {
      code: 'simpletoken', scope: account, table: 'accounts',
      limit: 50, json: true
    });
    for (const row of (res.rows || [])) {
      if (row.balance && row.balance.endsWith(' GUARD')) {
        const amt = parseFloat(row.balance.split(' ')[0]);
        if (amt > 0) return amt;
      }
    }
  } catch(e) {}
  return 0;
}

async function getBlastpadStakers() {
  // Try known BlastPad staking contracts on Proton
  const contracts = ['blastpadstake', 'blastpad', 'blastpadio'];
  for (const contract of contracts) {
    try {
      const res = await post('proton.eosusa.io', '/v1/chain/get_table_rows', {
        code: contract, scope: contract, table: 'stakes',
        limit: 1000, json: true
      });
      if (res.rows && res.rows.length > 0) {
        process.stderr.write(`  BlastPad contract found: ${contract}, rows: ${res.rows.length}\n`);
        return { contract, rows: res.rows, more: res.more };
      }
    } catch(e) {}

    // Try with pool 791 as scope
    try {
      const res2 = await post('proton.eosusa.io', '/v1/chain/get_table_rows', {
        code: contract, scope: '791', table: 'stakes',
        limit: 1000, json: true
      });
      if (res2.rows && res2.rows.length > 0) {
        process.stderr.write(`  BlastPad contract ${contract} scope 791: ${res2.rows.length} rows\n`);
        return { contract, rows: res2.rows, more: res2.more };
      }
    } catch(e) {}
  }
  return null;
}

async function getBlastpadByScope() {
  // Check what tables blastpad-style contracts have
  const candidates = ['blastpadstake','blastpad','launchpadio','blastpadio','protonswap'];
  for (const c of candidates) {
    try {
      const res = await post('proton.eosusa.io', '/v1/chain/get_table_by_scope', {
        code: c, table: 'userpositions', limit: 5
      });
      if (res.rows && res.rows.length > 0) {
        process.stderr.write(`  Found table userpositions in ${c}: ${JSON.stringify(res.rows[0])}\n`);
      }
    } catch(e) {}
    try {
      const res = await post('proton.eosusa.io', '/v1/chain/get_table_by_scope', {
        code: c, table: 'positions', limit: 5
      });
      if (res.rows && res.rows.length > 0) {
        process.stderr.write(`  Found table positions in ${c}: ${JSON.stringify(res.rows[0])}\n`);
      }
    } catch(e) {}
    try {
      const res = await post('proton.eosusa.io', '/v1/chain/get_table_by_scope', {
        code: c, table: 'pools', limit: 5
      });
      if (res.rows && res.rows.length > 0) {
        process.stderr.write(`  Found table pools in ${c}: ${JSON.stringify(res.rows[0])}\n`);
      }
    } catch(e) {}
  }
}

async function main() {
  const EXCLUDE = new Set(['scubasteve44','guardops','guardrewards']);

  // --- BlastPad discovery ---
  process.stderr.write('Discovering BlastPad staking contract...\n');
  await getBlastpadByScope();

  // Also try the contract used by the existing achievement check
  // Let me check what the site code uses for staking
  process.stderr.write('Trying common BlastPad staking patterns...\n');
  const bpCandidates = [
    { code: 'blastpadstake', scope: 'blastpadstake', table: 'userpos' },
    { code: 'blastpadstake', scope: '791', table: 'userpos' },
    { code: 'blastpad', scope: 'blastpad', table: 'userpos' },
    { code: 'blastpad', scope: '791', table: 'userpos' },
    { code: 'blastpadstake', scope: 'blastpadstake', table: 'stakepos' },
    { code: 'blastpadstake', scope: '791', table: 'stakepos' },
  ];
  for (const bp of bpCandidates) {
    try {
      const res = await post('proton.eosusa.io', '/v1/chain/get_table_rows', {
        ...bp, limit: 5, json: true
      });
      if (res.rows && res.rows.length > 0) {
        process.stderr.write(`  HIT: ${JSON.stringify(bp)} -> ${JSON.stringify(res.rows[0])}\n`);
      }
    } catch(e) {}
  }

  // --- GUARD token holders ---
  process.stderr.write('\nFetching all simpletoken scopes...\n');
  const scopes = await getAllScopes();
  process.stderr.write(`Total scopes: ${scopes.length}\n`);

  // Query GUARD balances in batches
  const holders = {};
  const BATCH = 20;
  for (let i = 0; i < scopes.length; i += BATCH) {
    const batch = scopes.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(acc => getGuardBalance(acc)));
    batch.forEach((acc, j) => {
      if (results[j] > 0 && !EXCLUDE.has(acc)) holders[acc] = results[j];
    });
    if ((i / BATCH) % 10 === 0) process.stderr.write(`  balances: ${i}/${scopes.length} scanned, ${Object.keys(holders).length} GUARD holders so far\n`);
    await sleep(50);
  }

  process.stderr.write(`\nFinal: ${Object.keys(holders).length} GUARD holders (excluding reserved accounts)\n`);
  console.log(JSON.stringify({ holders }, null, 2));
}

main().catch(e => { process.stderr.write('ERROR: ' + e.message + '\n'); process.exit(1); });
