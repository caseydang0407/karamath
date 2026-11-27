import type {
  AccessoryId,
  CharacterId,
  DifficultyLevel,
  MathProblem,
  MilestoneDef,
  Operation,
  OutfitCategory,
  OutfitItemDef,
  OutfitStageDef,
  PlayerProgress,
  UpgradeDef,
  UpgradeId,
} from './types';

export const ROUND_LENGTH = 10;

export const ACHIEVEMENT_STREAK_TARGETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export const ORCHARD_STAGE_NAMES: string[] = [
  'Seed',
  'Sprout',
  'Sapling',
  'Small Tree',
  'Young Tree',
  'Medium Tree',
  'More Branches',
  'More Leaves',
  'White Flowers',
  'Apples (1/2 Flowers Turned to Apples)',
  'Apples (All Flowers Turned to Apples)',
  '1 Apple Dropped to the Ground',
  'Basket of Apples Next to Trunk',
  'Wild Flowers Around Trunk',
  'Wooden Tree Guard & Fence Ring',
  'Wooden Orchard Harvest Ladder',
  'Second Crate Full of Apples',
  'Hanging Wooden Birdhouse',
  'Tire Swing on Sturdy Branch',
  'Branch Lantern & Golden Fireflies',
];

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: 'kara',
    name: 'Kara (White Bunny)',
    tagline: 'Starts as a tiny white cotton ball and grows step-by-step into a bunny explorer!',
    effectSummary: 'Grow Kara from cotton ball → baby → teenager → explorer bunny (unlocks Mira!)',
    maxLevel: 20,
    baseCost: 2,
    costStep: 8,
    accentHex: '#ec4899',
    stageNames: [
      'Baby Bunny in Fabric Basket (Crying)',
      'Sucking Milk from Bottle',
      'Baby Bunny Sitting Up',
      'Baby Bunny Standing Up',
      'Baby Bunny Grows Up a Bit',
      'Blue Undershirt',
      'Pink Underwear',
      'Teenager Bunny Growth',
      'Pink Shirt',
      'Shirt Buttons',
      'Blue Skirt',
      'Bowtie on Left Ear',
      'Bowtie on Right Ear',
      'Brown Sock on Left Leg',
      'Brown Sock on Right Leg',
      'Fully Grown Cute Girl Bunny',
      'Pink Sneaker on Left Foot',
      'Pink Sneaker on Right Foot',
      'Little Pink Hat',
      'Working Black Suitcase (Left Hand)',
    ],
  },
  {
    id: 'kaitlyn',
    name: 'Mira (Yellow Chick)',
    tagline: 'Unlocks after Kara is fully grown! Hatch Mira from her straw nest and watch her grow!',
    effectSummary: 'Adds Mira to the meadow: Nest → Egg → Hatch → Teen → Girl Chicken (unlocks Kaitlyn!)',
    maxLevel: 20,
    baseCost: 4,
    costStep: 10,
    accentHex: '#eab308',
    stageNames: [
      'Straw Nest',
      'Tiny Yellow Egg in Nest',
      'Cracked Yellow Egg',
      'Hatched Egg Shell',
      'Baby Chick Head Peeking Out',
      'Baby Chick Out of Egg Shell',
      'Baby Chick Eating First Worm',
      'Baby Chick Grows Up a Bit',
      'White Undershirt',
      'Blue Underwear',
      'Teenager Chick Growth',
      'Blue Shirt',
      'White Bowtie on Shirt',
      'Pink Skirt',
      'Blue Socks',
      'Fully Grown Cute Girl Chicken',
      'White Sneaker on Left Foot',
      'Chick Sneaker on Right Foot',
      'Little Violet Cap',
      'Garden Shovel (Left Hand)',
    ],
  },
  {
    id: 'joshua',
    name: 'Kaitlyn (Brown Bear)',
    tagline: 'Unlocks after Mira is fully grown! Raise Kaitlyn from a sleepy bear cub into a cozy woodland explorer!',
    effectSummary: 'Adds Kaitlyn to the meadow: Cub → Honey Pot → Vest → Backpack & Lantern (unlocks Katy!)',
    maxLevel: 20,
    baseCost: 4,
    costStep: 10,
    accentHex: '#92400e',
    stageNames: [
      'Warm Mossy Bear Bed',
      'Tiny Baby Bear Cub (Sleeping)',
      'Baby Bear Cub Sitting Up',
      'Bear Cub Holding Acorn',
      'Baby Bear Standing Up',
      'Bear Cub Grows Up a Bit',
      'Cream Tummy Vest',
      'Denim Shorts',
      'Teenager Bear Growth',
      'Forest Green Shirt',
      'Wooden Shirt Buttons',
      'Red Explorer Scarf',
      'Golden Honey Pot',
      'Woolly Tan Socks',
      'Fully Grown Friendly Brown Bear',
      'Sturdy Hiking Boot (Left)',
      'Sturdy Hiking Boot (Right)',
      'Ranger Hat',
      'Adventure Backpack',
      'Explorer Brass Lantern (Right Paw)',
    ],
  },
  {
    id: 'katy',
    name: 'Katy (Pink Pig)',
    tagline: 'Unlocks after Kaitlyn is fully grown! Welcome Katy from her clover patch to a cheerful meadow gardener!',
    effectSummary: 'Adds Katy to the meadow: Piglet → Overalls → Sunhat & Mint Watering Can',
    maxLevel: 20,
    baseCost: 4,
    costStep: 10,
    accentHex: '#f472b6',
    stageNames: [
      'Soft Clover & Straw Cushion',
      'Tiny Pink Piglet (Napping)',
      'Baby Piglet Sitting Up',
      'Baby Piglet Sniffing Daisy',
      'Baby Piglet Standing Up',
      'Piglet Grows Up a Bit',
      'Lemon Yellow Undershirt',
      'Polka-Dot Bloomers',
      'Teenager Pig Growth',
      'Lavender Shirt',
      'Pearl Shirt Buttons',
      'Sky-Blue Denim Overalls',
      'Pink Ear Ribbon Bow',
      'Striped Meadow Socks',
      'Fully Grown Cheerful Pink Pig',
      'Rain Boot (Left Hoof)',
      'Rain Boot (Right Hoof)',
      'Straw Sunhat with Flower',
      'Woven Harvest Basket',
      'Mint Watering Can (Left Hoof)',
    ],
  },
  {
    id: 'cottage',
    name: 'Moonbeam Cottage',
    tagline: 'Starts on flat grassy ground—build your cozy 30-step Moonbeam Cottage from stone foundation to crescent weathervane!',
    effectSummary: '30-stage Moonbeam Cottage with porch awning, shutters, chimney smoke & moon weathervane',
    maxLevel: 30,
    baseCost: 2,
    costStep: 8,
    accentHex: '#dc2626',
    stageNames: [
      'Stone Foundation',
      'Wooden Pillar #1 (Front Left)',
      'Wooden Pillar #2 (Front Right)',
      'Wooden Pillar #3 (Back Left)',
      'Wooden Pillar #4 (Back Right)',
      'Wall #1 (Back Wall)',
      'Wall #2 (Left Wall)',
      'Wall #3 (Right Wall)',
      'Wall #4 (Front Wall)',
      'Paint the Walls',
      'Simple Roof',
      'Tile Roof',
      'Add Chimney',
      'Add Front Door',
      'Shiny Gold Door Knob',
      'Add Windows',
      'Add Light Inside Windows',
      'Add Window Apron',
      'Add Grass in Window Apron',
      'Add Flowers in Window Apron',
      'Add Stone Steps to Door',
      'Add Designs on the Wall',
      'Wooden Porch Awning Over Door',
      'Front Porch Lantern',
      'Painted Window Shutters',
      'Stone Walkway & Side Windows',
      'Cozy Chimney Smoke Puffs',
      'Climbing Cottage Ivy & Roses',
      'Crescent Moon Weathervane',
      'Porch Bench & Welcome Mat',
    ],
  },
  {
    id: 'causeway',
    name: 'Starlight Causeway',
    tagline: 'Lay a 20-step glowing stone walkway stretching from Moonbeam Cottage across the meadow!',
    effectSummary: '20-stage stone causeway with golden star inlays, curbs, lanterns & plaza gateposts',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#6366f1',
    stageNames: [
      'Compact Gravel Trail Bed',
      'Cottage Threshold Stepping Stones',
      'Mid-Meadow Cobblestone Pavers',
      'Front Meadow Walkway Stones',
      'Starlight Mosaic Plaza Disc',
      'Golden Star Inlay Tiles',
      'Left Cobble Curb Border',
      'Right Cobble Curb Border',
      'Meadow Wildflower Edging',
      'Wooden Guard Posts (Left)',
      'Wooden Guard Posts (Right)',
      'Starlight Bollard Lanterns #1 (Front)',
      'Starlight Bollard Lanterns #2 (Middle)',
      'Starlight Bollard Lanterns #3 (Cottage)',
      'Carved Stone Plaza Gateposts',
      'Gatepost Climbing Vines & Blossoms',
      'Plaza Starlight Beacon Lanterns',
      'Glowing Moonstone Path Pebbles',
      'Twin Starlight Flower Planters',
      'Floating Starlight Dust Ribbons',
    ],
  },
  {
    id: 'pond',
    name: 'Lullaby Lagoon',
    tagline: 'Create a 20-step cozy lagoon on the left meadow with lily pads, lanterns & jumping fishes!',
    effectSummary: '20-stage meadow lagoon with jumping koi fishes, lily pads, frog rock & willow sapling',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#06b6d4',
    stageNames: [
      'Earthen Bank & Pebble Basin',
      'Clear Shimmering Pond Water',
      'Golden Koi Fish #1 (Jumper)',
      'River Stone Border (Back Arc)',
      'River Stone Border (Front Arc)',
      'First Trio of Lily Pads',
      'Ruby Koi Fish #2 (Jumper)',
      'Blooming Pink Lotus Flowers',
      'Tall Cattails & Pond Reeds',
      'Second Cluster of Lily Pads',
      'Azure Minnow Pair (Jumpers)',
      'Pebble Cove & Stepping Stones',
      'Tiny Wooden Pond Dock',
      'Bamboo Water Trickle Spout',
      'Mossy Boulder & Pond Frog',
      'Graceful Willow Sapling',
      'Carved Stone Garden Lantern',
      'Floating Glowing Lotus Lanterns',
      'Skimming Meadow Dragonflies',
      'Golden Starlight Pond Mist',
    ],
  },
  {
    id: 'orchard',
    name: 'Sunbeam Orchard',
    tagline: 'Starts on a round brown dirt pad—grow a 20-step apple tree with blossoms, harvest ladder, birdhouse & tire swing!',
    effectSummary: '20-stage apple tree with white flowers, baskets, ladder, birdhouse & swing',
    maxLevel: ORCHARD_STAGE_NAMES.length,
    baseCost: 2,
    costStep: 4,
    accentHex: '#ef4444',
    stageNames: ORCHARD_STAGE_NAMES,
  },
  {
    id: 'windmill',
    name: 'Sky Spinner',
    tagline: 'Build a tall 20-step Netherlands windmill on the far-left meadow!',
    effectSummary: '20-stage Dutch windmill with octagonal tower, wooden gallery & spinning sails',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#0284c7',
    stageNames: [
      'Brick & Stone Foundation Pad',
      'Octagonal Stone Base Wall',
      'Red Brick Lower Tower',
      'Tapered Timber Smock Body',
      'Arched Wooden Mill Door',
      'Tower Lattice Windows',
      'Wooden Gallery Deck Ring',
      'Gallery Railing & Support Braces',
      'Upper Cap Bearing Collar',
      'Thatched Dome Windmill Cap',
      'Rear Tailpole & Turning Beam',
      'Windshaft & Brass Sail Hub',
      'Sail Stock Spar #1 (Top)',
      'Sail Stock Spar #2 (Bottom)',
      'Sail Stock Spar #3 (Left)',
      'Sail Stock Spar #4 (Right)',
      'White Canvas Lattice Sail #1',
      'White Canvas Lattice Sail #2',
      'White Canvas Lattice Sail #3',
      'White Canvas Lattice Sail #4 & Tulip Planters',
    ],
  },
  {
    id: 'well',
    name: 'Wishing Well',
    tagline: 'Build a classic 20-step stone Wishing Well with wooden roof, crank, rope & water bucket!',
    effectSummary: '+1 Star bonus to your Daily Goal Treasure Chest every 2 levels',
    maxLevel: 20,
    baseCost: 2,
    costStep: 6,
    accentHex: '#0ea5e9',
    stageNames: [
      'Clear Spot & Dig Well Pit',
      'Deep Water Pool Inside',
      'Stone Base Ring',
      'Stone Wall Course #1',
      'Stone Wall Course #2',
      'Stone Wall Course #3',
      'Stone Coping Rim',
      'Stepping Stones at Base',
      'Left Timber Post',
      'Right Timber Post',
      'Crossbar Axle Beam',
      'Hand Crank Handle',
      'Roof Frame Rafters',
      'Shingled Well Roof',
      'Roof Ridge Cap & Trim',
      'Coiled Rope on Axle',
      'Wooden Water Bucket',
      'Bucket Full of Fresh Water',
      'Moss & Ivy on Stone Wall',
      'Hanging Well Lantern',
    ],
  },
  {
    id: 'lanterns',
    name: 'Firefly Pergola',
    tagline: 'Build a cozy 20-step garden pergola with climbing vines, bench & glowing firefly lanterns!',
    effectSummary: '20-stage garden pergola with lanterns, bench & glowing firefly aura',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#f59e0b',
    stageNames: [
      'Four Stone Post Pads',
      'Front-Left Timber Post',
      'Front-Right Timber Post',
      'Back-Left Timber Post',
      'Back-Right Timber Post',
      'Front & Back Crossbeams',
      'Side Stringer Beams',
      'Pergola Roof Rafters',
      'Side Lattice Trellis Panels',
      'Climbing Ivy Vines',
      'Pergola Vine Blossoms',
      'Flagstone Garden Patio',
      'Wooden Garden Bench',
      'Hanging Lantern #1 (Front Left)',
      'Hanging Lantern #2 (Center)',
      'Hanging Lantern #3 (Front Right)',
      'Hanging Lantern #4 (Back Left)',
      'Hanging Lantern #5 (Back Right)',
      'Flower Baskets on Posts',
      'Golden Firefly Halo Swarm',
    ],
  },
  {
    id: 'fence',
    name: 'Sanctuary Shield',
    tagline: 'Build a 20-step cozy timber & lantern fence wrapping protectively around the meadow!',
    effectSummary: '20-stage perimeter meadow fence with gate pillars, flower garlands & glowing lanterns',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#84cc16',
    stageNames: [
      'North Meadow Fence Posts',
      'Northwest Meadow Fence Posts',
      'Northeast Meadow Fence Posts',
      'West Meadow Fence Posts',
      'East Meadow Fence Posts',
      'Southwest Meadow Fence Posts',
      'Southeast Meadow Fence Posts',
      'Entrance Twin Gate Pillars',
      'North Timber Fence Rails',
      'West Timber Fence Rails',
      'East Timber Fence Rails',
      'South Timber Fence Rails',
      'Lattice Pickets (Back Arc)',
      'Lattice Pickets (Side Arcs)',
      'Carved Acorn Post Finials',
      'Perimeter Stone Footings',
      'Climbing Fence Vines & Ivy',
      'Blooming Meadow Rose Garlands',
      'Warm Perimeter Fence Lanterns',
      'Golden Starlight Shield Crest & Wisps',
    ],
  },
  {
    id: 'farm',
    name: 'Enchanted Acre',
    tagline: 'Grow a 20-step little farm field with carrots, pumpkins, golden wheat & a friendly scarecrow!',
    effectSummary: '20-stage meadow farm field with carrots, pumpkins, wheat, scarecrow & wheelbarrow',
    maxLevel: 20,
    baseCost: 2,
    costStep: 4,
    accentHex: '#ea580c',
    stageNames: [
      'Cleared Rich Farm Soil Bed',
      'Split-Rail Timber Plot Border',
      'Plump Furrowed Soil Rows',
      'Row 1: Tiny Carrot Leaf Sprouts',
      'Row 1: Plump Orange Carrots',
      'Row 2: Baby Pumpkin Vines',
      'Row 2: Blossoms & Green Squash',
      'Row 2: Big Ripe Orange Pumpkins',
      'Row 3: Tender Green Wheat Shoots',
      'Row 3: Tall Golden Ripening Wheat',
      'Scarecrow Wooden Cross Post',
      'Scarecrow Flannel Shirt & Straw Arms',
      'Scarecrow Burlap Smiling Face',
      'Scarecrow Straw Hat & Crow Buddy',
      'Wooden Farm Wheelbarrow',
      'Harvest Crate of Carrots & Pumpkins',
      'Copper Watering Can & Stones',
      'Sunflowers Along Back Rail',
      'Cozy Farm Sign & Lantern',
      'Twirling Wind-Spinner & Sparkles',
    ],
  },
];

