import React from 'react'
import {
  Sprout, Flower2, TreePine, Droplets, ShowerHead, Bath, Trash2, Recycle,
  Bed, Shirt, WashingMachine, Sparkles, SprayCan, Wind, Refrigerator, Flame,
  Utensils, CookingPot, Coffee, ShoppingCart, Milk, Fish, Cat, Dog, Bird, Bone, PawPrint,
  Stethoscope, Pill, HeartPulse, Dumbbell, Bike, Footprints, Brain,
  Phone, Mail, Gift, Wallet, Receipt, Landmark, BookOpen, Music, Palette,
  Car, Fuel, Wrench, Hammer, Lightbulb, Plug, Trees, Sun, Snowflake, Leaf,
  Calendar, Clock, Star, Heart, House, Baby, Briefcase, GlassWater, Scissors, Tv
} from 'lucide-react'

// Curated monochrome (Lucide) icon set — cohesive editorial line icons.
export const ICONS = {
  sprout: Sprout, flower: Flower2, tree: TreePine, droplets: Droplets, water: GlassWater,
  shower: ShowerHead, bath: Bath, trash: Trash2, recycle: Recycle, bed: Bed,
  shirt: Shirt, laundry: WashingMachine, sparkles: Sparkles, spray: SprayCan, vacuum: Wind,
  fridge: Refrigerator, flame: Flame, utensils: Utensils, pot: CookingPot, coffee: Coffee,
  cart: ShoppingCart, milk: Milk, fish: Fish, cat: Cat, dog: Dog, bird: Bird, bone: Bone, paw: PawPrint,
  health: Stethoscope, pill: Pill, heartpulse: HeartPulse, dumbbell: Dumbbell, bike: Bike,
  walk: Footprints, brain: Brain, phone: Phone, mail: Mail, gift: Gift, wallet: Wallet,
  receipt: Receipt, bank: Landmark, book: BookOpen, music: Music, palette: Palette,
  car: Car, fuel: Fuel, wrench: Wrench, hammer: Hammer, bulb: Lightbulb, plug: Plug,
  trees: Trees, sun: Sun, snow: Snowflake, leaf: Leaf, calendar: Calendar, clock: Clock,
  star: Star, heart: Heart, home: House, baby: Baby, work: Briefcase, scissors: Scissors, tv: Tv
}

export const ICON_KEYS = Object.keys(ICONS)
export const DEFAULT_CHORE_ICON = 'sparkles'
export const DEFAULT_CATEGORY_ICON = 'home'

export function Icon({ name, size = 20, strokeWidth = 1.75, className, style }) {
  const Cmp = ICONS[name] || ICONS[DEFAULT_CHORE_ICON]
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} style={style} absoluteStrokeWidth />
}

export const COLOR_CHOICES = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e',
  '#10b981','#14b8a6','#06b6d4','#3b82f6','#5b5bd6','#8b5cf6',
  '#a855f7','#d946ef','#ec4899','#f43f5e','#64748b','#78716c'
]
