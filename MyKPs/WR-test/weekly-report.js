(function(){
  let subjectKeys = [];    
let earliestDate = null;   
let subjectDisplayMap = {};  
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
  const categoryCanvas = document.getElementById('categoryChart');
  const trendCanvas = document.getElementById('trendChart');
  const tagCanvas = document.getElementById('tagChart');
  const dailyCategoryCanvas = document.getElementById('dailyCategoryChart');
  const categoryCtx = categoryCanvas.getContext('2d');
  const trendCtx = trendCanvas.getContext('2d');
  const tagCtx = tagCanvas.getContext('2d');
  const dailyCategoryCtx = dailyCategoryCanvas.getContext('2d');
  const detailsTbody = document.querySelector('#detailsTable tbody');
  const overviewPanel = document.getElementById('overview');
  const tablePanel = document.getElementById('tableView');

  // 放大功能相关元素
  const zoomModal = document.getElementById('zoomModal');
  const closeBtn = document.querySelector('.close-btn');
  const zoomChartCanvas = document.getElementById('zoomChart');
  const zoomChartCtx = zoomChartCanvas.getContext('2d');
  const zoomChartTitle = document.getElementById('zoomChartTitle');
  
  let categoryChart, trendChart, tagChart, dailyCategoryChart, zoomChart;
  // KPs mapping cache (uniqueId -> name)
  let kpsMap = null;
  // 添加一个变量来跟踪当前放大的图表类型
  let currentZoomChartType = null;

  // Enhanced combinatorial quote segments with randomized variables and random time between 22:00 and 01:00
  // Templates contain placeholders: {night} {adj} {time} etc., which will be replaced by randomized synonyms or formats.
  const starters = [
    '{night}，', '{night}里，', '在{night}，', '夜深时，', '当{night}降临，', '趁着{adj}的夜，', '在安静的{night}，', '这会儿，', '当大家已睡，', '当世界安静，', '在灯还亮着时，', '当时针指向今晚，'
  ];
  const middles = [
    '{verb}一件事，', '把最重要的事先做完，', '把拖延打一打败，', '专注一段时间，', '把任务拆成小步，', '把难题攻克一小半，', '把清单的第一项搞定，',
    '坚持二十分钟的深度工作，', '用番茄钟推动进度，', '把今天该学的学完，', '把手头的任务推进到下一站，', '先做最难的那件，', '赶在午夜前完成关键一项，'
  ];
  const endings = [
    '你会感谢现在的自己。', '这是对未来的温柔投资。', '明天会因为今晚不同。', '再坚持一会儿，成果会显现。', '别忘了也要好好休息。', '这会成为你前进的资本。',
    '哪怕只进步一点，也算赢了今天。', '给自己一个交代，给未来一个可能。', '积累小胜利，终会看到长远的改变。', '这份努力会沉淀成实力。'
  ];

  // inserts often include the {time} placeholder which will be formatted randomly
  const inserts = [
    '坚持到{time}，', '直到{time}，', '约在{time}，', '持续到深夜，', '坚持一小时，', '', '持续半小时，', '带着目标去做，', '把结果记录下来，'
  ];

  // synonyms and small variable pools
  const nightSyns = ['夜晚', '深夜', '午夜', '夜色', '夜里', '夜间', '星夜', '暮色', '黑夜'];
  const adjSyns = ['静谧', '安静', '寂静', '平和', '温柔', '沉稳', '静好的'];
  const verbSyns = ['完成', '解决', '专注', '攻克', '推进', '落实', '启动', '突破', '收获'];

  // time formatting variants: functions that accept a Date and return a string
  const timeFormats = [
    d => `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => `晚上${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`,
    d => (d.getHours()===0 ? `凌晨${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}` : `凌晨${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`),
    d => `约 ${d.getHours()} 点 ${String(d.getMinutes()).padStart(2,'0')} 分`,
    d => `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} 左右`
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
      // No KPs store available in IndexedDB. Do not attempt to fetch local files (file:// may be blocked).
      // Resolve with empty map — callers should handle missing names gracefully.
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
      'dailyCategory': 'Daily Category Distribution'
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
        
        // 直接复用主图的配置和创建逻辑，保持一致性
        let smallChart, chartConfig;
        switch(chartType) {
          case 'category':
            smallChart = categoryChart;
            chartConfig = getCategoryChartConfig(true);
            break;
          case 'trend':
            smallChart = trendChart;
            chartConfig = getTrendChartConfig(true);
            break;
          case 'tag':
            smallChart = tagChart;
            chartConfig = getTagChartConfig(true);
            break;
          case 'dailyCategory':
            smallChart = dailyCategoryChart;
            chartConfig = getDailyCategoryChartConfig(true);
            break;
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
        
        // 🔧 确保 options 对象存在
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

  function getCategoryChartConfig(isZoomed = false) {
    // 这里需要访问全局的统计数据，我们假设它们存储在某个地方
    // 实际应用中需要从renderCharts函数中获取这些数据
    const cats = Object.keys(window.currentStats.categories).sort((a,b)=>window.currentStats.categories[b]-window.currentStats.categories[a]);
    const catValues = cats.map(k=>window.currentStats.categories[k]);
    
    return {
      type: 'pie',
      data: {
        labels: cats,
        datasets: [{
          data: catValues,
          backgroundColor: generateColors(cats.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: isZoomed ? 'right' : 'bottom',
            labels: {
              padding: isZoomed ? 20 : 10,
              font: {
                size: isZoomed ? 14 : 12
              }
            }
          }
        }
      }
    };
  }

  function getTrendChartConfig(isZoomed = false) {
    const dates = window.currentDates || [];
    const trendValues = dates.map(d => window.currentStats.byDate[d] || 0);
    const weightedCompletedValues = dates.map(d => window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d] ? window.currentStats.byDateWeighted[d] : 0);
    const notCompletedValues = dates.map((d,i) => (trendValues[i] || 0) - (weightedCompletedValues[i] || 0));

    // 计算相对完成率
    const totalTasksSum = dates.reduce((sum, d) => sum + (window.currentStats.byDate[d] || 0), 0);
    const averageDailyTasks = totalTasksSum / dates.length || 1;
    
    const relativeCompletionRate = dates.map((d, index) => {
      const total = window.currentStats.byDate[d] || 0;
      const completed = window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d] ? window.currentStats.byDateWeighted[d] : 0;
      const rawRate = total === 0 ? 0 : (completed / total);
      const taskWeight = Math.min(total / averageDailyTasks, 1);
      return rawRate * taskWeight;
    });

    const rawCompletionRate = dates.map(d => {
      const total = window.currentStats.byDate[d] || 0;
      const completed = window.currentStats.byDateWeighted && window.currentStats.byDateWeighted[d] ? window.currentStats.byDateWeighted[d] : 0;
      return total === 0 ? 0 : (completed / total);
    });

    return  {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [
          { 
            label: 'Completed', 
            data: weightedCompletedValues, 
            backgroundColor: '#66bb6a', 
            stack: 'stack1' 
          },
          { 
            label: 'Total', 
            data: trendValues,  
            backgroundColor: 'rgba(160, 204, 251, 0.85)',
            stack: 'stack1' 
          },
          // --- 折线1：相对完成率 (默认显示，紫色) ---
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
            hidden: false // 默认显示
          },
          // --- 折线2：原始完成率 (默认隐藏，橙色，点击图例可显示) ---
          { 
            label: 'Completion Rate', 
            data: rawCompletionRate,          
            type: 'line', 
            borderColor: '#e94e2b', // 换个颜色区分
            borderDash: [5, 5],     // 加个虚线，更易区分
            backgroundColor: 'rgba(233, 78, 43, 0.1)', 
            fill: false, 
            tension: 0.2, 
            pointRadius: 3,
            yAxisID: 'y1',
            hidden: true // 【关键】默认隐藏
          }
        ]
      },
      options: {
        scales: {
          x: { 
            stacked: true, 
            ticks: { maxRotation:0, minRotation:0 } 
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
            stacked: false,
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: { 
          legend: { position: 'bottom' } 
        }
      }
    }
  }

  function getTagChartConfig(isZoomed = false) {
    const tagEntries = Object.entries(window.currentStats.tags).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const tagLabels = tagEntries.map(t=>t[0]);
    const tagVals = tagEntries.map(t=>t[1]);

    return {
      type: 'bar',
      data: {
        labels: tagLabels,
        datasets: [{
          label: 'Labels',
          data: tagVals,
          backgroundColor: '#66bb6a'
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    };
  }

  function getDailyCategoryChartConfig(isZoomed = false) {
    // 数据验证
    const dates = window.currentDates || [];
    const categories = window.currentStats && window.currentStats.categories ? 
      Object.keys(window.currentStats.categories).sort() : [];
    
    console.log('Daily Category Chart Debug:');
    console.log('- Dates:', dates);
    console.log('- Categories:', categories);
    console.log('- Current Stats Available:', !!window.currentStats);
    console.log('- Raw Data Available:', !!window.currentRawData);
    
    // 如果没有数据，返回有效的空图表配置（不是null）
    if (dates.length === 0 || categories.length === 0) {
      console.log('No dates or categories available for daily category chart');
      return {
        type: 'line',  // 确保type不为undefined
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
              text: 'Daily Category Distribution (No Data)'
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
    }
    
    // 准备每个类别的每日数据
    const datasets = categories.map((category, index) => {
      const data = dates.map(date => {
        // 从原始数据中统计该日期该类别的任务数
        if (window.currentRawData && window.currentRawData.items) {
          // 更宽松的日期匹配 - 只要包含日期即可
          return window.currentRawData.items
            .filter(item => {
              if (!item.date || !item.category) return false;
              // 检查日期是否匹配（支持多种格式）
              const itemDate = item.date.split('T')[0]; // YYYY-MM-DD格式
              return itemDate === date && item.category === category;
            })
            .length;
        }
        return 0;
      });
      
      // 只有当数据不全为0时才创建数据集
      const hasData = data.some(value => value > 0);
      if (!hasData) {
        console.log(`Skipping category ${category} - no data found`);
        return null;
      }
      
      return {
        label: subjectDisplayMap[category] || category,
        data: data,
        borderColor: generateColors(categories.length)[index],
        backgroundColor: generateColors(categories.length)[index].replace('1)', '0.1)'),
        fill: false,
        tension: 0.3,
        pointRadius: isZoomed ? 4 : 2
      };
    }).filter(dataset => dataset !== null); // 过滤掉没有数据的数据集

    console.log('Final datasets for daily category chart:', datasets);

    return {
      type: 'line',  // 确保type明确指定
      data: {
        labels: dates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { maxRotation: 0, minRotation: 0 }
          },
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: isZoomed ? 'right' : 'bottom',
            labels: {
              padding: isZoomed ? 20 : 10,
              font: {
                size: isZoomed ? 14 : 12
              }
            }
          }
        }
      }
    };
  }

  function getSubjectActivityChartConfig(isZoomed = false) {
    // 基于趋势图数据，按学科分组显示每日活动情况
    const dates = window.currentDates || [];
    
    // 从统计数据中提取学科信息
    const subjectData = {};
    
    // 遍历所有数据点，按学科分组
    if (window.currentRawData && window.currentRawData.items) {
      window.currentRawData.items.forEach(item => {
        if (item.category && item.date) {
          const subject = item.category;
          const date = item.date.split('T')[0]; // 提取日期部分
          
          if (!subjectData[subject]) {
            subjectData[subject] = {};
          }
          
          if (!subjectData[subject][date]) {
            subjectData[subject][date] = 0;
          }
          
          // 根据状态分配权重
          let weight = 0;
          if (item.status === 'done') {
            weight = 1;
          } else if (item.status === 'half') {
            weight = 0.5;
          }
          
          subjectData[subject][date] += weight;
        }
      });
    }

    // 准备图表数据
    const subjects = Object.keys(subjectData);
    const datasets = subjects.map((subject, index) => {
      const data = dates.map(date => subjectData[subject][date] || 0);
      return {
        label: subject,
        data: data,
        borderColor: generateColors(subjects.length)[index],
        backgroundColor: generateColors(subjects.length)[index].replace('1)', '0.1)'),
        fill: false,
        tension: 0.3,
        pointRadius: isZoomed ? 4 : 2
      };
    });

    return {
      type: 'line',
      data: {
        labels: dates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { maxRotation: 0, minRotation: 0 }
          },
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: isZoomed ? 'right' : 'bottom',
            labels: {
              padding: isZoomed ? 20 : 10,
              font: {
                size: isZoomed ? 14 : 12
              }
            }
          }
        }
      }
    };
  }

  function renderOverviewCards(stats, relativeAvgRate = 0){
    const totalTasks = stats.totalTasks || stats.total || 0;
    const score = stats.score || 0;
    const totalPoints = stats.totalPoints || (totalTasks * 2);
    const rate = totalPoints===0 ? 0 : Math.round((score/totalPoints)*100);
    overviewCards.innerHTML = '';
    const tpl = (title, val) => {
      const c = document.createElement('div'); c.className='card';
      c.innerHTML = `<h3>${title}</h3><p>${val}</p>`; return c;
    };
    // Do not show raw score/full as requested — show total tasks and a weighted completion rate only
    overviewCards.appendChild(tpl('Total Tasks', totalTasks));
    
    // 显示"原来%/新%"格式
    const originalPercent = rate;
    const newPercent = Math.round(relativeAvgRate * 100) || 0;
    const completionRateDisplay = `${originalPercent}%/${newPercent}%`;
    overviewCards.appendChild(tpl('Completion Rate', completionRateDisplay));
    
    // category proportions (show top 4)
  const catBreakdown = Object.entries(stats.categories)
  .sort((a,b) => b[1] - a[1])
  .slice(0,4)
  .map(([k,v]) => `${subjectDisplayMap[k] || k}:${v}`)
  .join(' | ');    overviewCards.appendChild(tpl('Category Distribution', catBreakdown || '-'));
  }

  function renderTable(items){
    detailsTbody.innerHTML = '';
    items.sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    for(const it of items){
      const tr = document.createElement('tr');
      const statusText = it.status === 1 ? 'Done' : (it.status === 0 ? 'Half' : (it.status === -1 ? 'Fail' : 'Pending'));
      // separate KPS name column and content
      const kpName = it.kpsId ? ((kpsMap && kpsMap[it.kpsId]) ? kpsMap[it.kpsId] : `[KPS:${it.kpsId}]`) : '';
      const content = it.content || '';
      const statusClass = it.status === 1 ? 'status-done' : (it.status === 0 ? 'status-half' : (it.status === -1 ? 'status-fail' : ''));
      const statusHtml = `<span class="status-badge ${statusClass}">${statusText}</span>`;
  const categoryDisplay = subjectDisplayMap[it.category] || it.category || '';
tr.innerHTML = `<td>${it.date||''}</td><td>${categoryDisplay}</td>...`;      detailsTbody.appendChild(tr);
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

  // main load flow
  async function loadAndRender(){
    const s = startDateEl.value; const e = endDateEl.value;
    if(!s || !e){ alert('Please select start and end dates'); return; }
    if(s > e){ alert('Start date cannot be later than end date'); return; }
    try{
      // Ensure KPs mapping is loaded before rendering so names are available
      try{ await loadKpsMap(); }catch(e){ /* ignore */ }
      const items = await fetchRange(s, e);
      
      // 🔧 保存原始数据，供每日类别图使用
      window.currentRawData = { items: items };
      
      const summary = summarizeRecords(items, s, e);
      renderOverviewCards(summary.stats, summary.relativeAvgRate); // 传递相对完成率平均值
      renderCharts(summary);
      renderTable(items);
      // generate automatic study suggestions: pass date range so we can inspect MyLearningLogs
      try{ await generateStudySuggestions(items, s, e); }catch(err){ console.warn('suggestions failed', err); }
    }catch(err){ console.error(err); alert('Failed to load data, please check console'); }
  }

  function renderCharts(statsObj){
    const { stats, dates } = statsObj;
    // 存储当前统计数据供放大功能使用
    window.currentStats = stats;
    window.currentDates = dates;
    
    // Make sure canvas elements are sized for devicePixelRatio to prevent blurring
    function scaleCanvasForDisplay(canvas){
      if(!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      // clientWidth/Height are CSS pixels; set actual pixel size to CSS * ratio
      const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
      const cssH = canvas.clientHeight || Math.max(150, cssW * 0.5);
      // only update if needed
      if(canvas.width !== Math.floor(cssW * ratio) || canvas.height !== Math.floor(cssH * ratio)){
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.floor(cssW * ratio);
        canvas.height = Math.floor(cssH * ratio);
        
        // 应用上下文缩放以保持清晰度
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
      }
    }
    // apply to all canvases
    scaleCanvasForDisplay(categoryCanvas);
    scaleCanvasForDisplay(trendCanvas);
    scaleCanvasForDisplay(tagCanvas);
    scaleCanvasForDisplay(dailyCategoryCanvas);

    // Category pie chart (use sorted labels)
    const cats = Object.keys(stats.categories).sort((a,b)=>stats.categories[b]-stats.categories[a]);
    const catLabels = cats.map(k => subjectDisplayMap[k] || k);
    const catValues = cats.map(k=>stats.categories[k]);
    if(categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryCtx, { 
      type:'pie', 
      data:{ 
        labels:catLabels, 
        datasets:[{ 
          data:catValues, 
          backgroundColor: generateColors(cats.length) 
        }] 
      }, 
      options:{
        responsive: true,
        maintainAspectRatio: false,
        plugins:{legend:{position:'bottom'}},
        // 添加resize配置
        onResize: function(chart, size) {
          // 图表尺寸改变时的回调
          console.log('Chart resized:', size);
        }
      } 
    });

    // Trend chart: dates vs byDate
    const trendValues = dates.map(d=>stats.byDate[d]||0);
    // 使用预计算的加权完成分数
    const weightedCompletedValues = dates.map(d => stats.byDateWeighted && stats.byDateWeighted[d] ? stats.byDateWeighted[d] : 0);
    const notCompletedValues = dates.map((d,i) => (trendValues[i] || 0) - (weightedCompletedValues[i] || 0));

    // ========== 计算相对完成率 ==========
    // 1. 计算「基准任务量」：所有日期的平均总任务数
    const totalTasksSum = dates.reduce((sum, d) => sum + (stats.byDate[d] || 0), 0);
    const averageDailyTasks = totalTasksSum / dates.length || 1; // 防止除以0

    // 2. 计算相对完成率数据
    const relativeCompletionRate = dates.map((d, index) => {
        const total = stats.byDate[d] || 0;
        const completed = stats.byDateWeighted && stats.byDateWeighted[d] ? stats.byDateWeighted[d] : 0;
        const rawRate = total === 0 ? 0 : (completed / total);
        const taskWeight = Math.min(total / averageDailyTasks, 1);
        return rawRate * taskWeight;
    });

    // 3. 计算【原始】完成率数据 (用于对比)
    const rawCompletionRate = dates.map(d => {
        const total = stats.byDate[d] || 0;
        const completed = stats.byDateWeighted && stats.byDateWeighted[d] ? stats.byDateWeighted[d] : 0;
        return total === 0 ? 0 : (completed / total);
    });
    // ======================================

    if(trendChart) trendChart.destroy();

    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [
          { 
            label: 'Completed', 
            data: weightedCompletedValues, 
            backgroundColor: '#66bb6a', 
            stack: 'stack1' 
          },
          { 
            label: 'Total', 
            data: trendValues,  
            backgroundColor: 'rgba(160, 204, 251, 0.85)',
            stack: 'stack1' 
          },
          // --- 折线1：相对完成率 (默认显示，紫色) ---
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
            hidden: false // 默认显示
          },
          // --- 折线2：原始完成率 (默认隐藏，橙色，点击图例可显示) ---
          { 
            label: 'Completion Rate', 
            data: rawCompletionRate,          
            type: 'line', 
            borderColor: '#e94e2b', // 换个颜色区分
            borderDash: [5, 5],     // 加个虚线，更易区分
            backgroundColor: 'rgba(233, 78, 43, 0.1)', 
            fill: false, 
            tension: 0.2, 
            pointRadius: 3,
            yAxisID: 'y1',
            hidden: true // 【关键】默认隐藏
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            stacked: true, 
            ticks: { maxRotation:0, minRotation:0 } 
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
            stacked: false,
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: { 
          legend: { position: 'bottom' } 
        },
        // 添加resize配置
        onResize: function(chart, size) {
          console.log('Trend chart resized:', size);
        }
      }
    });

    // Tag bar chart (top tags)
    const tagEntries = Object.entries(stats.tags).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const tagLabels = tagEntries.map(t=>t[0]);
    const tagVals = tagEntries.map(t=>t[1]);
    if(tagChart) tagChart.destroy();
    tagChart = new Chart(tagCtx, { 
      type:'bar', 
      data:{ 
        labels:tagLabels, 
        datasets:[{ 
          label:'Labels', 
          data:tagVals, 
          backgroundColor:'#66bb6a' 
        }] 
      }, 
      options:{
        indexAxis:'y', 
        responsive: true,
        maintainAspectRatio: false,
        plugins:{legend:{display:false}},
        // 添加resize配置
        onResize: function(chart, size) {
          console.log('Tag chart resized:', size);
        }
      } 
    });

    // Daily category distribution chart
    if(dailyCategoryChart) dailyCategoryChart.destroy();
    dailyCategoryChart = new Chart(dailyCategoryCtx, getDailyCategoryChartConfig());
  }

  // Generate study suggestions: recommend KPs (from tasks) that were NOT studied or least studied in the selected date range
  async function generateStudySuggestions(items, startISO, endISO){
    const container = document.getElementById('suggestionsContent');
    if(!container) return;
    try{
      const kpsInItems = Array.from(new Set((items||[]).map(it=>it.kpsId).filter(Boolean)));
      if(kpsInItems.length === 0){ container.innerHTML = 'No KPs associated with tasks in this period, no suggestions based on study records.'; return; }

      // load learning logs (MyLearningLogs) and count topics in the date range
      let logs = [];
      try{
        if(db && db.objectStoreNames && db.objectStoreNames.contains('MyLearningLogs')){
          const tx = db.transaction(['MyLearningLogs'],'readonly');
          const store = tx.objectStore('MyLearningLogs');
          const req = store.getAll();
          logs = await new Promise((res,rej)=>{ req.onsuccess = ()=>res(req.result||[]); req.onerror = ()=>res([]); });
        }
      }catch(e){ logs = []; }

      // filter logs by timestamp within start..end (inclusive)
      const s = new Date(startISO);
      const e = new Date(endISO); e.setHours(23,59,59,999);
      const logsInRange = logs.filter(l=>{
        const t = l.timestamp ? new Date(l.timestamp) : null;
        return t && t >= s && t <= e;
      });

      // count studies per topicId
      const studyCounts = {};
      logsInRange.forEach(l=>{ if(l.topicId) studyCounts[l.topicId] = (studyCounts[l.topicId]||0) + 1; });

      // For each kpsId present in tasks, get study count (default 0)
      const list = kpsInItems.map(id => ({ id, name: (kpsMap && kpsMap[id]) ? kpsMap[id] : id, count: studyCounts[id] || 0 }));
      // sort ascending (least studied first), show top 6
      list.sort((a,b)=> a.count - b.count || a.name.localeCompare(b.name));
      const top = list.slice(0,6);

      if(top.length === 0){ container.innerHTML = 'No suggestions at the moment (no learning records found).'; return; }

      const parts = ['<strong>Recommended KPs for focused review (the KPs studied the least in the tasks of this cycle):</strong>'];
      top.forEach((it,i)=> parts.push(`${i+1}. ${escapeHtml(it.name)} (Study times ${it.count}) `));
      container.innerHTML = parts.join('<br>');
    }catch(err){ console.warn('generateStudySuggestions error', err); container.innerHTML = 'Failed to generate suggestions, please check the console.'; }
  }

  function generateColors(n){
    const palette = ['#2b8be9','#66bb6a','#f6c85f','#ff6b6b','#9b59b6','#4ecdc4','#f39c12','#e67e22','#3498db','#e91e63'];
    const out = [];
    for(let i=0;i<n;i++) out.push(palette[i % palette.length]);
    return out;
  }

  function exportCSV(items){
    const headers = ['日期','分类','标签','知识点','内容','状态'];
    const rows = items.map(it => {
      const kpName = it.kpsId ? ((kpsMap && kpsMap[it.kpsId]) ? kpsMap[it.kpsId] : `[KPS:${it.kpsId}]`) : '';
      const content = it.content || '';
      const categoryDisplay = subjectDisplayMap[it.category] || it.category || '';
      return [it.date||'', categoryDisplay, (it.tag||''), kpName, content, (it.status===1?'完成':(it.status===0?'半完成':(it.status===-1?'失败':'未完成')))];
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
  // start quotes after init
  try{ startQuoteCarousel(); }catch(e){ /* ignore if elements missing */ }
  
  // 初始化放大功能
  initZoomFunctionality();

  // 添加窗口resize事件监听器来处理图表缩放问题
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      // 使用Chart.js内置的resize方法调整主图表尺寸
      if (categoryChart) categoryChart.resize();
      if (trendChart) trendChart.resize();
      if (tagChart) tagChart.resize();
      
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
      'category': 'Category Distribution',
      'trend': 'Task Completion Trend',
      'tag': 'Top Tags',
      'dailyCategory': 'Daily Category Distribution'
    };
    return titles[chartType] || 'Unknown Chart';
  }
})();