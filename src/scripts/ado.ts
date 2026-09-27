/**
 * ado.ts — Azure DevOps driver for Sprint retest work.
 *
 * Runs real Chrome against a persistent profile so the Entra sign-in survives
 * between invocations: sign in once via `login`, every later command reuses the
 * cookies in reports/.chrome-profile-ado.
 *
 *   npx ts-node src/scripts/ado.ts login          # opens board, waits for sign-in
 *   npx ts-node src/scripts/ado.ts list           # dumps Sprint 54 work items
 *   npx ts-node src/scripts/ado.ts comment <id> <file>
 */
import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const ORG = 'giftrete';
const PROJECT = 'JOBRATOR';
const TEAM = 'JOBRATOR Team';
const ITERATION = process.env.ADO_ITERATION || 'Sprint 55';
const BOARD_URL =
  `https://dev.azure.com/${ORG}/${PROJECT}/_sprints/taskboard/` +
  `${encodeURIComponent(TEAM)}/${PROJECT}/${encodeURIComponent(ITERATION)}`;

const PROFILE_DIR = path.resolve(process.cwd(), 'reports/.chrome-profile-ado');
const OUT_DIR = path.resolve(process.cwd(), 'reports/ado');

async function open(headless: boolean): Promise<{ ctx: BrowserContext; page: Page }> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ctx: BrowserContext;
  try {
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'chrome',
      headless,
      viewport: { width: 1600, height: 1000 },
      args: ['--disable-blink-features=AutomationControlled'],
    });
  } catch (e) {
    console.log('   real Chrome unavailable, falling back to Chromium:', (e as Error).message);
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      viewport: { width: 1600, height: 1000 },
    });
  }
  return { ctx, page: ctx.pages()[0] ?? (await ctx.newPage()) };
}

/** True once we are back on dev.azure.com and off every sign-in host. */
function signedIn(url: string): boolean {
  return /^https:\/\/dev\.azure\.com\//.test(url) && !/_signin|login\.microsoftonline/.test(url);
}

/**
 * GET against the ADO REST API. Uses the context's request client so the session
 * cookies are sent without depending on a page that the SPA may navigate away
 * from mid-call.
 */
async function api<T = any>(ctx: BrowserContext, url: string): Promise<T> {
  const r = await ctx.request.get(url, {
    headers: { Accept: 'application/json', 'X-TFS-FedAuthRedirect': 'Suppress' },
  });
  const text = await r.text();
  if (!r.ok()) throw new Error(`${r.status()} ${url} :: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON from ${url} :: ${text.slice(0, 300)}`);
  }
}

