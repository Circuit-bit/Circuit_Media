<main class="shell content-section">
  <div class="section-heading">
    <span class="section-kicker">Operations</span>
    <h1>Admin</h1>
    <p>Token-gated import and verification tools.</p>
  </div>
  <form id="admin-import-form" class="admin-form">
    <label>Admin token <input type="password" name="token" required autocomplete="off" /></label>
    <label>Provider
      <select name="provider">
        <option value="all">all</option>
        <option value="gsmarena">gsmarena</option>
        <option value="live">live</option>
      </select>
    </label>
    <label class="choice"><input type="checkbox" name="fullRefresh" /> Full refresh</label>
    <button class="primary-button" type="submit">Queue import</button>
    <pre id="admin-import-out" class="admin-out" hidden></pre>
  </form>
  <form id="admin-verify-form" class="admin-form">
    <h2>Verify field</h2>
    <label>Token <input type="password" name="token" required /></label>
    <label>Device ID <input name="deviceId" required /></label>
    <label>Field path <input name="fieldPath" required placeholder="specifications.Display.Type" /></label>
    <label>Source ID <input name="sourceId" required value="catalog" /></label>
    <label>Status
      <select name="status">
        <option value="verified">verified</option>
        <option value="conflicting">conflicting</option>
        <option value="unverified">unverified</option>
      </select>
    </label>
    <label>Note <input name="note" /></label>
    <button class="primary-button" type="submit">Verify</button>
    <pre id="admin-verify-out" class="admin-out" hidden></pre>
  </form>
</main>