export const OUTFIT_CATEGORY_LABELS: Record<OutfitCategory, { label: string; shortLabel: string }> = {
  hat: { label: 'Hats & Caps', shortLabel: 'Hat' },
  shirt: { label: 'Shirts & Jackets', shortLabel: 'Shirt' },
  pants: { label: 'Pants & Shorts', shortLabel: 'Pants' },
  shoes: { label: 'Shoes & Boots', shortLabel: 'Shoes' },
};

export const OUTFIT_ITEMS: OutfitItemDef[] = [
  // Hat category
  {
    id: 'hat_knit',
    category: 'hat',
    tier: 1,
    name: 'Cozy Knit Beanie',
    description: 'A warm ribbed meadow beanie with a fluffy pom-pom',
    cost: 2,
  },
  {
    id: 'hat_straw',
    category: 'hat',
    tier: 2,
    name: 'Sunbeam Straw Hat',
    description: 'A wide-brim woven sun hat tied with a cheerful ribbon',
    cost: 4,
  },
  {
    id: 'hat_explorer',
    category: 'hat',
    tier: 3,
    name: 'Starlight Explorer Cap',
    description: 'A billed adventure cap topped with a golden star badge',
    cost: 7,
  },

  // Shirt category
  {
    id: 'shirt_under',
    category: 'shirt',
    tier: 1,
    name: 'Cotton Undershirt',
    description: 'A soft cream-white cotton undershirt',
    cost: 2,
  },
  {
    id: 'shirt_buttons',
    category: 'shirt',
    tier: 2,
    name: 'Buttoned Undershirt',
    description: 'Adds neat wooden buttons down the undershirt front',
    cost: 3,
  },
  {
    id: 'shirt_stripe',
    category: 'shirt',
    tier: 3,
    name: 'Color-Stripe Shirt',
    description: 'Adds cheerful stripes and crisp collar trim',
    cost: 5,
  },
  {
    id: 'shirt_jacket',
    category: 'shirt',
    tier: 4,
    name: 'Explorer Jacket',
    description: 'A tailored collared jacket with pockets & brass zipper',
    cost: 8,
  },

  // Pants category
  {
    id: 'pants_shorts',
    category: 'pants',
    tier: 1,
    name: 'Meadow Shorts',
    description: 'Lightweight stitched cotton shorts for sunny hops',
    cost: 2,
  },
  {
    id: 'pants_denim',
    category: 'pants',
    tier: 2,
    name: 'Denim Trousers',
    description: 'Comfy rolled-cuff denim pants for exploring',
    cost: 4,
  },
  {
    id: 'pants_overalls',
    category: 'pants',
    tier: 3,
    name: 'Garden Overalls',
    description: 'Sturdy meadow overalls with straps & pocket trim',
    cost: 6,
  },

  // Shoes category
  {
    id: 'shoes_sneakers',
    category: 'shoes',
    tier: 1,
    name: 'Canvas Sneakers',
    description: 'Laced meadow sneakers with crisp white toe caps',
    cost: 2,
  },
  {
    id: 'shoes_boots',
    category: 'shoes',
    tier: 2,
    name: 'Cozy Rain Boots',
    description: 'Waterproof puddle-ready garden boots',
    cost: 4,
  },
  {
    id: 'shoes_star',
    category: 'shoes',
    tier: 3,
    name: 'Golden Trail Boots',
    description: 'Sturdy explorer boots with shining brass buckles',
    cost: 6,
  },
];

