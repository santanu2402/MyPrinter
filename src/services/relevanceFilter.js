/**
 * Quality Feedback & Relevance Engine
 * Evaluates candidate images against strict criteria:
 * - Minimum Acceptance Band: >= 90 (Ultra-precision verified photographic matches)
 * - Disqualifies junk (diagrams, maps, scanned pages, catalogues, herbarium sheets, stone reliefs)
 * - Disqualifies human portraits, farmer interviews, PR photo-ops, disaster relief news stories
 * - Strictly scores authentic photographic representation of the requested subject (0-100)
 */

const HIGH_QUALITY_MIN_SCORE = 90;

// Patterns that disqualify an image from being an authentic photographic representation
const DISQUALIFY_PATTERNS = [
  /\b(diagram|chart|infographic|flowchart|flow-chart)\b/i,
  /\b(map|cartography|geographic map|atlas|topographic)\b/i,
  /\b(sketch|drawing|caricature|cartoon|comic|clipart|vector|svg)\b/i,
  /\b(logo|icon|symbol|emblem|stamp|postage stamp|badge)\b/i,
  /\b(scanned|scan|document|paper|sheet|certificate|receipt|manifest)\b/i,
  /\b(table of contents|title page|frontispiece|title-page)\b/i,
  /\b(encyclopedia|cyclopedia|dictionary|lexicon|handbook)\b/i,
  /\b(newspaper|gazette|journal article|headline|clipping)\b/i,
  /\b(whiteboard|blackboard|presentation slide|powerpoint)\b/i,
  /\b(press conference|assembly hall|parliament session|congress chamber)\b/i,
  /\b(backhoe|excavator|wreck|accident|crash|rubble)\b/i,
  /\b(catalogue|catalog|seed catalog|price list|annual report|proceedings|bulletin|vol\.|volume \d+|issue \d+|plate \d+)\b/i,
  /\b(undivided back|divided back|postcard|collotype|chromolithograph|stereoscopic)\b/i,
  /\b(herbarium|herbarium sheet|specimen sheet|pressed plant|dried specimen|botanical label)\b/i,
  /\b(relief|sculpture|statue|museum exhibit|monument plaque|carving on wall)\b/i,
  /\b(woodcut|engraving|etching|lithograph|hand colored print)\b/i,
];

// Patterns indicating a person portrait, human subject, farmer profile, or political/disaster PR story
// (MUST BE DISQUALIFIED when searching for crops, plants, or machinery/tools)
const PERSON_AND_STORY_PATTERNS = [
  // Parenthetical person attributions
  /\([sS]een\)/,                                         // e.g. "William L. Brim (seen)"
  /\([pP]ictured\)/,                                     // e.g. "John Doe (pictured)"
  /\([sS]hown\)/,                                        // e.g. "Secretary (shown)"
  /\([lL]eft\)/,                                         // e.g. "Jane Doe (left)"
  /\([rR]ight\)/,                                        // e.g. "John (right)"
  /\([cC]enter\)/,                                       // e.g. "Farmer (center)"
  /\([sS]eated\)/,                                       // e.g. "officials (seated)"
  /\([sS]tanding\)/,                                     // e.g. "guests (standing)"
  /\b(seen left|seen right|pictured left|pictured right|shown left|shown right)\b/i,

  // Portrait, selfie, and human focus keywords
  /\b(portrait of|portrait|headshot|mugshot|selfie|bust of|biography of)\b/i,
  /\b(looking at the camera|smiling at the camera|posing for the camera|poses for the camera)\b/i,
  /\b(poses with|posing with|smiling with|stands next to|standing beside|shaking hands|shakes hands)\b/i,

  // Farm ownership, human profile, and managerial stories
  /\b(co-owned by|founded by|managed by|operated by|owned by|checks the condition of|looking over the|inspecting the)\b/i,
  /\b(farmer|grower|producer|owner)\s+[A-Z][a-z]+/,      // e.g. "Farmer Brim", "Grower John"
  /\b(Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-z]+/,                   // e.g. "Mr. Brim", "Mrs. Smith"

  // Government, political, and official visits / PR photo-ops
  /\b(Secretary|Minister|Commissioner|Governor|Senator|Congressman|Representative|Mayor|Director|Administrator)\s+[A-Z][a-z]+/, // e.g. "Secretary Sonny Perdue"
  /\b(visits?\s+(the\s+)?(farm|field|greenhouse|facility|growers|producers)|tours?\s+(the\s+)?(farm|field|facility))\b/i,
  /\b(listens? to|listening to|talks? with|talking with|speaks? with|speaking with|briefing with|meeting with)\s+\d+/i,
  /\b(press tour|fact-finding mission|bilateral meeting|photo opportunity|official visit)\b/i,

  // Disaster relief, emergency programs, and news policy coverage
  /\b(disaster relief|hurricane\s+[A-Z][a-z]+|tornado cleanup|flood damage|emergency conservation program|fsa cleanup)\b/i,
  /\b(challenges following|immigration and|labor shortage challenges|structural damage cleanup)\b/i,
];

