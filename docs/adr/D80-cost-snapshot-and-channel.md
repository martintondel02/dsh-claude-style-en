# D80. Price and time-of-day snapshots travel through the repository; the host half prices a session

## Background

The conversation stats row has to show what this session cost. Plugins of the same kind either read another plugin's ledger or scrape the official pricing page on every machine; the former assumes that plugin exists, the latter puts the fragility of page parsing on every installation and makes every price change require a plugin update. Official prices also come in two currency tables that cannot be derived from each other, peak and off-peak tiers, and daily price changes, and a session may switch models midway.

## Decision

- Price is a snapshot: `packages/host/data/prices.json`, fetched daily by `.github/workflows/data.yml` from the official Chinese and English pricing pages, validated, and committed only when a value changes. Both the CNY and USD tables stay in the snapshot, covering the peak and off-peak tiers; the peak windows and Chinese statutory holidays come from the peak-rate catalog the same workflow refreshes.
- The installing end downloads only the validated snapshot: the host half reads the copy inside the package first, then the on-disk cache, and fetches once a day from the repository's CDN address (with the raw address as fallback), keeping the table it has when the fetch fails. The peak-rate catalog moves onto the same channel, so upstream is requested once a day, by the workflow only.
- The browser half reads the snapshot through a same-origin route, and the settled amount for a session id through another same-origin route; both go through the plugin's existing request fence.
- The host half computes the session amount: it folds every `assistant/message` / `assistant/attempt` in the conversation log, judging peak or off-peak by the event's own instant and taking its price by the event's own route, with a repeated report for the same `(turn, step)` replacing the earlier one; cache writes are priced at the hit rate, and reasoning tokens are already inside the output. The amount accumulates in millionths of a currency unit and is divided only when formatted.
- What the streaming phase adds is an estimate: the existing character estimate multiplied by the current route's output rate, on the same curve as the incoming tokens; the settled value replaces it when it arrives.
- Currency is a preference: both tables are in the snapshot, the setting only chooses which one, and no exchange rate takes part in pricing from the official tables.
- The official table covers only DeepSeek's two models on sale; the list prices of other models come from a public catalog (models.dev's USD price table), and the snapshot takes the median across vendors' quotes for the same model by field to compose one "input, cache read, output" line, excluding zero-price entries for planned channels. A model whose vendor also publishes a CNY price (K3) has a separate CNY row in the snapshot, used directly for CNY; a USD-only row is converted at the snapshot's fixed rate.

## Consequences

- The repository becomes the data source: a redesign of the official page fails one workflow run, and the table in users' hands keeps the previous version; a bad snapshot is stopped at build time by the same validator.
- A price-table update makes later sessions recompute under the new table, and history is not frozen — this plugin keeps no ledger; when reconciling penny by penny against the official bill, the bill is authoritative.
- Numbers during streaming are estimates and cover only the output side: prompt and cache wait for settlement, so the amount jumps once at each settlement.
- Catalog coverage goes by model id: quotes from different vendors under the same id are not distinguished, the amount for a subscription channel is the API list-price equivalent rather than the charge, and the fixed rate differs from the bank statement. A model neither the official table nor the catalog carries still shows no amount.
- Abandoned: reading another plugin's ledger (assuming it exists); parsing the official page in the browser (every machine pays for a page redesign); storing only the CNY table and multiplying by an exchange rate (the two official tables are not in an exchange-rate relation, and cross-currency differences reach several percent); writing the amount into the conversation log (the skin should not rewrite user data).
- The peak-rate catalog's source changes from a direct upstream connection to a repository mirror: upstream load falls from once per installation per day to once a day, at the cost of one more commit and one more workflow in the repository.

## Reconsider when

- When the host provides a per-session cost projection or an official price interface, the host half's folding connects to the host's.
- When the official side provides a machine-readable price document, the workflow's page parsing reads it directly.
- When a third use needs the same snapshot, the snapshot's validation and routes are extracted into a shared layer.