export const OUTFIT_STAGE_DEFS: OutfitStageDef[] = [
  {
    level: 1,
    name: 'Cozy Undershirt',
    description: 'A soft cream-white cotton undershirt',
    cost: 2,
  },
  {
    level: 2,
    name: 'Undershirt + Buttons',
    description: 'Adds neat wooden buttons down the front',
    cost: 3,
  },
  {
    level: 3,
    name: 'Color Stripe Undershirt',
    description: 'Adds bright cheerful stripes across the undershirt',
    cost: 4,
  },
  {
    level: 4,
    name: 'Meadow Collared Shirt',
    description: 'Layers a crisp collared shirt with cozy sleeves',
    cost: 6,
  },
  {
    level: 5,
    name: 'Stitched Garden Vest',
    description: 'Adds a warm stitched meadow vest over the shirt',
    cost: 8,
  },
  {
    level: 6,
    name: 'Explorer Jacket',
    description: 'Bundles up in a collared explorer jacket with pockets',
    cost: 10,
  },
  {
    level: 7,
    name: 'Starlight Jacket & Cap',
    description: 'Completes the look with a golden star badge & cap',
    cost: 14,
  },
];

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  cost: number;
  description: string;
}

export const ACCESSORY_DEFS: AccessoryDef[] = [
  { id: 'none', name: 'Natural Ears', cost: 0, description: 'Kara’s fluffy bunny ears' },
  { id: 'leaf_crown', name: 'Clover Crown', cost: 4, description: 'A lucky woven meadow crown' },
  { id: 'sun_hat', name: 'Straw Sun Hat', cost: 7, description: 'Cozy garden explorer hat' },
  { id: 'wizard_cap', name: 'Number Wizard Hat', cost: 11, description: 'Star-speckled math mage cap' },
  { id: 'star_glasses', name: 'Starlight Shades', cost: 15, description: 'Golden star-shaped glasses' },
];

