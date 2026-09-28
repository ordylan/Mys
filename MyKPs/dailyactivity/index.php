<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily Activity</title>
  <style>
    :root { color-scheme: light; font-family: Georgia, 'Times New Roman', serif; color: #172121; background: #f1eee6; }
    body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #f1eee6, #dce8e1); }
    main { width: min(680px, calc(100% - 32px)); margin: 0 auto; padding: 52px 0; }
    .topp { color: #28745f; font: 700 12px/1.2 Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase; }
    h1 { font-size: clamp(38px, 8vw, 68px); line-height: .95; margin: 12px 0 18px; max-width: 560px; }
    .panel { background: #fffdf7; border: 1px solid #cbd8cf; border-radius: 8px; padding: 28px; box-shadow: 10px 12px 0 #bfd3c6; }
    .description, li, .reward { font: 16px/1.5 Arial, sans-serif; }
    .streak { margin: 18px 0; color: #28745f; font: 700 18px/1.4 Arial, sans-serif; }
    .note-count { margin: 8px 0 18px; color: #5d6b65; font: 14px/1.4 Arial, sans-serif; }
    ul { margin: 18px 0; padding-left: 24px; }
    li { margin: 10px 0; }
    li.done { color: #28745f; text-decoration: line-through; }
    .reward { border-top: 1px solid #d7dfd9; padding-top: 18px; }
    .reward-list { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
    .reward-item { display: flex; align-items: center; gap: 10px; min-width: 190px; padding: 10px; border: 1px solid var(--reward-color, #d7dfd9); border-radius: 6px; background: #fff; }
    .reward-item img, .reward-icon { width: 42px; height: 42px; object-fit: contain; border-radius: 5px; background: #f1eee6; }
    .reward-icon { display: grid; place-items: center; color: var(--reward-color, #28745f); font-weight: 700; }
    .reward-name { font-weight: 700; }
    .reward-quality { color: var(--reward-color, #28745f); font-size: 12px; }
    .bag-toggle { background: #fffdf7; color: #28745f; border: 1px solid #9ebbad; }
    .bag { margin-top: 22px; border-top: 1px solid #d7dfd9; padding-top: 18px; }
    .bag[hidden] { display: none; }
    .bag-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .bag-heading strong { font: 700 18px/1.4 Arial, sans-serif; }
    .bag-status { color: #5d6b65; font: 13px/1.4 Arial, sans-serif; }
    .bag-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 12px; }
    .bag-item { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--reward-color, #d7dfd9); border-radius: 6px; background: #fff; }
    .bag-item img, .bag-icon { width: 42px; height: 42px; object-fit: contain; border-radius: 5px; background: #f1eee6; }
    .bag-icon { display: grid; place-items: center; color: var(--reward-color, #28745f); font-weight: 700; }
    .bag-name { font: 700 15px/1.3 Arial, sans-serif; }
    .bag-quantity { color: var(--reward-color, #28745f); }
    .bag-meta { color: #5d6b65; font: 12px/1.4 Arial, sans-serif; }
    .switch { display: flex; gap: 8px; margin: 18px 0; }
    .switch button { margin-top: 0; background: #d5e2da; color: #172121; }
    .switch button.active { background: #28745f; color: white; }
    button { margin-top: 22px; border: 0; border-radius: 5px; padding: 13px 18px; background: #28745f; color: white; font: 700 14px Arial, sans-serif; cursor: pointer; }
    button:disabled { background: #9aa9a1; cursor: not-allowed; }
    #status { min-height: 24px; margin-top: 18px; font: 14px Arial, sans-serif; }
    .error { color: #a43d35; }
  </style>
</head>
<body>
  <main>
    <div class="topp">Current streak: <div id="streak" class="streak" aria-live="polite"></div></div>
    <div class="switch" aria-label="Activity period">
      <button id="dailyTab" type="button" class="active">Daily</button>
      <button id="weeklyTab" type="button">Weekly</button>
      <button id="bagToggle" type="button" class="bag-toggle" aria-expanded="false">My Bag</button>
    </div>
    <section id="bag" class="panel bag" hidden aria-live="polite">
      <div class="bag-heading"><strong>My Bag</strong><span id="bagStatus" class="bag-status"></span></div>
      <div id="bagList" class="bag-list"></div>
    </section>
    <h1 id="title">Loading your activity...</h1>
    <section class="panel" aria-live="polite">
      <p id="description" class="description"></p>
      <div id="noteCount" class="note-count" aria-live="polite" hidden></div>
      <ul id="conditions"></ul>
      <div id="reward" class="reward"></div>
      <button id="claim" type="button" disabled>Claim reward</button>
      <button id="waiver" type="button" disabled>Use waiver slip</button>
      <div id="status"></div>
    </section>
  </main>
  <script>
    let period = 'daily';
    const token = localStorage.getItem('ON_MyKPs_Token');
    const title = document.getElementById('title');
    const description = document.getElementById('description');
    const streak = document.getElementById('streak');
    const noteCount = document.getElementById('noteCount');
    const conditions = document.getElementById('conditions');
    const reward = document.getElementById('reward');
    const claim = document.getElementById('claim');
    const waiver = document.getElementById('waiver');
    const status = document.getElementById('status');
    const dailyTab = document.getElementById('dailyTab');
    const weeklyTab = document.getElementById('weeklyTab');
    const bagToggle = document.getElementById('bagToggle');
    const bag = document.getElementById('bag');
    const bagStatus = document.getElementById('bagStatus');
    const bagList = document.getElementById('bagList');
    let task;

    function apiUrl() { return `../api/dailyactivity.php?proj=MyKPs&period=${period}`; }

    function requestOptions(method) {
      return { method, headers: { Authorization: `KaoYanBiSheng ${token}`, 'Content-Type': 'application/json' } };
    }

    async function loadBag() {
      if (!token) throw new Error('Please sign in before opening My Bag.');
      bagStatus.textContent = 'Loading...';
      const response = await fetch('../api/dailyactivity.php?proj=MyKPs&action=bag', requestOptions('GET'));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load your bag.');
      bagList.replaceChildren();
      const items = (Array.isArray(data.items) ? data.items : []).filter(item => Number(item.type_id) !== 6);
      if (!items.length) {
        bagStatus.textContent = 'Empty';
        return;
      }
      bagStatus.textContent = `${items.length} item type(s)`;
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bag-item';
        card.style.setProperty('--reward-color', item.color || '#28745f');
        if (item.icon) {
          const image = document.createElement('img');
          image.src = item.icon;
          image.alt = item.name || item.code || 'Item';
          card.appendChild(image);
        } else {
          const icon = document.createElement('span');
          icon.className = 'bag-icon';
          icon.textContent = item.code ? item.code.slice(0, 2).toUpperCase() : '?';
          card.appendChild(icon);
        }
        const details = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'bag-name';
        const itemName = document.createElement('span');
        itemName.textContent = item.name || item.code || 'Item';
        const quantity = document.createElement('span');
        quantity.className = 'bag-quantity';
        quantity.textContent = ` × ${item.quantity}`;
        name.append(itemName, quantity);
        const meta = document.createElement('div');
        meta.className = 'bag-meta';
        meta.textContent = item.description || '';
        details.append(name, meta);
        card.appendChild(details);
        bagList.appendChild(card);
      });
    }

    bagToggle.addEventListener('click', async () => {
      const opening = bag.hidden;
      bag.hidden = !opening;
      bagToggle.setAttribute('aria-expanded', String(opening));
      if (!opening) return;
      try {
        await loadBag();
      } catch (error) {
        bagStatus.textContent = error.message;
        bagList.replaceChildren();
      }
    });

    function render(data) {
      task = data.task;
      title.textContent = task.title;
      description.textContent = task.description;
      streak.textContent = period === 'daily' ? `${Math.max(0, Number(task.streak_days) || 0)} day(s)` : '';
      const notes = Math.max(0, Number(task.note_count) || 0);
      noteCount.hidden = period !== 'daily' || notes === 0;
      noteCount.textContent = noteCount.hidden ? '' : `Notes: ${notes}`;
      conditions.replaceChildren(...task.conditions.map(item => {
        const node = document.createElement('li');
        node.textContent = `${item.text} (${item.progress_text || `${item.current}/${item.target}`})`;
        if (item.completed) node.className = 'done';
        return node;
      }));
      reward.replaceChildren();
      const rewardLabel = document.createElement('strong');
      rewardLabel.textContent = 'Reward';
      reward.appendChild(rewardLabel);
      const rewardList = document.createElement('div');
      rewardList.className = 'reward-list';
      (task.rewards || []).forEach(item => {
        const card = document.createElement('div');
        card.className = 'reward-item';
        card.style.setProperty('--reward-color', item.color || '#28745f');
        if (item.icon) {
          const image = document.createElement('img');
          image.src = item.icon;
          image.alt = item.name || item.code || 'Reward';
          card.appendChild(image);
        } else {
          const icon = document.createElement('span');
          icon.className = 'reward-icon';
          icon.textContent = item.code ? item.code.slice(0, 2).toUpperCase() : '?';
          card.appendChild(icon);
        }
        const details = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'reward-name';
        name.textContent = `${item.quantity} x ${item.name}`;
        const quality = document.createElement('div');
        quality.className = 'reward-quality';
        quality.textContent = `× ${item.quality || 1}`;
        details.append(name, quality);
        card.appendChild(details);
        rewardList.appendChild(card);
      });
      reward.appendChild(rewardList);
      claim.disabled = !task.completed || task.claimed;
      claim.textContent = task.claimed ? 'Reward claimed' : task.completed ? 'Claim reward' : 'Complete the activity';
      waiver.hidden = period !== 'daily';
      waiver.disabled = period !== 'daily' || notes < 1 || task.completed || task.claimed;
      status.textContent = task.claimed ? 'This activity has already been claimed.' : '';
      status.className = '';
    }

    async function load() {
      if (!token) throw new Error('Please sign in before opening Daily Activity.');
      const response = await fetch(apiUrl(), requestOptions('GET'));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load the activity.');
      render(data);
    }

    async function claimReward(useWaiver) {
      claim.disabled = true;
      waiver.disabled = true;
      status.textContent = 'Claiming...';
      try {
        const response = await fetch(apiUrl(), { ...requestOptions('POST'), body: JSON.stringify({ task_id: task.id, use_waiver: period === 'daily' && useWaiver }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to claim the reward.');
        render(data);
        status.textContent = 'Reward claimed successfully.';
      } catch (error) {
        status.textContent = error.message;
        status.className = 'error';
        render({ task });
      }
    }

    claim.addEventListener('click', () => claimReward(false));
    waiver.addEventListener('click', () => claimReward(true));
    dailyTab.addEventListener('click', () => switchPeriod('daily'));
    weeklyTab.addEventListener('click', () => switchPeriod('weekly'));

    async function switchPeriod(nextPeriod) {
      if (period === nextPeriod) return;
      period = nextPeriod;
      dailyTab.classList.toggle('active', period === 'daily');
      weeklyTab.classList.toggle('active', period === 'weekly');
      title.textContent = 'Loading your activity...';
      conditions.replaceChildren();
      await load();
    }

    load().catch(error => { status.textContent = error.message; status.className = 'error'; title.textContent = 'Daily Activity'; });
  </script>
</body>
</html>