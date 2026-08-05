import { uid } from './uid.js'
import { DAY_MS } from './dates.js'

// Demo data so the app is alive on first run. Cleared if the user resets.
export function seedData() {
  const now = Date.now()
  const me = { id: uid('p'), name: 'Me', color: '#3b82f6', emoji: '🙂' }
  const partner = { id: uid('p'), name: 'Alex', color: '#ec4899', emoji: '😎' }

  const cHome = { id: uid('c'), name: 'Home', icon: '🏠', color: '#3b82f6', parentId: null }
  const cPlants = { id: uid('c'), name: 'Plants', icon: '🪴', color: '#22c55e', parentId: null }
  const cPets = { id: uid('c'), name: 'Pets', icon: '🐾', color: '#f59e0b', parentId: null }
  const cHealth = { id: uid('c'), name: 'Health', icon: '🩺', color: '#ec4899', parentId: null }
  const cCar = { id: uid('c'), name: 'Car', icon: '🚗', color: '#64748b', parentId: null }

  const categories = [cHome, cPlants, cPets, cHealth, cCar]
  const people = [me, partner]

  const mk = (name, icon, catId, cadenceDays, agoDays, personId, extra = {}) => ({
    id: uid('ch'), name, icon, categoryId: catId, cadenceDays,
    personId: personId || null, season: null, note: '', archived: false,
    createdAt: now - 60 * DAY_MS, _seedAgoDays: agoDays, ...extra
  })

  const chores = [
    mk('Water the plants', '💧', cPlants.id, 3, 4, me.id),
    mk('Water the cactus', '🌵', cPlants.id, 21, 6, me.id),
    mk('Fertilise plants', '🌿', cPlants.id, 30, 12, me.id),
    mk('Change the sheets', '🛏️', cHome.id, 14, 10, partner.id),
    mk('Clean the bathroom', '🚿', cHome.id, 7, 8, me.id),
    mk('Vacuum', '🧹', cHome.id, 7, 2, partner.id),
    mk('Take out recycling', '♻️', cHome.id, 7, 1, me.id),
    mk('Clean the litter box', '🐈', cPets.id, 2, 1, me.id),
    mk('Buy cat food', '🐟', cPets.id, 21, 15, partner.id),
    mk('Walk the dog', '🐕', cPets.id, 1, 0, me.id),
    mk('Dentist', '🦷', cHealth.id, 182, 120, me.id),
    mk('Call Mom', '📞', cHealth.id, 7, 9, me.id),
    mk('Refill prescription', '💊', cHealth.id, 30, 26, me.id),
    mk('Change car oil', '🛢️', cCar.id, 182, 60, partner.id),
    mk('Check tyre pressure', '🛞', cCar.id, 30, 40, me.id),
    mk('Salt the driveway', '❄️', cHome.id, 3, 5, me.id, { season: { start: 11, end: 2 } }),
    mk('Mow the lawn', '🌱', cHome.id, 10, 7, partner.id, { season: { start: 4, end: 10 } })
  ]

  // Build completion history so cards have color + heatmap has data.
  const completions = []
  for (const ch of chores) {
    const cadence = ch.cadenceDays || 7
    // a few past completions leading up to the last one
    let last = now - ch._seedAgoDays * DAY_MS
    completions.push({ id: uid('done'), choreId: ch.id, ts: last, note: '', personId: ch.personId })
    for (let k = 1; k <= 4; k++) {
      const t = last - k * cadence * DAY_MS - Math.random() * DAY_MS
      if (t > now - 400 * DAY_MS) completions.push({ id: uid('done'), choreId: ch.id, ts: t, note: '', personId: ch.personId })
    }
    delete ch._seedAgoDays
  }

  return {
    version: 2,
    people, categories, chores, completions,
    settings: { theme: 'system', activePersonId: null, notificationsEnabled: false, reminderHour: 9, seededAt: now }
  }
}