export const OPERATION_LABELS: Record<Operation, { name: string; symbol: '+' | '−' | '×' | '÷'; color: string }> = {
  add: { name: 'Addition', symbol: '+', color: '#16a34a' },
  sub: { name: 'Subtraction', symbol: '−', color: '#ea580c' },
  mul: { name: 'Multiplication', symbol: '×', color: '#2563eb' },
  div: { name: 'Division', symbol: '÷', color: '#9333ea' },
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { name: string; subtitle: string }> = {
  1: { name: 'Sprout', subtitle: '1-Digit Only (1–9)' },
  2: { name: 'Sapling', subtitle: 'Max 2 Digits (1–99)' },
  3: { name: 'Oak', subtitle: 'Max 3 Digits (1–999)' },
  4: { name: 'Starlight', subtitle: '4–6 Digits (1k–999k)' },
};

export const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: 'first_10',
    title: 'First 10 Sprouts',
    description: 'Solve 10 math problems accurately',
    category: 'practice',
    target: 10,
    getValue: (p) => p.totalCorrect,
  },
  {
    id: 'half_century',
    title: '50 Problem Explorer',
    description: 'Solve 50 math problems total',
    category: 'practice',
    target: 50,
    getValue: (p) => p.totalCorrect,
  },
  {
    id: 'century_club',
    title: '100 Math Master',
    description: 'Solve 100 math problems total',
    category: 'practice',
    target: 100,
    getValue: (p) => p.totalCorrect,
  },
  {
    id: 'thousand_club',
    title: '1000 Math Master',
    description: 'Solve 1,000 math problems total',
    category: 'practice',
    target: 1000,
    getValue: (p) => p.totalCorrect,
  },
  {
    id: 'combo_5',
    title: '5x Combo Spark',
    description: 'Reach a streak of 5 correct answers in a row',
    category: 'mastery',
    target: 5,
    getValue: (p) => p.bestCombo,
  },
  {
    id: 'combo_12',
    title: '12x Super Streak',
    description: 'Reach a streak of 12 correct answers in a row',
    category: 'mastery',
    target: 12,
    getValue: (p) => p.bestCombo,
  },
  {
    id: 'add_scout',
    title: 'Addition Ace',
    description: 'Get 15 Addition problems right',
    category: 'mastery',
    target: 15,
    getValue: (p) => p.operationStats.add.correct,
  },
  {
    id: 'sub_scout',
    title: 'Subtraction Scout',
    description: 'Get 15 Subtraction problems right',
    category: 'mastery',
    target: 15,
    getValue: (p) => p.operationStats.sub.correct,
  },
  {
    id: 'mul_wizard',
    title: 'Times Table Explorer',
    description: 'Get 15 Multiplication problems right',
    category: 'mastery',
    target: 15,
    getValue: (p) => p.operationStats.mul.correct,
  },
  {
    id: 'div_captain',
    title: 'Division Captain',
    description: 'Get 15 Division problems right',
    category: 'mastery',
    target: 15,
    getValue: (p) => p.operationStats.div.correct,
  },
  {
    id: 'streak_3',
    title: '3-Day Meadow Habit',
    description: 'Practice 3 days in a row',
    category: 'streak',
    target: 3,
    getValue: (p) => p.currentDailyStreak,
  },
  {
    id: 'daily_streak_7',
    title: '7-Day Meadow Habit',
    description: 'Practice 7 days in a row',
    category: 'streak',
    target: 7,
    getValue: (p) => p.currentDailyStreak,
  },
  {
    id: 'daily_streak_30',
    title: '30-Day Meadow Habit',
    description: 'Practice 30 days in a row',
    category: 'streak',
    target: 30,
    getValue: (p) => p.currentDailyStreak,
  },
  {
    id: 'garden_builder',
    title: 'Cozy Gardener',
    description: 'Unlock 4 total garden upgrade levels',
    category: 'garden',
    target: 4,
    getValue: (p) =>
      Object.values(p.upgrades).reduce((sum, lvl) => sum + lvl, 0),
  },
  ...ACHIEVEMENT_STREAK_TARGETS.map(
    (target): MilestoneDef => ({
      id: `streak_${target}`,
      title: `${target} in a Row`,
      description: `Complete ${target} correct answers in a row`,
      category: 'achievement',
      target,
      getValue: (p) => Math.max(p.bestCorrectStreak ?? 0, p.currentCorrectStreak ?? 0),
    })
  ),
];