// Patterns indicating architecture or empty buildings when an agricultural crop/plant is requested
const NON_CROP_BUILDING_PATTERNS = [
  /\b(tobacco house|office block|art installation|apartment|residential building|facade|suburban home|warehouse interior)\b/i,
];

// Photographic and contextual signals indicating authentic photography
const PHOTO_KEYWORD_PATTERN = /\b(photo|photograph|photography|shot|captured|field|farm|farming|agriculture|agricultural|crop|plant|harvest|soil|rural|nature|cultivation|plantation|tree|leaf|leaves|fruit|flower|grain|seed|greenhouse|orchard|vineyard|outdoors|irrigation|well|plough|plow|threshing|winnowing|harvester|tractor|drone|botanical)\b/gi;

/**
 * Evaluate a single candidate image against an entity specification
 * @param {Object} candidate - Candidate image object
 * @param {Object} entitySpec - Entity specification from researchPlanner
 * @returns {Object} { isQualified, score, disqualificationReason, feedback }
 */
function evaluateCandidate(candidate, entitySpec) {
  const title = (candidate.title || "").trim();
  const desc = (candidate.description || "").trim();
  const fullText = `${title} ${desc} ${candidate.url || ""}`.toLowerCase();

  // 1. Check Hard Disqualifications
  for (const pattern of DISQUALIFY_PATTERNS) {
    if (pattern.test(fullText)) {
      const allowed = entitySpec.keyConcepts && entitySpec.keyConcepts.some(kc => pattern.test(kc));
      if (!allowed) {
        return {
          isQualified: false,
          score: 0,
          disqualificationReason: `Matched disqualification pattern: ${pattern.toString()}`,
          feedback: `Disqualified junk document/diagram/specimen matching ${pattern.toString()}`
        };
      }
    }
  }

  // 2. Reject Person Portraits / Human Subject / PR Story photos when searching for crops, plants, or machinery
  const isSubjectNotPerson = entitySpec.isCropOrPlant || entitySpec.isObjectOrMethod || !entitySpec.isPerson;
  if (isSubjectNotPerson) {
    for (const pPattern of PERSON_AND_STORY_PATTERNS) {
      if (pPattern.test(desc) || pPattern.test(title)) {
        return {
          isQualified: false,
          score: 0,
          disqualificationReason: `Disqualified person portrait / human story / official visit (${pPattern.toString()}) — authentic crop/method photograph expected`,
          feedback: `Human subject / news story rejected: photo depicts a person, official visit, or profile instead of the requested subject`
        };
      }
    }
  }

  // 3. Reject architecture/building when crop or plant is expected
  if (entitySpec.isCropOrPlant) {
    for (const bPattern of NON_CROP_BUILDING_PATTERNS) {
      if (bPattern.test(fullText)) {
        return {
          isQualified: false,
          score: 0,
          disqualificationReason: `Disqualified building/architecture (${bPattern.toString()}) — agricultural crop expected`,
          feedback: `Building/installation rejected when crop photograph expected`
        };
      }
    }
  }

  // Dimension checks
  const width = candidate.width || 800;
  const height = candidate.height || 600;

  if (width < 320 || height < 220) {
    return {
      isQualified: false,
      score: 0,
      disqualificationReason: `Resolution too low: ${width}x${height} (minimum 320x220)`,
      feedback: "Low resolution thumbnail rejected"
    };
  }

  const aspectRatio = width / height;
  if (aspectRatio > 3.2 || aspectRatio < 0.31) {
    return {
      isQualified: false,
      score: 0,
      disqualificationReason: `Extreme aspect ratio ${aspectRatio.toFixed(2)} (banner or ribbon)`,
      feedback: "Extreme aspect ratio rejected"
    };
  }

  // Format check
  if (/\.(svg|gif)$/i.test(candidate.url || "") || /\.(svg|gif)$/i.test(candidate.originalUrl || "")) {
    return {
      isQualified: false,
      score: 0,
      disqualificationReason: "Disqualified vector/animated format (SVG/GIF)",
      feedback: "Non-photo format rejected"
    };
  }

  // 4. Score Calculation (0 - 100)
  let score = 20; // Base score for passing hard checks
  const matchedConcepts = [];

  // Key Concept matches (+40 max)
  if (entitySpec.keyConcepts && entitySpec.keyConcepts.length > 0) {
    for (const concept of entitySpec.keyConcepts) {
      const reg = new RegExp(`\\b${concept}\\b`, "i");
      if (reg.test(fullText)) {
        matchedConcepts.push(concept);
      }
    }

    if (matchedConcepts.length >= 3) {
      score += 40;
    } else if (matchedConcepts.length === 2) {
      score += 35;
    } else if (matchedConcepts.length === 1) {
      score += 20;
    } else {
      score -= 15;
    }
  }

  // Photographic Authenticity Signals (+20 max)
  const photoMatches = (fullText.match(PHOTO_KEYWORD_PATTERN) || []).length;
  if (photoMatches >= 2) score += 20;
  else if (photoMatches === 1) score += 12;

  // Resolution Quality (+10 max)
  if (width >= 800 && height >= 600) score += 10;
  else if (width >= 600 && height >= 450) score += 6;

  // Informative Description (+10 max)
  if (desc && desc.length > 30 && !desc.includes("...jpg")) {
    score += 10;
  }

  // Soft penalty for illustrations/paintings if pure photo is expected
  if (/\b(illustration|painting|drawing|watercolor|engraving|woodcut)\b/i.test(fullText)) {
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    isQualified: score >= HIGH_QUALITY_MIN_SCORE,
    score,
    matchedConcepts,
    disqualificationReason: null,
    feedback: `Score: ${score}/100 (Matched concepts: [${matchedConcepts.join(", ")}])`
  };
}

/**
 * Filter and rank a list of candidates against an entity specification
 * @param {Array} candidates - Candidate images
 * @param {Object} entitySpec - Entity spec
 * @param {number} minScore - Minimum acceptable score (default 90)
 * @returns {Array} Sorted qualified candidates
 */
function filterAndRankCandidates(candidates, entitySpec, minScore = HIGH_QUALITY_MIN_SCORE) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const evaluated = [];

  for (const cand of candidates) {
    const evaluation = evaluateCandidate(cand, entitySpec);
    if (evaluation.score >= minScore) {
      evaluated.push({
        ...cand,
        relevanceScore: evaluation.score,
        matchedConcepts: evaluation.matchedConcepts,
        feedback: evaluation.feedback,
      });
    } else {
      console.log(`[RelevanceFilter] Below acceptance band (${evaluation.score}/${minScore}): "${cand.title}" -> ${evaluation.disqualificationReason || evaluation.feedback}`);
    }
  }

  // Sort by relevance score descending
  evaluated.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return evaluated;
}

module.exports = {
  HIGH_QUALITY_MIN_SCORE,
  evaluateCandidate,
  filterAndRankCandidates,
};
