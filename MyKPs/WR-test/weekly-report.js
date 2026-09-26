(function(){
  let subjectKeys = [];    
let earliestDate = null;   
let subjectDisplayMap = {};  
// 科目颜色映射（与参考风格一致的色板）
const subjectColorMap = {};
const defaultColorPool = ['#e15759', '#4e79a7', '#f28e2b', '#59a14f', '#b07aa1', '#ffa200', '#9c755f', '#bab0ac'];
let colorPoolIndex = 0;
const pieLinesPlugin = {
  id: 'pieLines',
  afterDraw(chart) {
    if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;

    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data.length) return;

    const arcs = meta.data;
    const outerRadius = arcs[0].outerRadius;
    const centerX = arcs[0].x;
    const centerY = arcs[0].y;

    const baseFontSize =Math.max(14, outerRadius / 6);
    const font = `${baseFontSize}px Arial`;

    // 连线样式
    const lineColor = '#666';
    const lineWidth = 1.2;
    const textColor = '#333';
    const dotRadius = 2;
    const offset = Math.max(10, outerRadius * 0.2);

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';

    arcs.forEach((arc, i) => {
      const rawLabel = data.labels?.[i] ?? '';
      const rawValue = data.datasets[0]?.data?.[i] ?? '';

      let displayText = '';
      const labelCallback = chart.options.plugins?.tooltip?.callbacks?.label;
      if (typeof labelCallback === 'function') {
        const context = {
          label: rawLabel,
          raw: rawValue,
          dataIndex: i,
          datasetIndex: 0,
          dataset: chart.data.datasets[0],
          formattedValue: rawValue,
          chart: chart
        };
        displayText = labelCallback(context);
      } else {
        displayText = `${rawLabel}:${rawValue}`;
      }
      if (!displayText) return;

      const midAngle = (arc.startAngle + arc.endAngle) / 2;
      const edgeX = centerX + Math.cos(midAngle) * outerRadius;
      const edgeY = centerY + Math.sin(midAngle) * outerRadius;

      let labelX = centerX + Math.cos(midAngle) * (outerRadius + offset);
      let labelY = centerY + Math.sin(midAngle) * (outerRadius + offset);

      const isRight = Math.cos(midAngle) >= 0;
      ctx.textAlign = isRight ? 'left' : 'right';

      // 小圆点
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, dotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = lineColor;
      ctx.fill();

      // 连线
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(labelX, labelY);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // 文字
      ctx.fillStyle = textColor;
      ctx.fillText(displayText, labelX, labelY);
    });

    ctx.restore();
  }
};
const barValueLabels = {
  id: 'barValueLabels',
  afterDraw(chart) {
    if (chart.config.type !== 'bar') return;

    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data.length) return;

    const fontSize = 15;
    const font = `bold ${fontSize}px Arial`;
    const textColor = '#333';
    const offset = 6;

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';

    meta.data.forEach((bar, i) => {
      const rawValue = data.datasets[0].data[i];
      const rawLabel = data.labels?.[i] ?? '';

      let displayText = formatMinutesLabel(rawValue);
      if (!displayText) return;
      const x = bar.x;
      const y = bar.y;
      const labelX = x + offset;
      const labelY = y;
      ctx.textAlign = 'left';
      ctx.fillStyle = textColor;
      ctx.fillText(displayText, labelX, labelY);
    });

    ctx.restore();
  }
};
async function loadConfigAndInitRange() {
  try {
    if (db && db.objectStoreNames.contains('AppConfig')) {
      const tx = db.transaction(['AppConfig'], 'readonly');
      const store = tx.objectStore('AppConfig');
      const config = await new Promise((res, rej) => {
        const req = store.get('main');
        req.onsuccess = () => res(req.result);
        req.onerror = rej;
      });
      if (config && config.subjects) {
        subjectKeys = config.subjects.map(s => s.key);
        config.subjects.forEach(s => {
          subjectDisplayMap[s.key] = s.displayName;
          // 为每个科目分配颜色
          if (!subjectColorMap[s.key]) {
            subjectColorMap[s.key] = defaultColorPool[colorPoolIndex % defaultColorPool.length];
            colorPoolIndex++;
          }
        });
      }
    }
  } catch (e) {
    console.warn('无法读取AppConfig');
  }

  try {
    if (db && db.objectStoreNames.contains('DailyPlans')) {
      const tx = db.transaction(['DailyPlans'], 'readonly');
      const store = tx.objectStore('DailyPlans');
      const index = store.index('date');
      const req = index.openCursor(null, 'next'); // 按日期升序第一个
      const record = await new Promise((res) => {
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          res(cursor ? cursor.value : null);
        };
        req.onerror = () => res(null);
      });
      if (record && record.date) {
        earliestDate = new Date(record.date);
      }
    }
  } catch (e) {
    console.warn('无法查询最早日期');
  }

  if (!earliestDate) earliestDate = new Date(2025, 11, 1);
}
  const DB_NAME = 'MyKPs';
  const DAILY_STORE = 'DailyPlans';
  let db = null;

  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const loadBtn = document.getElementById('loadBtn');
  const viewSelect = document.getElementById('viewSelect');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // 快速选择按钮元素
  const quickAllBtn = document.getElementById('quickAllBtn');
  const quick30DBtn = document.getElementById('quick30DBtn');
  const quick7DBtn = document.getElementById('quick7DBtn');

  // Quote carousel elements
  const quoteTextEl = document.getElementById('quoteText');
  const quoteIntervalEl = document.getElementById('quoteInterval');

  const overviewCards = document.getElementById('overviewCards');
  // Grab canvas elements so we can apply DPR scaling to avoid blurry charts on high-DPI screens
  const subjectCanvas = document.getElementById('subjectChart');
  const trendCanvas = document.getElementById('trendChart');
  const activeTimeCanvas = document.getElementById('activeTimeChart');
  const kpsCanvas = document.getElementById('kpsChart');
  const rankCanvas = document.getElementById('rankChart');
  //const dailyMinutesCanvas = document.getElementById('dailyMinutesChart');
  const subjectCtx = subjectCanvas.getContext('2d');
  const trendCtx = trendCanvas.getContext('2d');
  const activeTimeCtx = activeTimeCanvas.getContext('2d');
  const kpsCtx = kpsCanvas.getContext('2d');
  const rankCtx = rankCanvas.getContext('2d');
  //const dailyMinutesCtx = dailyMinutesCanvas ? dailyMinutesCanvas.getContext('2d') : null;
  const detailsTbody = document.querySelector('#detailsTable tbody');
  const overviewPanel = document.getElementById('overview');
  const tablePanel = document.getElementById('tableView');

  // 放大功能相关元素
  const zoomModal = document.getElementById('zoomModal');
  const closeBtn = document.querySelector('.close-btn');
  const zoomChartCanvas = document.getElementById('zoomChart');
  const zoomChartCtx = zoomChartCanvas.getContext('2d');
  const zoomChartTitle = document.getElementById('zoomChartTitle');
  
  let subjectChart, trendChart, activeTimeChart, kpsChart, rankChart, zoomChart, dailyMinutesChart;
  // KPs mapping cache (uniqueId -> name)
  let kpsMap = null;
  // 添加一个变量来跟踪当前放大的图表类型
  let currentZoomChartType = null;

  // Enhanced combinatorial quote segments with randomized variables and random time between 22:00 and 01:00.
  const starters = [
    '{night}, ', '{night} at this hour, ', 'As {night} settles in, ', 'Late at night, ', 'When {night} arrives, ', 'In the quiet of {night}, ', 'At this moment, ', 'When the world is still, ', 'With the lights still on, ', 'As the clock moves past midnight, '
  ];
  const middles = [
    '{verb} one important thing, ', 'finish the most important task first, ', 'beat procrastination for a while, ', 'focus for a short stretch, ', 'break the task into small steps, ', 'make a small breakthrough on the hard part, ', 'clear the first item on the list, ',
    'stay deep-focused for twenty minutes, ', 'use a pomodoro to push progress, ', 'complete today\'s study block, ', 'advance the current task to the next stage, ', 'start with the hardest part, ', 'complete a key milestone before midnight, '
  ];
  const endings = [
    'you will be grateful for your future self.', 'this is a gentle investment in tomorrow.', 'tomorrow will feel different because of tonight.', 'keep going a little longer and the results will appear.', 'remember to rest well too.', 'this effort will become your strength.',
    'even a small improvement counts as a win today.', 'give yourself a clear finish line for tomorrow.', 'small victories accumulate into lasting progress.', 'this discipline will turn into real capability.'
  ];

  const inserts = [
    'hold on until {time}, ', 'continue until {time}, ', 'aim for {time}, ', 'keep going through the night, ', 'stick with it for an hour, ', '', 'keep it going for half an hour, ', 'move with intention, ', 'record the outcome before you stop, '
  ];

  const nightSyns = ['night', 'the late hour', 'midnight', 'the quiet night', 'the dark hour', 'the stillness of night'];
  const adjSyns = ['calm', 'quiet', 'steady', 'gentle', 'peaceful', 'serene'];
  const verbSyns = ['finish', 'solve', 'focus on', 'tackle', 'advance', 'start', 'break through', 'make progress on', 'complete'];

  const timeFormats = [
    d => `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => `around ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => `about ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => `around ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} or so`
  ];

  // estimate minute slots between 22:00 and 01:00 (inclusive) => 180 minutes
  const timeSlotCount = 181; // 0..180 minutes

  const comboModeEl = document.getElementById('comboMode');
  const regenQuoteBtn = document.getElementById('regenQuoteBtn');
  const comboCountEl = document.getElementById('comboCount');

  function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function randomTimeBetween22and1(){
    // base at today's 22:00
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);
    const offset = Math.floor(Math.random() * timeSlotCount); // minutes
    const d = new Date(base.getTime() + offset * 60 * 1000);
    return d;
  }

  function formatRandomTime(d){
    const fmt = pickRandom(timeFormats);
    // for nicer localized hour display: adjust hours to 24h format
    return fmt(d);
  }

  function replacePlaceholders(template){
    return template.replace(/\{night\}/g, pickRandom(nightSyns))
      .replace(/\{adj\}/g, pickRandom(adjSyns))
      .replace(/\{verb\}/g, pickRandom(verbSyns))
      .replace(/\{time\}/g, () => formatRandomTime(randomTimeBetween22and1()));
  }

  function generateComboQuote(){
    const s = pickRandom(starters);
    const m = pickRandom(middles);
    const midInsert = pickRandom(inserts);
    const e = pickRandom(endings);
    const raw = `${s}${m}${midInsert}${e}`.replace(/\s+/g,' ').trim();
    return replacePlaceholders(raw);
  }

  function computeComboCount(){
    // rough lower-bound: starters * middles * endings * inserts * synonyms * timeSlots * timeFormats
    const base = starters.length * middles.length * endings.length * inserts.length;
    const synVariants = nightSyns.length * adjSyns.length * verbSyns.length;
    const fmtVariants = timeFormats.length;
    const approx = base * synVariants * timeSlotCount * fmtVariants;
    // if inserts include empty string, base may be smaller; show approx as rounded
    return approx;
  }

  // Load KPs mapping from IndexedDB (store 'KPs'), fallback to local my.json if available
  function loadKpsMap(){
    return new Promise((resolve)=>{
      kpsMap = {};
      try{
        if(db && db.objectStoreNames && db.objectStoreNames.contains('KPs')){
          const tx = db.transaction(['KPs'],'readonly');
          const store = tx.objectStore('KPs');
          const req = store.getAll();
          req.onsuccess = () => {
            (req.result||[]).forEach(k=>{ if(k.uniqueId) kpsMap[k.uniqueId]=k.name; });
            resolve(kpsMap);
          };
          req.onerror = () => resolve(kpsMap);
          return;
        }
      }catch(e){ /* ignore, fallback */ }
      resolve(kpsMap);
    });
  }

  const staticQuotes = [
    'For a better you — work a little later tonight and rest after progress.',
    'Finishing today\'s tasks is a gentle investment in tomorrow.',
    'Opening your notes late at night often leads to unexpected breakthroughs.',
    'Never underestimate nightly accumulation; it leads to transformation.',
    'When you work through the night, time quietly works for you.',
    'Persist a little longer — tomorrow will thank you.'
  ];

  let quoteTimer = null;

  // Utility to display a quote in the UI container with a small fade effect
  function showQuoteText(text){ if(!quoteTextEl) return; quoteTextEl.classList.remove('visible'); setTimeout(()=>{ quoteTextEl.textContent = text || ''; quoteTextEl.classList.add('visible'); }, 60); }

  // Simple QuoteGenerator with combinatorial generation and a carousel starter
  const QuoteGenerator = (function(){
    function computeComboCount(){
      const base = starters.length * middles.length * endings.length * inserts.length;
      const synVariants = nightSyns.length * adjSyns.length * verbSyns.length;
      const fmtVariants = timeFormats.length;
      return base * synVariants * timeSlotCount * fmtVariants;
    }

    function generate(opts){
      const combo = opts && opts.combo;
      if(combo) return generateComboQuote();
      return pickRandom(staticQuotes);
    }

    function startCarousel(opts){
      const container = opts && opts.container;
      const intervalSec = (opts && opts.interval) || 6;
      const combo = opts && opts.combo;
      let handle = { stopped: false };
      function tick(){ if(handle.stopped) return; const txt = generate({ combo }); if(container) showQuoteText(txt); if(typeof opts.onChange === 'function') opts.onChange(txt); }
      tick();
      const tid = setInterval(tick, Math.max(2, intervalSec) * 1000);
      handle.stop = ()=>{ if(!handle.stopped){ clearInterval(tid); handle.stopped = true; } };
      return handle;
    }

    return { generate, startCarousel, computeComboCount };
  })();

  // Attach basic quote UI events
  (function attachQuoteEvents(){
    const container = document.getElementById('quoteCarousel');
    let carouselHandle = null;
    function start(){
      if(carouselHandle && typeof carouselHandle.stop === 'function') carouselHandle.stop();
      const sec = Math.max(2, parseInt(quoteIntervalEl && quoteIntervalEl.value, 10) || 6);
      const combo = comboModeEl ? comboModeEl.checked : false;
      carouselHandle = QuoteGenerator.startCarousel({ container: quoteTextEl, interval: sec, combo: combo, pauseOnHover: true });
    }
    function stop(){ if(carouselHandle && typeof carouselHandle.stop === 'function') carouselHandle.stop(); carouselHandle = null; }
    if(container){ container.addEventListener('mouseenter', stop); container.addEventListener('mouseleave', start); }
    if(quoteIntervalEl) quoteIntervalEl.addEventListener('change', start);
    if(comboModeEl) comboModeEl.addEventListener('change', start);
    if(regenQuoteBtn) regenQuoteBtn.addEventListener('click', ()=>{ const combo = comboModeEl ? comboModeEl.checked : false; showQuoteText(QuoteGenerator.generate({ combo })); });
    // show initial
    start();
  })();

  // 图表放大功能
  function initZoomFunctionality() {
    // 为每个放大按钮添加点击事件
    document.querySelectorAll('.zoom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const chartType = btn.getAttribute('data-chart');
        openZoomModal(chartType);
      });
    });

    // 关闭按钮事件
    closeBtn.addEventListener('click', closeZoomModal);

    // 点击模态框背景关闭
    zoomModal.addEventListener('click', (e) => {
      if (e.target === zoomModal) {
        closeZoomModal();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && zoomModal.style.display === 'block') {
        closeZoomModal();
      }
    });

    // 窗口大小变化处理
    window.addEventListener('resize', handleWindowResize);
  }

  function openZoomModal(chartType) {
    if (!chartType) return;
    
    currentZoomChartType = chartType;
    
    // 设置标题
    const titles = {
      'category': 'Category Distribution',
      'trend': 'Task Completion Trend',
      'tag': 'Top Tags',
      'dailyCategory': 'Daily Category Distribution',
      'dailyMinutesLine': 'Daily Learning Minutes'
    };
    zoomChartTitle.textContent = titles[chartType] || 'Chart';
    
    // 显示模态框
    zoomModal.style.display = 'block';
    
    // 延迟创建图表以确保DOM完全渲染
    setTimeout(() => {
      try {
        // 销毁现有图表
        if (zoomChart) {
          zoomChart.destroy();
          zoomChart = null;
        }
        
        let smallChart, chartConfig;
        switch(chartType) {
          case 'subject':
            smallChart = subjectChart;
            chartConfig = getSubjectChartConfig(true);
            break;
          case 'trend':
            smallChart = trendChart;
            chartConfig = getTrendChartConfig(true);
            break;
          case 'knowledgePoint':
            smallChart = kpsChart;
            chartConfig = getKnowledgePointChartConfig(true);
            break;
          case 'rank':
            smallChart = rankChart;
            chartConfig = getRankChartConfig(true);
            break;
         // case 'dailyMinutesLine':
          //  smallChart = dailyMinutesChart;
          //  chartConfig = getDailyMinutesLineConfig(true);
          //  break;
          default:
            console.error('Unknown chart type:', chartType);
            return;
        }
        
        // 验证配置的有效性
        if (!chartConfig) {
          console.error('Chart config is null or undefined for type:', chartType);
          createPlaceholderChart(chartType);
          return;
        }
        
        // 确保必要的属性存在
        if (!chartConfig.type) {
          console.error('Chart config missing type property:', chartConfig);
          chartConfig.type = 'bar'; // 默认类型
        }
        
        if (!chartConfig.data) {
          chartConfig.data = { labels: [], datasets: [] };
        }
        
        if (!chartConfig.options) {
          chartConfig.options = {};
        }
        
        chartConfig.options = chartConfig.options || {};
        
        // 调整配置适应大图显示
        chartConfig.options.responsive = true;
        chartConfig.options.maintainAspectRatio = false;
        
        if (chartConfig && window.currentStats) {
          // 应用与主图相同的DPR处理逻辑
          function scaleCanvasForDisplay(canvas){
            if(!canvas) return;
            const ratio = window.devicePixelRatio || 1;
            const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
            const cssH = canvas.clientHeight || Math.max(150, cssW * 0.5);
            if(canvas.width !== Math.floor(cssW * ratio) || canvas.height !== Math.floor(cssH * ratio)){
              canvas.style.width = cssW + 'px';
              canvas.style.height = cssH + 'px';
              canvas.width = Math.floor(cssW * ratio);
              canvas.height = Math.floor(cssH * ratio);
              
              const ctx = canvas.getContext('2d');
              ctx.scale(ratio, ratio);
            }
          }
          
          // 设置大图画布尺寸
          const container = document.querySelector('.zoom-chart-container');
          zoomChartCanvas.style.width = container.clientWidth + 'px';
          zoomChartCanvas.style.height = container.clientHeight + 'px';
          
          // 应用DPR缩放处理
          scaleCanvasForDisplay(zoomChartCanvas);
          
          // 创建放大版图表
          try {
            zoomChart = new Chart(zoomChartCtx, chartConfig);
            console.log('Zoom chart created successfully for type:', chartType);
          } catch (chartError) {
            console.error('Error creating Chart.js instance:', chartError);
            createPlaceholderChart(chartType);
          }
        } else {
          console.warn('Missing chart data or stats for type:', chartType);
          createPlaceholderChart(chartType);
        }
      } catch (error) {
        console.error('Error creating zoom chart:', error);
        createPlaceholderChart(chartType);
      }
    }, 150);
  }

  function closeZoomModal() {
    if (zoomChart) {
      zoomChart.destroy();
      zoomChart = null;
    }
    zoomModal.style.display = 'none';
    currentZoomChartType = null;
  }

  // 处理窗口大小变化
  function handleWindowResize() {
    if (zoomChart && currentZoomChartType) {
      try {
        // 重新计算容器尺寸
        const container = document.querySelector('.zoom-chart-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        
        // 更新画布尺寸
        zoomChartCanvas.style.width = containerWidth + 'px';
        zoomChartCanvas.style.height = containerHeight + 'px';
        zoomChartCanvas.width = Math.floor(containerWidth * ratio);
        zoomChartCanvas.height = Math.floor(containerHeight * ratio);
        
        const ctx = zoomChartCanvas.getContext('2d');
        ctx.scale(ratio, ratio);
        
        // 重新渲染图表
        zoomChart.resize();
      } catch (error) {
        console.error('Error resizing zoom chart:', error);
      }
    }
  }

  function formatMinutesLabel(minutes){
    const total = Math.max(0, Math.round(minutes || 0));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  function getSubjectChartConfig(isZoomed = false) {
    const learningStats = window.currentLearningStats;
    const entries = Object.entries(learningStats && learningStats.byCategory ? learningStats.byCategory : {})
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const labels = entries.map(item => subjectDisplayMap[item.name] || item.name);
    const values = entries.map(item => item.minutes);
    const bgColors = entries.map(item => {
      return subjectColorMap[item.name] || '#999';
    });

return {
  type: 'pie',
  data: {
    labels,
    datasets: [{
      data: values,
      backgroundColor: bgColors
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 35,
        bottom: 35,
        left: 60,
        right: 60
      }
    },
    plugins: {
      legend: {
        display: false,
        position: isZoomed ? 'right' : 'bottom',
        labels: {
          padding: isZoomed ? 20 : 10,
          font: { size: isZoomed ? 14 : 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatMinutesLabel(ctx.raw)}`
        }
      }
    }
  },
  plugins: [pieLinesPlugin]
};
  }

  function getKnowledgePointChartConfig(isZoomed = false) {
    const learningStats = window.currentLearningStats;
    const entries = Object.entries(learningStats && learningStats.byKp ? learningStats.byKp : {})
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const labels = entries.map(item => item.name);
    const values = entries.map(item => item.minutes);
    const kpSubjectMap = learningStats ? learningStats.kpSubjectMap : {};
    const bgColors = entries.map(item => {
      const subjectKey = kpSubjectMap[item.name] || '';
      return subjectColorMap[subjectKey] || '#999';
    });

    return {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors
        }]
      },
      options: {layout: {
      padding: {
        top: 48,
        bottom: 48,
        left: 70,
        right: 70
      }
    },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {display: false,
            position: isZoomed ? 'right' : 'bottom',
            labels: {
              padding: isZoomed ? 20 : 10,
              font: { size: isZoomed ? 14 : 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatMinutesLabel(ctx.raw)}`
            }
          }
        }
      },
  plugins: [pieLinesPlugin] 
    };
  }

  function getRankChartConfig(isZoomed = false) {
    const learningStats = window.currentLearningStats;
    const entries = Object.entries(learningStats && learningStats.byKp ? learningStats.byKp : {})
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 15);

    const labels = entries.map(item => item.name);
    const values = entries.map(item => item.minutes);
    const kpSubjectMap = learningStats ? learningStats.kpSubjectMap : {};
    const bgColors = entries.map(item => {
      const subjectKey = kpSubjectMap[item.name] || '';
      return subjectColorMap[subjectKey] || '#2b8be9';
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Learning Time',
          data: values,
          backgroundColor: bgColors
        }]
      },
      options: {layout: {
      padding: {
        right: 80
      }
    },
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatMinutesLabel(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: (value) => `${value}m` }
          },
          y: {
            ticks: { autoSkip: false }
          }
        }
      },
  plugins: [barValueLabels]
    };
  }

  function getDailyMinutesLineConfig(isZoomed = false) {
    const dates = window.currentDates || [];
    const learningByDate = window.currentLearningStats ? window.currentLearningStats.byDate : {};
    const values = dates.map(d => learningByDate[d] || 0);

    return {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Learning Minutes',
          data: values,
          borderColor: '#d4980a',
          backgroundColor: 'rgba(212,152,10,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#d4980a',
          borderWidth: 1.8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const min = ctx.raw;
                const h = Math.floor(min / 60);
                const m = Math.round(min % 60);
                return `Learning ${h}h${m}m`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: isZoomed ? 20 : 10, font: { size: 10 }, color: '#999', maxRotation: 45 },
            grid: { color: '#f0ede6' }
          },
          y: {
            title: { display: true, text: 'Minutes', font: { size: 11 }, color: '#888' },
            ticks: { font: { size: 10 }, color: '#999', maxTicksLimit: 8 },
            grid: { color: '#f0ede6' },
            beginAtZero: true
          }
        }
      }
    };
  }

function getTrendChartConfig(isZoomed = false) {
  const dates = window.currentDates || [];
  const trendValues = dates.map(d => window.currentStats.byDate[d] || 0);
  const weightedCompletedValues = dates.map(d =>
    window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d]
      ? window.currentStats.byDateWeighted[d] : 0
  );

  const totalTasksSum = dates.reduce((sum, d) => sum + (window.currentStats.byDate[d] || 0), 0);
  const averageDailyTasks = totalTasksSum / dates.length || 1;

  const relativeCompletionRate = dates.map((d) => {
    const total = window.currentStats.byDate[d] || 0;
    const completed = window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d]
      ? window.currentStats.byDateWeighted[d] : 0;
    const rawRate = total === 0 ? 0 : (completed / total);
    const taskWeight = Math.min(total / averageDailyTasks, 1);
    return rawRate * taskWeight;
  });

  const rawCompletionRate = dates.map(d => {
    const total = window.currentStats.byDate[d] || 0;
    const completed = window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d]
      ? window.currentStats.byDateWeighted[d] : 0;
    return total === 0 ? 0 : (completed / total);
  });

  const learningByDate = window.currentLearningStats ? window.currentLearningStats.byDate : {};
  const minutesValues = dates.map(d => learningByDate[d] || 0);
  const enjoyByDate = window.currentLearningStats ? window.currentLearningStats.enjoyByDate : {};
  const enjoyValues = dates.map(d => enjoyByDate[d] || 0);
  return {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Completed',
          data: weightedCompletedValues,
          backgroundColor: 'rgba(102, 187, 106, 0.48)',
          stack: 'stack1',
          order: 1
        },
        {
          label: 'Total',
          data: trendValues,
          backgroundColor: 'rgba(160, 204, 251, 0.4)',
          stack: 'stack1',
          order: 1
        },
        {
          label: 'Relative Completion',
          data: relativeCompletionRate,
          type: 'line',
          borderColor: '#cf27b0e4',
          backgroundColor: 'rgba(207, 39, 176, 0.1)',
          fill: false,
          tension: 0.2,
          pointRadius: 3,
          yAxisID: 'y1',
          hidden: false,
          order: 2
        },
        {
          label: 'Completion Rate',
          data: rawCompletionRate,
          type: 'line',
          borderColor: '#e94e2b',
          borderDash: [5, 5],
          backgroundColor: 'rgba(233, 78, 43, 0.1)',
          fill: false,
          tension: 0.2,
          pointRadius: 3,
          yAxisID: 'y1',
          hidden: true,
          order: 2
        },
        {
          label: 'Learning Minutes',
          data: minutesValues,
          type: 'line',
          borderColor: '#e2a311',
          backgroundColor: 'rgba(212, 151, 10, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          yAxisID: 'y2',
          hidden: false,
          order: 6 
        },  {
          label: 'Enjoy Time',
          data: enjoyValues,
          type: 'line',
          borderColor: '#87CEEB',
          backgroundColor: 'rgba(135, 206, 235, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          yAxisID: 'y2',
          hidden: false,
          order: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: { maxRotation: 0, minRotation: 0 }
        },
        y: {
          stacked: false,
          beginAtZero: true
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          max: 1,
          min: 0,
          grid: {
            drawOnChartArea: false
          }
        },
        y2: {
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: 'Minutes'
          },
          afterFit(axis) {
            axis.paddingRight = 40;
          }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === 'Learning Minutes') {
                const min = ctx.raw;
                const h = Math.floor(min / 60);
                const m = Math.round(min % 60);
                return `Learning: ${h}h ${m}m`;
              }
              else if (ctx.dataset.label === 'Enjoy Time') {
                const min = ctx.raw;
                const h = Math.floor(min / 60);
                const m = Math.round(min % 60);
                return `Enjoy: ${h}h ${m}m`;
              }
              return ctx.dataset.label + ': ' + ctx.formattedValue;
            }
          }
        }
      }
    }
  };
}

  function renderOverviewCards(stats, relativeAvgRate = 0, learningStats = null){
    const totalTasks = stats.totalTasks || stats.total || 0;
    const score = stats.score || 0;
    const totalPoints = stats.totalPoints || (totalTasks * 2);
    const rate = totalPoints===0 ? 0 : Math.round((score/totalPoints)*100);
    const actualLearningStats = learningStats || window.currentLearningStats || {};
    const totalLearningMinutes = Object.values(actualLearningStats.byDate || {}).reduce((sum, value) => sum + (value || 0), 0);
    const activeDays = Object.keys(actualLearningStats.byDate || {}).length;
    const avgLearningMinutes = activeDays > 0 ? Math.round(totalLearningMinutes / activeDays) : 0;

    overviewCards.innerHTML = '';
    const tpl = (title, val) => {
      const c = document.createElement('div'); c.className='card';
      c.innerHTML = `<h3>${title}</h3><p>${val}</p>`; return c;
    };

    overviewCards.appendChild(tpl('Total Tasks', totalTasks));

    const originalPercent = rate;
    const newPercent = Math.round(relativeAvgRate * 100) || 0;
    const completionRateDisplay = `${originalPercent}%/${newPercent}%`;
    overviewCards.appendChild(tpl('Completion Rate', completionRateDisplay));

    overviewCards.appendChild(tpl('Learning Time', `${formatMinutesLabel(totalLearningMinutes)} / ${formatMinutesLabel(avgLearningMinutes)}/day`));
  }

  function renderTable(items){
    detailsTbody.innerHTML = '';
    items.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    for(const it of items){
      const tr = document.createElement('tr');
      const statusText = it.status === 1 ? 'Done' : (it.status === 0 ? 'Half' : (it.status === -1 ? 'Fail' : 'Pending'));
      const kpName = it.kpsId ? ((kpsMap && kpsMap[it.kpsId]) ? kpsMap[it.kpsId] : `[KPS:${it.kpsId}]`) : '';
      const content = it.content || '';
      const statusClass = it.status === 1 ? 'status-done' : (it.status === 0 ? 'status-half' : (it.status === -1 ? 'status-fail' : ''));
      const statusHtml = `<span class="status-badge ${statusClass}">${statusText}</span>`;
      const categoryDisplay = subjectDisplayMap[it.category] || it.category || '';
      tr.innerHTML = `<td>${it.date||''}</td><td>${escapeHtml(categoryDisplay)}</td><td>${escapeHtml(it.tag||'')}</td><td>${escapeHtml(kpName)}</td><td class="content-cell">${escapeHtml(content)}</td><td>${statusHtml}</td>`;
      detailsTbody.appendChild(tr);
    }
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // 添加日期输入防抖功能
  let dateChangeTimer = null;
  
  function debounceDateChange() {
    // 清除之前的定时器
    if (dateChangeTimer) {
      clearTimeout(dateChangeTimer);
    }
    
    // 设置新的定时器，1秒后执行
    dateChangeTimer = setTimeout(() => {
      console.log('Date input unchanged for 1 second, auto-generating report...');
      // 自动触发报告生成
      loadAndRender();
    }, 1000);
  }

  // 为主日期输入框添加事件监听器
  if (startDateEl) {
    startDateEl.addEventListener('input', debounceDateChange);
  }
  
  if (endDateEl) {
    endDateEl.addEventListener('input', debounceDateChange);
  }

  async function fetchLearningLogs(startISO, endISO){
    const API_BASE = 'https://on.ordylan.com/MyKPs/api/NNTT_api.php?proj=MyKPs';
    const url = `${API_BASE}&action=getLogs&start=${startISO}&end=${endISO}`;
    const token = localStorage.getItem('ON_MyKPs_Token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'KaoYanBiSheng ' + token;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const json = await res.json();
      if (json && json.error) throw new Error(json.error);
      return Array.isArray(json) ? json : (json && Array.isArray(json.logs) ? json.logs : []);
    } catch (err) {
      console.warn('Learning API unavailable, falling back to task data.', err);
      return [];
    }
  }

  // main load flow
  async function loadAndRender(){
    const s = startDateEl.value; const e = endDateEl.value;
    if(!s || !e){ alert('Please select start and end dates'); return; }
    if(s > e){ alert('Start date cannot be later than end date'); return; }
    try{
      try{ await loadKpsMap(); }catch(e){ /* ignore */ }
      const [items, logs] = await Promise.all([fetchRange(s, e), fetchLearningLogs(s, e)]);

      window.currentRawData = { items, logs };
      const summary = summarizeRecords(items, s, e);
      const learningStats = buildLearningStats(logs, summary.dates);
      window.currentLearningStats = learningStats;
      renderOverviewCards(summary.stats, summary.relativeAvgRate, learningStats);
      renderActiveTimeChart(logs);
      renderCharts(summary, logs);
      renderHeatmap(logs, s, e);
      renderTable(items);
    }catch(err){ console.error(err); alert('Failed to load data, please check console'); }
  }

  function getLogTimeRange(item) {
    if (!item) return null;
    const startValue = item.a || item.start || item.startTime || item.startedAt || item.timestamp || item.time;
    const endValue = item.b || item.end || item.endTime || item.finishedAt;
    if (!startValue) return null;
    const start = new Date(startValue);
    if (Number.isNaN(start.getTime())) return null;
    const end = endValue ? new Date(endValue) : start;
    return { start, end: Number.isNaN(end.getTime()) ? start : end };
  }

  function buildActiveTimeData(items = []) {
    const learningMinutes = Array(144).fill(0);
    const enjoyMinutes = Array(144).fill(0);
    (items || []).forEach(item => {
      const range = getLogTimeRange(item);
      if (!range) return;
      const category = String(item.subject || item.category || item.s || 'other').toLowerCase();
      const minutes = category === 'enjoy' ? enjoyMinutes : learningMinutes;
      const start = range.start;
      const end = range.end > start
        ? range.end
        : new Date(start.getTime() + extractLearningMinutes(item) * 60000);

      const firstDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      for (const day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
        for (let slot = 0; slot < minutes.length; slot++) {
          const slotStart = new Date(day);
          slotStart.setMinutes(slot * 10);
          const slotEnd = new Date(slotStart.getTime() + 10 * 60000);
          const overlapStart = Math.max(start.getTime(), slotStart.getTime());
          const overlapEnd = Math.min(end.getTime(), slotEnd.getTime());
          if (overlapEnd > overlapStart) {
            minutes[slot] += (overlapEnd - overlapStart) / 60000;
          }
        }
      }
    });
    return { learningMinutes, enjoyMinutes };
  }

  function renderActiveTimeChart(logs = []) {
    window.currentActiveTimeData = buildActiveTimeData(logs);
    const summary = document.getElementById('activeTimeSummary');
    if (summary) {
      const learningTotal = window.currentActiveTimeData.learningMinutes.reduce((sum, value) => sum + value, 0);
      const enjoyTotal = window.currentActiveTimeData.enjoyMinutes.reduce((sum, value) => sum + value, 0);
      summary.textContent = `${formatMinutesLabel(learningTotal)} learning / ${formatMinutesLabel(enjoyTotal)} enjoy`;
    }
  }

  function getActiveTimeChartConfig() {
    const activeTimeData = window.currentActiveTimeData || {
      learningMinutes: Array(144).fill(0),
      enjoyMinutes: Array(144).fill(0)
    };
    const learningMinutes = activeTimeData.learningMinutes;
    const enjoyMinutes = activeTimeData.enjoyMinutes;
    const maxSlotMinutes = Math.max(
      1,
      ...learningMinutes.map((value, index) => value + enjoyMinutes[index])
    );
    const labels = learningMinutes.map((_, index) => {
      const hour = Math.floor(index / 6);
      const minute = (index % 6) * 10;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });
    const learningColors = learningMinutes.map(value => {
      const intensity = value / maxSlotMinutes;
      return `rgba(200, 152, 10, ${0.4 + intensity * 0.6})`;
    });
    const enjoyColors = enjoyMinutes.map(value => {
      const intensity = value / maxSlotMinutes;
      return `rgba(214, 63, 55, ${0.4 + intensity * 0.6})`;
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Learning Minutes',
            data: learningMinutes.map(value => [0, Math.min(maxSlotMinutes, value)]),
            backgroundColor: learningColors,
            borderWidth: 0,
            grouped: false,
            order: 1
          },
          {
            type: 'bar',
            label: 'Enjoy Minutes',
            data: enjoyMinutes.map(value => [
              Math.max(0, maxSlotMinutes - Math.min(maxSlotMinutes, value)),
              maxSlotMinutes
            ]),
            backgroundColor: enjoyColors,
            borderWidth: 0,
            grouped: false,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: context => {
                const value = Array.isArray(context.raw)
                  ? Math.max(0, context.raw[1] - context.raw[0])
                  : context.raw;
                return `${context.dataset.label}: ${formatMinutesLabel(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { autoSkip: false, maxRotation: 0, callback: (_, index) => index % 6 === 0 ? labels[index] : '' }
          },
          y: {
            beginAtZero: true,
            max: maxSlotMinutes,
            ticks: { precision: 0 },
            title: { display: true, text: 'Minutes' }
          }
        }
      }
    };
  }

  function renderCharts(statsObj, logs = []){
    const { stats, dates } = statsObj;
    window.currentStats = stats;
    window.currentDates = dates;
    window.currentLearningStats = buildLearningStats(logs, dates);
    
    // 确保所有出现的科目都有颜色
    const learningStats = window.currentLearningStats;
    if (learningStats && learningStats.byCategory) {
      Object.keys(learningStats.byCategory).forEach(subj => {
        if (!subjectColorMap[subj]) {
          subjectColorMap[subj] = defaultColorPool[colorPoolIndex % defaultColorPool.length];
          colorPoolIndex++;
        }
      });
    }

    function scaleCanvasForDisplay(canvas){
      if(!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
      const cssH = canvas.clientHeight || Math.max(150, cssW * 0.5);
      if(canvas.width !== Math.floor(cssW * ratio) || canvas.height !== Math.floor(cssH * ratio)){
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.floor(cssW * ratio);
        canvas.height = Math.floor(cssH * ratio);
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
      }
    }
    scaleCanvasForDisplay(subjectCanvas);
    scaleCanvasForDisplay(trendCanvas);
    scaleCanvasForDisplay(activeTimeCanvas);
    scaleCanvasForDisplay(kpsCanvas);
    scaleCanvasForDisplay(rankCanvas);
    //if (dailyMinutesCanvas) scaleCanvasForDisplay(dailyMinutesCanvas);

    if(subjectChart) subjectChart.destroy();
    subjectChart = new Chart(subjectCtx, getSubjectChartConfig());

    if(trendChart) trendChart.destroy();
    trendChart = new Chart(trendCtx, getTrendChartConfig());

    if(activeTimeChart) activeTimeChart.destroy();
    activeTimeChart = new Chart(activeTimeCtx, getActiveTimeChartConfig());

    if(kpsChart) kpsChart.destroy();
    kpsChart = new Chart(kpsCtx, getKnowledgePointChartConfig());

    if(rankChart) rankChart.destroy();
    rankChart = new Chart(rankCtx, getRankChartConfig());

  //  if (dailyMinutesCtx) {
  //    if (dailyMinutesChart) dailyMinutesChart.destroy();
   //   dailyMinutesChart = new Chart(dailyMinutesCtx, getDailyMinutesLineConfig());
   // }
  }

  function buildLearningStats(items = [], dates = []){
    const byDate = {};
     const enjoyByDate = {};  
    const byCategory = {};
    const byKp = {};
    const kpSubjectMap = {};

    dates.forEach(date => { byDate[date] = 0;enjoyByDate[date] = 0; });

    (items || []).forEach(item => {
      const date = getRecordDateKey(item);
      const minutes = extractLearningMinutes(item);

      const category = String(item.subject || item.category || item.s || 'other');
       const isEnjoy = category.toLowerCase() === 'enjoy';
       
      if (date) {
        if (isEnjoy) {
          enjoyByDate[date] = (enjoyByDate[date] || 0) + minutes;   // 新增
        } else {
          byDate[date] = (byDate[date] || 0) + minutes;
        }
      }
      byCategory[category] = (byCategory[category] || 0) + minutes;

        if (!isEnjoy) {
        const kpKey = item.kpsId || item.kp || item.topicId || item.topic || item.k || item.name || 'Unknown';
        const kpName = (kpsMap && kpsMap[kpKey]) ? kpsMap[kpKey] : String(kpKey);
        byKp[kpName] = (byKp[kpName] || 0) + minutes;
        if (!kpSubjectMap[kpName]) {
          kpSubjectMap[kpName] = category;
        }
      }
    });

    return { byDate, enjoyByDate, byCategory, byKp, kpSubjectMap };  }

  function getRecordDateKey(item) {
    if (!item) return '';
    if (item.date) return String(item.date).split('T')[0];
    if (item.a) return String(item.a).split('T')[0];
    if (item.start) return String(item.start).split('T')[0];
    if (item.timestamp) return String(item.timestamp).split('T')[0];
    return '';
  }

  function extractLearningMinutes(item) {
    const candidates = ['durationMinutes', 'duration', 'minutes', 'studyMinutes', 'learningMinutes', 'minutesSpent', 'timeSpent', 'studyTime'];
    const timeKeys = ['a', 'b', 'start', 'end', 'startTime', 'endTime', 'startedAt', 'finishedAt'];

    for (const key of candidates) {
      const raw = item[key];
      if (raw === null || raw === undefined || raw === '') continue;
      if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.round(raw));
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^\d+(h|m|hr|min|mins|minute|minutes)$/i.test(trimmed)) {
          const match = trimmed.match(/(\d+)/g) || [];
          const values = match.map(Number);
          if (values.length > 0) {
            const total = values.reduce((sum, value) => sum + value, 0);
            return Math.max(1, Math.round(total));
          }
        }
        const numeric = Number(trimmed.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(numeric)) return Math.max(1, Math.round(numeric));
      }
    }

    for (const key of timeKeys) {
      const start = item[key];
      if (!start) continue;
      const endKey = key === 'a' ? 'b' : key === 'b' ? 'a' : (key.includes('start') ? 'end' : key.includes('end') ? 'start' : null);
      if (endKey) {
        const endVal = item[endKey];
        if (endVal) {
          const startDate = new Date(start);
          const endDate = new Date(endVal);
          if (!Number.isNaN(startDate) && !Number.isNaN(endDate)) {
            const diffMinutes = Math.max(1, Math.round((endDate - startDate) / 60000));
            return diffMinutes;
          }
        }
      }
    }

    return 1;
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const text = String(value).split('T')[0];
    const [year, month, day] = text.split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    return new Date(year, month - 1, day);
  }

  function renderHeatmap(items = [], startISO, endISO) {
    const container = document.getElementById('heatmapContainer');
    const monthsRow = document.getElementById('heatmapMonths');
    const labelsLeft = document.getElementById('heatmapLabels');
    const weeksEl = document.getElementById('heatmapWeeks');
    if (!container || !monthsRow || !labelsLeft || !weeksEl) return;

    const start = parseDateOnly(startISO);
    const end = parseDateOnly(endISO);
    if (!start || !end) return;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const durationByDate = {};

    (items || []).forEach(item => {
      const date = getRecordDateKey(item);
      if (!date) return;
      const category = String(item.subject || item.category || item.s || 'other');
      if (category.toLowerCase() === 'enjoy') return;
      const minutes = extractLearningMinutes(item);
      const key = isoDate(parseDateOnly(date));
      durationByDate[key] = (durationByDate[key] || 0) + minutes;
    });

    const heatStart = new Date(start);
    const startDay = heatStart.getDay();
    heatStart.setDate(heatStart.getDate() - startDay);

    const heatEnd = new Date(end);
    const endDay = heatEnd.getDay();
    heatEnd.setDate(heatEnd.getDate() + (6 - endDay));

    const weeks = [];
    let weekStart = new Date(heatStart);
    while (weekStart <= heatEnd) {
      const cells = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + offset);
        const key = isoDate(day);
        const minutes = durationByDate[key] || 0;
        cells.push({ date: key, minutes, inRange: day >= start && day <= end });
      }
      weeks.push(cells);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    labelsLeft.innerHTML = dayNames.map(name => `<span>${name}</span>`).join('');
    monthsRow.innerHTML = '';
    weeksEl.innerHTML = '';

    weeks.forEach((week, weekIndex) => {
      const firstInRange = week.find(day => day.inRange);
      const monthIndex = firstInRange ? new Date(parseDateOnly(firstInRange.date)).getMonth() : new Date(parseDateOnly(week[0].date)).getMonth();
      const month = monthNames[monthIndex];
      const prevMonthIndex = weeks[weekIndex - 1] ? new Date(parseDateOnly(weeks[weekIndex - 1].find(day => day.inRange)?.date || weeks[weekIndex - 1][0].date)).getMonth() : -1;
      if (weekIndex === 0 || monthIndex !== prevMonthIndex) {
        const monthLabel = document.createElement('span');
        monthLabel.textContent = month;
        monthLabel.style.left = `${weekIndex * 17}px`;
        monthsRow.appendChild(monthLabel);
      }

      const weekCol = document.createElement('div');
      weekCol.className = 'heatmap-week-col';
      week.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        if (!day.inRange) {
          cell.classList.add('empty');
        } else {
          const level = day.minutes <= 123 ? 0 
             : day.minutes <= 288 ? 1 
             : day.minutes <= 466 ? 2 
             : day.minutes <= 600 ? 3 
             : 4;
          cell.classList.add(`level-${level}`);
        }
        weekCol.appendChild(cell);
      });
      weeksEl.appendChild(weekCol);
    });
  }

  function generateColors(n){
    const palette = ['#2b8be9','#66bb6a','#f6c85f','#ff6b6b','#9b59b6','#4ecdc4','#f39c12','#e67e22','#3498db','#e91e63'];
    const out = [];
    for(let i=0;i<n;i++) out.push(palette[i % palette.length]);
    return out;
  }

  function exportCSV(items){
    const headers = ['Date','Category','Tag','Knowledge Point','Content','Status'];
    const rows = items.map(it => {
      const kpName = it.kpsId ? ((kpsMap && kpsMap[it.kpsId]) ? kpsMap[it.kpsId] : `[KPS:${it.kpsId}]`) : '';
      const content = it.content || '';
      const categoryDisplay = subjectDisplayMap[it.category] || it.category || '';
      return [it.date||'', categoryDisplay, (it.tag||''), kpName, content, (it.status===1?'Done':(it.status===0?'Half':(it.status===-1?'Fail':'Pending')))]
    });
    const all = [headers].concat(rows).map(r=> r.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([all], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `daily-report-${startDateEl.value || ''}_to_${endDateEl.value || ''}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function summarizeRecords(items, startISO, endISO){
    // create date array from start to end inclusive
    const dates = [];
    const s = new Date(startISO); const e = new Date(endISO);
    for(let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) dates.push(isoDate(new Date(d)));

    // Exclude items with tag === 'Temp' from statistics (but keep them in table/export)
    const itemsForStats = (items||[]).filter(it => String(it.tag||'') !== 'Temp');

    const stats = {
      totalTasks: itemsForStats.length,
      totalPoints: itemsForStats.length * 2, // each task worth 2 points
      score: 0, // computed below (Done=2, Half=1, Fail/Pending=0)
      byDate: {},
      byDateCompleted: {},
      byDateWeighted: {}, // New: weighted completion score by date
      categories: {},
      statusCounts: { 'Done':0, 'Half':0, 'Fail':0, 'Pending':0 },
      tags: {}
    };

  // initialize byDate and byDateCompleted with zero counts for trend
  dates.forEach(d=> { 
    stats.byDate[d] = 0; 
    stats.byDateCompleted[d] = 0;
    stats.byDateWeighted[d] = 0; // initialize weighted score
  });

    itemsForStats.forEach(it=>{
      const date = it.date || '';
  if(stats.byDate[date] !== undefined) stats.byDate[date]++;
      // category bucket
      const cat = String(it.category || 'other');
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      // status mapping and scoring
      const st = it.status;
  if(st === 1){ 
    stats.statusCounts['Done']++; 
    stats.score += 2; 
    if(stats.byDateCompleted[date] !== undefined) stats.byDateCompleted[date]++; 
    if(stats.byDateWeighted[date] !== undefined) stats.byDateWeighted[date] += 1.0; // Done=1.0 point
  }
      else if(st === 0){ 
        stats.statusCounts['Half']++; 
        stats.score += 1; 
        if(stats.byDateWeighted[date] !== undefined) stats.byDateWeighted[date] += 0.5; // Half=0.5 point
      }
      else if(st === -1){ stats.statusCounts['Fail']++; /* 0 points */ }
      else { stats.statusCounts['Pending']++; }
      // tags
      const tag = it.tag || 'No Tag';
      stats.tags[tag] = (stats.tags[tag] || 0) + 1;
    });

    // ensure all interestingCats present (maybe 0)
 subjectKeys.forEach(c => { if (!stats.categories[c]) stats.categories[c] = 0; });    
    // 计算相对完成率的平均值
    const totalTasksSum = dates.reduce((sum, d) => sum + (stats.byDate[d] || 0), 0);
    const averageDailyTasks = totalTasksSum / dates.length || 1;
    
    const relativeCompletionRate = dates.map((d, index) => {
      const total = stats.byDate[d] || 0;
      const completed = stats.byDateWeighted && stats.byDateWeighted[d] ? stats.byDateWeighted[d] : 0;
      const rawRate = total === 0 ? 0 : (completed / total);
      const taskWeight = Math.min(total / averageDailyTasks, 1);
      return rawRate * taskWeight;
    });
    
    // 计算相对完成率的平均值
    const validRelativeRates = relativeCompletionRate.filter(rate => rate > 0);
    const avgRelativeRate = validRelativeRates.length > 0 ? 
      validRelativeRates.reduce((sum, rate) => sum + rate, 0) / validRelativeRates.length : 0;
    
    return { stats, dates, relativeAvgRate: avgRelativeRate };
  }

  // UI wiring
  loadBtn.addEventListener('click', loadAndRender);
  
  // 添加快速选择按钮事件监听器
  if (quickAllBtn) {
    quickAllBtn.addEventListener('click', function() {
      setQuickDateRange('all');
      // 自动触发报告生成
      setTimeout(() => loadBtn.click(), 100);
    });
  }
  
  if (quick30DBtn) {
    quick30DBtn.addEventListener('click', function() {
      setQuickDateRange('last30d');
      // 自动触发报告生成
      setTimeout(() => loadBtn.click(), 100);
    });
  }
     if (quick7DBtn) {
    quick7DBtn.addEventListener('click', function() {
      setQuickDateRange('last7d');
      // 自动触发报告生成
      setTimeout(() => loadBtn.click(), 100);
    });
  } 

  viewSelect.addEventListener('change', ()=>{
    if(viewSelect.value === 'table'){ overviewPanel.style.display='none'; tablePanel.style.display='block'; }
    else { overviewPanel.style.display='block'; tablePanel.style.display='none'; }
  });
  exportCsvBtn.addEventListener('click', async ()=>{
    const s = startDateEl.value; const e = endDateEl.value; if(!s||!e) return alert('Please select date range');
    const items = await fetchRange(s,e); exportCSV(items);
  });
  // Fetch records in inclusive date range (dates are yyyy-mm-dd strings)
  function fetchRange(startISO, endISO){
    return new Promise((resolve,reject)=>{
      if(!db) return reject(new Error('DB not opened'));
      if(!db.objectStoreNames.contains(DAILY_STORE)) return resolve([]);
      const tx = db.transaction([DAILY_STORE],'readonly');
      const store = tx.objectStore(DAILY_STORE);
      const idx = store.index('date');
      const range = IDBKeyRange.bound(startISO, endISO);
      const req = idx.getAll(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function isoDate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  // 快速选择功能
  function setQuickDateRange(type) {
    const today = new Date();
    let startDate, endDate;
    
    switch(type) {
case 'all':
  // 使用从数据库查出的最早日期（如果没有则回退到今天）
  startDate = earliestDate ? new Date(earliestDate) : new Date(today);
  endDate = new Date(today);
  break;
      case 'last30d':
        // 设置为最近30天
        endDate = new Date(today);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 29); // 包含今天，所以减29天
        break;
      case 'last7d':
        // 设置为最近7天
        endDate = new Date(today);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6); // 包含今天，所以减6天
        break;

      default:
        return;
    }
    
    // 格式化日期为 yyyy-mm-dd
    startDateEl.value = isoDate(startDate);
    endDateEl.value = isoDate(endDate);
  }

  function defaultRangeLast30(){
    const e = new Date();
    const s = new Date(e); s.setDate(e.getDate()-29); // 改为30天（包含今天，所以减29天）
    startDateEl.value = isoDate(s);
    endDateEl.value = isoDate(e);
  }

  // init
(async function(){ 
    try{ 
      await openDB();
      await loadConfigAndInitRange(); 
      defaultRangeLast30(); 
      loadAndRender();
    }catch(e){ 
      console.warn('IndexedDB open failed', e); 
    }
})();

  // load KPs map if DB available
  (async function(){ try{ await loadKpsMap(); }catch(e){ /* ignore */ }})();
  
  // 初始化放大功能
  initZoomFunctionality();

  // 添加窗口resize事件监听器来处理图表缩放问题
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      // 使用Chart.js内置的resize方法调整主图表尺寸
      if (subjectChart) subjectChart.resize();
      if (trendChart) trendChart.resize();
      if (activeTimeChart) activeTimeChart.resize();
      if (kpsChart) kpsChart.resize();
      if (rankChart) rankChart.resize();
      //if (dailyMinutesChart) dailyMinutesChart.resize();
      
      // 如果放大模态框打开，重新创建放大图表
      if (zoomModal.style.display === 'block' && zoomChart) {
        handleWindowResize();
      }
    }, 250); // 防抖处理，避免频繁重绘
  });

  // 创建占位图表的辅助函数
  function createPlaceholderChart(chartType) {
    // 清除画布
    zoomChartCtx.clearRect(0, 0, zoomChartCanvas.width, zoomChartCanvas.height);
    
    // 获取图表标题
    const chartTitle = getChartTitle(chartType);
    
    // 绘制占位文本
    zoomChartCtx.fillStyle = '#999';
    zoomChartCtx.font = '16px Arial';
    zoomChartCtx.textAlign = 'center';
    zoomChartCtx.fillText(`${chartTitle}`, 
      zoomChartCanvas.width / 2, 
      zoomChartCanvas.height / 2 - 20);
    
    zoomChartCtx.font = '14px Arial';
    zoomChartCtx.fillText('No data available or error occurred', 
      zoomChartCanvas.width / 2, 
      zoomChartCanvas.height / 2 + 10);
    
    // 创建一个最小化的图表配置作为占位符
    const placeholderConfig = {
      type: 'bar',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${chartTitle} (No Data)`
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            display: false
          }
        }
      }
    };
    
    try {
      zoomChart = new Chart(zoomChartCtx, placeholderConfig);
    } catch (error) {
      console.error('Error creating placeholder chart:', error);
      // 最后的备用方案：只显示文本
      zoomChartCtx.clearRect(0, 0, zoomChartCanvas.width, zoomChartCanvas.height);
      zoomChartCtx.fillStyle = '#ccc';
      zoomChartCtx.font = '16px Arial';
      zoomChartCtx.textAlign = 'center';
      zoomChartCtx.fillText('Chart unavailable', 
        zoomChartCanvas.width / 2, 
        zoomChartCanvas.height / 2);
    }
  }

  // 获取图表标题的辅助函数
  function getChartTitle(chartType) {
    const titles = {
      'subject': 'Subject Learning Time',
      'trend': 'Daily Learning Trend',
      'knowledgePoint': 'Knowledge Point Learning Time',
      'rank': 'Top 15 Knowledge Points',
      'dailyMinutesLine': 'Daily Learning Minutes'
    };
    return titles[chartType] || 'Unknown Chart';
  }
})();