export function getTodayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(now: Date = new Date()): string {
  const copy = new Date(now.getTime());
  copy.setDate(copy.getDate() - 1);
  return getTodayDateKey(copy);
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function getEffectiveTier(
  baseTier: DifficultyLevel,
  adaptive: boolean,
  combo: number
): DifficultyLevel {
  if (!adaptive) return baseTier;
  const boost = Math.floor(combo / 4);
  return Math.min(4, baseTier + boost) as DifficultyLevel;
}

export function buildHint(a: number, b: number, op: Operation): string {
  if (op === 'add') {
    if (a >= 10 || b >= 10) {
      const tensA = Math.floor(a / 10) * 10;
      const onesA = a % 10;
      const tensB = Math.floor(b / 10) * 10;
      const onesB = b % 10;
      if (tensA > 0 && tensB > 0) {
        return `Split into tens and ones: (${tensA} + ${tensB}) + (${onesA} + ${onesB})`;
      }
      return `Count up from ${Math.max(a, b)} by ${Math.min(a, b)} more!`;
    }
    return `Start at ${Math.max(a, b)} and count forward ${Math.min(a, b)} steps.`;
  }
  if (op === 'sub') {
    if (a >= 10) {
      return `Think: What number plus ${b} equals ${a}?`;
    }
    return `Start at ${a} and count backward ${b} steps.`;
  }
  if (op === 'mul') {
    if (a <= 5 || b <= 5) {
      return `Think of ${a} groups with ${b} stars in each group!`;
    }
    return `Break it apart: (${a} × ${Math.floor(b / 2)}) + (${a} × ${Math.ceil(b / 2)}).`;
  }
  return `Think backwards: ${b} × ? = ${a}`;
}

function pickStarlightScale(rng: () => number): [number, number] {
  const digits = randInt(4, 6, rng);
  if (digits === 4) return [1000, 9999];
  if (digits === 5) return [10000, 99999];
  return [100000, 999999];
}

export function generateProblem(
  ops: Operation[],
  tier: DifficultyLevel,
  rng: () => number = Math.random
): MathProblem {
  const pool: Operation[] = ops.length > 0 ? ops : ['add'];
  const operation = pool[randInt(0, pool.length - 1, rng)];
  let a = 1;
  let b = 1;
  let answer = 2;

  if (operation === 'add') {
    if (tier === 1) {
      a = randInt(1, 9, rng);
      b = randInt(1, 9, rng);
    } else if (tier === 2) {
      a = randInt(10, 49, rng);
      b = randInt(2, Math.min(29, 99 - a), rng);
    } else if (tier === 3) {
      // Oak: max 3 digits (a, b, and sum <= 999)
      a = randInt(60, 799, rng);
      b = randInt(20, Math.min(499, 999 - a), rng);
    } else {
      // Starlight: randomly 4 to 6 digits (1,000..999,999)
      const [minS, maxS] = pickStarlightScale(rng);
      const capA = Math.min(maxS, 899999);
      a = randInt(minS, capA, rng);
      b = randInt(1000, Math.min(maxS, 999999 - a), rng);
    }
    answer = a + b;
  } else if (operation === 'sub') {
    if (tier === 1) {
      a = randInt(2, 9, rng);
      b = randInt(1, a, rng);
    } else if (tier === 2) {
      a = randInt(12, 69, rng);
      b = randInt(3, Math.min(29, a - 1), rng);
    } else if (tier === 3) {
      // Oak: max 3 digits (a, b, and difference <= 999)
      a = randInt(100, 999, rng);
      b = randInt(15, a - 10, rng);
    } else {
      // Starlight: randomly 4 to 6 digits (1,000..999,999)
      const [minS, maxS] = pickStarlightScale(rng);
      a = randInt(Math.max(2000, minS), maxS, rng);
      b = randInt(1000, Math.max(1000, a - 1000), rng);
    }
    answer = a - b;
  } else if (operation === 'mul') {
    if (tier === 1) {
      a = randInt(1, 5, rng);
      b = randInt(1, 5, rng);
    } else if (tier === 2) {
      a = randInt(2, 9, rng);
      b = randInt(2, 9, rng);
    } else if (tier === 3) {
      // Oak: max 3 digits (product <= 999)
      a = randInt(12, 99, rng);
      b = randInt(2, Math.min(19, Math.floor(999 / a)), rng);
    } else {
      // Starlight: 4-5 digit multiplicand with product in 4-6 digits (<= 999,999)
      if (randInt(0, 1, rng) === 0) {
        a = randInt(1000, 9999, rng);
        b = randInt(2, Math.min(99, Math.floor(999999 / a)), rng);
      } else {
        a = randInt(10000, 99999, rng);
        b = randInt(2, Math.min(9, Math.floor(999999 / a)), rng);
      }
    }
    answer = a * b;
  } else {
    // Exact integer division: a = divisor * quotient
    let divisor = 2;
    let quotient = 2;
    if (tier === 1) {
      // Strictly 1-digit dividend (1..9), divisor (1..9), and quotient (1..9)
      const corePairs: Array<[number, number]> = [
        [4, 2], [6, 2], [6, 3], [8, 2], [8, 4], [9, 3],
      ];
      const extraPairs: Array<[number, number]> = [
        [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
        [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9],
      ];
      const poolPairs = rng() < 0.72 ? corePairs : extraPairs;
      const [divA, divB] = poolPairs[randInt(0, poolPairs.length - 1, rng)];
      divisor = divB;
      quotient = divA / divB;
    } else if (tier === 2) {
      divisor = randInt(2, 9, rng);
      quotient = randInt(2, 9, rng);
    } else if (tier === 3) {
      // Oak: max 3 digits (dividend <= 999)
      divisor = randInt(2, 12, rng);
      const maxQ = Math.floor(999 / divisor);
      quotient = randInt(Math.min(10, maxQ), maxQ, rng);
    } else {
      // Starlight: dividend randomly 4 to 6 digits (1,000..999,999)
      const [minS, maxS] = pickStarlightScale(rng);
      divisor = randInt(2, 99, rng);
      const minQ = Math.ceil(minS / divisor);
      const maxQ = Math.floor(maxS / divisor);
      quotient = randInt(minQ, maxQ, rng);
    }
    a = divisor * quotient;
    b = divisor;
    answer = quotient;
  }

  const choices = generateDistractors(answer, operation, tier, rng);
  const symbol = OPERATION_LABELS[operation].symbol;

  return {
    id: `${operation}-${a}-${b}-${Math.floor(rng() * 1e6)}`,
    a,
    b,
    operation,
    symbol,
    answer,
    choices,
    hint: buildHint(a, b, operation),
    tier,
  };
}

export function generateDistractors(
  answer: number,
  op: Operation,
  tier: DifficultyLevel,
  rng: () => number = Math.random
): number[] {
  const set = new Set<number>([answer]);
  const offsets =
    answer >= 1000
      ? [-1000, 1000, -100, 100, -10, 10, -2, 2, -1, 1]
      : answer >= 100
        ? [-100, 100, -10, 10, -2, 2, -1, 1, -5, 5]
        : tier >= 2 && (op === 'add' || op === 'sub')
          ? [-10, 10, -2, 2, -1, 1, -3, 3, -5, 5]
          : [-2, 2, -1, 1, -3, 3, -4, 4, 5, -5];

  let guard = 0;
  while (set.size < 4 && guard < 40) {
    guard++;
    const delta = offsets[randInt(0, offsets.length - 1, rng)];
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      set.add(candidate);
    }
  }

  let fallback = 1;
  while (set.size < 4) {
    if (!set.has(answer + fallback)) {
      set.add(answer + fallback);
    }
    fallback++;
  }

  const arr = Array.from(set);
  // Deterministic-friendly Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getMaxComboMultiplier(pinwheelLevel: number, flowersLevel: number = 0): number {
  return 3 + pinwheelLevel * 0.5 + flowersLevel * 0.25;
}

export function getComboMultiplier(
  combo: number,
  pinwheelLevel: number,
  flowersLevel: number = 0
): number {
  const raw = 1 + Math.floor(combo / 2) * 0.5 + (combo >= 2 ? flowersLevel * 0.25 : 0);
  return Math.min(getMaxComboMultiplier(pinwheelLevel, flowersLevel), raw);
}

export function calculatePointsEarned(
  _tier: DifficultyLevel,
  _comboAfterAnswer: number,
  _upgrades: Record<UpgradeId, number>
): number {
  return 1;
}

export function getRoundClearBonus(_cottageLevel: number): number {
  return 0;
}

export function getUpgradeCost(def: UpgradeDef, currentLevel: number): number {
  if (currentLevel >= def.maxLevel) return Infinity;
  let cost = def.baseCost;
  for (let i = 0; i < currentLevel; i++) {
    cost = Math.ceil(cost * 1.3);
  }
  return cost;
}

export function isUpgradeLocked(progress: PlayerProgress, upgradeId: UpgradeId): boolean {
  if (upgradeId === 'kaitlyn') {
    return (progress.upgrades.kara ?? 0) < 20;
  }
  if (upgradeId === 'joshua') {
    return (progress.upgrades.kaitlyn ?? 0) < 20;
  }
  if (upgradeId === 'katy') {
    return (progress.upgrades.joshua ?? 0) < 20;
  }
  return false;
}

export function getDailyChestBonus(wellLevel: number): number {
  return 3 + Math.floor(Math.max(0, wellLevel) / 2);
}

export function getAffordableUpgradeIds(progress: PlayerProgress): UpgradeId[] {
  return UPGRADE_DEFS.filter((def) => {
    if (isUpgradeLocked(progress, def.id)) return false;
    const lvl = progress.upgrades[def.id] ?? 0;
    return lvl < def.maxLevel && progress.stars >= getUpgradeCost(def, lvl);
  }).map((def) => def.id);
}

export function sortUpgradesForDisplay(progress: PlayerProgress): UpgradeDef[] {
  const getPriorityBucket = (def: UpgradeDef): number => {
    const lvl = progress.upgrades[def.id] ?? 0;
    if (lvl >= def.maxLevel) return 3;
    if (isUpgradeLocked(progress, def.id)) return 2;
    const cost = getUpgradeCost(def, lvl);
    if (progress.stars >= cost) return 0;
    return 1;
  };
  return [...UPGRADE_DEFS].sort((a, b) => getPriorityBucket(a) - getPriorityBucket(b));
}

export function purchaseUpgrade(
  progress: PlayerProgress,
  upgradeId: UpgradeId
): { next: PlayerProgress; purchased: boolean } {
  const def = UPGRADE_DEFS.find((u) => u.id === upgradeId);
  if (!def) return { next: progress, purchased: false };
  if (isUpgradeLocked(progress, upgradeId)) return { next: progress, purchased: false };
  const currentLvl = progress.upgrades[upgradeId] ?? 0;
  if (currentLvl >= def.maxLevel) return { next: progress, purchased: false };
  const cost = getUpgradeCost(def, currentLvl);
  if (progress.stars < cost) return { next: progress, purchased: false };

  const next: PlayerProgress = {
    ...progress,
    stars: progress.stars - cost,
    upgrades: {
      ...progress.upgrades,
      [upgradeId]: currentLvl + 1,
    },
  };
  next.unlockedMilestones = evaluateMilestones(next);
  return { next, purchased: true };
}

export function purchaseOutfitStage(
  progress: PlayerProgress,
  character: CharacterId
): { next: PlayerProgress; purchased: boolean } {
  const currentLvl =
    character === 'kara' ? progress.karaOutfitLevel : progress.kaitlynOutfitLevel;
  const nextStage = OUTFIT_STAGE_DEFS.find((s) => s.level === currentLvl + 1);
  if (!nextStage) return { next: progress, purchased: false };
  if (progress.stars < nextStage.cost) return { next: progress, purchased: false };

  const next: PlayerProgress =
    character === 'kara'
      ? {
          ...progress,
          stars: progress.stars - nextStage.cost,
          karaOutfitLevel: nextStage.level,
          karaEquippedOutfit: nextStage.level,
        }
      : {
          ...progress,
          stars: progress.stars - nextStage.cost,
          kaitlynOutfitLevel: nextStage.level,
          kaitlynEquippedOutfit: nextStage.level,
        };
  return { next, purchased: true };
}

export function equipOutfitStage(
  progress: PlayerProgress,
  character: CharacterId,
  stageLevel: number
): PlayerProgress {
  const unlockedMax =
    character === 'kara' ? progress.karaOutfitLevel : progress.kaitlynOutfitLevel;
  const clamped = Math.max(0, Math.min(unlockedMax, stageLevel));
  return character === 'kara'
    ? { ...progress, karaEquippedOutfit: clamped }
    : { ...progress, kaitlynEquippedOutfit: clamped };
}

export function getOutfitItemsByCategory(category: OutfitCategory): OutfitItemDef[] {
  return OUTFIT_ITEMS.filter((item) => item.category === category).sort((a, b) => a.tier - b.tier);
}

export function canUnlockOutfitItem(unlockedIds: string[], item: OutfitItemDef): boolean {
  if (unlockedIds.includes(item.id)) return false;
  if (item.tier <= 1) return true;
  const prevItem = OUTFIT_ITEMS.find(
    (x) => x.category === item.category && x.tier === item.tier - 1
  );
  return prevItem ? unlockedIds.includes(prevItem.id) : true;
}

export function purchaseOutfitItem(
  progress: PlayerProgress,
  character: CharacterId,
  itemId: string
): { next: PlayerProgress; purchased: boolean } {
  const item = OUTFIT_ITEMS.find((x) => x.id === itemId);
  if (!item) return { next: progress, purchased: false };
  const unlocked =
    character === 'kara' ? progress.karaUnlockedOutfits : progress.kaitlynUnlockedOutfits;
  if (!canUnlockOutfitItem(unlocked, item)) return { next: progress, purchased: false };
  if (progress.stars < item.cost) return { next: progress, purchased: false };

  const nextUnlocked = [...unlocked, item.id];
  const next: PlayerProgress =
    character === 'kara'
      ? {
          ...progress,
          stars: progress.stars - item.cost,
          karaUnlockedOutfits: nextUnlocked,
          karaEquippedOutfits: {
            ...progress.karaEquippedOutfits,
            [item.category]: item.id,
          },
        }
      : {
          ...progress,
          stars: progress.stars - item.cost,
          kaitlynUnlockedOutfits: nextUnlocked,
          kaitlynEquippedOutfits: {
            ...progress.kaitlynEquippedOutfits,
            [item.category]: item.id,
          },
        };
  return { next, purchased: true };
}

export function equipOutfitItem(
  progress: PlayerProgress,
  character: CharacterId,
  category: OutfitCategory,
  itemId: string | null
): PlayerProgress {
  const unlocked =
    character === 'kara' ? progress.karaUnlockedOutfits : progress.kaitlynUnlockedOutfits;
  if (itemId !== null) {
    const item = OUTFIT_ITEMS.find((x) => x.id === itemId && x.category === category);
    if (!item || !unlocked.includes(item.id)) return progress;
  }

  return character === 'kara'
    ? {
        ...progress,
        karaEquippedOutfits: {
          ...progress.karaEquippedOutfits,
          [category]: itemId,
        },
      }
    : {
        ...progress,
        kaitlynEquippedOutfits: {
          ...progress.kaitlynEquippedOutfits,
          [category]: itemId,
        },
      };
}

export function evaluateMilestones(progress: PlayerProgress): string[] {
  const unlocked = new Set(progress.unlockedMilestones);
  for (const m of MILESTONE_DEFS) {
    if (m.getValue(progress) >= m.target) {
      unlocked.add(m.id);
    }
  }
  return Array.from(unlocked);
}

export function recordAnswerResult(
  progress: PlayerProgress,
  problem: MathProblem,
  isCorrect: boolean,
  responseMs: number,
  currentCombo: number,
  shieldsRemaining: number,
  now: Date = new Date()
): {
  nextProgress: PlayerProgress;
  nextCombo: number;
  nextShields: number;
  shieldUsed: boolean;
  starsGained: number;
  chestClaimedBonus: number;
  newlyUnlockedMilestones: string[];
} {
  const todayKey = getTodayDateKey(now);
  const yesterdayKey = getYesterdayDateKey(now);

  let nextCombo = currentCombo;
  let nextShields = shieldsRemaining;
  let shieldUsed = false;
  let starsGained = 0;

  if (isCorrect) {
    nextCombo = currentCombo + 1;
    starsGained = calculatePointsEarned(problem.tier, nextCombo, progress.upgrades);
  } else if (shieldsRemaining > 0) {
    nextShields = shieldsRemaining - 1;
    shieldUsed = true;
    // Combo preserved by Firefly Lantern shield!
  } else {
    nextCombo = 0;
  }

  // Update daily streak
  let nextStreak = progress.currentDailyStreak;
  if (progress.lastPracticeDate === todayKey) {
    if (nextStreak === 0) nextStreak = 1;
  } else if (progress.lastPracticeDate === yesterdayKey) {
    nextStreak = progress.currentDailyStreak + 1;
  } else {
    nextStreak = 1;
  }

  // Update daily history entry
  const historyCopy = [...progress.dailyHistory];
  let todayIdx = historyCopy.findIndex((e) => e.date === todayKey);
  if (todayIdx === -1) {
    historyCopy.push({
      date: todayKey,
      solved: 0,
      correct: 0,
      starsEarned: 0,
    });
    todayIdx = historyCopy.length - 1;
  }
  const todayEntry = { ...historyCopy[todayIdx] };
  todayEntry.solved += 1;
  if (isCorrect) {
    todayEntry.correct += 1;
    todayEntry.starsEarned += starsGained;
  }

  // Check daily goal chest bonus
  let chestClaimedBonus = 0;
  let nextClaimedDate = progress.dailyChestClaimedDate;
  if (
    todayEntry.correct >= progress.dailyGoal &&
    progress.dailyChestClaimedDate !== todayKey
  ) {
    chestClaimedBonus = getDailyChestBonus(progress.upgrades.well);
    todayEntry.starsEarned += chestClaimedBonus;
    nextClaimedDate = todayKey;
  }
  historyCopy[todayIdx] = todayEntry;
  historyCopy.sort((x, y) => x.date.localeCompare(y.date));

  const opStat = progress.operationStats[problem.operation];
  const updatedOpStat = {
    attempted: opStat.attempted + 1,
    correct: opStat.correct + (isCorrect ? 1 : 0),
    totalResponseMs: opStat.totalResponseMs + Math.max(200, Math.min(responseMs, 60000)),
    highestTier: Math.max(opStat.highestTier, isCorrect ? problem.tier : 1) as DifficultyLevel,
  };

  const nextCorrectStreak = isCorrect ? (progress.currentCorrectStreak ?? 0) + 1 : 0;
  const nextBestCorrectStreak = Math.max(progress.bestCorrectStreak ?? 0, nextCorrectStreak);

  const prevMilestones = new Set(progress.unlockedMilestones);
  const nextProgress: PlayerProgress = {
    ...progress,
    stars: progress.stars + starsGained + chestClaimedBonus,
    totalStarsEarned: progress.totalStarsEarned + starsGained + chestClaimedBonus,
    totalAttempted: progress.totalAttempted + 1,
    totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
    bestCombo: Math.max(progress.bestCombo, nextCombo),
    currentCorrectStreak: nextCorrectStreak,
    bestCorrectStreak: nextBestCorrectStreak,
    currentDailyStreak: nextStreak,
    lastPracticeDate: todayKey,
    dailyChestClaimedDate: nextClaimedDate,
    operationStats: {
      ...progress.operationStats,
      [problem.operation]: updatedOpStat,
    },
    dailyHistory: historyCopy.slice(-30),
  };

  const evaluated = evaluateMilestones(nextProgress);
  nextProgress.unlockedMilestones = evaluated;
  const newlyUnlockedMilestones = evaluated.filter((id) => !prevMilestones.has(id));

  return {
    nextProgress,
    nextCombo,
    nextShields,
    shieldUsed,
    starsGained,
    chestClaimedBonus,
    newlyUnlockedMilestones,
  };
}

