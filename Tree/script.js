/**
 * Santa's Workshop Holiday Clicker
 * Inspired by Cookie Clicker - Christmas, Santa & Rudolph Edition
 */

(() => {
  'use strict';

  // =========================================================================
  // Game Configuration & Data
  // =========================================================================

  const BUILDINGS_DEF = [
    {
      id: 'elf',
      name: 'Cheerful Elf',
      icon: '🧝',
      desc: 'Nimble fingers wrapping boxes round the clock.',
      baseCost: 15,
      basePps: 0.5,
      flavor: 'Takes 15-minute eggnog breaks.'
    },
    {
      id: 'reindeer',
      name: 'Rudolph & Reindeer',
      icon: '🦌',
      desc: 'Glowing red nose powers through blizzard weather.',
      baseCost: 100,
      basePps: 4,
      flavor: 'Carrot fuel efficiency rated at 99.8%.'
    },
    {
      id: 'bakery',
      name: 'Gingerbread Bakery',
      icon: '🍪',
      desc: 'Spiced cookies keep North Pole morale sky-high.',
      baseCost: 1100,
      basePps: 32,
      flavor: 'Smells like cinnamon and pure joy.'
    },
    {
      id: 'workshop',
      name: 'Santa\'s Toy Workshop',
      icon: '🏠',
      desc: 'Master craftsmen carving trains and rocking horses.',
      baseCost: 12000,
      basePps: 260,
      flavor: 'Sawdust sparkles like powdered snow.'
    },
    {
      id: 'sleigh_fleet',
      name: 'Magic Sleigh Fleet',
      icon: '🛷',
      desc: 'Supersonic airborne sleighs delivering test shipments.',
      baseCost: 130000,
      basePps: 1400,
      flavor: 'Breaks the sound barrier with jingle bells.'
    },
    {
      id: 'megafactory',
      name: 'North Pole Megafactory',
      icon: '🏭',
      desc: 'Automated candy-cane turbines and gift-boxing robots.',
      baseCost: 1400000,
      basePps: 7800,
      flavor: 'Zero emissions, runs 100% on holiday cheer.'
    },
    {
      id: 'aurora_portal',
      name: 'Aurora Borealis Portal',
      icon: '🌌',
      desc: 'Channels polar geomagnetic magic straight into wrapped presents.',
      baseCost: 20000000,
      basePps: 44000,
      flavor: 'Shimmers in vibrant shades of emerald and violet.'
    },
    {
      id: 'quantum_sleigh',
      name: 'Quantum Chrono-Sleigh',
      icon: '🎅',
      desc: 'Folds spacetime to visit every chimney simultaneously.',
      baseCost: 330000000,
      basePps: 260000,
      flavor: 'Ho-Ho-Hold on to your coordinates!'
    }
  ];

  const UPGRADES_DEF = [
    // -----------------------------------------------------------------------
    // 1. Click Mastery Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'click_1',
      name: 'Candy Cane Grip',
      icon: '🍬',
      cost: 50,
      desc: 'Your clicks wrap 2x more presents.',
      req: (s) => s.totalPresents >= 25,
      apply: (s) => { s.clickMult *= 2; }
    },
    {
      id: 'click_2',
      name: 'Jingle Bell Gloves',
      icon: '🔔',
      cost: 500,
      desc: 'Clicks wrap 2x presents and gain +1% of your PPS.',
      req: (s) => s.totalPresents >= 300,
      apply: (s) => { s.clickMult *= 2; s.clickPpsPercent += 0.01; }
    },
    {
      id: 'click_3',
      name: 'Rudolph\'s Nose Polish',
      icon: '🔴',
      cost: 10000,
      desc: 'Clicks wrap 2x presents and gain an extra +2% of your PPS.',
      req: (s) => s.totalPresents >= 6000,
      apply: (s) => { s.clickMult *= 2; s.clickPpsPercent += 0.02; }
    },
    {
      id: 'click_4',
      name: 'Santa\'s Magic Velvet Sack',
      icon: '🎁',
      cost: 250000,
      desc: 'Clicks wrap 3x presents and gain +3% of your PPS.',
      req: (s) => s.totalPresents >= 150000,
      apply: (s) => { s.clickMult *= 3; s.clickPpsPercent += 0.03; }
    },
    {
      id: 'click_5',
      name: 'Diamond-Tipped Ribbons',
      icon: '💎',
      cost: 5000000,
      desc: 'Clicks wrap 3x presents and gain an additional +4% of your PPS.',
      req: (s) => s.totalPresents >= 2500000,
      apply: (s) => { s.clickMult *= 3; s.clickPpsPercent += 0.04; }
    },
    {
      id: 'click_6',
      name: 'Chrono-Temporal Wrapping',
      icon: '⌛',
      cost: 100000000,
      desc: 'Clicks wrap 4x presents and gain +5% of your PPS.',
      req: (s) => s.totalPresents >= 50000000,
      apply: (s) => { s.clickMult *= 4; s.clickPpsPercent += 0.05; }
    },
    {
      id: 'click_7',
      name: 'Cosmic Gift Resonance',
      icon: '🌠',
      cost: 5000000000,
      desc: 'Clicks wrap 5x presents and gain +6% of your PPS.',
      req: (s) => s.totalPresents >= 2500000000,
      apply: (s) => { s.clickMult *= 5; s.clickPpsPercent += 0.06; }
    },

    // -----------------------------------------------------------------------
    // 2. Cheerful Elf Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'elf_1',
      name: 'Extra Marshmallows',
      icon: '☕',
      cost: 100,
      desc: 'Cheerful Elves are twice as efficient.',
      req: (s) => (s.buildings.elf || 0) >= 1,
      apply: (s) => { s.buildingMults.elf = (s.buildingMults.elf || 1) * 2; }
    },
    {
      id: 'elf_2',
      name: 'Pointy Shoes with Bells',
      icon: '👞',
      cost: 1000,
      desc: 'Cheerful Elves are twice as efficient.',
      req: (s) => (s.buildings.elf || 0) >= 10,
      apply: (s) => { s.buildingMults.elf = (s.buildingMults.elf || 1) * 2; }
    },
    {
      id: 'elf_3',
      name: 'Ergonomic Ribbon Cutters',
      icon: '✂️',
      cost: 10000,
      desc: 'Cheerful Elves are twice as efficient.',
      req: (s) => (s.buildings.elf || 0) >= 25,
      apply: (s) => { s.buildingMults.elf = (s.buildingMults.elf || 1) * 2; }
    },
    {
      id: 'elf_4',
      name: 'Triple-Filtered Hot Cocoa',
      icon: '🍫',
      cost: 150000,
      desc: 'Cheerful Elves are twice as efficient.',
      req: (s) => (s.buildings.elf || 0) >= 50,
      apply: (s) => { s.buildingMults.elf = (s.buildingMults.elf || 1) * 2; }
    },
    {
      id: 'elf_5',
      name: 'Master Elf Guild Charter',
      icon: '📜',
      cost: 2500000,
      desc: 'Cheerful Elves are twice as efficient.',
      req: (s) => (s.buildings.elf || 0) >= 100,
      apply: (s) => { s.buildingMults.elf = (s.buildingMults.elf || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 3. Rudolph & Reindeer Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'deer_1',
      name: 'Glowing Carrots',
      icon: '🥕',
      cost: 1000,
      desc: 'Rudolph & Reindeer are twice as efficient.',
      req: (s) => (s.buildings.reindeer || 0) >= 1,
      apply: (s) => { s.buildingMults.reindeer = (s.buildingMults.reindeer || 1) * 2; }
    },
    {
      id: 'deer_2',
      name: 'Golden Antler Harness',
      icon: '⭐',
      cost: 10000,
      desc: 'Rudolph & Reindeer are twice as efficient.',
      req: (s) => (s.buildings.reindeer || 0) >= 10,
      apply: (s) => { s.buildingMults.reindeer = (s.buildingMults.reindeer || 1) * 2; }
    },
    {
      id: 'deer_3',
      name: 'Supersonic Aerodynamics',
      icon: '💨',
      cost: 100000,
      desc: 'Rudolph & Reindeer are twice as efficient.',
      req: (s) => (s.buildings.reindeer || 0) >= 25,
      apply: (s) => { s.buildingMults.reindeer = (s.buildingMults.reindeer || 1) * 2; }
    },
    {
      id: 'deer_4',
      name: 'Platinum Horseshoes',
      icon: '🧲',
      cost: 1500000,
      desc: 'Rudolph & Reindeer are twice as efficient.',
      req: (s) => (s.buildings.reindeer || 0) >= 50,
      apply: (s) => { s.buildingMults.reindeer = (s.buildingMults.reindeer || 1) * 2; }
    },
    {
      id: 'deer_5',
      name: 'Aurora Trail Navigation',
      icon: '🌌',
      cost: 25000000,
      desc: 'Rudolph & Reindeer are twice as efficient.',
      req: (s) => (s.buildings.reindeer || 0) >= 100,
      apply: (s) => { s.buildingMults.reindeer = (s.buildingMults.reindeer || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 4. Gingerbread Bakery Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'bake_1',
      name: 'Vanilla Frosting Dispensers',
      icon: '🧁',
      cost: 11000,
      desc: 'Gingerbread Bakeries are twice as efficient.',
      req: (s) => (s.buildings.bakery || 0) >= 1,
      apply: (s) => { s.buildingMults.bakery = (s.buildingMults.bakery || 1) * 2; }
    },
    {
      id: 'bake_2',
      name: 'Molasses Blast Furnace',
      icon: '🍯',
      cost: 110000,
      desc: 'Gingerbread Bakeries are twice as efficient.',
      req: (s) => (s.buildings.bakery || 0) >= 10,
      apply: (s) => { s.buildingMults.bakery = (s.buildingMults.bakery || 1) * 2; }
    },
    {
      id: 'bake_3',
      name: 'Spiced Nutmeg Aromatics',
      icon: '🌰',
      cost: 1200000,
      desc: 'Gingerbread Bakeries are twice as efficient.',
      req: (s) => (s.buildings.bakery || 0) >= 25,
      apply: (s) => { s.buildingMults.bakery = (s.buildingMults.bakery || 1) * 2; }
    },
    {
      id: 'bake_4',
      name: 'Candy Glass Ovens',
      icon: '🔥',
      cost: 15000000,
      desc: 'Gingerbread Bakeries are twice as efficient.',
      req: (s) => (s.buildings.bakery || 0) >= 50,
      apply: (s) => { s.buildingMults.bakery = (s.buildingMults.bakery || 1) * 2; }
    },
    {
      id: 'bake_5',
      name: 'Perpetual Confectionery Core',
      icon: '🍪',
      cost: 200000000,
      desc: 'Gingerbread Bakeries are twice as efficient.',
      req: (s) => (s.buildings.bakery || 0) >= 100,
      apply: (s) => { s.buildingMults.bakery = (s.buildingMults.bakery || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 5. Santa's Toy Workshop Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'work_1',
      name: 'Titanium Woodcarvers',
      icon: '🪚',
      cost: 120000,
      desc: 'Santa\'s Toy Workshops are twice as efficient.',
      req: (s) => (s.buildings.workshop || 0) >= 1,
      apply: (s) => { s.buildingMults.workshop = (s.buildingMults.workshop || 1) * 2; }
    },
    {
      id: 'work_2',
      name: 'Automated Paint Dip Vats',
      icon: '🎨',
      cost: 1500000,
      desc: 'Santa\'s Toy Workshops are twice as efficient.',
      req: (s) => (s.buildings.workshop || 0) >= 10,
      apply: (s) => { s.buildingMults.workshop = (s.buildingMults.workshop || 1) * 2; }
    },
    {
      id: 'work_3',
      name: 'Clockwork Toy Assemblers',
      icon: '⚙️',
      cost: 18000000,
      desc: 'Santa\'s Toy Workshops are twice as efficient.',
      req: (s) => (s.buildings.workshop || 0) >= 25,
      apply: (s) => { s.buildingMults.workshop = (s.buildingMults.workshop || 1) * 2; }
    },
    {
      id: 'work_4',
      name: 'Master Blueprint Vault',
      icon: '📐',
      cost: 250000000,
      desc: 'Santa\'s Toy Workshops are twice as efficient.',
      req: (s) => (s.buildings.workshop || 0) >= 50,
      apply: (s) => { s.buildingMults.workshop = (s.buildingMults.workshop || 1) * 2; }
    },
    {
      id: 'work_5',
      name: 'Sub-Zero Precision Forge',
      icon: '🔨',
      cost: 3000000000,
      desc: 'Santa\'s Toy Workshops are twice as efficient.',
      req: (s) => (s.buildings.workshop || 0) >= 100,
      apply: (s) => { s.buildingMults.workshop = (s.buildingMults.workshop || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 6. Magic Sleigh Fleet Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'sleigh_1',
      name: 'Stardust Propulsion',
      icon: '✨',
      cost: 1300000,
      desc: 'Magic Sleigh Fleets are twice as efficient.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 1,
      apply: (s) => { s.buildingMults.sleigh_fleet = (s.buildingMults.sleigh_fleet || 1) * 2; }
    },
    {
      id: 'sleigh_2',
      name: 'Anti-Gravity Runners',
      icon: '⛷️',
      cost: 15000000,
      desc: 'Magic Sleigh Fleets are twice as efficient.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 10,
      apply: (s) => { s.buildingMults.sleigh_fleet = (s.buildingMults.sleigh_fleet || 1) * 2; }
    },
    {
      id: 'sleigh_3',
      name: 'Slipstream Turbo Thrusters',
      icon: '🚀',
      cost: 180000000,
      desc: 'Magic Sleigh Fleets are twice as efficient.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 25,
      apply: (s) => { s.buildingMults.sleigh_fleet = (s.buildingMults.sleigh_fleet || 1) * 2; }
    },
    {
      id: 'sleigh_4',
      name: 'Polar Orbit Expressways',
      icon: '🛰️',
      cost: 2500000000,
      desc: 'Magic Sleigh Fleets are twice as efficient.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 50,
      apply: (s) => { s.buildingMults.sleigh_fleet = (s.buildingMults.sleigh_fleet || 1) * 2; }
    },
    {
      id: 'sleigh_5',
      name: 'Sonic Jingle Dampeners',
      icon: '🔔',
      cost: 35000000000,
      desc: 'Magic Sleigh Fleets are twice as efficient.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 100,
      apply: (s) => { s.buildingMults.sleigh_fleet = (s.buildingMults.sleigh_fleet || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 7. North Pole Megafactory Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'mega_1',
      name: 'Geothermal Candy Turbines',
      icon: '🏭',
      cost: 14000000,
      desc: 'North Pole Megafactories are twice as efficient.',
      req: (s) => (s.buildings.megafactory || 0) >= 1,
      apply: (s) => { s.buildingMults.megafactory = (s.buildingMults.megafactory || 1) * 2; }
    },
    {
      id: 'mega_2',
      name: 'Hydraulic Ribbon Presses',
      icon: '🗜️',
      cost: 180000000,
      desc: 'North Pole Megafactories are twice as efficient.',
      req: (s) => (s.buildings.megafactory || 0) >= 10,
      apply: (s) => { s.buildingMults.megafactory = (s.buildingMults.megafactory || 1) * 2; }
    },
    {
      id: 'mega_3',
      name: 'High-Speed Tinsel Looms',
      icon: '🧵',
      cost: 2500000000,
      desc: 'North Pole Megafactories are twice as efficient.',
      req: (s) => (s.buildings.megafactory || 0) >= 25,
      apply: (s) => { s.buildingMults.megafactory = (s.buildingMults.megafactory || 1) * 2; }
    },
    {
      id: 'mega_4',
      name: 'Superconducting Conveyors',
      icon: '⚡',
      cost: 30000000000,
      desc: 'North Pole Megafactories are twice as efficient.',
      req: (s) => (s.buildings.megafactory || 0) >= 50,
      apply: (s) => { s.buildingMults.megafactory = (s.buildingMults.megafactory || 1) * 2; }
    },
    {
      id: 'mega_5',
      name: 'Robotic Assembly Overseers',
      icon: '🤖',
      cost: 450000000000,
      desc: 'North Pole Megafactories are twice as efficient.',
      req: (s) => (s.buildings.megafactory || 0) >= 100,
      apply: (s) => { s.buildingMults.megafactory = (s.buildingMults.megafactory || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 8. Aurora Borealis Portal Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'aurora_1',
      name: 'Geomagnetic Prism Refractors',
      icon: '💎',
      cost: 200000000,
      desc: 'Aurora Borealis Portals are twice as efficient.',
      req: (s) => (s.buildings.aurora_portal || 0) >= 1,
      apply: (s) => { s.buildingMults.aurora_portal = (s.buildingMults.aurora_portal || 1) * 2; }
    },
    {
      id: 'aurora_2',
      name: 'Solar Wind Funnels',
      icon: '🌪️',
      cost: 2500000000,
      desc: 'Aurora Borealis Portals are twice as efficient.',
      req: (s) => (s.buildings.aurora_portal || 0) >= 10,
      apply: (s) => { s.buildingMults.aurora_portal = (s.buildingMults.aurora_portal || 1) * 2; }
    },
    {
      id: 'aurora_3',
      name: 'Quantum Northern Resonance',
      icon: '🌌',
      cost: 35000000000,
      desc: 'Aurora Borealis Portals are twice as efficient.',
      req: (s) => (s.buildings.aurora_portal || 0) >= 25,
      apply: (s) => { s.buildingMults.aurora_portal = (s.buildingMults.aurora_portal || 1) * 2; }
    },
    {
      id: 'aurora_4',
      name: 'Magnetosphere Harvester',
      icon: '🧲',
      cost: 500000000000,
      desc: 'Aurora Borealis Portals are twice as efficient.',
      req: (s) => (s.buildings.aurora_portal || 0) >= 50,
      apply: (s) => { s.buildingMults.aurora_portal = (s.buildingMults.aurora_portal || 1) * 2; }
    },
    {
      id: 'aurora_5',
      name: 'Multiverse Starlight Tap',
      icon: '🌟',
      cost: 8000000000000,
      desc: 'Aurora Borealis Portals are twice as efficient.',
      req: (s) => (s.buildings.aurora_portal || 0) >= 100,
      apply: (s) => { s.buildingMults.aurora_portal = (s.buildingMults.aurora_portal || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 9. Quantum Chrono-Sleigh Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'quantum_1',
      name: 'Tachyon Gift Injectors',
      icon: '⏳',
      cost: 3300000000,
      desc: 'Quantum Chrono-Sleighs are twice as efficient.',
      req: (s) => (s.buildings.quantum_sleigh || 0) >= 1,
      apply: (s) => { s.buildingMults.quantum_sleigh = (s.buildingMults.quantum_sleigh || 1) * 2; }
    },
    {
      id: 'quantum_2',
      name: 'Spacetime Chimney Wormholes',
      icon: '🌀',
      cost: 45000000000,
      desc: 'Quantum Chrono-Sleighs are twice as efficient.',
      req: (s) => (s.buildings.quantum_sleigh || 0) >= 10,
      apply: (s) => { s.buildingMults.quantum_sleigh = (s.buildingMults.quantum_sleigh || 1) * 2; }
    },
    {
      id: 'quantum_3',
      name: 'Paradox-Proof Delivery Loops',
      icon: '♾️',
      cost: 650000000000,
      desc: 'Quantum Chrono-Sleighs are twice as efficient.',
      req: (s) => (s.buildings.quantum_sleigh || 0) >= 25,
      apply: (s) => { s.buildingMults.quantum_sleigh = (s.buildingMults.quantum_sleigh || 1) * 2; }
    },
    {
      id: 'quantum_4',
      name: 'Chrono-Dilation Sleigh Cloaking',
      icon: '🛸',
      cost: 9000000000000,
      desc: 'Quantum Chrono-Sleighs are twice as efficient.',
      req: (s) => (s.buildings.quantum_sleigh || 0) >= 50,
      apply: (s) => { s.buildingMults.quantum_sleigh = (s.buildingMults.quantum_sleigh || 1) * 2; }
    },
    {
      id: 'quantum_5',
      name: 'Infinite Holiday Engine',
      icon: '🪐',
      cost: 120000000000000,
      desc: 'Quantum Chrono-Sleighs are twice as efficient.',
      req: (s) => (s.buildings.quantum_sleigh || 0) >= 100,
      apply: (s) => { s.buildingMults.quantum_sleigh = (s.buildingMults.quantum_sleigh || 1) * 2; }
    },

    // -----------------------------------------------------------------------
    // 10. Golden Rudolph / Event Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'gold_1',
      name: 'Lucky Golden Horseshoe',
      icon: '🧲',
      cost: 77777,
      desc: 'Golden Rudolph appears 15% more frequently.',
      req: (s) => s.goldenClicks >= 1,
      apply: () => {} // Checked in getNextGoldenDelay
    },
    {
      id: 'gold_2',
      name: 'Crimson Nose Polish Plus',
      icon: '🔴',
      cost: 777777,
      desc: 'Frenzy and Hyperclick buffs last +10 seconds longer.',
      req: (s) => s.goldenClicks >= 3,
      apply: () => {} // Checked in triggerBuff
    },
    {
      id: 'gold_3',
      name: 'Jingle Bell Resonator',
      icon: '🔔',
      cost: 7777777,
      desc: 'Christmas Miracle windfalls grant +50% more bonus presents.',
      req: (s) => s.goldenClicks >= 5,
      apply: () => {} // Checked in handleGoldenClick
    },
    {
      id: 'gold_4',
      name: 'North Star Guidance',
      icon: '🌟',
      cost: 77777777,
      desc: 'Golden Rudolph flies across screen 30% slower, giving plenty of time to click.',
      req: (s) => s.goldenClicks >= 10,
      apply: () => {}
    },

    // -----------------------------------------------------------------------
    // 11. Cross-Facility Synergies
    // -----------------------------------------------------------------------
    {
      id: 'syn_1',
      name: 'Sugar-Fueled Elves',
      icon: '🍪',
      cost: 50000,
      desc: 'Cheerful Elves gain +1% extra production per Gingerbread Bakery owned.',
      req: (s) => (s.buildings.elf || 0) >= 15 && (s.buildings.bakery || 0) >= 5,
      apply: () => {} // Computed dynamically in recalculateStats
    },
    {
      id: 'syn_2',
      name: 'Sleigh Escort Reindeer',
      icon: '🛷',
      cost: 500000,
      desc: 'Reindeer gain +1% extra production per Magic Sleigh Fleet owned.',
      req: (s) => (s.buildings.reindeer || 0) >= 15 && (s.buildings.sleigh_fleet || 0) >= 5,
      apply: () => {}
    },
    {
      id: 'syn_3',
      name: 'Mechanized Toy Assembly',
      icon: '⚙️',
      cost: 5000000,
      desc: 'Toy Workshops gain +1% extra production per Megafactory owned.',
      req: (s) => (s.buildings.workshop || 0) >= 15 && (s.buildings.megafactory || 0) >= 5,
      apply: () => {}
    },
    {
      id: 'syn_4',
      name: 'Aurora Powered Sleighs',
      icon: '🌌',
      cost: 50000000,
      desc: 'Magic Sleigh Fleets gain +1% extra production per Aurora Portal owned.',
      req: (s) => (s.buildings.sleigh_fleet || 0) >= 15 && (s.buildings.aurora_portal || 0) >= 5,
      apply: () => {}
    },
    {
      id: 'syn_5',
      name: 'Quantum Sugar Confectionery',
      icon: '🪐',
      cost: 500000000,
      desc: 'Gingerbread Bakeries gain +5% extra production per Quantum Sleigh owned.',
      req: (s) => (s.buildings.bakery || 0) >= 25 && (s.buildings.quantum_sleigh || 0) >= 2,
      apply: () => {}
    },
    {
      id: 'syn_6',
      name: 'Cybernetic Elf Exoskeletons',
      icon: '🦾',
      cost: 5000000000,
      desc: 'Cheerful Elves gain +3% extra production per Megafactory owned.',
      req: (s) => (s.buildings.elf || 0) >= 50 && (s.buildings.megafactory || 0) >= 10,
      apply: () => {}
    },

    // -----------------------------------------------------------------------
    // 12. Global North Pole Morale & Spirit Upgrades
    // -----------------------------------------------------------------------
    {
      id: 'global_1',
      name: 'Christmas Carol Broadcast',
      icon: '🎶',
      cost: 50000,
      desc: 'North Pole morale boosts ALL present production by +15%.',
      req: (s) => s.totalPresents >= 25000,
      apply: (s) => { s.globalPpsMult *= 1.15; }
    },
    {
      id: 'global_2',
      name: 'Starlight Blessing',
      icon: '🌟',
      cost: 5000000,
      desc: 'Heavenly starlight boosts ALL present production by +25%.',
      req: (s) => s.totalPresents >= 2500000,
      apply: (s) => { s.globalPpsMult *= 1.25; }
    },
    {
      id: 'global_3',
      name: 'Mistletoe Harmony',
      icon: '🌿',
      cost: 50000000,
      desc: 'Festive harmony boosts ALL present production by +20%.',
      req: (s) => s.totalPresents >= 25000000,
      apply: (s) => { s.globalPpsMult *= 1.20; }
    },
    {
      id: 'global_4',
      name: 'Spiced Eggnog Fountains',
      icon: '🥛',
      cost: 500000000,
      desc: 'Unlimited eggnog boosts ALL present production by +25%.',
      req: (s) => s.totalPresents >= 250000000,
      apply: (s) => { s.globalPpsMult *= 1.25; }
    },
    {
      id: 'global_5',
      name: 'Polar Express Rail Network',
      icon: '🚂',
      cost: 5000000000,
      desc: 'High-speed polar transit boosts ALL present production by +30%.',
      req: (s) => s.totalPresents >= 2500000000,
      apply: (s) => { s.globalPpsMult *= 1.30; }
    },
    {
      id: 'global_6',
      name: 'Chimney Standardization Accord',
      icon: '🧱',
      cost: 50000000000,
      desc: 'Frictionless entry boosts ALL present production by +35%.',
      req: (s) => s.totalPresents >= 25000000000,
      apply: (s) => { s.globalPpsMult *= 1.35; }
    },
    {
      id: 'global_7',
      name: 'Spirit of Saint Nicholas',
      icon: '🎅',
      cost: 500000000000,
      desc: 'Sacred winter joy boosts ALL present production by +50%.',
      req: (s) => s.totalPresents >= 250000000000,
      apply: (s) => { s.globalPpsMult *= 1.50; }
    },
    {
      id: 'global_8',
      name: 'Eternal Christmas Day',
      icon: '☀️',
      cost: 5000000000000,
      desc: 'A permanent festive solstice! DOUBLES all present production (2x)!',
      req: (s) => s.totalPresents >= 2500000000000,
      apply: (s) => { s.globalPpsMult *= 2.0; }
    }
  ];

  const ACHIEVEMENTS_DEF = [
    { id: 'click_1', name: 'First Gift', icon: '🎁', desc: 'Click to wrap your very first present.', check: (s) => s.totalPresents >= 1 },
    { id: 'click_100', name: 'Gift Master', icon: '🎀', desc: 'Wrap 100 presents manually with clicks.', check: (s) => s.presentsFromClicks >= 100 },
    { id: 'pres_1k', name: 'Holiday Spirit', icon: '🎄', desc: 'Accumulate 1,000 presents all time.', check: (s) => s.totalPresents >= 1000 },
    { id: 'pres_10k', name: 'Toy Mountain', icon: '📦', desc: 'Accumulate 10,000 presents all time.', check: (s) => s.totalPresents >= 10000 },
    { id: 'pres_100k', name: 'Sleigh Overflow', icon: '🛷', desc: 'Accumulate 100,000 presents all time.', check: (s) => s.totalPresents >= 100000 },
    { id: 'pres_1m', name: 'Global Deliverer', icon: '🌍', desc: 'Accumulate 1,000,000 presents all time.', check: (s) => s.totalPresents >= 1000000 },
    { id: 'elf_1', name: 'Little Helper', icon: '🧝', desc: 'Hire your first Cheerful Elf.', check: (s) => (s.buildings.elf || 0) >= 1 },
    { id: 'elf_10', name: 'Elf Syndicate', icon: '👥', desc: 'Employ 10 Cheerful Elves.', check: (s) => (s.buildings.elf || 0) >= 10 },
    { id: 'deer_1', name: 'Guided by the Nose', icon: '🦌', desc: 'Recruit Rudolph & the Reindeer.', check: (s) => (s.buildings.reindeer || 0) >= 1 },
    { id: 'deer_10', name: 'The Whole Sleigh Team', icon: '🔴', desc: 'Lead a team of 10 Reindeer units.', check: (s) => (s.buildings.reindeer || 0) >= 10 },
    { id: 'bakery_1', name: 'Sugar & Spice', icon: '🍪', desc: 'Open a Gingerbread Bakery.', check: (s) => (s.buildings.bakery || 0) >= 1 },
    { id: 'work_1', name: 'Toy Tycoon', icon: '🏠', desc: 'Establish Santa\'s Toy Workshop.', check: (s) => (s.buildings.workshop || 0) >= 1 },
    { id: 'pps_100', name: 'Brisk Delivery', icon: '⚡', desc: 'Reach 100 Presents Per Second.', check: (s) => s.pps >= 100 },
    { id: 'pps_1k', name: 'Lightning Sleigh', icon: '🚀', desc: 'Reach 1,000 Presents Per Second.', check: (s) => s.pps >= 1000 },
    { id: 'pps_50k', name: 'Christmas Miracle Rate', icon: '💫', desc: 'Reach 50,000 Presents Per Second.', check: (s) => s.pps >= 50000 },
    { id: 'golden_1', name: 'Spotted Rudolph!', icon: '✨', desc: 'Click a Golden Rudolph flying across the sky.', check: (s) => s.goldenClicks >= 1 },
    { id: 'upg_5', name: 'Holiday Innovation', icon: '🔧', desc: 'Purchase 5 festive upgrades.', check: (s) => Object.keys(s.upgradesOwned).length >= 5 },
    { id: 'tree_star', name: 'O Christmas Tree', icon: '🌟', desc: 'Decorate the tree with the Bethlehem Star Topper.', check: (s) => (s.treeLevel || 0) >= 6 },
    { id: 'tree_rudolph', name: 'Rudolph Joins the Tree', icon: '🔴', desc: 'Invite Rudolph beside the Christmas tree.', check: (s) => (s.treeLevel || 0) >= 8 },
    { id: 'tree_santa', name: 'Santa Arrives', icon: '🎅', desc: 'Welcome Santa Claus beside the Christmas tree.', check: (s) => (s.treeLevel || 0) >= 9 },
    { id: 'tree_aurora', name: 'Aurora Borealis Wonder', icon: '🌌', desc: 'Crown the tree with the Celestial Aurora Borealis.', check: (s) => (s.treeLevel || 0) >= 11 },
    { id: 'tree_max', name: 'Cosmic Starlight Wonder', icon: '🌠', desc: 'Fully decorate the Christmas Tree to maximum Level 12!', check: (s) => (s.treeLevel || 0) >= 12 },
    { id: 'ascend_1', name: 'First Sleigh Flight', icon: '🛷', desc: 'Embark on Santa\'s Sleigh Journey (Ascension) for the first time.', check: (s) => s.ascensions >= 1 },
    { id: 'canes_3', name: 'Golden Sweet Tooth', icon: '🦯', desc: 'Amass 3 or more Golden Candy Canes from ascensions.', check: (s) => s.goldenCanes >= 3 },
    { id: 'helpers_100', name: 'Centennial Workshop', icon: '🎖️', desc: 'Employ 100 total North Pole helpers (+25% Global Synergy).', check: (s) => (s.totalHelpers || 0) >= 100 },
    { id: 'helpers_1000', name: 'Millennial Guild', icon: '🏅', desc: 'Employ 1,000 total North Pole helpers (+50% Global Synergy).', check: (s) => (s.totalHelpers || 0) >= 1000 },
    { id: 'helpers_10000', name: 'Imperial Toy Legion', icon: '👑', desc: 'Employ 10,000 total North Pole helpers (+100% Global Synergy).', check: (s) => (s.totalHelpers || 0) >= 10000 }
  ];

  const HELPER_MILESTONES = [
    { count: 100, bonus: 0.25, title: '100 Helpers: Elf Synergy Squad (+25% Global Bonus)' },
    { count: 1000, bonus: 0.50, title: '1,000 Helpers: North Pole Guild (+50% Global Bonus)' },
    { count: 10000, bonus: 1.00, title: '10,000 Helpers: Imperial Toy Legion (+100% Global Bonus)' },
    { count: 100000, bonus: 2.00, title: '100,000 Helpers: Continental Taskforce (+200% Global Bonus)' },
    { count: 1000000, bonus: 5.00, title: '1,000,000 Helpers: Cosmic Santa Army (+500% Global Bonus)' }
  ];

  function getFacilityMilestoneMultiplier(count) {
    let mult = 1;
    if (count >= 100) mult *= 2;
    if (count >= 1000) mult *= 2;
    if (count >= 10000) mult *= 2;
    if (count >= 100000) mult *= 2;
    return mult;
  }

  function getFacilityMilestoneBadge(count) {
    if (count >= 100000) return '👑 100K (16x)';
    if (count >= 10000) return '💎 10K (8x)';
    if (count >= 1000) return '★★ 1K (4x)';
    if (count >= 100) return '★ 100 (2x)';
    return '';
  }

  function getTotalHelperSynergy(totalHelpers) {
    let bonus = 0;
    for (const m of HELPER_MILESTONES) {
      if (totalHelpers >= m.count) {
        bonus += m.bonus;
      }
    }
    return bonus;
  }

  const NEWS_ITEMS = [
    'Rudolph spotted practicing supersonic turns over Greenland.',
    'Mrs. Claus baked 40,000 gingerbread men this morning. Half are already gone.',
    'Elves demand an eggnog fountain in the breakroom; Santa agrees in principle.',
    'Meteorologists report an anomalous high-pressure zone made of pure peppermint over the North Pole.',
    'Rudolph\'s glowing nose temporarily registered as a new lighthouse by ocean freighters.',
    'Global toy demand up 14.8%; elves respond by working with both hands and feet.',
    'Local snowman voted Employee of the Month for remaining exceptionally chill.',
    'Santa tests aerodynamic hat trim: reduces sleigh drag by 0.04%!',
    'Toy conveyor belts lubricated with sugar syrup; engineers note sticking issues.',
    'Aurora Borealis shines emerald green in celebration of wrapped gift records!'
  ];

  // 24 Progressive, Bought Tree Upgrades (Progressive Centerpiece Levels)
  const TREE_UPGRADES_DEF = [
    {
      level: 1,
      name: 'Snowy Needle Caps',
      icon: '❄️',
      cost: 500,
      decorId: 'decorSnowCaps',
      multBonus: 0.15, // +15% PPC & PPS
      desc: 'Dust the pine branches in pure crystalline arctic snow.'
    },
    {
      level: 2,
      name: 'Warm Twinkling Fairy Lights',
      icon: '💡',
      cost: 5000,
      decorId: 'decorLights',
      multBonus: 0.25, // +25%
      desc: 'String warm glowing amber fairy lights across all tiers.'
    },
    {
      level: 3,
      name: 'Handcrafted Glass Baubles',
      icon: '🔴',
      cost: 40000,
      decorId: 'decorBaubles',
      multBonus: 0.35, // +35%
      desc: 'Hang lustrous red, blue, and gold glass ornaments.'
    },
    {
      level: 4,
      name: 'Peppermint Canes & Treats',
      icon: '🦯',
      cost: 250000,
      decorId: 'decorCanes',
      multBonus: 0.50, // +50%
      desc: 'Adorn the boughs with striped peppermint canes and spiced cookies.'
    },
    {
      level: 5,
      name: 'Golden Garlands & Tinsel',
      icon: '✨',
      cost: 1500000,
      decorId: 'decorTinsel',
      multBonus: 0.75, // +75%
      desc: 'Drape shimmering golden tinsel and festive garlands around the tree.'
    },
    {
      level: 6,
      name: 'Bethlehem Star Tree Topper',
      icon: '🌟',
      cost: 10000000,
      decorId: 'decorStar',
      multBonus: 1.00, // +100% (2x)
      desc: 'Crown the tree apex with a brilliant rotating golden star.'
    },
    {
      level: 7,
      name: 'Mountain of Wrapped Presents',
      icon: '🎁',
      cost: 65000000,
      decorId: 'decorGiftPile',
      multBonus: 1.25, // +125%
      desc: 'Stack an overflowing pile of wrapped holiday gift boxes and teddy bears.'
    },
    {
      level: 8,
      name: 'Rudolph & Glowing Red Nose',
      icon: '🦌',
      cost: 350000000,
      decorId: 'decorRudolph',
      multBonus: 1.50, // +150%
      desc: 'Rudolph stands proudly by the tree with his pulsing beacon red nose.'
    },
    {
      level: 9,
      name: 'Jolly Santa Claus & Toy Sack',
      icon: '🎅',
      cost: 2000000000,
      decorId: 'decorSanta',
      multBonus: 2.00, // +200% (3x)
      desc: 'Santa Claus arrives in his crimson velvet coat with his magic toy sack.'
    },
    {
      level: 10,
      name: 'Cheerful Workshop Elves',
      icon: '🧝',
      cost: 12000000000,
      decorId: 'decorElves',
      multBonus: 2.50, // +250%
      desc: 'A merry troupe of North Pole elves singing carols and helping decorate.'
    },
    {
      level: 11,
      name: 'Celestial Aurora Borealis Crown',
      icon: '🌌',
      cost: 80000000000,
      decorId: 'decorAurora',
      multBonus: 3.50, // +350%
      desc: 'A mystical swirling polar aurora halo radiating cosmic holiday magic.'
    },
    {
      level: 12,
      name: 'Cosmic Miracle Starlight Aura',
      icon: '🌠',
      cost: 500000000000,
      decorId: 'decorStarlightAura',
      multBonus: 5.00, // +500% (6x)
      desc: 'Bathes the tree in divine starlight particles.'
    },
    {
      level: 13,
      name: 'Swaying Jingle Bells Symphony',
      icon: '🔔',
      cost: 3000000000000,
      decorId: 'decorBells',
      multBonus: 6.00, // +600% (7x)
      desc: 'Polished golden bells chime in harmony, amplifying holiday cheer.'
    },
    {
      level: 14,
      name: 'Frosty Snowman Royal Guardians',
      icon: '⛄',
      cost: 20000000000000,
      decorId: 'decorSnowmen',
      multBonus: 8.00, // +800% (9x)
      desc: 'Twin enchanted polar snowmen stand guard on either side of the tree.'
    },
    {
      level: 15,
      name: 'Gingerbread Castle Foundation',
      icon: '🏰',
      cost: 120000000000000,
      decorId: 'decorGingerCastle',
      multBonus: 10.00, // +1000% (11x)
      desc: 'Reinforce the tree base with an intricate, frosted gingerbread castle.'
    },
    {
      level: 16,
      name: 'Golden Angel Apex Herald',
      icon: '👼',
      cost: 750000000000000,
      decorId: 'decorAngel',
      multBonus: 15.00, // +1500% (16x)
      desc: 'A radiant golden archangel hovers above the star, bestowing celestial blessings.'
    },
    {
      level: 17,
      name: 'North Pole Clockwork Express',
      icon: '🚂',
      cost: 5000000000000000,
      decorId: 'decorTrain',
      multBonus: 20.00, // +2000% (21x)
      desc: 'An automated clockwork train circles the base tracks delivering presents.'
    },
    {
      level: 18,
      name: 'Nutcracker Imperial Sentry',
      icon: '💂',
      cost: 35000000000000000,
      decorId: 'decorNutcrackers',
      multBonus: 25.00, // +2500% (26x)
      desc: 'Regal wooden soldiers stand at attention with ceremonial sabers.'
    },
    {
      level: 19,
      name: 'Diamond Crystalline Prism Needles',
      icon: '💎',
      cost: 250000000000000000,
      decorId: 'decorDiamondPrisms',
      multBonus: 35.00, // +3500% (36x)
      desc: 'Branches crystallize into radiant diamonds that refract festive light.'
    },
    {
      level: 20,
      name: 'Rainbow Sugar Crystal Garlands',
      icon: '🌈',
      cost: 1800000000000000000,
      decorId: 'decorRainbowGarland',
      multBonus: 50.00, // +5000% (51x)
      desc: 'Prismatic confectionary ribbons orbit the foliage in chromatic waves.'
    },
    {
      level: 21,
      name: 'Supersonic Reindeer Air Escort',
      icon: '🛷',
      cost: 12000000000000000000,
      decorId: 'decorReindeerEscort',
      multBonus: 75.00, // +7500% (76x)
      desc: 'A pair of flying reindeer escort the centerpiece at Mach speeds.'
    },
    {
      level: 22,
      name: 'Constellation Star Map Canopy',
      icon: '✨',
      cost: 80000000000000000000,
      decorId: 'decorConstellations',
      multBonus: 100.00, // +10000% (101x)
      desc: 'The night sky condenses into a glowing astronomical canopy above the branches.'
    },
    {
      level: 23,
      name: 'Santa Spacetime Chrono-Vortex',
      icon: '🌀',
      cost: 500000000000000000000,
      decorId: 'decorChronoVortex',
      multBonus: 150.00, // +15000% (151x)
      desc: 'Rips open twin counter-rotating portals through the fabric of Christmas eve.'
    },
    {
      level: 24,
      name: 'Christmas Singularity Supernova',
      icon: '🪐',
      cost: 3000000000000000000000,
      decorId: 'decorSupernova',
      multBonus: 250.00, // +25000% (251x)
      desc: 'THE ABSOLUTE OMEGA TREE! Collapses the holiday cosmos into infinite wrapping power!'
    }
  ];

  // =========================================================================
  // Extreme Golden Cane Relic Upgrades (Permanent, Multi-Ascension Prestige Perks)
  // =========================================================================

  const EXTREME_RELICS_DEF = [
    {
      id: 'relic_celestial_touch',
      name: 'Celestial Diamond Finger',
      icon: '👆',
      cost: 1,
      tag: 'Extreme Click Power',
      desc: 'Manual tree clicks gain an extra +5% of your current total PPS permanently!'
    },
    {
      id: 'relic_aurora_core',
      name: 'Aurora Singularity Core',
      icon: '🌌',
      cost: 2,
      tag: 'Global Production',
      desc: 'Permanent TRIPLE (3x) global present production across all runs and ascensions!'
    },
    {
      id: 'relic_rudolph_chronos',
      name: 'Rudolph Chrono-Beacon',
      icon: '🔴',
      cost: 3,
      tag: 'Golden Rudolph',
      desc: 'Golden Rudolph appears 50% faster, and all miracle frenzy buff multipliers are doubled (14x PPS / 30x PPC)!'
    },
    {
      id: 'relic_evergreen_titan',
      name: 'Evergreen Titan Root',
      icon: '🌲',
      cost: 5,
      tag: 'Tree Synergy',
      desc: 'DOUBLES (2x) the multiplier bonus of all bought tree decorations permanently!'
    },
    {
      id: 'relic_discount_architect',
      name: 'North Pole Architect Accord',
      icon: '📜',
      cost: 7,
      tag: 'Economic Supremacy',
      desc: 'All North Pole helper facilities cost 25% less presents to buy forever!'
    },
    {
      id: 'relic_santa_avatar',
      name: 'Avatar of Father Christmas',
      icon: '🎅',
      cost: 10,
      tag: 'Divine Transcendence',
      desc: 'Permanent 10x production multiplier, and start every ascension with 1,000 Elves, 250 Reindeer, and 50 Workshops!'
    },
    {
      id: 'relic_quantum_presents',
      name: 'Quantum Present Synthesizer',
      icon: '⚛️',
      cost: 15,
      tag: 'Infinite Scale',
      desc: 'Each 1,000 total North Pole helpers grants an extra +100% global multiplier (instead of standard rates)!'
    },
    {
      id: 'relic_cosmic_solstice',
      name: 'Cosmic Solstice Engine',
      icon: '🪐',
      cost: 25,
      tag: 'Cosmic Omega',
      desc: 'THE ULTIMATE GOLDEN RELIC! Multiplies ALL present production, clicks, and miracles by 50x forever!'
    }
  ];

  // =========================================================================
  // Game State
  // =========================================================================

  const state = {
    presents: 0,
    totalPresents: 0,
    totalClicks: 0,
    presentsFromClicks: 0,
    goldenClicks: 0,
    startTime: Date.now(),
    lastSaveTime: Date.now(),
    buildings: {},
    upgradesOwned: {},
    achievementsOwned: {},
    treeLevel: 0, // Level 0 (Bare Pine) up to 24
    
    // Ascension / Prestige State
    ascensions: 0,
    goldenCanes: 0,
    relicsOwned: {}, // Permanent upgrades bought with Golden Candy Canes
    activeBlessing: null, // 'auto_catcher' | 'head_start' | 'evergreen_boost' | 'offline_magic' | 'sugar_rush'
    selectedBlessing: 'auto_catcher',
    
    // Dynamic Stats
    clickMult: 1,
    clickPpsPercent: 0,
    globalPpsMult: 1,
    buildingMults: {},
    
    // Calculated
    ppc: 1,
    pps: 0,
    
    // Buff State
    activeBuff: null, // { type, mult, endsAt, duration, title, desc, icon }
    
    // UI State
    buyMult: 1, // 1, 10, 'max'
    soundEnabled: true
  };

  // =========================================================================
  // Synthesized Web Audio API Sound Effects
  // =========================================================================

  class SoundManager {
    constructor() {
      this.ctx = null;
      this.initOnInteraction = this.initOnInteraction.bind(this);
      window.addEventListener('click', this.initOnInteraction, { once: true });
    }

    initOnInteraction() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
    }

    playClick() {
      if (!state.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // High pleasant bell ping
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880 + Math.random() * 200, t);
        osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } catch (e) {
        // Audio error muted safely
      }
    }

    playBuy() {
      if (!state.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Cheerful ascending arpeggio
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.05); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.1); // G5

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      } catch (e) {}
    }

    playUpgrade() {
      if (!state.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);

          gain.gain.setValueAtTime(0.14, t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 0.2);
        });
      } catch (e) {}
    }

    playSleighBell() {
      if (!state.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        [1500, 2200, 2900, 3700].forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq + (Math.random() * 80 - 40), t);

          gain.gain.setValueAtTime(0.06, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } catch (e) {}
    }
  }

  const sound = new SoundManager();

  // =========================================================================
  // Formatting Utilities
  // =========================================================================

  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (num < 1000) {
      return Math.floor(num).toLocaleString();
    }
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const i = Math.floor(Math.log10(num) / 3);
    if (i < suffixes.length) {
      const formatted = (num / Math.pow(10, i * 3)).toFixed(2);
      return `${formatted} ${suffixes[i]}`;
    }
    return num.toExponential(2);
  }

  function formatTime(seconds) {
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  // Cost calculation for building purchase (North Pole Architect Accord gives 25% discount)
  function getBuildingCost(baseCost, currentCount, countToBuy) {
    let total = 0;
    const discount = state.relicsOwned && state.relicsOwned['relic_discount_architect'] ? 0.75 : 1.0;
    for (let i = 0; i < countToBuy; i++) {
      total += Math.ceil(baseCost * Math.pow(1.15, currentCount + i) * discount);
    }
    return total;
  }

  function getMaxAffordable(baseCost, currentCount, availablePresents) {
    let count = 0;
    let cost = 0;
    const discount = state.relicsOwned && state.relicsOwned['relic_discount_architect'] ? 0.75 : 1.0;
    while (true) {
      const nextCost = Math.ceil(baseCost * Math.pow(1.15, currentCount + count) * discount);
      if (cost + nextCost > availablePresents) break;
      cost += nextCost;
      count++;
      if (count >= 1000) break; // safety ceiling
    }
    return { count: Math.max(1, count), cost: cost || Math.ceil(baseCost * Math.pow(1.15, currentCount) * discount) };
  }

  // =========================================================================
  // Canvas Snowfall Engine
  // =========================================================================

  class SnowEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.flakes = [];
      this.numFlakes = 75;
      this.isBlizzard = false;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initFlakes();
    }

    resize() {
      this.w = this.canvas.width = window.innerWidth;
      this.h = this.canvas.height = window.innerHeight;
    }

    initFlakes() {
      this.flakes = [];
      for (let i = 0; i < this.numFlakes; i++) {
        this.flakes.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          radius: Math.random() * 2.5 + 1,
          speed: Math.random() * 1.2 + 0.6,
          wind: Math.random() * 0.8 - 0.4,
          opacity: Math.random() * 0.7 + 0.3
        });
      }
    }

    setBlizzard(active) {
      this.isBlizzard = active;
      this.numFlakes = active ? 160 : 75;
      while (this.flakes.length < this.numFlakes) {
        this.flakes.push({
          x: Math.random() * this.w,
          y: -10,
          radius: Math.random() * 3 + 1,
          speed: Math.random() * 3 + 2,
          wind: Math.random() * 2 + 1,
          opacity: Math.random() * 0.8 + 0.2
        });
      }
    }

    render() {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.ctx.fillStyle = '#ffffff';

      const speedMult = this.isBlizzard ? 2.5 : 1.0;
      const windBias = this.isBlizzard ? 1.5 : 0;

      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i];
        this.ctx.globalAlpha = f.opacity;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fill();

        f.y += f.speed * speedMult;
        f.x += (f.wind + windBias) * speedMult;

        if (f.y > this.h) {
          f.y = -5;
          f.x = Math.random() * this.w;
        }
        if (f.x > this.w) f.x = 0;
        if (f.x < 0) f.x = this.w;
      }
      this.ctx.globalAlpha = 1;
    }
  }

  // =========================================================================
  // Game Logic & Recalculation
  // =========================================================================

  function recalculateStats() {
    // 1. Reset dynamic multipliers
    state.clickMult = 1;
    state.clickPpsPercent = 0;
    state.globalPpsMult = 1;
    state.buildingMults = {};

    // 2. Apply owned upgrades
    UPGRADES_DEF.forEach(upg => {
      if (state.upgradesOwned[upg.id]) {
        upg.apply(state);
      }
    });

    // 3. Compute PPS from all buildings (including individual facility milestones at 100, 1000, 10000... & synergies)
    let basePpsTotal = 0;
    let totalHelpers = 0;

    // Cross-building synergies from upgrades
    const elfSynergy = (state.upgradesOwned['syn_1'] ? (state.buildings.bakery || 0) * 0.01 : 0) +
                       (state.upgradesOwned['syn_6'] ? (state.buildings.megafactory || 0) * 0.03 : 0);
    const reindeerSynergy = state.upgradesOwned['syn_2'] ? (state.buildings.sleigh_fleet || 0) * 0.01 : 0;
    const workshopSynergy = state.upgradesOwned['syn_3'] ? (state.buildings.megafactory || 0) * 0.01 : 0;
    const sleighSynergy = state.upgradesOwned['syn_4'] ? (state.buildings.aurora_portal || 0) * 0.01 : 0;
    const bakerySynergy = state.upgradesOwned['syn_5'] ? (state.buildings.quantum_sleigh || 0) * 0.05 : 0;

    BUILDINGS_DEF.forEach(b => {
      const count = state.buildings[b.id] || 0;
      totalHelpers += count;
      const bMult = state.buildingMults[b.id] || 1;
      const facilityMult = getFacilityMilestoneMultiplier(count);

      let synergyMult = 1;
      if (b.id === 'elf') synergyMult += elfSynergy;
      else if (b.id === 'reindeer') synergyMult += reindeerSynergy;
      else if (b.id === 'workshop') synergyMult += workshopSynergy;
      else if (b.id === 'sleigh_fleet') synergyMult += sleighSynergy;
      else if (b.id === 'bakery') synergyMult += bakerySynergy;

      basePpsTotal += count * b.basePps * bMult * facilityMult * synergyMult;
    });

    state.totalHelpers = totalHelpers;
    let helperSynergyBonus = getTotalHelperSynergy(totalHelpers);

    // Relic: Quantum Present Synthesizer gives extra +100% per 1,000 total helpers
    if (state.relicsOwned && state.relicsOwned['relic_quantum_presents']) {
      helperSynergyBonus += Math.floor(totalHelpers / 1000) * 1.0;
    }

    state.helperSynergyBonus = helperSynergyBonus;

    // Relic: Aurora Singularity Core (3x), Avatar of Father Christmas (10x), Cosmic Solstice Engine (50x)
    let relicPpsMult = 1;
    if (state.relicsOwned) {
      if (state.relicsOwned['relic_aurora_core']) relicPpsMult *= 3;
      if (state.relicsOwned['relic_santa_avatar']) relicPpsMult *= 10;
      if (state.relicsOwned['relic_cosmic_solstice']) relicPpsMult *= 50;
    }

    // Base PPS with Global upgrades, Helper Synergy Bonus, and Permanent Relic Multipliers
    let effectivePps = basePpsTotal * state.globalPpsMult * (1 + helperSynergyBonus) * relicPpsMult;

    // Cumulative Tree Decoration Multiplier (Expensive Bought Tree Upgrades)
    let treeMultBonus = 0;
    for (let i = 0; i < (state.treeLevel || 0) && i < TREE_UPGRADES_DEF.length; i++) {
      treeMultBonus += TREE_UPGRADES_DEF[i].multBonus;
    }

    // Relic: Evergreen Titan Root DOUBLES (2x) all tree upgrade bonuses
    if (state.relicsOwned && state.relicsOwned['relic_evergreen_titan']) {
      treeMultBonus *= 2;
    }

    const treeMultiplier = 1 + treeMultBonus;
    state.treeMultiplier = treeMultiplier;
    state.treeMultBonus = treeMultBonus;
    effectivePps *= treeMultiplier;

    // Apply Active Blessing: Evergreen Boost (+100% base + 10% per unspent Golden Cane)
    if (state.activeBlessing === 'evergreen_boost') {
      const bonusMult = 2.0 + (state.goldenCanes * 0.10);
      effectivePps *= bonusMult;
    }

    // Apply active Golden Frenzy Buff
    if (state.activeBuff && state.activeBuff.type === 'frenzy') {
      effectivePps *= state.activeBuff.mult;
    }

    state.pps = effectivePps;

    // 4. Compute PPC (Presents Per Click) with Tree Multiplier, Helper Synergy & Relic Multipliers
    let clickBonusPercent = state.clickPpsPercent;
    // Relic: Celestial Diamond Finger gives +5% current PPS per click
    if (state.relicsOwned && state.relicsOwned['relic_celestial_touch']) {
      clickBonusPercent += 0.05;
    }

    let relicClickMult = 1;
    if (state.relicsOwned && state.relicsOwned['relic_cosmic_solstice']) {
      relicClickMult *= 50;
    }

    let effectivePpc = ((1 * state.clickMult) + (state.pps * clickBonusPercent)) * treeMultiplier * (1 + helperSynergyBonus) * relicClickMult;

    if (state.activeBuff && state.activeBuff.type === 'hyperclick') {
      effectivePpc *= state.activeBuff.mult;
    }

    state.ppc = Math.max(1, effectivePpc);
  }

  // Trigger floating click numbers and bursting holiday particles
  function spawnClickEffects(e, amount) {
    const container = document.getElementById('particleContainer');
    const x = e.clientX || (window.innerWidth / 2);
    const y = e.clientY || (window.innerHeight / 2);

    // Floating text
    const numEl = document.createElement('div');
    numEl.className = 'floating-number';
    numEl.textContent = `+${formatNumber(amount)} 🎁`;
    numEl.style.left = `${x - 20}px`;
    numEl.style.top = `${y - 20}px`;
    container.appendChild(numEl);

    // Particle bursts
    const symbols = ['❄️', '⭐', '✨', '🍬', '🎄'];
    for (let i = 0; i < 4; i++) {
      const p = document.createElement('div');
      p.className = 'click-particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60 + 30;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);

      container.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }

    setTimeout(() => numEl.remove(), 1000);
  }

  function handleTreeClick(e) {
    recalculateStats();
    const amount = state.ppc;

    state.presents += amount;
    state.totalPresents += amount;
    state.totalClicks += 1;
    state.presentsFromClicks += amount;

    sound.playClick();
    spawnClickEffects(e, amount);

    const treeWrapper = document.getElementById('treeClicker');
    treeWrapper.classList.remove('clicked');
    void treeWrapper.offsetWidth; // trigger reflow
    treeWrapper.classList.add('clicked');

    checkAchievements();
    updateUI();
  }

  // =========================================================================
  // Tree Upgrades & Decorations Station (12 Bought Levels)
  // =========================================================================

  function buyTreeUpgrade() {
    const currentLevel = state.treeLevel || 0;
    if (currentLevel >= TREE_UPGRADES_DEF.length) return;

    const next = TREE_UPGRADES_DEF[currentLevel];
    if (state.presents >= next.cost) {
      state.presents -= next.cost;
      state.treeLevel = currentLevel + 1;

      sound.playUpgrade();
      showTicker(`🎄 Christmas Tree decorated with ${next.name}! (+${(next.multBonus * 100).toFixed(0)}% Multiplier Boost!)`);

      // Spawn celebratory particle explosion around tree
      const container = document.getElementById('particleContainer');
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const symbols = ['🌟', '✨', '🎁', '❄️', '🎀', '🍬'];
      for (let i = 0; i < 16; i++) {
        const p = document.createElement('div');
        p.className = 'click-particle';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        const angle = (Math.PI * 2 * i) / 16;
        const dist = Math.random() * 90 + 50;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        container.appendChild(p);
        setTimeout(() => p.remove(), 800);
      }

      checkAchievements();
      recalculateStats();
      updateTreeEvolution();
      updateUI();
      saveGame();
    }
  }

  function updateTreeEvolution() {
    const currentLevel = state.treeLevel || 0;

    // Toggle SVG decor elements based on bought treeLevel
    TREE_UPGRADES_DEF.forEach((upg) => {
      if (!upg.decorId) return;
      const el = document.getElementById(upg.decorId);
      if (el) {
        if (currentLevel >= upg.level) {
          el.classList.remove('decor-hidden');
        } else {
          el.classList.add('decor-hidden');
        }
      }
    });

    // Update Tree Upgrade Header
    document.getElementById('treeLevelBadge').textContent = currentLevel;
    const curName = currentLevel === 0 ? 'Bare Evergreen Pine' : TREE_UPGRADES_DEF[currentLevel - 1].name;
    document.getElementById('treeLevelName').textContent = curName;
    document.getElementById('treeMultiplierBadge').textContent = `+${((state.treeMultBonus || 0) * 100).toFixed(0)}% Boost`;

    // Update Next Tree Upgrade Card
    const buyBtn = document.getElementById('buyTreeUpgradeBtn');
    if (currentLevel < TREE_UPGRADES_DEF.length) {
      const next = TREE_UPGRADES_DEF[currentLevel];
      document.getElementById('treeNextIcon').textContent = next.icon;
      document.getElementById('treeNextName').textContent = next.name;
      document.getElementById('treeNextBonus').textContent = `+${(next.multBonus * 100).toFixed(0)}% PPC & PPS`;
      document.getElementById('treeNextDesc').textContent = next.desc;
      document.getElementById('treeUpgradeCost').textContent = `${formatNumber(next.cost)} 🎁`;

      const canAfford = state.presents >= next.cost;
      buyBtn.disabled = !canAfford;
      buyBtn.classList.toggle('can-afford', canAfford);
    } else {
      document.getElementById('treeNextIcon').textContent = '🌟';
      document.getElementById('treeNextName').textContent = 'Cosmic Transcendence';
      document.getElementById('treeNextBonus').textContent = '+500% Max Boost!';
      document.getElementById('treeNextDesc').textContent = 'Your Christmas Tree radiates the ultimate cosmic holiday grandeur!';
      document.getElementById('treeUpgradeCost').textContent = 'MAX LEVEL';
      buyBtn.disabled = true;
      buyBtn.classList.remove('can-afford');
    }

    // Rudolph glowing nose intensity when buff is active
    const nose = document.getElementById('rudolphNose');
    if (nose) {
      if (state.activeBuff) {
        nose.classList.add('super-charged');
      } else {
        nose.classList.remove('super-charged');
      }
    }
  }

  // =========================================================================
  // Golden Rudolph Flying Sleigh Event
  // =========================================================================

  function getNextGoldenDelay() {
    const isSugarRush = state.activeBlessing === 'sugar_rush';
    let baseMin = isSugarRush ? 22000 : 38000;
    let baseVar = isSugarRush ? 25000 : 45000;
    
    // gold_1 upgrade: Golden Rudolph appears 15% more frequently
    if (state.upgradesOwned['gold_1']) {
      baseMin *= 0.85;
      baseVar *= 0.85;
    }

    // Relic: Rudolph Chrono-Beacon makes Rudolph appear 50% faster
    if (state.relicsOwned && state.relicsOwned['relic_rudolph_chronos']) {
      baseMin *= 0.50;
      baseVar *= 0.50;
    }

    return baseMin + Math.random() * baseVar;
  }

  let nextGoldenSpawn = Date.now() + getNextGoldenDelay();

  function checkGoldenRudolph() {
    const el = document.getElementById('goldenRudolph');
    if (Date.now() >= nextGoldenSpawn && el.classList.contains('hidden')) {
      // Spawn golden rudolph
      el.classList.remove('hidden');
      sound.playSleighBell();

      // gold_4 upgrade: flies 30% slower across the screen
      const flightDuration = state.upgradesOwned['gold_4'] ? 18000 : 14000;
      el.style.animationDuration = `${(flightDuration / 1000).toFixed(1)}s`;

      // Set random vertical position
      const topPct = Math.floor(Math.random() * 50) + 10;
      el.style.top = `${topPct}%`;

      // Active Blessing: Rudolph Auto-Catcher
      if (state.activeBlessing === 'auto_catcher') {
        setTimeout(() => {
          if (!el.classList.contains('hidden')) {
            showTicker('🎯 Rudolph Auto-Catcher caught the Flying Sleigh!');
            handleGoldenClick();
          }
        }, 550);
      }

      // Hide after animation finishes if not clicked
      setTimeout(() => {
        if (!el.classList.contains('hidden')) {
          el.classList.add('hidden');
          nextGoldenSpawn = Date.now() + getNextGoldenDelay();
        }
      }, flightDuration);
    }
  }

  function handleGoldenClick() {
    const el = document.getElementById('goldenRudolph');
    if (el.classList.contains('hidden')) return;

    el.classList.add('hidden');
    state.goldenClicks += 1;
    sound.playUpgrade();

    // Relic: Rudolph Chrono-Beacon doubles buff multipliers (14x PPS / 30x PPC)
    const frenzyMult = (state.relicsOwned && state.relicsOwned['relic_rudolph_chronos']) ? 14 : 7;
    const hyperMult = (state.relicsOwned && state.relicsOwned['relic_rudolph_chronos']) ? 30 : 15;

    // Pick 1 of 3 Festive Miracles
    const roll = Math.random();
    if (roll < 0.45) {
      // Red-Nose Frenzy
      triggerBuff({
        type: 'frenzy',
        mult: frenzyMult,
        duration: 30,
        title: 'Red-Nose Frenzy!',
        desc: `${frenzyMult}x Production for 30 seconds!`,
        icon: '🔴'
      });
    } else if (roll < 0.8) {
      // Ho-Ho-Hyperclick
      triggerBuff({
        type: 'hyperclick',
        mult: hyperMult,
        duration: 15,
        title: 'Ho-Ho-Hyperclick!',
        desc: `${hyperMult}x Click Power for 15 seconds!`,
        icon: '⚡'
      });
    } else {
      // Christmas Miracle! Instant Windfall (gold_3 gives +50% bonus)
      recalculateStats();
      const miracleMultiplier = (state.upgradesOwned['gold_3'] ? 1.5 : 1.0) * (state.relicsOwned && state.relicsOwned['relic_cosmic_solstice'] ? 50 : 1.0);
      const lumpSum = Math.max(50, Math.floor((state.presents * 0.15 + state.pps * 60) * miracleMultiplier));
      state.presents += lumpSum;
      state.totalPresents += lumpSum;
      showTicker(`🌟 CHRISTMAS MIRACLE! Santa gave you an instant gift of +${formatNumber(lumpSum)} presents!`);
      triggerBuff({
        type: 'miracle',
        mult: 1,
        duration: 5,
        title: 'Christmas Miracle!',
        desc: `Instant +${formatNumber(lumpSum)} Presents Wrapped!`,
        icon: '🎁'
      });
    }

    nextGoldenSpawn = Date.now() + getNextGoldenDelay();
    checkAchievements();
    recalculateStats();
    updateUI();
  }

  function triggerBuff(buff) {
    // gold_2 upgrade: Frenzy and Hyperclick buffs last +10 seconds longer
    if (buff.type !== 'miracle' && state.upgradesOwned['gold_2']) {
      buff.duration += 10;
    }

    // Active Blessing: Sugar Rush doubles buff duration
    if (state.activeBlessing === 'sugar_rush' && buff.type !== 'miracle') {
      buff.duration *= 2;
    }

    buff.desc = buff.desc.replace(/(\d+)\s*seconds/, `${buff.duration} seconds`);
    buff.endsAt = Date.now() + buff.duration * 1000;
    state.activeBuff = buff;

    const banner = document.getElementById('buffBanner');
    const iconEl = document.getElementById('buffIcon');
    const titleEl = document.getElementById('buffTitle');
    const descEl = document.getElementById('buffDesc');

    iconEl.textContent = buff.icon;
    titleEl.textContent = buff.title;
    descEl.textContent = buff.desc;
    banner.classList.remove('hidden');

    if (window.snowEngine) {
      window.snowEngine.setBlizzard(buff.type === 'frenzy' || buff.type === 'hyperclick');
    }
  }

  function updateBuffProgress() {
    if (!state.activeBuff) return;
    const now = Date.now();
    const remaining = state.activeBuff.endsAt - now;

    if (remaining <= 0) {
      state.activeBuff = null;
      document.getElementById('buffBanner').classList.add('hidden');
      if (window.snowEngine) window.snowEngine.setBlizzard(false);
      recalculateStats();
      updateUI();
    } else {
      const pct = (remaining / (state.activeBuff.duration * 1000)) * 100;
      document.getElementById('buffProgress').style.width = `${pct}%`;
    }
  }

  // =========================================================================
  // Upgrades & Building Purchases
  // =========================================================================

  function buyUpgrade(upgradeId) {
    const upg = UPGRADES_DEF.find(u => u.id === upgradeId);
    if (!upg || state.upgradesOwned[upgradeId]) return;

    if (state.presents >= upg.cost) {
      state.presents -= upg.cost;
      state.upgradesOwned[upgradeId] = true;
      hideUpgradeTooltip();
      sound.playUpgrade();
      showTicker(`🎅 Purchased Upgrade: ${upg.name}!`);
      checkAchievements();
      recalculateStats();
      lastAvailableUpgradesKey = ''; // Force tray re-render
      updateUpgradesUI();
      updateUI();
    }
  }

  function buyBuilding(buildingId) {
    const b = BUILDINGS_DEF.find(item => item.id === buildingId);
    if (!b) return;

    const currentCount = state.buildings[buildingId] || 0;
    const oldTotalHelpers = state.totalHelpers || 0;
    let countToBuy = 1;
    let cost = 0;

    if (state.buyMult === 1) {
      countToBuy = 1;
      cost = getBuildingCost(b.baseCost, currentCount, 1);
    } else if (state.buyMult === 10) {
      countToBuy = 10;
      cost = getBuildingCost(b.baseCost, currentCount, 10);
    } else if (state.buyMult === 'max') {
      const res = getMaxAffordable(b.baseCost, currentCount, state.presents);
      countToBuy = res.count;
      cost = res.cost;
    }

    if (state.presents >= cost) {
      state.presents -= cost;
      const newCount = currentCount + countToBuy;
      state.buildings[buildingId] = newCount;

      sound.playBuy();

      // Check facility milestone crossings (100, 1000, 10000...)
      [100, 1000, 10000, 100000].forEach(threshold => {
        if (currentCount < threshold && newCount >= threshold) {
          sound.playUpgrade();
          showTicker(`⭐ ${b.name} reached ${threshold.toLocaleString()} units! Production DOUBLED (2x speed bonus)!`);
        }
      });

      recalculateStats();

      // Check total helpers milestone crossings (100, 1000, 10000...)
      HELPER_MILESTONES.forEach(m => {
        if (oldTotalHelpers < m.count && state.totalHelpers >= m.count) {
          sound.playUpgrade();
          showTicker(`🎉 HELPER MILESTONE! Reached ${m.count.toLocaleString()} total helpers! +${(m.bonus * 100).toFixed(0)}% Global Production Bonus unlocked!`);
        }
      });

      checkAchievements();
      updateWorkshopShowcase();
      updateUI();
    }
  }

  // =========================================================================
  // Achievements
  // =========================================================================

  function checkAchievements() {
    let newlyUnlocked = false;
    ACHIEVEMENTS_DEF.forEach(ach => {
      if (!state.achievementsOwned[ach.id] && ach.check(state)) {
        state.achievementsOwned[ach.id] = true;
        newlyUnlocked = true;
        showTicker(`🏆 Trophy Unlocked: ${ach.name}! (${ach.desc})`);
        sound.playUpgrade();
      }
    });
    if (newlyUnlocked) {
      renderAchievements();
    }
  }

  // =========================================================================
  // UI Rendering & Updates
  // =========================================================================

  function showTicker(msg) {
    const el = document.getElementById('tickerText');
    if (el) {
      el.textContent = msg;
    }
  }

  // Render static building cards once
  function renderBuildingsList() {
    const list = document.getElementById('buildingsList');
    list.innerHTML = '';

    BUILDINGS_DEF.forEach(b => {
      const card = document.createElement('div');
      card.className = 'building-card';
      card.id = `building-card-${b.id}`;
      card.onclick = () => buyBuilding(b.id);

      card.innerHTML = `
        <div class="building-card__left">
          <div class="building-card__icon">${b.icon}</div>
          <div class="building-card__info">
            <span class="building-card__name">${b.name}</span>
            <span class="building-card__cost" id="building-cost-${b.id}">
              <span>🎁</span>
              <strong id="building-cost-val-${b.id}">0</strong>
            </span>
          </div>
        </div>
        <div class="building-card__right">
          <span class="building-card__count" id="building-count-${b.id}">0</span>
          <span class="building-card__rate" id="building-rate-${b.id}">+${b.basePps}/s</span>
        </div>
      `;

      list.appendChild(card);
    });
  }

  // Render achievement trophies
  function renderAchievements() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    ACHIEVEMENTS_DEF.forEach(ach => {
      const badge = document.createElement('div');
      const isUnlocked = !!state.achievementsOwned[ach.id];
      badge.className = `trophy-badge ${isUnlocked ? 'unlocked' : ''}`;
      badge.textContent = ach.icon;
      badge.title = `${ach.name} - ${ach.desc} ${isUnlocked ? '(Unlocked!)' : '(Locked)'}`;
      grid.appendChild(badge);
    });

    const count = Object.keys(state.achievementsOwned).length;
    document.getElementById('achievementsCount').textContent = `${count} / ${ACHIEVEMENTS_DEF.length}`;
  }

  // Stable Upgrades Tray UI (No DOM destruction on every frame)
  let lastAvailableUpgradesKey = null;

  function updateUpgradesUI() {
    const available = UPGRADES_DEF.filter(u => !state.upgradesOwned[u.id] && u.req(state));
    const currentKey = available.map(u => u.id).join(',');
    const tray = document.getElementById('upgradesTray');
    if (!tray) return;

    document.getElementById('availableUpgradesCount').textContent = available.length;

    // Only rebuild DOM when available upgrade list actually changes
    if (currentKey !== lastAvailableUpgradesKey) {
      lastAvailableUpgradesKey = currentKey;

      if (available.length === 0) {
        tray.innerHTML = '<div class="no-upgrades" id="noUpgradesMsg">Earn more presents to unlock festive upgrades!</div>';
        return;
      }

      tray.innerHTML = '';
      available.forEach(upg => {
        const slot = document.createElement('div');
        const canAfford = state.presents >= upg.cost;
        slot.className = `upgrade-slot ${canAfford ? '' : 'unaffordable'}`;
        slot.dataset.upgradeId = upg.id;
        slot.textContent = upg.icon;
        slot.setAttribute('title', `${upg.name} (${formatNumber(upg.cost)} 🎁)`);
        tray.appendChild(slot);
      });
    } else {
      // Just toggle .unaffordable class on existing elements
      available.forEach(upg => {
        const slot = tray.querySelector(`[data-upgrade-id="${upg.id}"]`);
        if (slot) {
          const canAfford = state.presents >= upg.cost;
          slot.classList.toggle('unaffordable', !canAfford);
        }
      });
    }
  }

  // Tooltip display
  const tooltipEl = document.getElementById('upgradeTooltip');
  function showUpgradeTooltip(targetEl, upg) {
    if (!tooltipEl || !upg || !targetEl) return;
    document.getElementById('tooltipIcon').textContent = upg.icon;
    document.getElementById('tooltipName').textContent = upg.name;
    document.getElementById('tooltipCost').textContent = `Cost: ${formatNumber(upg.cost)} 🎁`;
    document.getElementById('tooltipDesc').textContent = upg.desc;

    tooltipEl.classList.remove('hidden');
    const rect = targetEl.getBoundingClientRect();
    tooltipEl.style.left = `${Math.min(window.innerWidth - 260, Math.max(10, rect.left - 50))}px`;
    tooltipEl.style.top = `${rect.bottom + 8}px`;
  }

  function hideUpgradeTooltip() {
    if (tooltipEl) tooltipEl.classList.add('hidden');
  }

  // Update Workshop Helpers Visualizer and Helper Milestone Progress
  let lastWorkshopKey = null;

  function updateWorkshopShowcase() {
    const showcase = document.getElementById('workshopShowcase');
    if (!showcase) return;

    let totalHelpers = 0;
    Object.values(state.buildings).forEach(c => { totalHelpers += c; });
    state.totalHelpers = totalHelpers;

    // 1. Update Helper Milestone Synergy Card
    const synergyBonus = getTotalHelperSynergy(totalHelpers);
    const synergyBadge = document.getElementById('helperSynergyBonusBadge');
    if (synergyBadge) {
      synergyBadge.textContent = `+${(synergyBonus * 100).toFixed(0)}% Global Bonus`;
    }

    // Find next milestone
    let nextMilestone = null;
    let prevCount = 0;
    for (const m of HELPER_MILESTONES) {
      if (totalHelpers < m.count) {
        nextMilestone = m;
        break;
      }
      prevCount = m.count;
    }

    const milestoneBar = document.getElementById('helperMilestoneBar');
    const goalEl = document.getElementById('nextHelperMilestoneGoal');
    const bonusEl = document.getElementById('nextHelperMilestoneBonus');

    if (nextMilestone) {
      const pct = Math.min(100, Math.max(0, ((totalHelpers - prevCount) / (nextMilestone.count - prevCount)) * 100));
      if (milestoneBar) milestoneBar.style.width = `${pct.toFixed(1)}%`;
      if (goalEl) goalEl.textContent = `${nextMilestone.count.toLocaleString()} Helpers (${totalHelpers.toLocaleString()} / ${nextMilestone.count.toLocaleString()})`;
      if (bonusEl) bonusEl.textContent = `+${(nextMilestone.bonus * 100).toFixed(0)}% Production`;
    } else {
      if (milestoneBar) milestoneBar.style.width = '100%';
      if (goalEl) goalEl.textContent = 'All Milestones Mastered! 🌟';
      if (bonusEl) bonusEl.textContent = 'Max Bonus Active';
    }

    const currentKey = Object.entries(state.buildings).map(([k, v]) => `${k}:${v}`).join(',');
    if (currentKey === lastWorkshopKey) return;
    lastWorkshopKey = currentKey;

    let html = '';

    BUILDINGS_DEF.forEach(b => {
      const count = state.buildings[b.id] || 0;
      if (count > 0) {
        const bMult = state.buildingMults[b.id] || 1;
        const facilityMult = getFacilityMilestoneMultiplier(count);
        const facilityBadge = getFacilityMilestoneBadge(count);
        const totalPps = count * b.basePps * bMult * facilityMult * state.globalPpsMult * (1 + synergyBonus);
        html += `
          <div class="helper-strip">
            <div class="helper-strip__info">
              <span class="helper-strip__icon">${b.icon}</span>
              <div>
                <div class="helper-strip__title">
                  ${b.name} ${facilityBadge ? `<span class="badge-mini" style="background: rgba(251, 191, 36, 0.2); color: var(--gold-star); margin-left: 4px;">${facilityBadge}</span>` : ''}
                </div>
                <div class="helper-strip__sub">Producing ${formatNumber(totalPps)} gifts/sec (${b.flavor})</div>
              </div>
            </div>
            <div class="helper-strip__count">${count.toLocaleString()}</div>
          </div>
        `;
      }
    });

    document.getElementById('totalHelpersBadge').textContent = `${totalHelpers.toLocaleString()} Helpers Active`;
    if (totalHelpers > 0) {
      showcase.innerHTML = html;
    } else {
      showcase.innerHTML = `
        <div class="empty-workshop">
          Your workshop is quiet. Hire elves and reindeer from Santa's Shop to get production rolling!
        </div>
      `;
    }
  }

  // Master UI refresh
  function updateUI() {
    document.getElementById('presentCount').textContent = formatNumber(state.presents);
    document.getElementById('ppsDisplay').textContent = formatNumber(state.pps);
    document.getElementById('ppcDisplay').textContent = formatNumber(state.ppc);

    // Update Building Cards
    BUILDINGS_DEF.forEach(b => {
      const card = document.getElementById(`building-card-${b.id}`);
      if (!card) return;

      const currentCount = state.buildings[b.id] || 0;
      let countToBuy = 1;
      let cost = 0;

      if (state.buyMult === 1) {
        countToBuy = 1;
        cost = getBuildingCost(b.baseCost, currentCount, 1);
      } else if (state.buyMult === 10) {
        countToBuy = 10;
        cost = getBuildingCost(b.baseCost, currentCount, 10);
      } else if (state.buyMult === 'max') {
        const res = getMaxAffordable(b.baseCost, currentCount, state.presents);
        countToBuy = res.count;
        cost = res.cost;
      }

      const canAfford = state.presents >= cost;
      card.classList.toggle('unaffordable', !canAfford);

      const costValEl = document.getElementById(`building-cost-val-${b.id}`);
      costValEl.textContent = formatNumber(cost);

      const costContainer = document.getElementById(`building-cost-${b.id}`);
      costContainer.classList.toggle('cannot-afford', !canAfford);

      const fBadge = getFacilityMilestoneBadge(currentCount);
      document.getElementById(`building-count-${b.id}`).innerHTML = `${currentCount.toLocaleString()} ${fBadge ? `<span class="badge-mini" style="font-size: 9px; color: var(--gold-star); background: rgba(251, 191, 36, 0.2);">${fBadge}</span>` : ''}`;

      const bMult = state.buildingMults[b.id] || 1;
      const facilityMult = getFacilityMilestoneMultiplier(currentCount);
      const helperMult = (1 + (state.helperSynergyBonus || 0)) * (state.treeMultiplier || 1) * state.globalPpsMult;
      const rate = b.basePps * bMult * facilityMult * helperMult * (state.buyMult === 'max' ? countToBuy : state.buyMult);
      document.getElementById(`building-rate-${b.id}`).textContent = `+${formatNumber(rate)}/s`;
    });

    updateUpgradesUI();
    updateTreeEvolution();
    updateAscendUI();
  }

  // =========================================================================
  // Save & Load (localStorage)
  // =========================================================================

  const SAVE_KEY = 'santa_workshop_clicker_save_v1';

  function saveGame() {
    state.lastSaveTime = Date.now();
    const data = {
      presents: state.presents,
      totalPresents: state.totalPresents,
      totalClicks: state.totalClicks,
      presentsFromClicks: state.presentsFromClicks,
      goldenClicks: state.goldenClicks,
      startTime: state.startTime,
      buildings: state.buildings,
      upgradesOwned: state.upgradesOwned,
      achievementsOwned: state.achievementsOwned,
      treeLevel: state.treeLevel || 0,
      soundEnabled: state.soundEnabled,
      ascensions: state.ascensions,
      goldenCanes: state.goldenCanes,
      relicsOwned: state.relicsOwned || {},
      activeBlessing: state.activeBlessing,
      selectedBlessing: state.selectedBlessing,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      state.presents = data.presents || 0;
      state.totalPresents = data.totalPresents || 0;
      state.totalClicks = data.totalClicks || 0;
      state.presentsFromClicks = data.presentsFromClicks || 0;
      state.goldenClicks = data.goldenClicks || 0;
      state.startTime = data.startTime || Date.now();
      state.buildings = data.buildings || {};
      state.upgradesOwned = data.upgradesOwned || {};
      state.achievementsOwned = data.achievementsOwned || {};
      state.treeLevel = typeof data.treeLevel === 'number' ? data.treeLevel : 0;
      state.ascensions = data.ascensions || 0;
      state.goldenCanes = data.goldenCanes || 0;
      state.relicsOwned = data.relicsOwned || {};
      state.activeBlessing = data.activeBlessing || null;
      state.selectedBlessing = data.selectedBlessing || 'auto_catcher';

      if (typeof data.soundEnabled === 'boolean') {
        state.soundEnabled = data.soundEnabled;
      }

      // Offline progress calculation
      recalculateStats();
      if (data.timestamp && state.pps > 0) {
        const isOfflineMagic = state.activeBlessing === 'offline_magic';
        const maxOfflineSecs = isOfflineMagic ? 172800 : 86400; // 48h vs 24h
        const efficiency = isOfflineMagic ? 1.0 : 0.7; // 100% vs 70%

        const secondsOffline = Math.min(maxOfflineSecs, Math.floor((Date.now() - data.timestamp) / 1000));
        if (secondsOffline > 10) {
          const offlinePresents = Math.floor(state.pps * secondsOffline * efficiency);
          state.presents += offlinePresents;
          state.totalPresents += offlinePresents;
          showTicker(`🎅 Welcome back! The elves wrapped ${formatNumber(offlinePresents)} presents while you were away!`);
        }
      }
    } catch (e) {
      console.error('Error loading save:', e);
    }
  }

  function resetGame() {
    if (confirm('Are you sure you want to restart Santa\'s Workshop from scratch? All presents, helpers, and upgrades will reset!')) {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    }
  }

  // =========================================================================
  // Game Loop
  // =========================================================================

  let lastFrameTime = performance.now();

  function gameLoop(now) {
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (dt > 0 && dt < 2) {
      recalculateStats();
      const earned = state.pps * dt;
      if (earned > 0) {
        state.presents += earned;
        state.totalPresents += earned;
      }
    }

    updateBuffProgress();
    checkGoldenRudolph();
    updateUI();

    // Render Canvas Snowfall
    if (window.snowEngine) {
      window.snowEngine.render();
    }

    requestAnimationFrame(gameLoop);
  }

  // =========================================================================
  // Event Listeners & Initialization
  // =========================================================================

  function initNewsCycle() {
    setInterval(() => {
      if (!state.activeBuff) {
        const item = NEWS_ITEMS[Math.floor(Math.random() * NEWS_ITEMS.length)];
        showTicker(item);
      }
    }, 12000);
  }

  function calculateEarnableGCC(allTimePresents) {
    if (allTimePresents < 10000000) return 0;
    return Math.floor(Math.cbrt(allTimePresents / 10000000));
  }

  function getNextGCCThreshold(earnedGCC) {
    const nextTarget = earnedGCC + 1;
    return Math.pow(nextTarget, 3) * 10000000;
  }

  const BLESSINGS_INFO = {
    auto_catcher: { name: 'Rudolph Auto-Catcher', icon: '🎯' },
    head_start: { name: 'Workshop Head Start', icon: '🧝' },
    evergreen_boost: { name: 'Evergreen Multiplier', icon: '🌲' },
    offline_magic: { name: 'North Pole Slumber', icon: '💤' },
    sugar_rush: { name: 'Peppermint Sugar Rush', icon: '⚡' }
  };

  function updateAscendUI() {
    const ascendBtn = document.getElementById('ascendBtn');
    const ascendLabel = document.getElementById('ascendLabel');
    const extremeShopBtn = document.getElementById('extremeShopBtn');
    const extremeShopLabel = document.getElementById('extremeShopLabel');
    const earnable = calculateEarnableGCC(state.totalPresents);

    // Show Ascend button once player hits 10M or has ascended at least once
    if (state.totalPresents >= 10000000 || state.ascensions > 0) {
      ascendBtn.classList.remove('hidden');
      ascendLabel.textContent = `Ascend (+${earnable} 🦯)`;
    } else {
      ascendBtn.classList.add('hidden');
    }

    // Show Extreme Relics button once player has any Golden Canes, has bought any relic, or has ascended
    const ownedRelicCount = Object.keys(state.relicsOwned || {}).length;
    if (state.goldenCanes > 0 || state.ascensions > 0 || ownedRelicCount > 0) {
      extremeShopBtn.classList.remove('hidden');
      extremeShopLabel.textContent = `Golden Relics (${state.goldenCanes} 🦯)`;
    } else {
      extremeShopBtn.classList.add('hidden');
    }

    // Active blessing indicator in Stage column
    const blessingBar = document.getElementById('activeBlessingBar');
    if (state.activeBlessing && BLESSINGS_INFO[state.activeBlessing]) {
      blessingBar.classList.remove('hidden');
      const info = BLESSINGS_INFO[state.activeBlessing];
      document.getElementById('activeBlessingIcon').textContent = info.icon;
      document.getElementById('activeBlessingName').textContent = `${info.name} Active`;
      document.getElementById('gccBadge').textContent = `${state.goldenCanes} 🦯`;
    } else if (state.goldenCanes > 0) {
      blessingBar.classList.remove('hidden');
      document.getElementById('activeBlessingIcon').textContent = '🦯';
      document.getElementById('activeBlessingName').textContent = 'Ascended Workshop';
      document.getElementById('gccBadge').textContent = `${state.goldenCanes} 🦯`;
    } else {
      blessingBar.classList.add('hidden');
    }
  }

  function initStatsModal() {
    const modal = document.getElementById('statsModal');
    const openBtn = document.getElementById('statsModalBtn');
    const closeBtn = document.getElementById('closeStatsBtn');

    function refreshModalData() {
      document.getElementById('statCurrentPresents').textContent = formatNumber(state.presents);
      document.getElementById('statTotalPresents').textContent = formatNumber(state.totalPresents);
      document.getElementById('statTotalClicks').textContent = state.totalClicks.toLocaleString();
      document.getElementById('statPresentsFromClicks').textContent = formatNumber(state.presentsFromClicks);
      document.getElementById('statGoldenClicks').textContent = state.goldenClicks.toLocaleString();
      document.getElementById('statTimePlayed').textContent = formatTime((Date.now() - state.startTime) / 1000);
      document.getElementById('statUpgradesOwned').textContent = `${Object.keys(state.upgradesOwned).length} / ${UPGRADES_DEF.length}`;

      let helpersTotal = 0;
      Object.values(state.buildings).forEach(c => { helpersTotal += c; });
      document.getElementById('statHelpersOwned').textContent = helpersTotal.toLocaleString();

      document.getElementById('statAscensions').textContent = state.ascensions.toLocaleString();
      document.getElementById('statGoldenCanes').textContent = state.goldenCanes.toLocaleString();
    }

    openBtn.onclick = () => {
      refreshModalData();
      modal.classList.remove('hidden');
    };

    closeBtn.onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };
  }

  function initAscension() {
    const modal = document.getElementById('ascendModal');
    const openBtn = document.getElementById('ascendBtn');
    const closeBtn = document.getElementById('closeAscendBtn');
    const confirmBtn = document.getElementById('confirmAscendBtn');
    const blessingCards = document.querySelectorAll('.blessing-card');

    function refreshAscendModal() {
      const earnable = calculateEarnableGCC(state.totalPresents);
      const nextThreshold = getNextGCCThreshold(earnable);

      document.getElementById('ascendAllTimePresents').textContent = formatNumber(state.totalPresents);
      document.getElementById('ascendEarnedCanes').textContent = `+${earnable} 🦯`;
      document.getElementById('ascendNextThreshold').textContent = `${formatNumber(nextThreshold)} presents`;

      // Highlight selected blessing
      blessingCards.forEach(card => {
        card.classList.toggle('active', card.dataset.blessing === state.selectedBlessing);
      });
    }

    openBtn.onclick = () => {
      refreshAscendModal();
      modal.classList.remove('hidden');
    };

    closeBtn.onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };

    // Blessing card selection
    blessingCards.forEach(card => {
      card.onclick = () => {
        state.selectedBlessing = card.dataset.blessing;
        blessingCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        sound.playClick();
      };
    });

    // Confirm Ascension (Rebirth)
    confirmBtn.onclick = () => {
      const earnable = calculateEarnableGCC(state.totalPresents);
      if (earnable <= 0 && state.ascensions === 0) {
        alert('You need at least 10,000,000 all-time presents to earn your first Golden Candy Cane and ascend!');
        return;
      }

      if (!confirm(`Take flight on Santa's Sleigh?\n\nYou will earn +${earnable} Golden Candy Canes and lock in ${BLESSINGS_INFO[state.selectedBlessing].name} for your next run!`)) {
        return;
      }

      // Execute Ascension
      state.goldenCanes += earnable;
      state.ascensions += 1;
      state.activeBlessing = state.selectedBlessing;

      // Reset run progress (all upgrades and tree upgrades reset; Golden Canes & active Blessing remain)
      state.presents = 0;
      state.buildings = {};
      state.upgradesOwned = {};
      state.treeLevel = 0; // Tree decorations & upgrades reset upon ascension

      // Head Start Blessing bonus & Avatar of Father Christmas relic
      if (state.activeBlessing === 'head_start') {
        state.buildings.elf = (state.buildings.elf || 0) + 25;
        state.buildings.reindeer = (state.buildings.reindeer || 0) + 10;
      }
      if (state.relicsOwned && state.relicsOwned['relic_santa_avatar']) {
        state.buildings.elf = (state.buildings.elf || 0) + 1000;
        state.buildings.reindeer = (state.buildings.reindeer || 0) + 250;
        state.buildings.workshop = (state.buildings.workshop || 0) + 50;
      }

      sound.playUpgrade();
      showTicker(`🛷 Santa took flight! Ascension #${state.ascensions} complete: +${earnable} 🦯 & ${BLESSINGS_INFO[state.activeBlessing].name} active!`);

      modal.classList.add('hidden');
      lastAvailableUpgradesKey = '';
      lastWorkshopKey = '';
      recalculateStats();
      checkAchievements();
      updateTreeEvolution();
      updateWorkshopShowcase();
      updateUI();
      saveGame();
    };
  }

  function initExtremeShop() {
    const modal = document.getElementById('extremeModal');
    const openBtn = document.getElementById('extremeShopBtn');
    const closeBtn = document.getElementById('closeExtremeBtn');
    const listEl = document.getElementById('extremeUpgradesList');
    const canesBalanceEl = document.getElementById('extremeModalCanes');

    function renderExtremeRelics() {
      canesBalanceEl.textContent = `${state.goldenCanes} 🦯`;
      listEl.innerHTML = '';

      EXTREME_RELICS_DEF.forEach(relic => {
        const isOwned = !!(state.relicsOwned && state.relicsOwned[relic.id]);
        const canAfford = state.goldenCanes >= relic.cost;

        const card = document.createElement('div');
        card.className = `relic-card ${isOwned ? 'owned' : ''}`;
        card.innerHTML = `
          <div>
            <div class="relic-card-header">
              <span class="relic-icon">${relic.icon}</span>
              <div class="relic-title-group">
                <span class="relic-tag">${relic.tag}</span>
                <strong class="relic-name">${relic.name}</strong>
              </div>
            </div>
            <p class="relic-desc">${relic.desc}</p>
          </div>
          <div class="relic-footer">
            <span class="relic-cost">${relic.cost} 🦯</span>
            ${isOwned ? `
              <span class="relic-owned-badge">✓ Active Forever</span>
            ` : `
              <button class="btn-buy-relic" data-relic-id="${relic.id}" ${canAfford ? '' : 'disabled'}>
                Trade ${relic.cost} 🦯
              </button>
            `}
          </div>
        `;
        listEl.appendChild(card);
      });
    }

    openBtn.onclick = () => {
      renderExtremeRelics();
      modal.classList.remove('hidden');
    };

    closeBtn.onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-buy-relic');
      if (!btn) return;
      const relicId = btn.dataset.relicId;
      const relic = EXTREME_RELICS_DEF.find(r => r.id === relicId);
      if (!relic) return;

      if (state.goldenCanes >= relic.cost && !(state.relicsOwned && state.relicsOwned[relic.id])) {
        state.goldenCanes -= relic.cost;
        if (!state.relicsOwned) state.relicsOwned = {};
        state.relicsOwned[relic.id] = true;

        sound.playUpgrade();
        showTicker(`✨ GOD-TIER RELIC UNLOCKED! Acquired ${relic.name}! Permanently active across all runs!`);

        recalculateStats();
        updateUI();
        renderExtremeRelics();
        saveGame();
      }
    });
  }

  function initControls() {
    // Tree Centerpiece clicker & Tree Decorate button
    const treeClicker = document.getElementById('treeClicker');
    treeClicker.addEventListener('click', handleTreeClick);
    treeClicker.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleTreeClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
      }
    });

    const buyTreeUpgradeBtn = document.getElementById('buyTreeUpgradeBtn');
    if (buyTreeUpgradeBtn) {
      buyTreeUpgradeBtn.onclick = buyTreeUpgrade;
    }

    // Golden Rudolph
    document.getElementById('goldenRudolph').addEventListener('click', handleGoldenClick);

    // Multiplier toggles
    document.querySelectorAll('.mult-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.mult-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.mult;
        state.buyMult = val === 'max' ? 'max' : parseInt(val, 10);
        updateUI();
      };
    });

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    const soundLabel = document.getElementById('soundLabel');
    const soundIcon = document.getElementById('soundIcon');

    function updateSoundUI() {
      soundLabel.textContent = `Sound: ${state.soundEnabled ? 'On' : 'Off'}`;
      soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    }

    soundToggle.onclick = () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundUI();
    };
    updateSoundUI();

    // Upgrades tray delegated interaction (instant click & tooltip handling)
    const upgradesTray = document.getElementById('upgradesTray');
    if (upgradesTray) {
      upgradesTray.addEventListener('click', (e) => {
        const slot = e.target.closest('.upgrade-slot');
        if (slot && slot.dataset.upgradeId) {
          buyUpgrade(slot.dataset.upgradeId);
        }
      });

      upgradesTray.addEventListener('mouseover', (e) => {
        const slot = e.target.closest('.upgrade-slot');
        if (slot && slot.dataset.upgradeId) {
          const upg = UPGRADES_DEF.find(u => u.id === slot.dataset.upgradeId);
          if (upg) showUpgradeTooltip(slot, upg);
        }
      });

      upgradesTray.addEventListener('mouseout', (e) => {
        const slot = e.target.closest('.upgrade-slot');
        if (slot) hideUpgradeTooltip();
      });
    }

    // Save & Reset
    document.getElementById('saveBtn').onclick = () => {
      saveGame();
      showTicker('💾 Game saved successfully!');
    };
    document.getElementById('resetBtn').onclick = resetGame;

    // Periodic auto-save every 5s
    setInterval(saveGame, 5000);
  }

  function init() {
    // 1. Snowfall
    const canvas = document.getElementById('snowCanvas');
    window.snowEngine = new SnowEngine(canvas);

    // 2. Load Save & Render Initial Views
    loadGame();
    renderBuildingsList();
    renderAchievements();
    recalculateStats();
    updateUI();

    // 3. Bind Controls & Modals
    initControls();
    initStatsModal();
    initAscension();
    initExtremeShop();
    initNewsCycle();

    // 4. Start Loop
    requestAnimationFrame(gameLoop);
  }

  window.addEventListener('DOMContentLoaded', init);
})();

