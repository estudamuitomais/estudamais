(function initializeAvatarStudio(global) {
  const catalog = {
    skin: [
      { id: 'sunny', name: 'Dourada', color: '#F1B989', unlock: 0 },
      { id: 'peach', name: 'Pêssego', color: '#FFD0AD', unlock: 0 },
      { id: 'bronze', name: 'Bronze', color: '#C98255', unlock: 0 },
      { id: 'deep', name: 'Ébano', color: '#75452F', unlock: 0 }
    ],
    hair: [
      { id: 'short', name: 'Curtinho', icon: '✂', unlock: 0 },
      { id: 'curls', name: 'Cachos', icon: '◌', unlock: 0 },
      { id: 'long', name: 'Comprido', icon: '〰', unlock: 0 },
      { id: 'spikes', name: 'Espetado', icon: '✦', unlock: 0 }
    ],
    hairColor: [
      { id: 'cocoa', name: 'Cacau', color: '#4A2D28', unlock: 0 },
      { id: 'night', name: 'Noturno', color: '#25243A', unlock: 0 },
      { id: 'honey', name: 'Mel', color: '#D18A2E', unlock: 0 },
      { id: 'berry', name: 'Ameixa', color: '#713A68', unlock: 0 }
    ],
    outfit: [
      { id: 'tshirt', name: 'Camiseta Estuda+', icon: '👕', color: '#7C3AED', unlock: 0 },
      { id: 'hoodie', name: 'Moletom curioso', icon: '🧥', color: '#5B5BD6', unlock: 1 },
      { id: 'labcoat', name: 'Jaleco científico', icon: '🥼', color: '#F8FAFC', unlock: 2 },
      { id: 'sports', name: 'Uniforme campeão', icon: '🏅', color: '#16A36A', unlock: 3 },
      { id: 'astronaut', name: 'Traje espacial', icon: '🚀', color: '#334155', unlock: 4 },
      { id: 'explorer', name: 'Colete explorador', icon: '🧭', color: '#C47A39', unlock: 6 }
    ],
    accessory: [
      { id: 'none', name: 'Sem acessório', icon: '✓', unlock: 0 },
      { id: 'glasses', name: 'Óculos de ideias', icon: '👓', unlock: 1 },
      { id: 'cap', name: 'Boné aventureiro', icon: '🧢', unlock: 2 },
      { id: 'headphones', name: 'Fone de foco', icon: '🎧', unlock: 3 },
      { id: 'crown', name: 'Coroa do saber', icon: '👑', unlock: 4 },
      { id: 'medal', name: 'Medalha mestre', icon: '🏆', unlock: 6 }
    ]
  };

  const categories = [
    { id: 'skin', label: 'Pele', icon: '●' },
    { id: 'hair', label: 'Cabelo', icon: '✂' },
    { id: 'hairColor', label: 'Cor', icon: '◐' },
    { id: 'outfit', label: 'Roupa', icon: '👕' },
    { id: 'accessory', label: 'Acessório', icon: '✨' }
  ];

  const defaults = Object.freeze({ skin: 'sunny', hair: 'short', hairColor: 'cocoa', outfit: 'tshirt', accessory: 'none' });
  const legacyPresets = Object.freeze({
    '🧑‍🚀': { skin: 'sunny', hair: 'short', hairColor: 'cocoa', outfit: 'astronaut', accessory: 'none' },
    '🦊': { skin: 'peach', hair: 'spikes', hairColor: 'honey', outfit: 'hoodie', accessory: 'none' },
    '🧙': { skin: 'bronze', hair: 'long', hairColor: 'berry', outfit: 'explorer', accessory: 'glasses' },
    '🤖': { skin: 'deep', hair: 'short', hairColor: 'night', outfit: 'astronaut', accessory: 'headphones' }
  });
  const itemFor = (category, id) => catalog[category]?.find((item) => item.id === id) || catalog[category]?.[0];
  const copyDefaults = () => ({ ...defaults });
  function normalize(raw = {}) {
    const safe = {};
    categories.forEach(({ id }) => { safe[id] = itemFor(id, raw?.[id])?.id || defaults[id]; });
    return safe;
  }
  function migrateLegacy(legacyIcon) { return normalize(legacyPresets[legacyIcon] || defaults); }
  function fitToUnlocks(raw, completedPhases = 0) {
    const safe = normalize(raw);
    ['outfit', 'accessory'].forEach((category) => {
      if ((itemFor(category, safe[category])?.unlock || 0) > completedPhases) safe[category] = defaults[category];
    });
    return safe;
  }
  function unlockedBetween(previousCount, nextCount) {
    return ['outfit', 'accessory'].flatMap((category) => catalog[category]
      .filter((item) => item.unlock > previousCount && item.unlock <= nextCount)
      .map((item) => ({ ...item, category })));
  }
  function nextUnlock(completedPhases = 0) {
    return ['outfit', 'accessory'].flatMap((category) => catalog[category].map((item) => ({ ...item, category })))
      .filter((item) => item.unlock > completedPhases)
      .sort((a, b) => a.unlock - b.unlock)[0] || null;
  }
  function description(raw = {}) {
    const avatar = normalize(raw);
    return `Avatar com pele ${itemFor('skin', avatar.skin).name.toLowerCase()}, cabelo ${itemFor('hair', avatar.hair).name.toLowerCase()} ${itemFor('hairColor', avatar.hairColor).name.toLowerCase()}, ${itemFor('outfit', avatar.outfit).name.toLowerCase()} e ${itemFor('accessory', avatar.accessory).name.toLowerCase()}.`;
  }

  const hairBack = (style, color) => style === 'long'
    ? `<path d="M45 73c0-35 21-53 46-53s46 18 46 53v78c-10 8-20 12-31 13l-15-31-15 31c-13-1-24-6-31-14z" fill="${color}"/>`
    : '';
  function hairFront(style, color) {
    if (style === 'curls') return `<g fill="${color}"><circle cx="53" cy="59" r="18"/><circle cx="69" cy="43" r="19"/><circle cx="91" cy="39" r="21"/><circle cx="113" cy="45" r="19"/><circle cx="129" cy="62" r="17"/><circle cx="70" cy="61" r="19"/><circle cx="106" cy="59" r="20"/></g>`;
    if (style === 'long') return `<path d="M49 69c4-32 21-46 42-46 24 0 40 15 43 47-15-19-30-23-50-18-15 4-23 13-35 17z" fill="${color}"/>`;
    if (style === 'spikes') return `<path d="M48 68 54 37l14 8 9-26 16 18 17-19 5 27 20-8-5 34c-17-16-61-18-82-3z" fill="${color}"/>`;
    return `<path d="M49 69c4-31 20-46 43-46 25 0 40 16 43 48-13-13-25-21-44-21-17 0-29 6-42 19z" fill="${color}"/>`;
  }
  function outfitLayer(outfit) {
    if (outfit === 'hoodie') return `<path d="M31 200v-25c0-24 19-38 44-41l16 16 16-16c25 3 44 17 44 41v25z" fill="#5B5BD6"/><path d="M67 139q24 25 48 0" fill="none" stroke="#CAC9FF" stroke-width="7" stroke-linecap="round"/><path d="M78 157v17m27-17v17" stroke="#fff" stroke-width="3"/><rect x="70" y="175" width="42" height="17" rx="8" fill="#4949B7"/>`;
    if (outfit === 'labcoat') return `<path d="M31 200v-25c0-24 18-37 44-41l16 14 16-14c26 4 44 17 44 41v25z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/><path d="m72 137 19 12-14 31-17-35zm38 0-19 12 14 31 17-35z" fill="#E2E8F0"/><path d="M91 149v51" stroke="#94A3B8" stroke-width="2"/><rect x="112" y="164" width="22" height="16" rx="3" fill="#DDD6FE"/><circle cx="118" cy="170" r="3" fill="#7C3AED"/>`;
    if (outfit === 'sports') return `<path d="M29 200v-26c0-24 18-37 46-40l16 12 16-12c28 3 46 16 46 40v26z" fill="#16A36A"/><path d="M65 138q26 25 52 0" fill="none" stroke="#F8FAFC" stroke-width="8"/><path d="M42 160h98" stroke="#FACC15" stroke-width="5"/><text x="91" y="190" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="27" font-weight="900">+</text>`;
    if (outfit === 'astronaut') return `<path d="M27 200v-25c0-25 19-38 48-42l16 12 16-12c29 4 48 17 48 42v25z" fill="#334155"/><path d="M64 138q27 25 54 0" fill="none" stroke="#C4B5FD" stroke-width="9"/><rect x="62" y="160" width="58" height="31" rx="8" fill="#F8FAFC"/><circle cx="75" cy="174" r="5" fill="#22C55E"/><circle cx="91" cy="174" r="5" fill="#FACC15"/><rect x="102" y="169" width="11" height="10" rx="2" fill="#7C3AED"/>`;
    if (outfit === 'explorer') return `<path d="M29 200v-25c0-24 18-37 46-41l16 13 16-13c28 4 46 17 46 41v25z" fill="#E7C493"/><path d="M57 145h29v55H48v-47zm39 0h29l9 8v47H96z" fill="#B96F35"/><rect x="56" y="165" width="22" height="18" rx="3" fill="#E7A25F"/><rect x="104" y="165" width="22" height="18" rx="3" fill="#E7A25F"/><path d="m75 137 16 14 16-14" fill="none" stroke="#EF4444" stroke-width="7"/>`;
    return `<path d="M31 200v-25c0-24 19-38 44-41l16 15 16-15c25 3 44 17 44 41v25z" fill="#7C3AED"/><path d="M69 138q22 24 44 0" fill="none" stroke="#EDE9FE" stroke-width="8"/><circle cx="91" cy="177" r="17" fill="#fff" opacity=".18"/><text x="91" y="184" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="22" font-weight="900">+</text>`;
  }
  function accessoryLayer(accessory) {
    if (accessory === 'glasses') return `<g fill="none" stroke="#3F3F46" stroke-width="4"><rect x="57" y="82" width="29" height="21" rx="9"/><rect x="96" y="82" width="29" height="21" rx="9"/><path d="M86 91h10m-39-3-9-4m77 4 9-4"/></g>`;
    if (accessory === 'cap') return `<path d="M51 48q12-29 42-29t42 29z" fill="#8B5CF6"/><path d="M85 48h62q-8 14-34 11z" fill="#6D28D9"/><circle cx="92" cy="20" r="5" fill="#FACC15"/>`;
    if (accessory === 'headphones') return `<path d="M45 89V70q0-46 46-46t46 46v19" fill="none" stroke="#4338CA" stroke-width="9"/><rect x="39" y="82" width="18" height="38" rx="8" fill="#8B5CF6"/><rect x="125" y="82" width="18" height="38" rx="8" fill="#8B5CF6"/>`;
    if (accessory === 'crown') return `<path d="M58 43 64 12l22 18 13-25 15 25 23-18-7 34z" fill="#FACC15" stroke="#D69E00" stroke-width="3"/><circle cx="64" cy="13" r="4" fill="#A855F7"/><circle cx="99" cy="6" r="4" fill="#22C55E"/><circle cx="136" cy="13" r="4" fill="#EF4444"/>`;
    if (accessory === 'medal') return `<path d="m74 142 17 29 17-29" fill="none" stroke="#2563EB" stroke-width="7"/><circle cx="91" cy="176" r="14" fill="#FACC15" stroke="#D69E00" stroke-width="3"/><path d="m91 167 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff"/>`;
    return '';
  }
  function render(raw = {}, options = {}) {
    const avatar = normalize(raw);
    const skin = itemFor('skin', avatar.skin).color;
    const hairColor = itemFor('hairColor', avatar.hairColor).color;
    const ariaLabel = options.decorative ? '' : (options.label || description(avatar));
    const aria = options.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${ariaLabel}"`;
    return `<svg class="custom-avatar-svg${options.className ? ` ${options.className}` : ''}" viewBox="0 0 182 202" xmlns="http://www.w3.org/2000/svg" ${aria} focusable="false">
      <circle cx="91" cy="90" r="82" fill="#F3EFFF"/><circle cx="28" cy="35" r="7" fill="#C4B5FD"/><circle cx="155" cy="52" r="5" fill="#FACC15"/><path d="m151 22 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#A78BFA"/>
      ${hairBack(avatar.hair, hairColor)}
      ${outfitLayer(avatar.outfit)}
      <rect x="78" y="128" width="26" height="25" rx="11" fill="${skin}"/>
      <circle cx="49" cy="91" r="13" fill="${skin}"/><circle cx="133" cy="91" r="13" fill="${skin}"/>
      <rect x="48" y="39" width="86" height="105" rx="43" fill="${skin}"/>
      ${hairFront(avatar.hair, hairColor)}
      <path d="M66 82q8-7 16 0m18 0q8-7 16 0" fill="none" stroke="${avatar.skin === 'deep' ? '#3D251A' : '#6B3F34'}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="74" cy="91" rx="5" ry="7" fill="#242033"/><ellipse cx="108" cy="91" rx="5" ry="7" fill="#242033"/><circle cx="76" cy="89" r="1.7" fill="#fff"/><circle cx="110" cy="89" r="1.7" fill="#fff"/>
      <circle cx="61" cy="107" r="7" fill="#EF8D8D" opacity=".32"/><circle cx="121" cy="107" r="7" fill="#EF8D8D" opacity=".32"/>
      <path d="M76 113q15 17 30 0" fill="none" stroke="#7B3F46" stroke-width="4" stroke-linecap="round"/>
      ${accessoryLayer(avatar.accessory)}
    </svg>`;
  }

  global.EstudaAvatarStudio = Object.freeze({ catalog, categories, defaults, legacyPresets, copyDefaults, normalize, migrateLegacy, fitToUnlocks, unlockedBetween, nextUnlock, itemFor, description, render });
})(window);