/** Resolve the Sprint iteration id, then the work items assigned to it. */
async function fetchSprintItems(ctx: BrowserContext) {
  const base = `https://dev.azure.com/${ORG}/${PROJECT}/${encodeURIComponent(TEAM)}/_apis/work`;
  const iterations = await api(ctx, `${base}/teamsettings/iterations?api-version=7.1`);
  const iter = (iterations.value || []).find(
    (i: any) => i.name === ITERATION || String(i.path || '').endsWith(ITERATION),
  );
  if (!iter) {
    throw new Error(
      `iteration "${ITERATION}" not found. Available: ${(iterations.value || [])
        .map((i: any) => i.name)
        .join(', ')}`,
    );
  }
  const wi = await api(
    ctx,
    `${base}/teamsettings/iterations/${iter.id}/workitems?api-version=7.1-preview.1`,
  );
  const ids = Array.from(
    new Set(
      (wi.workItemRelations || [])
        .map((r: any) => r?.target?.id)
        .filter((n: any): n is number => typeof n === 'number'),
    ),
  );
  if (!ids.length) return { iteration: iter, items: [] as any[] };

  const items: any[] = [];
  for (let i = 0; i < ids.length; i += 190) {
    const chunk = ids.slice(i, i + 190).join(',');
    const batch = await api(
      ctx,
      `https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${chunk}` +
        `&fields=System.Id,System.WorkItemType,System.Title,System.State,System.AssignedTo,` +
        `Microsoft.VSTS.Common.Priority,Microsoft.VSTS.Common.Severity,System.Tags` +
        `&api-version=7.1`,
    );
    items.push(...(batch.value || []));
  }
  return { iteration: iter, items };
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'login') {
    const { ctx, page } = await open(false);
    console.log(`\nOpening ${BOARD_URL}`);
    await page.goto(BOARD_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    console.log('\n>>> Sign in with your Microsoft account in the Chrome window that just opened.');
    console.log('>>> Waiting up to 10 minutes for the board to load...\n');

    const deadline = Date.now() + 10 * 60 * 1000;
    let ok = false;
    while (Date.now() < deadline) {
      const url = page.url();
      if (signedIn(url)) {
        ok = true;
        break;
      }
      await page.waitForTimeout(3000);
    }
    if (!ok) {
      console.log('TIMEOUT — still not signed in. Last URL:', page.url());
      await ctx.close();
      process.exit(2);
    }
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(OUT_DIR, 'board.png'), fullPage: true }).catch(() => {});
    console.log('Signed in. Board URL:', page.url());
    console.log('Session saved to', PROFILE_DIR);
    await ctx.close();
    return;
  }

  if (cmd === 'list') {
    const { ctx, page } = await open(true);
    await page.goto(BOARD_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    if (!signedIn(page.url())) {
      console.log('NOT SIGNED IN — run `login` first. URL:', page.url());
      await ctx.close();
      process.exit(3);
    }
    const { iteration, items } = await fetchSprintItems(ctx);
    const rows = items
      .map((w) => ({
        id: w.id,
        type: w.fields['System.WorkItemType'],
        title: w.fields['System.Title'],
        state: w.fields['System.State'],
        assignedTo: w.fields['System.AssignedTo']?.displayName ?? null,
        priority: w.fields['Microsoft.VSTS.Common.Priority'] ?? null,
        severity: w.fields['Microsoft.VSTS.Common.Severity'] ?? null,
        tags: w.fields['System.Tags'] ?? null,
      }))
      .sort((a, b) => a.id - b.id);
    fs.writeFileSync(
      path.join(OUT_DIR, `${ITERATION.replace(/\s+/g, '').toLowerCase()}.json`),
      JSON.stringify({ iteration: iteration.path, rows }, null, 2),
    );
    console.log(`\nIteration: ${iteration.path}  (${rows.length} work items)\n`);
    for (const r of rows) {
      console.log(`  #${r.id}  [${r.type}] [${r.state}] ${r.title}`);
    }
    await ctx.close();
    return;
  }

  if (cmd === 'states') {
    const { ctx } = await open(true);
    const wt = await api(
      ctx,
      `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitemtypes/Bug/states?api-version=7.1`,
    );
    console.log('\nValid Bug states:');
    for (const s of wt.value || []) console.log(`  ${s.name}  (category: ${s.category})`);
    await ctx.close();
    return;
  }

  if (cmd === 'rels') {
    const { ctx } = await open(true);
    const batch = await api(
      ctx,
      `https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${rest.join(',')}&$expand=relations&api-version=7.1`,
    );
    for (const w of batch.value || []) {
      console.log(
        `\n#${w.id} [${w.fields['System.State']}] ${w.fields['System.Title']}\n` +
          `   area=${w.fields['System.AreaPath']} tags=${w.fields['System.Tags'] ?? '-'}`,
      );
      const rels = (w.relations || []).filter((r: any) => /Link/.test(r.rel));
      if (!rels.length) console.log('   (no links)');
      for (const r of rels) {
        const id = String(r.url).split('/').pop();
        console.log(`   ${r.rel} -> #${id} ${r.attributes?.name ?? ''}`);
      }
    }
    await ctx.close();
    return;
  }

  if (cmd === 'comment') {
    const [id, file] = rest;
    if (!id || !file) {
      console.log('usage: ado.ts comment <workItemId> <htmlFile>');
      process.exit(1);
    }
    const text = fs.readFileSync(path.resolve(file), 'utf8');
    const { ctx } = await open(true);
    const url =
      `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workItems/${id}/comments` +
      `?api-version=7.1-preview.4`;
    const r = await ctx.request.post(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-TFS-FedAuthRedirect': 'Suppress',
      },
      data: { text },
    });
    const body = await r.text();
    if (r.ok()) {
      const parsed = JSON.parse(body);
      console.log(`OK #${id} → comment ${parsed.id} posted`);
    } else {
      console.log(`HTTP ${r.status()} posting to #${id}`);
      console.log(body.slice(0, 600));
      await ctx.close();
      process.exit(4);
    }
    await ctx.close();
    return;
  }

  if (cmd === 'details') {
    const { ctx } = await open(true);
    const ids = rest.join(',');
    const batch = await api(
      ctx,
      `https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${ids}&$expand=all&api-version=7.1`,
    );
    const strip = (h: any) =>
      String(h ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<li>/gi, '  - ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    const out: string[] = [];
    for (const w of batch.value || []) {
      const f = w.fields;
      out.push(`\n================ #${w.id} [${f['System.WorkItemType']}] [${f['System.State']}]`);
      out.push(`TITLE: ${f['System.Title']}`);
      out.push(`AREA: ${f['System.AreaPath']}  TAGS: ${f['System.Tags'] ?? '-'}`);
      out.push(`REPRO STEPS:\n${strip(f['Microsoft.VSTS.TCM.ReproSteps']) || '(empty)'}`);
      const desc = strip(f['System.Description']);
      if (desc) out.push(`DESCRIPTION:\n${desc}`);
      const sysinfo = strip(f['Microsoft.VSTS.TCM.SystemInfo']);
      if (sysinfo) out.push(`SYSTEM INFO:\n${sysinfo}`);
    }
    const text = out.join('\n');
    fs.writeFileSync(path.join(OUT_DIR, 'bug-details.txt'), text);
    console.log(text);
    await ctx.close();
    return;
  }

  if (cmd === 'bugs') {
    // Every Bug in the project that is not Closed/Removed — the duplicate check
    // has to look wider than the current sprint, since an existing report may
    // sit in an earlier iteration or the backlog.
    const { ctx } = await open(true);
    const wiql = await ctx.request.post(
      `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/wiql?api-version=7.1`,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-TFS-FedAuthRedirect': 'Suppress',
        },
        data: {
          query:
            `SELECT [System.Id] FROM WorkItems ` +
            `WHERE [System.TeamProject] = '${PROJECT}' ` +
            `AND [System.WorkItemType] = 'Bug' ` +
            `AND [System.State] NOT IN ('Closed', 'Removed', 'Done') ` +
            `ORDER BY [System.Id] DESC`,
        },
      },
    );
    const body = await wiql.text();
    if (!wiql.ok()) {
      console.log(`HTTP ${wiql.status()} running WIQL`);
      console.log(body.slice(0, 600));
      await ctx.close();
      process.exit(5);
    }
    const ids = (JSON.parse(body).workItems || []).map((w: any) => w.id);
    console.log(`\n${ids.length} open Bug work items in ${PROJECT}\n`);
    const rows: any[] = [];
    for (let i = 0; i < ids.length; i += 190) {
      const batch = await api(
        ctx,
        `https://dev.azure.com/${ORG}/_apis/wit/workitems?ids=${ids.slice(i, i + 190).join(',')}` +
          `&fields=System.Id,System.Title,System.State,System.Tags,System.AreaPath,System.IterationPath` +
          `&api-version=7.1`,
      );
      for (const w of batch.value || []) {
        const f = w.fields;
        rows.push({
          id: w.id,
          title: f['System.Title'],
          state: f['System.State'],
          iteration: f['System.IterationPath'],
          tags: f['System.Tags'] ?? null,
        });
        console.log(
          `  #${w.id}  [${f['System.State']}]  ${f['System.Title']}` +
            `   {${f['System.IterationPath']}}`,
        );
      }
    }
    fs.writeFileSync(path.join(OUT_DIR, 'open-bugs.json'), JSON.stringify(rows, null, 2));
    await ctx.close();
    return;
  }

  if (cmd === 'create') {
    // create <jsonFile> — the file holds the Bug's fields; see bugs/ado/*.json.
    const [file] = rest;
    if (!file) {
      console.log('usage: ado.ts create <jsonFile>');
      process.exit(1);
    }
    const spec = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
    const { ctx } = await open(true);

    // Resolve the real iteration path rather than hard-coding the separator.
    const base = `https://dev.azure.com/${ORG}/${PROJECT}/${encodeURIComponent(TEAM)}/_apis/work`;
    const iterations = await api(ctx, `${base}/teamsettings/iterations?api-version=7.1`);
    const iter = (iterations.value || []).find(
      (i: any) => i.name === ITERATION || String(i.path || '').endsWith(ITERATION),
    );
    if (!iter) throw new Error(`iteration "${ITERATION}" not found`);

    const patch: any[] = [
      { op: 'add', path: '/fields/System.Title', value: spec.title },
      { op: 'add', path: '/fields/System.AreaPath', value: spec.areaPath ?? PROJECT },
      { op: 'add', path: '/fields/System.IterationPath', value: iter.path },
      { op: 'add', path: '/fields/Microsoft.VSTS.TCM.ReproSteps', value: spec.reproSteps },
    ];
    if (spec.systemInfo) {
      patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.SystemInfo', value: spec.systemInfo });
    }
    if (spec.severity) {
      patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Severity', value: spec.severity });
    }
    if (spec.priority) {
      patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: spec.priority });
    }
    if (spec.tags) patch.push({ op: 'add', path: '/fields/System.Tags', value: spec.tags });

    const r = await ctx.request.post(
      `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems/$Bug?api-version=7.1`,
      {
        headers: {
          'Content-Type': 'application/json-patch+json',
          Accept: 'application/json',
          'X-TFS-FedAuthRedirect': 'Suppress',
        },
        data: patch,
      },
    );
    const body = await r.text();
    if (!r.ok()) {
      console.log(`HTTP ${r.status()} creating bug`);
      console.log(body.slice(0, 900));
      await ctx.close();
      process.exit(6);
    }
    const created = JSON.parse(body);
    console.log(`OK created Bug #${created.id} — ${spec.title}`);
    console.log(`   ${created._links?.html?.href ?? ''}`);
    await ctx.close();
    return;
  }

  if (cmd === 'tags') {
    // The project's existing tag definitions. Adding a tag that already exists
    // needs no special permission; minting a new one needs "create tags"
    // (TF401289 if the account lacks it).
    const { ctx } = await open(true);
    const t = await api(
      ctx,
      `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/tags?api-version=7.1-preview.1`,
    );
    const names = (t.value || []).map((x: any) => x.name).sort();
    console.log(`\n${names.length} tags defined in ${PROJECT}:\n`);
    for (const n of names) console.log(`  ${n}`);
    await ctx.close();
    return;
  }

  if (cmd === 'tag') {
    // tag "<tag name>" <ids...> — appends the tag, keeping any already set.
    const [tagName, ...ids] = rest;
    if (!tagName || !ids.length) {
      console.log('usage: ado.ts tag "<tag name>" <ids...>');
      process.exit(1);
    }
    const { ctx } = await open(true);
    for (const id of ids) {
      const cur = await api(
        ctx,
        `https://dev.azure.com/${ORG}/_apis/wit/workitems/${id}?fields=System.Tags&api-version=7.1`,
      );
      const existing = String(cur.fields?.['System.Tags'] ?? '')
        .split(';')
        .map((t: string) => t.trim())
        .filter(Boolean);
      if (existing.some((t: string) => t.toLowerCase() === tagName.toLowerCase())) {
        console.log(`  #${id} already tagged "${tagName}" — skipped`);
        continue;
      }
      const value = [...existing, tagName].join('; ');
      const r = await ctx.request.patch(
        `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems/${id}?api-version=7.1`,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
            Accept: 'application/json',
            'X-TFS-FedAuthRedirect': 'Suppress',
          },
          data: [{ op: 'add', path: '/fields/System.Tags', value }],
        },
      );
      const body = await r.text();
      if (!r.ok()) {
        console.log(`  #${id} HTTP ${r.status()} — ${body.slice(0, 250)}`);
        continue;
      }
      console.log(`  #${id} tags -> ${JSON.parse(body).fields['System.Tags']}`);
    }
    await ctx.close();
    return;
  }

  console.log('usage: ado.ts login | list | bugs | tags | tag "<name>" <ids...> | details <ids...> | comment <id> <file> | create <jsonFile>');
  process.exit(1);
})().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(1);
});
