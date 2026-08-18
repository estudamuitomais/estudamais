(function initializeAvatarStudio(global) {
  const catalog = {
    presentation: [
      { id: 'masculine', name: 'Masculino', icon: '♂', unlock: 0 },
      { id: 'feminine', name: 'Feminino', icon: '♀', unlock: 0 }
    ],
    skin: [
      { id: 'porcelain', name: 'Porcelana', color: '#FFE0C7', unlock: 0 },
      { id: 'peach', name: 'Pêssego', color: '#FFD0AD', unlock: 0 },
      { id: 'sunny', name: 'Dourada', color: '#F1B989', unlock: 0 },
      { id: 'bronze', name: 'Bronze', color: '#C98255', unlock: 0 },
      { id: 'cocoa', name: 'Cacau', color: '#9A5D3F', unlock: 0 },
      { id: 'deep', name: 'Ébano', color: '#75452F', unlock: 0 }
    ],
    hair: [
      { id: 'short', name: 'Curtinho', icon: '✂', unlock: 0 },
      { id: 'curls', name: 'Cachos', icon: '◌', unlock: 0 },
      { id: 'long', name: 'Comprido', icon: '〰', unlock: 0 },
      { id: 'spikes', name: 'Espetado', icon: '✦', unlock: 0 },
      { id: 'bob', name: 'Chanel', icon: '◒', unlock: 0 },
      { id: 'afro', name: 'Afro', icon: '●', unlock: 0 },
      { id: 'braids', name: 'Tranças', icon: '≋', unlock: 0 },
      { id: 'ponytail', name: 'Rabo de cavalo', icon: '➰', unlock: 0 }
    ],
    hairColor: [
      { id: 'cocoa', name: 'Cacau', color: '#4A2D28', unlock: 0 },
      { id: 'night', name: 'Noturno', color: '#25243A', unlock: 0 },
      { id: 'honey', name: 'Mel', color: '#D18A2E', unlock: 0 },
      { id: 'copper', name: 'Cobre', color: '#A64B2A', unlock: 0 },
      { id: 'berry', name: 'Ameixa', color: '#713A68', unlock: 0, premium: true },
      { id: 'ocean', name: 'Azul criativo', color: '#3157A8', unlock: 0, premium: true }
    ],
    eyes: [
      { id: 'espresso', name: 'Castanhos', color: '#4B2E25', unlock: 0 },
      { id: 'night', name: 'Pretos', color: '#242033', unlock: 0 },
      { id: 'forest', name: 'Verdes', color: '#2F7D63', unlock: 0 },
      { id: 'sky', name: 'Azuis', color: '#3478B8', unlock: 0 },
      { id: 'violet', name: 'Violetas', color: '#7C3AED', unlock: 0 }
    ],
    expression: [
      { id: 'smile', name: 'Sorridente', icon: '😊', unlock: 0 },
      { id: 'focus', name: 'Concentrado', icon: '🧐', unlock: 0 },
      { id: 'curious', name: 'Curioso', icon: '🤔', unlock: 2 },
      { id: 'excited', name: 'Superanimado', icon: '🤩', unlock: 4, premium: true },
      { id: 'brave', name: 'Corajoso', icon: '😎', unlock: 6, premium: true }
    ],
    outfit: [
      { id: 'tshirt', name: 'Camiseta Estuda+', icon: '👕', color: '#7C3AED', unlock: 0 },
      { id: 'hoodie', name: 'Moletom curioso', icon: '🧥', color: '#5B5BD6', unlock: 1 },
      { id: 'labcoat', name: 'Jaleco científico', icon: '🥼', color: '#F8FAFC', unlock: 2 },
      { id: 'sports', name: 'Uniforme campeão', icon: '🏅', color: '#16A36A', unlock: 3 },
      { id: 'astronaut', name: 'Traje espacial', icon: '🚀', color: '#334155', unlock: 4, premium: true },
      { id: 'artist', name: 'Avental de artista', icon: '🎨', color: '#EC4899', unlock: 5, premium: true },
      { id: 'explorer', name: 'Colete explorador', icon: '🧭', color: '#C47A39', unlock: 6, premium: true },
      { id: 'inventor', name: 'Jaqueta inventora', icon: '⚙', color: '#0F766E', unlock: 8, premium: true }
    ],
    accessory: [
      { id: 'none', name: 'Sem acessório', icon: '✓', unlock: 0 },
      { id: 'glasses', name: 'Óculos de ideias', icon: '👓', unlock: 1 },
      { id: 'cap', name: 'Boné aventureiro', icon: '🧢', unlock: 2 },
      { id: 'headphones', name: 'Fone de foco', icon: '🎧', unlock: 3 },
      { id: 'crown', name: 'Coroa do saber', icon: '👑', unlock: 4, premium: true },
      { id: 'bandana', name: 'Faixa da coragem', icon: '🎗', unlock: 5, premium: true },
      { id: 'medal', name: 'Medalha mestre', icon: '🏆', unlock: 6, premium: true },
      { id: 'visor', name: 'Visor do futuro', icon: '🥽', unlock: 8, premium: true }
    ],
    companion: [
      { id: 'none', name: 'Sem companheiro', icon: '✓', unlock: 0 },
      { id: 'star', name: 'Estrelinha', icon: '⭐', unlock: 1 },
      { id: 'owl', name: 'Coruja sábia', icon: '🦉', unlock: 3 },
      { id: 'fox', name: 'Raposa curiosa', icon: '🦊', unlock: 5, premium: true },
      { id: 'robot', name: 'Robô ajudante', icon: '🤖', unlock: 7, premium: true }
    ],
    scene: [
      { id: 'studio', name: 'Ateliê violeta', icon: '✦', unlock: 0, color: '#F3EFFF' },
      { id: 'library', name: 'Biblioteca mágica', icon: '📚', unlock: 2, color: '#FFF4D6' },
      { id: 'forest', name: 'Floresta do saber', icon: '🌿', unlock: 4, color: '#E8F8EC' },
      { id: 'space', name: 'Estação espacial', icon: '🪐', unlock: 6, color: '#E8ECFF', premium: true },
      { id: 'lab', name: 'Laboratório neon', icon: '🧪', unlock: 8, color: '#E5FBF6', premium: true }
    ]
  };

  const categories = [
    { id: 'presentation', label: 'Estilo', icon: '☺' },
    { id: 'skin', label: 'Pele', icon: '●' },
    { id: 'hair', label: 'Cabelo', icon: '✂' },
    { id: 'hairColor', label: 'Cor', icon: '◐' },
    { id: 'eyes', label: 'Olhos', icon: '◉' },
    { id: 'expression', label: 'Expressão', icon: '😊' },
    { id: 'outfit', label: 'Roupa', icon: '👕' },
    { id: 'accessory', label: 'Acessório', icon: '✨' },
    { id: 'companion', label: 'Amigo', icon: '⭐' },
    { id: 'scene', label: 'Cenário', icon: '🌈' }
  ];

  const unlockableCategories = Object.freeze(['expression', 'outfit', 'accessory', 'companion', 'scene']);
  const defaults = Object.freeze({ presentation: 'masculine', skin: 'sunny', hair: 'short', hairColor: 'cocoa', eyes: 'espresso', expression: 'smile', outfit: 'tshirt', accessory: 'none', companion: 'none', scene: 'studio' });
  const legacyPresets = Object.freeze({
    '🧑‍🚀': { presentation: 'masculine', skin: 'sunny', hair: 'short', hairColor: 'cocoa', outfit: 'astronaut', accessory: 'none' },
    '🦊': { presentation: 'feminine', skin: 'peach', hair: 'spikes', hairColor: 'honey', outfit: 'hoodie', accessory: 'none', companion: 'fox' },
    '🧙': { presentation: 'feminine', skin: 'bronze', hair: 'long', hairColor: 'berry', outfit: 'explorer', accessory: 'glasses' },
    '🤖': { presentation: 'masculine', skin: 'deep', hair: 'short', hairColor: 'night', outfit: 'astronaut', accessory: 'headphones', companion: 'robot' }
  });
  const itemFor = (category, id) => catalog[category]?.find((item) => item.id === id) || catalog[category]?.[0];
  const copyDefaults = () => ({ ...defaults });
  function normalize(raw = {}) {
    const safe = {};
    categories.forEach(({ id }) => { safe[id] = itemFor(id, raw?.[id] || defaults[id])?.id || defaults[id]; });
    return safe;
  }
  function migrateLegacy(legacyIcon) { return normalize(legacyPresets[legacyIcon] || defaults); }
  function fitToUnlocks(raw, completedPhases = 0) {
    const safe = normalize(raw);
    unlockableCategories.forEach((category) => {
      if ((itemFor(category, safe[category])?.unlock || 0) > completedPhases) safe[category] = defaults[category];
    });
    return safe;
  }
  function unlockedBetween(previousCount, nextCount) {
    return unlockableCategories.flatMap((category) => catalog[category]
      .filter((item) => item.unlock > previousCount && item.unlock <= nextCount)
      .map((item) => ({ ...item, category })));
  }
  function nextUnlock(completedPhases = 0) {
    return unlockableCategories.flatMap((category) => catalog[category].map((item) => ({ ...item, category })))
      .filter((item) => item.unlock > completedPhases)
      .sort((a, b) => a.unlock - b.unlock)[0] || null;
  }
  function description(raw = {}) {
    const avatar = normalize(raw);
    const companion = avatar.companion === 'none' ? 'sem companheiro' : `com ${itemFor('companion', avatar.companion).name.toLowerCase()}`;
    return `Avatar ${itemFor('presentation', avatar.presentation).name.toLowerCase()}, pele ${itemFor('skin', avatar.skin).name.toLowerCase()}, cabelo ${itemFor('hair', avatar.hair).name.toLowerCase()} ${itemFor('hairColor', avatar.hairColor).name.toLowerCase()}, olhos ${itemFor('eyes', avatar.eyes).name.toLowerCase()}, expressão ${itemFor('expression', avatar.expression).name.toLowerCase()}, ${itemFor('outfit', avatar.outfit).name.toLowerCase()}, ${companion}, no cenário ${itemFor('scene', avatar.scene).name.toLowerCase()}.`;
  }

  function sceneLayer(scene) {
    if (scene === 'library') return '<circle cx="91" cy="90" r="82" fill="#FFF4D6"/><path d="M22 56h138v95H22z" fill="#F8DDA4" opacity=".45"/><path d="M31 67h23v70H31zm32 0h23v70H63zm65 0h23v70h-23z" fill="#B7784A" opacity=".35"/><path d="M34 76h17m-17 13h17m32-13h18m-18 13h18m30-13h17m-17 13h17" stroke="#7C3AED" stroke-width="5"/>';
    if (scene === 'forest') return '<circle cx="91" cy="90" r="82" fill="#E8F8EC"/><circle cx="35" cy="61" r="24" fill="#A7E3B2"/><circle cx="150" cy="72" r="27" fill="#8ED7A0"/><path d="M24 151q32-32 61 0t72 0v28H24z" fill="#69BE7D" opacity=".55"/><path d="M39 29q8 17 25 8-12 17-25-8zm94 6q9 18 26 7-11 18-26-7z" fill="#36A35B"/>';
    if (scene === 'space') return '<circle cx="91" cy="90" r="82" fill="#E8ECFF"/><path d="M19 113q72-55 145-8v67H19z" fill="#CBD5FF"/><circle cx="142" cy="45" r="17" fill="#FACC15"/><path d="M127 45h30M142 30v30" stroke="#F59E0B" stroke-width="3" opacity=".6"/><circle cx="32" cy="37" r="3" fill="#7C3AED"/><circle cx="54" cy="22" r="4" fill="#4F46E5"/><circle cx="115" cy="25" r="3" fill="#EC4899"/>';
    if (scene === 'lab') return '<circle cx="91" cy="90" r="82" fill="#E5FBF6"/><path d="M22 132h138v45H22z" fill="#BDEFE4"/><path d="M30 45h29v39H30zm92 0h29v39h-29z" fill="#fff" opacity=".8"/><path d="M43 84v18l-12 20h27l-12-20V84m89 0v17l-12 21h28l-13-21V84" fill="none" stroke="#14B8A6" stroke-width="4"/><circle cx="45" cy="112" r="5" fill="#A855F7"/><circle cx="137" cy="111" r="5" fill="#F59E0B"/>';
    return '<circle cx="91" cy="90" r="82" fill="#F3EFFF"/><circle cx="28" cy="35" r="7" fill="#C4B5FD"/><circle cx="155" cy="52" r="5" fill="#FACC15"/><path d="m151 22 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#A78BFA"/>';
  }
  const hairBack = (style, color) => {
    if (style === 'long' || style === 'bob') return `<path d="M45 73c0-35 21-53 46-53s46 18 46 53v78c-10 8-20 12-31 13l-15-31-15 31c-13-1-24-6-31-14z" fill="${color}"/>`;
    if (style === 'ponytail') return `<circle cx="139" cy="63" r="25" fill="${color}"/><path d="M127 60q33 24 16 66-25-25-16-66z" fill="${color}"/>`;
    if (style === 'braids') return `<path d="M50 65q-11 39 3 87m78-87q11 39-3 87" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-dasharray="7 4"/>`;
    return '';
  };
  function hairFront(style, color) {
    if (style === 'curls') return `<g fill="${color}"><circle cx="53" cy="59" r="18"/><circle cx="69" cy="43" r="19"/><circle cx="91" cy="39" r="21"/><circle cx="113" cy="45" r="19"/><circle cx="129" cy="62" r="17"/><circle cx="70" cy="61" r="19"/><circle cx="106" cy="59" r="20"/></g>`;
    if (style === 'afro') return `<g fill="${color}"><circle cx="47" cy="61" r="22"/><circle cx="59" cy="37" r="24"/><circle cx="86" cy="27" r="26"/><circle cx="114" cy="34" r="25"/><circle cx="135" cy="58" r="22"/><circle cx="76" cy="52" r="27"/><circle cx="108" cy="53" r="27"/></g>`;
    if (style === 'long') return `<path d="M49 69c4-32 21-46 42-46 24 0 40 15 43 47-15-19-30-23-50-18-15 4-23 13-35 17z" fill="${color}"/>`;
    if (style === 'bob') return `<path d="M47 73q3-51 44-51 43 0 45 54-14-22-45-22-29 0-44 19z" fill="${color}"/><path d="M48 64v60m87-60v60" stroke="${color}" stroke-width="13" stroke-linecap="round"/>`;
    if (style === 'spikes') return `<path d="M48 68 54 37l14 8 9-26 16 18 17-19 5 27 20-8-5 34c-17-16-61-18-82-3z" fill="${color}"/>`;
    if (style === 'braids') return `<path d="M49 69q5-47 43-47 39 0 43 49-19-17-43-17-25 0-43 15z" fill="${color}"/>`;
    if (style === 'ponytail') return `<path d="M49 70q5-48 43-48 39 0 43 49-19-17-43-17-25 0-43 16z" fill="${color}"/>`;
    return `<path d="M49 69c4-31 20-46 43-46 25 0 40 16 43 48-13-13-25-21-44-21-17 0-29 6-42 19z" fill="${color}"/>`;
  }
  function outfitLayer(outfit) {
    if (outfit === 'hoodie') return '<path d="M31 200v-25c0-24 19-38 44-41l16 16 16-16c25 3 44 17 44 41v25z" fill="#5B5BD6"/><path d="M67 139q24 25 48 0" fill="none" stroke="#CAC9FF" stroke-width="7" stroke-linecap="round"/><path d="M78 157v17m27-17v17" stroke="#fff" stroke-width="3"/><rect x="70" y="175" width="42" height="17" rx="8" fill="#4949B7"/>';
    if (outfit === 'labcoat') return '<path d="M31 200v-25c0-24 18-37 44-41l16 14 16-14c26 4 44 17 44 41v25z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/><path d="m72 137 19 12-14 31-17-35zm38 0-19 12 14 31 17-35z" fill="#E2E8F0"/><path d="M91 149v51" stroke="#94A3B8" stroke-width="2"/><rect x="112" y="164" width="22" height="16" rx="3" fill="#DDD6FE"/><circle cx="118" cy="170" r="3" fill="#7C3AED"/>';
    if (outfit === 'sports') return '<path d="M29 200v-26c0-24 18-37 46-40l16 12 16-12c28 3 46 16 46 40v26z" fill="#16A36A"/><path d="M65 138q26 25 52 0" fill="none" stroke="#F8FAFC" stroke-width="8"/><path d="M42 160h98" stroke="#FACC15" stroke-width="5"/><text x="91" y="190" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="27" font-weight="900">+</text>';
    if (outfit === 'astronaut') return '<path d="M27 200v-25c0-25 19-38 48-42l16 12 16-12c29 4 48 17 48 42v25z" fill="#334155"/><path d="M64 138q27 25 54 0" fill="none" stroke="#C4B5FD" stroke-width="9"/><rect x="62" y="160" width="58" height="31" rx="8" fill="#F8FAFC"/><circle cx="75" cy="174" r="5" fill="#22C55E"/><circle cx="91" cy="174" r="5" fill="#FACC15"/><rect x="102" y="169" width="11" height="10" rx="2" fill="#7C3AED"/>';
    if (outfit === 'artist') return '<path d="M29 200v-25c0-24 18-37 46-41l16 13 16-13c28 4 46 17 46 41v25z" fill="#F9A8D4"/><path d="M55 144h72l-8 56H63z" fill="#EC4899"/><circle cx="76" cy="172" r="5" fill="#FACC15"/><circle cx="93" cy="181" r="5" fill="#22C55E"/><circle cx="108" cy="165" r="5" fill="#7C3AED"/>';
    if (outfit === 'explorer') return '<path d="M29 200v-25c0-24 18-37 46-41l16 13 16-13c28 4 46 17 46 41v25z" fill="#E7C493"/><path d="M57 145h29v55H48v-47zm39 0h29l9 8v47H96z" fill="#B96F35"/><rect x="56" y="165" width="22" height="18" rx="3" fill="#E7A25F"/><rect x="104" y="165" width="22" height="18" rx="3" fill="#E7A25F"/><path d="m75 137 16 14 16-14" fill="none" stroke="#EF4444" stroke-width="7"/>';
    if (outfit === 'inventor') return '<path d="M28 200v-25c0-24 19-38 47-41l16 14 16-14c28 3 47 17 47 41v25z" fill="#0F766E"/><path d="M65 139q26 24 52 0" fill="none" stroke="#99F6E4" stroke-width="8"/><circle cx="91" cy="174" r="17" fill="#134E4A"/><path d="M91 162v24m-12-12h24m-20-9 16 18m0-18-16 18" stroke="#FACC15" stroke-width="3"/>';
    return '<path d="M31 200v-25c0-24 19-38 44-41l16 15 16-15c25 3 44 17 44 41v25z" fill="#7C3AED"/><path d="M69 138q22 24 44 0" fill="none" stroke="#EDE9FE" stroke-width="8"/><circle cx="91" cy="177" r="17" fill="#fff" opacity=".18"/><text x="91" y="184" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="22" font-weight="900">+</text>';
  }
  function accessoryLayer(accessory) {
    if (accessory === 'glasses') return '<g fill="none" stroke="#3F3F46" stroke-width="4"><rect x="57" y="82" width="29" height="21" rx="9"/><rect x="96" y="82" width="29" height="21" rx="9"/><path d="M86 91h10m-39-3-9-4m77 4 9-4"/></g>';
    if (accessory === 'cap') return '<path d="M51 48q12-29 42-29t42 29z" fill="#8B5CF6"/><path d="M85 48h62q-8 14-34 11z" fill="#6D28D9"/><circle cx="92" cy="20" r="5" fill="#FACC15"/>';
    if (accessory === 'headphones') return '<path d="M45 89V70q0-46 46-46t46 46v19" fill="none" stroke="#4338CA" stroke-width="9"/><rect x="39" y="82" width="18" height="38" rx="8" fill="#8B5CF6"/><rect x="125" y="82" width="18" height="38" rx="8" fill="#8B5CF6"/>';
    if (accessory === 'crown') return '<path d="M58 43 64 12l22 18 13-25 15 25 23-18-7 34z" fill="#FACC15" stroke="#D69E00" stroke-width="3"/><circle cx="64" cy="13" r="4" fill="#A855F7"/><circle cx="99" cy="6" r="4" fill="#22C55E"/><circle cx="136" cy="13" r="4" fill="#EF4444"/>';
    if (accessory === 'bandana') return '<path d="M50 55q41-18 83 0l-4 13q-38-16-76 0z" fill="#EF4444"/><path d="m128 59 24 12-22 10z" fill="#DC2626"/>';
    if (accessory === 'medal') return '<path d="m74 142 17 29 17-29" fill="none" stroke="#2563EB" stroke-width="7"/><circle cx="91" cy="176" r="14" fill="#FACC15" stroke="#D69E00" stroke-width="3"/><path d="m91 167 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff"/>';
    if (accessory === 'visor') return '<path d="M53 82q38-13 76 0l-5 24q-33 10-66 0z" fill="#67E8F9" opacity=".75" stroke="#0E7490" stroke-width="4"/><path d="m60 98 20-11" stroke="#fff" stroke-width="4" opacity=".8"/>';
    return '';
  }
  function faceLayer(avatar, eyeColor) {
    const browColor = avatar.skin === 'deep' ? '#3D251A' : '#6B3F34';
    const brows = avatar.expression === 'curious'
      ? `<path d="M65 82q9-10 18-1m17-4q9-5 16 3" fill="none" stroke="${browColor}" stroke-width="3" stroke-linecap="round"/>`
      : avatar.expression === 'brave'
        ? `<path d="m65 79 17 5m19 0 16-5" fill="none" stroke="${browColor}" stroke-width="4" stroke-linecap="round"/>`
        : `<path d="M66 82q8-7 16 0m18 0q8-7 16 0" fill="none" stroke="${browColor}" stroke-width="3" stroke-linecap="round"/>`;
    const eyes = avatar.expression === 'excited'
      ? `<path d="m74 84 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1zm34 0 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="${eyeColor}"/>`
      : avatar.expression === 'focus'
        ? `<ellipse cx="74" cy="92" rx="5" ry="6" fill="${eyeColor}"/><ellipse cx="108" cy="92" rx="5" ry="6" fill="${eyeColor}"/><path d="M67 98h14m20 0h14" stroke="${eyeColor}" stroke-width="2"/>`
        : `<ellipse cx="74" cy="91" rx="5" ry="7" fill="${eyeColor}"/><ellipse cx="108" cy="91" rx="5" ry="7" fill="${eyeColor}"/><circle cx="76" cy="89" r="1.7" fill="#fff"/><circle cx="110" cy="89" r="1.7" fill="#fff"/>`;
    const lashes = avatar.presentation === 'feminine' ? '<path d="m67 87-5-4m50 4 5-4" stroke="#3D253B" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="105" r="3" fill="#F9A8D4"/><circle cx="132" cy="105" r="3" fill="#F9A8D4"/>' : '';
    let mouth = '<path d="M76 113q15 17 30 0" fill="none" stroke="#7B3F46" stroke-width="4" stroke-linecap="round"/>';
    if (avatar.expression === 'focus') mouth = '<path d="M79 118h24" fill="none" stroke="#7B3F46" stroke-width="4" stroke-linecap="round"/>';
    if (avatar.expression === 'curious') mouth = '<circle cx="92" cy="117" r="7" fill="#7B3F46"/><circle cx="94" cy="115" r="2" fill="#fff" opacity=".5"/>';
    if (avatar.expression === 'excited') mouth = '<path d="M72 111q19 27 38 0z" fill="#7B3F46"/><path d="M80 115h22" stroke="#fff" stroke-width="5"/>';
    if (avatar.expression === 'brave') mouth = '<path d="M76 115q15 12 30 0" fill="none" stroke="#7B3F46" stroke-width="4" stroke-linecap="round"/>';
    return `${brows}${eyes}${lashes}<circle cx="61" cy="107" r="7" fill="#EF8D8D" opacity=".32"/><circle cx="121" cy="107" r="7" fill="#EF8D8D" opacity=".32"/>${mouth}`;
  }
  function companionLayer(companion) {
    if (companion === 'star') return '<g class="avatar-companion"><circle cx="150" cy="147" r="23" fill="#fff" opacity=".93"/><path d="m150 128 6 12 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="#FACC15" stroke="#D69E00" stroke-width="2"/><circle cx="145" cy="147" r="1.5"/><circle cx="155" cy="147" r="1.5"/></g>';
    if (companion === 'owl') return '<g class="avatar-companion"><circle cx="150" cy="148" r="24" fill="#fff" opacity=".94"/><path d="M133 145q0-22 17-22t17 22v20h-34z" fill="#A78BFA"/><circle cx="143" cy="143" r="7" fill="#fff"/><circle cx="157" cy="143" r="7" fill="#fff"/><circle cx="143" cy="143" r="3"/><circle cx="157" cy="143" r="3"/><path d="m150 148-5 6h10z" fill="#F59E0B"/></g>';
    if (companion === 'fox') return '<g class="avatar-companion"><circle cx="150" cy="148" r="24" fill="#fff" opacity=".94"/><path d="m132 135 7-13 8 10m21 3-7-13-8 10" fill="#EA7A2D"/><path d="M133 144q2-17 17-17t17 17q0 21-17 22t-17-22z" fill="#F28C38"/><path d="m142 151 8 11 8-11" fill="#fff"/><circle cx="143" cy="143" r="2.5"/><circle cx="157" cy="143" r="2.5"/></g>';
    if (companion === 'robot') return '<g class="avatar-companion"><circle cx="150" cy="148" r="24" fill="#fff" opacity=".94"/><path d="M150 123v7" stroke="#475569" stroke-width="3"/><circle cx="150" cy="121" r="3" fill="#FACC15"/><rect x="132" y="131" width="36" height="31" rx="9" fill="#94A3B8" stroke="#475569" stroke-width="2"/><circle cx="143" cy="144" r="4" fill="#67E8F9"/><circle cx="157" cy="144" r="4" fill="#67E8F9"/><path d="M142 154h16" stroke="#475569" stroke-width="3"/></g>';
    return '';
  }
  function render(raw = {}, options = {}) {
    const avatar = normalize(raw);
    const skin = itemFor('skin', avatar.skin).color;
    const hairColor = itemFor('hairColor', avatar.hairColor).color;
    const eyeColor = itemFor('eyes', avatar.eyes).color;
    const ariaLabel = options.decorative ? '' : (options.label || description(avatar));
    const aria = options.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${ariaLabel}"`;
    return `<svg class="custom-avatar-svg avatar-presentation-${avatar.presentation} avatar-expression-${avatar.expression}${options.className ? ` ${options.className}` : ''}" viewBox="0 0 182 202" xmlns="http://www.w3.org/2000/svg" ${aria} focusable="false">
      ${sceneLayer(avatar.scene)}
      ${hairBack(avatar.hair, hairColor)}
      ${outfitLayer(avatar.outfit)}
      <rect x="78" y="128" width="26" height="25" rx="11" fill="${skin}"/>
      <circle cx="49" cy="91" r="13" fill="${skin}"/><circle cx="133" cy="91" r="13" fill="${skin}"/>
      <rect x="48" y="39" width="86" height="105" rx="43" fill="${skin}"/>
      ${hairFront(avatar.hair, hairColor)}
      ${faceLayer(avatar, eyeColor)}
      ${accessoryLayer(avatar.accessory)}
      ${companionLayer(avatar.companion)}
    </svg>`;
  }

  global.EstudaAvatarStudio = Object.freeze({ catalog, categories, unlockableCategories, defaults, legacyPresets, copyDefaults, normalize, migrateLegacy, fitToUnlocks, unlockedBetween, nextUnlock, itemFor, description, render });
})(window);
