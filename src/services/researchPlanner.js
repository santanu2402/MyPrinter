/**
 * AI Research Planner Service
 * Analyzes high-level user requests and decomposes abstract categories into
 * specific, concrete, photographic real-world entities before searching.
 */

// Curated educational and factual taxonomy for agriculture, science, and nature
const KNOWLEDGE_TAXONOMY = [
  // 1. Traditional Old Methods of Farming
  {
    categoryMatcher: /(traditional|old|ancient|primitive|historical|past).*(farming|agriculture|cultivation|methon?d)/i,
    categoryName: "Traditional Old Methods of Farming",
    entities: [
      {
        name: "Bullock Ploughing",
        searchTerms: ["bullock ploughing field", "oxen wooden plough agriculture", "pair of bullocks ploughing"],
        keyConcepts: ["bullock", "ox", "oxen", "plough", "plow", "wooden", "furrow"],
        isObjectOrMethod: true,
        description: "Traditional wooden plough driven by a pair of bullocks or oxen furrowing arable soil."
      },
      {
        name: "Sickle Harvesting",
        searchTerms: ["sickle harvesting wheat manual", "reaping wheat with sickle", "manual sickle harvest agriculture"],
        keyConcepts: ["sickle", "scythe", "harvest", "reaping", "wheat", "manual"],
        isObjectOrMethod: true,
        description: "Manual reaping of ripe cereal grain stalks using a curved iron hand sickle."
      },
      {
        name: "Winnowing Grain",
        searchTerms: ["winnowing grain basket", "traditional winnowing agriculture", "farmer winnowing chaff"],
        keyConcepts: ["winnow", "winnowing", "basket", "chaff", "grain", "wind"],
        isObjectOrMethod: true,
        description: "Ancient winnowing technique using woven bamboo baskets and wind to separate husk from grain."
      },
      {
        name: "Persian Wheel (Rahat) Irrigation",
        searchTerms: ["persian wheel irrigation", "rahat water wheel well", "persian wheel bullock water lift"],
        keyConcepts: ["persian wheel", "rahat", "wheel", "well", "water", "irrigation", "bullock"],
        isObjectOrMethod: true,
        description: "Traditional mechanical water-lifting device driven by draft animals to draw water from open wells."
      },
      {
        name: "Terraced Step Farming",
        searchTerms: ["terrace farming rice steps", "terraced rice fields mountain", "traditional stepped terraces agriculture"],
        keyConcepts: ["terrace", "terraced", "paddy", "mountain", "steps", "ridge"],
        isObjectOrMethod: true,
        description: "Ancient terracing technique carving graduated steps into hilly terrain to retain water for paddy cultivation."
      },
      {
        name: "Hand Broadcast Sowing",
        searchTerms: ["broadcasting seeds hand sowing", "farmer sowing seeds hand field", "broadcast sowing agriculture"],
        keyConcepts: ["sow", "sowing", "seed", "broadcast", "broadcasting", "hand"],
        isObjectOrMethod: true,
        description: "Traditional hand-broadcasting of seeds scattered evenly across tilled topsoil."
      },
      {
        name: "Oxen Grain Threshing",
        searchTerms: ["oxen threshing grain", "traditional threshing bullocks floor", "threshing floor agriculture"],
        keyConcepts: ["threshing", "treading", "oxen", "bullock", "grain", "chaff"],
        isObjectOrMethod: true,
        description: "Traditional threshing floor where bullocks tread across harvested stalks to dislodge grain kernels."
      }
    ]
  },

  // 2. Modern Methods of Farming
  {
    categoryMatcher: /(modern|contemporary|advanced|high[- ]?tech|smart|mechanized|precision).*(farming|agriculture|cultivation|methon?d)/i,
    categoryName: "Modern Methods of Farming",
    entities: [
      {
        name: "Combine Harvester",
        searchTerms: ["combine harvester field wheat", "claas combine harvester harvesting", "modern combine harvester agriculture"],
        keyConcepts: ["combine", "harvester", "reaper", "threshing", "wheat", "grain", "field"],
        isObjectOrMethod: true,
        description: "Modern automated combine harvester cutting, threshing, and cleaning cereal crops in a single pass."
      },
      {
        name: "Agricultural Drone Spraying",
        searchTerms: ["Agricultural drone spraying on paddy field", "Sprinkler drone agricultural spraying", "Agricultural drone in use on rice field near Nisoshi"],
        keyConcepts: ["drone", "uav", "spraying", "crop", "precision", "spray", "paddy"],
        isObjectOrMethod: true,
        description: "Autonomous multirotor agricultural drone spraying liquid fertilizer and crop protection fluids with precision."
      },
      {
        name: "Hydroponic Vertical Farming",
        searchTerms: ["hydroponic vertical farming", "vertical indoor farm led vegetables", "hydroponics greenhouse agriculture"],
        keyConcepts: ["hydroponic", "hydroponics", "vertical", "indoor", "soilless", "led", "farm"],
        isObjectOrMethod: true,
        description: "Controlled-environment vertical farming utilizing soilless nutrient solutions and specialized LED spectra."
      },
      {
        name: "Center Pivot Irrigation",
        searchTerms: ["center pivot irrigation system", "center pivot sprinkler crops", "circular irrigation agriculture"],
        keyConcepts: ["center pivot", "pivot", "irrigation", "sprinkler", "boom", "crop"],
        isObjectOrMethod: true,
        description: "Mechanized circular center-pivot sprinkler system delivering automated uniform watering across wide acreage."
      },
      {
        name: "GPS Precision Tractor",
        searchTerms: ["modern tractor field ploughing", "precision agriculture tractor field", "modern tractor farming autosteer"],
        keyConcepts: ["tractor", "gps", "precision", "autosteer", "field", "modern", "ploughing"],
        isObjectOrMethod: true,
        description: "High-horsepower modern tractor equipped with satellite GPS auto-guidance for precision soil tillage."
      },
      {
        name: "Drip Micro-Irrigation",
        searchTerms: ["drip irrigation system field", "micro drip irrigation emitters crops", "drip line agriculture farm"],
        keyConcepts: ["drip", "irrigation", "micro", "emitter", "tube", "water"],
        isObjectOrMethod: true,
        description: "Water-conserving micro-irrigation system delivering metered moisture directly to plant roots through emitter tubes."
      }
    ]
  },

  // 3. Non-Food Crops (MUST be matched before food crops so "non food" is caught first)
  {
    categoryMatcher: /(non[- ]?food\s+crops?|industrial\s+crops?|fiber\s+crops?|cash\s+crops?|commercial\s+crops?)/i,
    categoryName: "Non-Food Crops",
    entities: [
      {
        name: "Cotton Fiber Crop",
        searchTerms: ["cotton bolls white fiber plant", "cotton field ready harvest", "cotton crop harvest field"],
        keyConcepts: ["cotton", "bolls", "fiber", "gossypium", "textile", "white", "harvest"],
        isCropOrPlant: true,
        description: "Natural textile fiber crop (Gossypium) showing fluffy mature white cotton bolls ready for harvest."
      },
      {
        name: "Jute Fiber Crop",
        searchTerms: ["jute plant stalks field", "golden bast fiber jute Corchorus", "Corchorus jute farming"],
        keyConcepts: ["jute", "corchorus", "fiber", "stalks", "golden fiber", "crop"],
        isCropOrPlant: true,
        description: "Golden bast fiber crop (Corchorus) with tall unbranched green stalks grown for burlap and twine manufacturing."
      },
      {
        name: "Natural Rubber Tree (Latex)",
        searchTerms: ["rubber tree tapping latex cup", "Hevea brasiliensis tapping latex", "rubber plantation tapping"],
        keyConcepts: ["rubber", "latex", "tapping", "hevea", "tree", "plantation"],
        isCropOrPlant: true,
        description: "Industrial rubber tree (Hevea brasiliensis) being tapped with a spiral incision collecting milky white natural latex."
      },
      {
        name: "Tobacco Crop",
        searchTerms: ["Tobacco plantation Vinales", "Tobacco Plantation Motueka", "Patch of Tobacco Nicotiana tabacum in a field"],
        keyConcepts: ["tobacco", "tabac", "plantation", "leaf", "leaves", "crop", "field"],
        isCropOrPlant: true,
        description: "Broad-leaved non-food cash crop (Nicotiana tabacum) exhibiting expansive green foliage in agricultural farm rows."
      },
      {
        name: "Flax (Linen Fiber) Crop",
        searchTerms: ["flax crop blue flowers linen", "Linum usitatissimum field crop", "flax fiber plant agriculture"],
        keyConcepts: ["flax", "linseed", "linum", "linen", "fiber", "blue"],
        isCropOrPlant: true,
        description: "Ancient fiber and oilseed crop (Linum usitatissimum) showing delicate sky-blue blossoms and fibrous stems."
      },
      {
        name: "Industrial Hemp",
        searchTerms: ["industrial hemp crop field", "cannabis sativa hemp fiber farm", "hemp stalks agriculture"],
        keyConcepts: ["hemp", "cannabis", "fiber", "stalks", "industrial", "crop"],
        isCropOrPlant: true,
        description: "High-yield industrial hemp crop (Cannabis sativa) with strong bast fibers utilized in eco-friendly textiles and biocomposites."
      }
    ]
  },

  // 4. Food Crops
  {
    categoryMatcher: /(?<!non[- ]\s*)(food\s+crops?|edible\s+crops?|staple\s+food\s+crops?|grain\s+crops?|cereal\s+crops?)/i,
    categoryName: "Food Crops",
    entities: [
      {
        name: "Paddy Rice Crop",
        searchTerms: ["paddy rice crop field", "rice paddy green ears oryza sativa", "paddy crop ready harvest"],
        keyConcepts: ["rice", "paddy", "oryza", "cereal", "grain", "field", "crop"],
        isCropOrPlant: true,
        description: "Paddy rice (Oryza sativa) with ripe drooping golden seed heads cultivated in flooded agricultural basins."
      },
      {
        name: "Golden Wheat Crop",
        searchTerms: ["golden wheat field crop", "wheat crop ears field", "ripe wheat field golden ears"],
        keyConcepts: ["wheat", "triticum", "golden", "ears", "crop", "cereal", "field"],
        isCropOrPlant: true,
        description: "Staple wheat crop (Triticum) displaying dense golden spikelets ready for mechanical combine reaping."
      },
      {
        name: "Maize (Corn) Crop",
        searchTerms: ["corn maize field crop", "maize crop zea mays cobs", "corn stalks ears agriculture"],
        keyConcepts: ["corn", "maize", "zea", "cobs", "stalks", "crop"],
        isCropOrPlant: true,
        description: "Tall maize corn stalks (Zea mays) bearing sweet golden cobs wrapped in green husks."
      },
      {
        name: "Potato Crop Plant",
        searchTerms: ["potato crop plant field", "potato flowering plants solanum", "potato farming field crop"],
        keyConcepts: ["potato", "solanum", "tubers", "crop", "plant", "field"],
        isCropOrPlant: true,
        description: "Nutritious potato crop (Solanum tuberosum) showing lush foliage and flowering shoots above subterranean tubers."
      },
      {
        name: "Sugarcane Crop",
        searchTerms: ["sugarcane crop field", "saccharum officinarum sugarcane farm", "tall sugarcane stalks agriculture"],
        keyConcepts: ["sugarcane", "cane", "saccharum", "stalks", "sugar", "crop"],
        isCropOrPlant: true,
        description: "Dense perennial sugarcane crop (Saccharum officinarum) with jointed fibrous stalks rich in sucrose juice."
      },
      {
        name: "Soybean Crop",
        searchTerms: ["soybean crop pods field", "glycine max soybean farm", "soybeans agriculture harvest"],
        keyConcepts: ["soybean", "soybeans", "glycine", "pods", "legume", "crop"],
        isCropOrPlant: true,
        description: "Protein-rich soybean legume crop (Glycine max) bearing hairy green and golden seed pods on bushy stems."
      }
    ]
  },

  // 5. Crops Cultivated in Horticulture (Fruits, Vegetables, Flowers, Plantation, Spices)
  {
    categoryMatcher: /(crops?\s+(cultivated\s+in\s+|for\s+)?horticulture|horticultural\s+crops?|horticulture\s+crops?|fruits?\s+and\s+vegetables?|floriculture\s+crops?)/i,
    categoryName: "Crops Cultivated in Horticulture",
    entities: [
      {
        name: "Apple Orchard",
        searchTerms: ["Red apples on tree orchard", "Apples in an orchard fruit tree", "Apple harvest season orchard"],
        keyConcepts: ["apple", "orchard", "apples", "tree", "fruit", "malus"],
        isCropOrPlant: true,
        description: "Temperate fruit crop (Malus domestica) laden with crisp red apples in a pruned commercial orchard."
      },
      {
        name: "Mango Plantation",
        searchTerms: ["Mango fruit tree plantation", "mangifera indica mango orchard", "ripe mangoes hanging tree branch"],
        keyConcepts: ["mango", "mangifera", "orchard", "fruit", "tropical", "plantation"],
        isCropOrPlant: true,
        description: "Tropical fruit crop (Mangifera indica) showing clusters of succulent golden-yellow mangoes hanging from leafy branches."
      },
      {
        name: "Marigold Floriculture",
        searchTerms: ["Marigold Fields Floriculture Horticulture in Maharashtra India", "Marigold Field Howrah Tagetes", "Orange Marigold Flower Tagetes"],
        keyConcepts: ["marigold", "tagetes", "floriculture", "flower", "fields"],
        isCropOrPlant: true,
        description: "Commercial floriculture crop (Tagetes erecta) blooming with vibrant orange and gold flower heads in neat rows."
      },
      {
        name: "Tea Plantation Terrace",
        searchTerms: ["Tea plantations in Munnar", "Tea plantation terraces Munnar Kerala", "tea plantation green terraces"],
        keyConcepts: ["tea", "plantation", "estate", "terraces", "munnar"],
        isCropOrPlant: true,
        description: "Perennial plantation crop (Camellia sinensis) featuring sculpted evergreen tea bushes blanketing rolling hill terraces."
      },
      {
        name: "Greenhouse Bell Pepper",
        searchTerms: ["Capsicum annuum greenhouse", "Bell pepper plant greenhouse Trimingham", "Capsicum annuum bell fruit greenhouse"],
        keyConcepts: ["capsicum", "pepper", "greenhouse", "plant", "fruit", "bell"],
        isCropOrPlant: true,
        description: "High-value olericulture crop (Capsicum annuum) cultivated inside climate-regulated greenhouses bearing glossy sweet peppers."
      },
      {
        name: "Grape Vineyard (Viticulture)",
        searchTerms: ["grape vineyard bunches trellis", "vitis vinifera vineyard fruit", "wine grapes hanging vine trellis"],
        keyConcepts: ["grape", "vineyard", "vitis", "viticulture", "trellis", "vine"],
        isCropOrPlant: true,
        description: "Fruit viticulture crop (Vitis vinifera) with dense clusters of purple and green grapes suspended from post trellises."
      },
      {
        name: "Strawberry Mulch Beds",
        searchTerms: ["strawberry farm field ripe", "fragaria strawberry plant mulch", "ripe red strawberries growing field"],
        keyConcepts: ["strawberry", "fragaria", "berry", "mulch", "fruit", "farm"],
        isCropOrPlant: true,
        description: "Small fruit horticultural crop (Fragaria ananassa) with ripe crimson berries resting on clean polyethylene mulch beds."
      }
    ]
  }
];

