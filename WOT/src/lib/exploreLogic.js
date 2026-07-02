let _cache = null

export async function loadCollections() {
  if (_cache) return _cache
  const res = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
  if (!res.ok) throw new Error('Failed to load collections.json')
  const data = await res.json()
  _cache = data
  return _cache
}

function chooseWeighted(items, weights) {
  const sum = weights.reduce((a,b)=>a+b,0)
  if (sum <= 0) return null
  let r = Math.random() * sum
  for (let i=0;i<items.length;i++){
    if (r < weights[i]) return items[i]
    r -= weights[i]
  }
  return items[items.length-1]
}

function _getLevelFromConfig(exp, config){
  if (!config || !config.exploreDrawsByLevel) return 1
  for (const k of Object.keys(config.exploreDrawsByLevel)){
    const v = config.exploreDrawsByLevel[k]
    if (typeof v.expMin === 'number' && typeof v.expMax === 'number'){
      if (exp >= v.expMin && exp <= v.expMax) return Number(k)
    }
  }
  return 1
}

export function getLevelForExp(exp, config){
  // if config omitted, try cached data
  const cfg = config || (_cache && _cache.config) || null
  return _getLevelFromConfig(exp, cfg)
}

export async function pickAwardsByExp(exp){
  const data = await loadCollections()
  const cfg = data.config || {}
  const items = (data.items || []).filter(i => i)
  const level = getLevelForExp(exp, cfg)
  // determine draw count
  let draws = 1
  try{
    const byLevel = cfg.exploreDrawsByLevel && Object.values(cfg.exploreDrawsByLevel).find(v => exp >= v.expMin && exp <= v.expMax)
    if (byLevel) {
      const min = byLevel.drawMin || 1
      const max = byLevel.drawMax || min
      draws = (min === max) ? min : Math.floor(Math.random()*(max-min+1))+min
    }
  }catch(e){ draws = 1 }

  const baseWeights = cfg.baseQualityWeights || { "1":45,"2":30,"3":15,"4":7,"5":3 }
  const levelMods = (cfg.levelQualityModifiers && cfg.levelQualityModifiers[String(level)]) || {}

  const results = []
  for (let d=0; d<draws; d++){
    const itemPool = []
    const weights = []
    for (const it of items){
      const tier = String(it.qualityTier || 1)
      const base = Number(baseWeights[tier] || 1)
      const lvlmod = Number(levelMods[tier] || 1)
      const mult = Number(it.multiplier || cfg.defaultMultiplier || 1)
      const value = Number(it.value || 1)
      // higher value -> slightly lower chance: divide weight by value
      const weight = Math.max(0, base * lvlmod * mult / Math.max(1, value))
      itemPool.push(it)
      weights.push(weight)
    }
    const chosen = chooseWeighted(itemPool, weights) || itemPool[0]
    // determine qty using min/max
    let min = Number.isFinite(chosen.min) ? chosen.min : (chosen.min === 0 ? 0 : 1)
    let max = Number.isFinite(chosen.max) ? chosen.max : min
    if (min > max){ const t = min; min = max; max = t }
    const qty = (max === min) ? min : Math.floor(Math.random()*(max-min+1))+min
    results.push({ id: chosen.id, name: chosen.name, qty, qualityTier: chosen.qualityTier || 1, value: chosen.value || 1 })
  }
  // aggregate duplicates
  const agg = {}
  for (const r of results){
    if (!agg[r.id]) agg[r.id] = { id: r.id, name: r.name, qty: 0, qualityTier: r.qualityTier, value: r.value }
    agg[r.id].qty += r.qty
  }
  return Object.values(agg)
}

export default { loadCollections, pickAwardsByExp }