/**
 * Plan search for a single parsed topic
 * @param {string} queryRaw - Raw query string like "traditional old methods of farming"
 * @param {number} count - Number of images requested (e.g. 5)
 * @param {string} topicLabel - Optional human topic label
 */
function planTopicSearch(queryRaw, count = 5, topicLabel = '') {
  const query = queryRaw.trim();
  const requestedCount = Math.max(1, Math.min(25, count));

  // 1. Check if the topic matches our curated ontology
  for (const item of KNOWLEDGE_TAXONOMY) {
    if (item.categoryMatcher.test(query) || (topicLabel && item.categoryMatcher.test(topicLabel))) {
      const selectedEntities = item.entities.slice(0, requestedCount);

      while (selectedEntities.length < requestedCount) {
        const base = item.entities[selectedEntities.length % item.entities.length];
        selectedEntities.push({
          ...base,
          name: `${base.name} (View ${selectedEntities.length + 1})`,
          searchTerms: base.searchTerms.map(s => `${s} detail photography`),
        });
      }

      return {
        isKnownCategory: true,
        categoryName: item.categoryName,
        queryOriginal: query,
        requestedCount,
        entities: selectedEntities,
        researchNotes: `AI Knowledge Engine identified category "${item.categoryName}" and researched ${selectedEntities.length} concrete real-world entities for direct photographic relevance.`
      };
    }
  }

  // 2. Generic Concept Decomposition (Fallback for arbitrary topics)
  const cleanTopic = query
    .replace(/\b(5|10|15|20|images?|photos?|pictures?|pics?|of|in|and|the|for|a|an)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isCrop = /(crop|crops|plant|plants|flower|flowers|fruit|fruits|vegetable|vegetables|tree|trees)/i.test(cleanTopic);

  const genericEntities = [];
  for (let i = 0; i < requestedCount; i++) {
    const termVariations = [
      `${cleanTopic} photography natural high resolution`,
      `${cleanTopic} field authentic photo`,
      `${cleanTopic} closeup detailed photograph`,
      `${cleanTopic} specimen view photograph`,
      `${cleanTopic} example in real life photo`
    ];

    const currentSearch = termVariations[i % termVariations.length];
    const keyWords = cleanTopic.split(/\s+/).filter(w => w.length > 2);

    genericEntities.push({
      name: `${cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1)} (Subject ${i + 1})`,
      searchTerms: [currentSearch, `${cleanTopic} photography`],
      keyConcepts: keyWords,
      isCropOrPlant: isCrop,
      description: `Targeted authentic photograph for ${cleanTopic} (#${i + 1}).`
    });
  }

  return {
    isKnownCategory: false,
    categoryName: cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1),
    queryOriginal: query,
    requestedCount,
    entities: genericEntities,
    researchNotes: `Generated targeted entity search plan with ${genericEntities.length} photographic variations.`
  };
}

module.exports = {
  KNOWLEDGE_TAXONOMY,
  planTopicSearch,
};
