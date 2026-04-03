/**
 * Форматирование цены
 * Бэкенд возвращает цены в рублях
 */
export const formatPrice = (price: number | string): string => {
  const num = Number(price) || 0;
  return Math.round(num).toLocaleString('ru-RU');
};

/**
 * Форматирование объёма данных
 * Бэкенд должен возвращать правильный формат ("500 MB", "20 GB")
 * Но на случай багов - исправляем на клиенте
 */
export const formatDataAmount = (amount: string): string => {
  if (!amount) return '';
  
  // Если уже правильный формат - возвращаем как есть
  const match = amount.match(/^(\d+)\s*(MB|GB)$/i);
  if (!match) return amount;
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toUpperCase();
  
  // Проверяем на баги бэкенда:
  // Если "500 GB" но значение < 100 - это норм (500 GB = 500 гигабайт)
  // Если "1024 GB" - это скорее всего баг, должно быть "1 GB"
  // Если "20480 GB" - это баг, должно быть "20 GB"
  
  if (unit === 'GB') {
    if (value >= 1000) {
      // Баг: значение в MB показано как GB
      // 1024 GB -> 1 GB, 20480 GB -> 20 GB
      const correctGB = Math.round(value / 1024);
      return `${correctGB} GB`;
    }
    if (value >= 100 && value < 1000) {
      // Баг: значение в MB показано как GB  
      // 500 GB -> 500 MB
      return `${value} MB`;
    }
  }
  
  return amount;
};

const NAME_TO_ISO: Record<string, string> = {
  'afghanistan':'AF','albania':'AL','algeria':'DZ','andorra':'AD','angola':'AO',
  'antigua':'AG','argentina':'AR','armenia':'AM','australia':'AU','austria':'AT',
  'azerbaijan':'AZ','bahamas':'BS','bahrain':'BH','bangladesh':'BD','barbados':'BB',
  'belarus':'BY','belgium':'BE','belize':'BZ','benin':'BJ','bermuda':'BM',
  'bhutan':'BT','bolivia':'BO','bosnia':'BA','botswana':'BW','brazil':'BR',
  'brunei':'BN','bulgaria':'BG','burkina':'BF','burkina faso':'BF','burundi':'BI',
  'cambodia':'KH','cameroon':'CM','canada':'CA','cape verde':'CV','chad':'TD',
  'chile':'CL','china':'CN','colombia':'CO','comoros':'KM','congo':'CG',
  'costa rica':'CR','croatia':'HR','cuba':'CU','curacao':'CW','cyprus':'CY',
  'czech':'CZ','czechia':'CZ','denmark':'DK','djibouti':'DJ','dominica':'DM',
  'dominican':'DO','dominican republic':'DO','ecuador':'EC','egypt':'EG',
  'el salvador':'SV','equatorial guinea':'GQ','eritrea':'ER','estonia':'EE',
  'eswatini':'SZ','ethiopia':'ET','fiji':'FJ','finland':'FI','france':'FR',
  'gabon':'GA','gambia':'GM','georgia':'GE','germany':'DE','ghana':'GH',
  'gibraltar':'GI','greece':'GR','greenland':'GL','grenada':'GD','guadeloupe':'GP',
  'guam':'GU','guatemala':'GT','guernsey':'GG','guinea':'GN','guinea-bissau':'GW',
  'guyana':'GY','haiti':'HT','honduras':'HN','hong kong':'HK','hungary':'HU',
  'iceland':'IS','india':'IN','indonesia':'ID','iran':'IR','iraq':'IQ',
  'ireland':'IE','isle of man':'IM','israel':'IL','italy':'IT','ivory coast':'CI',
  'jamaica':'JM','japan':'JP','jersey':'JE','jordan':'JO','kazakhstan':'KZ',
  'kenya':'KE','kiribati':'KI','korea':'KR','south korea':'KR','north korea':'KP',
  'kosovo':'XK','kuwait':'KW','kyrgyzstan':'KG','laos':'LA','latvia':'LV',
  'lebanon':'LB','lesotho':'LS','liberia':'LR','libya':'LY','liechtenstein':'LI',
  'lithuania':'LT','luxembourg':'LU','macao':'MO','macau':'MO','madagascar':'MG',
  'malawi':'MW','malaysia':'MY','maldives':'MV','mali':'ML','malta':'MT',
  'marshall':'MH','martinique':'MQ','mauritania':'MR','mauritius':'MU',
  'mexico':'MX','micronesia':'FM','moldova':'MD','monaco':'MC','mongolia':'MN',
  'montenegro':'ME','montserrat':'MS','morocco':'MA','mozambique':'MZ',
  'myanmar':'MM','namibia':'NA','nauru':'NR','nepal':'NP','netherlands':'NL',
  'new caledonia':'NC','new zealand':'NZ','nicaragua':'NI','niger':'NE',
  'nigeria':'NG','north macedonia':'MK','macedonia':'MK','norway':'NO',
  'oman':'OM','pakistan':'PK','palau':'PW','palestine':'PS','panama':'PA',
  'papua':'PG','papua new guinea':'PG','paraguay':'PY','peru':'PE',
  'philippines':'PH','poland':'PL','portugal':'PT','puerto rico':'PR',
  'qatar':'QA','reunion':'RE','romania':'RO','russia':'RU','rwanda':'RW',
  'saint kitts':'KN','saint lucia':'LC','saint vincent':'VC','samoa':'WS',
  'san marino':'SM','saudi arabia':'SA','senegal':'SN','serbia':'RS',
  'seychelles':'SC','sierra leone':'SL','singapore':'SG','sint maarten':'SX',
  'slovakia':'SK','slovenia':'SI','solomon':'SB','somalia':'SO','south africa':'ZA',
  'south sudan':'SS','spain':'ES','sri lanka':'LK','sudan':'SD','suriname':'SR',
  'sweden':'SE','switzerland':'CH','syria':'SY','taiwan':'TW','tajikistan':'TJ',
  'tanzania':'TZ','thailand':'TH','timor':'TL','togo':'TG','tonga':'TO',
  'trinidad':'TT','trinidad and tobago':'TT','tunisia':'TN','turkey':'TR',
  'turkiye':'TR','turkmenistan':'TM','turks':'TC','tuvalu':'TV','uganda':'UG',
  'ukraine':'UA','united arab emirates':'AE','uae':'AE','united kingdom':'GB',
  'uk':'GB','united states':'US','usa':'US','uruguay':'UY','uzbekistan':'UZ',
  'vanuatu':'VU','vatican':'VA','venezuela':'VE','vietnam':'VN','viet nam':'VN',
  'yemen':'YE','zambia':'ZM','zimbabwe':'ZW',
  'europe':'EU','asia':'AS','africa':'AF','global':'XX','world':'XX','worldwide':'XX',
};

export const getCountryCode = (country: string): string => {
  if (!country) return 'XX';

  if (/^[A-Za-z]{2}-\d+$/.test(country.trim())) {
    return 'XX';
  }

  if (/^[A-Za-z]{2}$/.test(country)) {
    return country.toUpperCase();
  }

  const match = country.match(/^([A-Za-z]{2})(?:[-_\s].*)$/);
  if (match) {
    return match[1].toUpperCase();
  }

  const key = country.trim().toLowerCase();
  if (NAME_TO_ISO[key]) return NAME_TO_ISO[key];

  for (const [name, code] of Object.entries(NAME_TO_ISO)) {
    if (key.includes(name) || name.includes(key)) return code;
  }

  return 'XX';
};

/**
 * URL картинки флага через CDN (работает на всех устройствах).
 * На Android/WebView SVG с некоторых CDN может отображаться некорректно,
 * поэтому используем PNG-версии.
 */
export const getFlagUrl = (country: string): string => {
  const code = getCountryCode(country).toLowerCase();
  if (code === 'xx') return '';
  
  // Проксируем через свой домен (rewrite в next.config.js) чтобы
  // избежать блокировки внешних картинок на Android.
  return `/flags/${code}.png`;
};

/**
 * Название страны по ISO коду
 */
export const getCountryName = (country: string): string => {
  if (!country) return 'Мир';

  const providerRegionCode = country.trim().toUpperCase().match(/^([A-Z]{2})-\d+$/);
  if (providerRegionCode) {
    const regionNames: Record<string, string> = {
      AF: 'Африка',
      AS: 'Азия',
      EU: 'Европа',
      NA: 'Северная Америка',
      LA: 'Латинская Америка',
      OC: 'Океания',
      ME: 'Ближний Восток и Северная Африка',
      GL: 'Глобальный',
      WW: 'Глобальный',
    };

    return regionNames[providerRegionCode[1]] || country;
  }
  
  const code = getCountryCode(country);
  
  const names: Record<string, string> = {
    'AD': 'Андорра', 'AE': 'ОАЭ', 'AF': 'Афганистан', 'AG': 'Антигуа',
    'AI': 'Ангилья', 'AL': 'Албания', 'AM': 'Армения', 'AO': 'Ангола',
    'AR': 'Аргентина', 'AS': 'Азия', 'AT': 'Австрия', 'AU': 'Австралия',
    'AX': 'Аланды', 'AZ': 'Азербайджан', 'BA': 'Босния', 'BB': 'Барбадос',
    'BD': 'Бангладеш', 'BE': 'Бельгия', 'BF': 'Буркина-Фасо', 'BG': 'Болгария',
    'BH': 'Бахрейн', 'BJ': 'Бенин', 'BM': 'Бермуды', 'BN': 'Бруней',
    'BO': 'Боливия', 'BR': 'Бразилия', 'BS': 'Багамы', 'BT': 'Бутан',
    'BW': 'Ботсвана', 'BY': 'Беларусь', 'BZ': 'Белиз', 'CA': 'Канада',
    'CD': 'Конго', 'CF': 'ЦАР', 'CG': 'Конго', 'CH': 'Швейцария',
    'CI': 'Кот-д\'Ивуар', 'CL': 'Чили', 'CM': 'Камерун', 'CN': 'Китай',
    'CO': 'Колумбия', 'CR': 'Коста-Рика', 'CU': 'Куба', 'CV': 'Кабо-Верде',
    'CW': 'Кюрасао', 'CY': 'Кипр', 'CZ': 'Чехия', 'DE': 'Германия',
    'DJ': 'Джибути', 'DK': 'Дания', 'DM': 'Доминика', 'DO': 'Доминикана',
    'DZ': 'Алжир', 'EC': 'Эквадор', 'EE': 'Эстония', 'EG': 'Египет',
    'ER': 'Эритрея', 'ES': 'Испания', 'ET': 'Эфиопия', 'EU': 'Европа',
    'FI': 'Финляндия', 'FJ': 'Фиджи', 'FK': 'Фолкленды', 'FM': 'Микронезия',
    'FO': 'Фареры', 'FR': 'Франция', 'GA': 'Габон', 'GB': 'Британия',
    'GD': 'Гренада', 'GE': 'Грузия', 'GF': 'Гвиана', 'GG': 'Гернси',
    'GH': 'Гана', 'GI': 'Гибралтар', 'GL': 'Гренландия', 'GM': 'Гамбия',
    'GN': 'Гвинея', 'GP': 'Гваделупа', 'GQ': 'Экв. Гвинея', 'GR': 'Греция',
    'GT': 'Гватемала', 'GU': 'Гуам', 'GW': 'Гвинея-Бисау', 'GY': 'Гайана',
    'HK': 'Гонконг', 'HN': 'Гондурас', 'HR': 'Хорватия', 'HT': 'Гаити',
    'HU': 'Венгрия', 'ID': 'Индонезия', 'IE': 'Ирландия', 'IL': 'Израиль',
    'IM': 'Мэн', 'IN': 'Индия', 'IQ': 'Ирак', 'IR': 'Иран',
    'IS': 'Исландия', 'IT': 'Италия', 'JE': 'Джерси', 'JM': 'Ямайка',
    'JO': 'Иордания', 'JP': 'Япония', 'KE': 'Кения', 'KG': 'Киргизия',
    'KH': 'Камбоджа', 'KI': 'Кирибати', 'KM': 'Коморы', 'KN': 'Сент-Китс',
    'KP': 'КНДР', 'KR': 'Корея', 'KW': 'Кувейт', 'KY': 'Кайманы',
    'KZ': 'Казахстан', 'LA': 'Лаос', 'LB': 'Ливан', 'LC': 'Сент-Люсия',
    'LI': 'Лихтенштейн', 'LK': 'Шри-Ланка', 'LR': 'Либерия', 'LS': 'Лесото',
    'LT': 'Литва', 'LU': 'Люксембург', 'LV': 'Латвия', 'LY': 'Ливия',
    'MA': 'Марокко', 'MC': 'Монако', 'MD': 'Молдова', 'ME': 'Черногория',
    'MG': 'Мадагаскар', 'MH': 'Маршаллы', 'MK': 'Македония', 'ML': 'Мали',
    'MM': 'Мьянма', 'MN': 'Монголия', 'MO': 'Макао', 'MP': 'Марианы',
    'MQ': 'Мартиника', 'MR': 'Мавритания', 'MS': 'Монтсеррат', 'MT': 'Мальта',
    'MU': 'Маврикий', 'MV': 'Мальдивы', 'MW': 'Малави', 'MX': 'Мексика',
    'MY': 'Малайзия', 'MZ': 'Мозамбик', 'NA': 'Намибия', 'NC': 'Каледония',
    'NE': 'Нигер', 'NF': 'Норфолк', 'NG': 'Нигерия', 'NI': 'Никарагуа',
    'NL': 'Нидерланды', 'NO': 'Норвегия', 'NP': 'Непал', 'NR': 'Науру',
    'NU': 'Ниуэ', 'NZ': 'Н. Зеландия', 'OM': 'Оман', 'PA': 'Панама',
    'PE': 'Перу', 'PF': 'Полинезия', 'PG': 'Папуа', 'PH': 'Филиппины',
    'PK': 'Пакистан', 'PL': 'Польша', 'PM': 'Сен-Пьер', 'PN': 'Питкэрн',
    'PR': 'Пуэрто-Рико', 'PS': 'Палестина', 'PT': 'Португалия', 'PW': 'Палау',
    'PY': 'Парагвай', 'QA': 'Катар', 'RE': 'Реюньон', 'RO': 'Румыния',
    'RS': 'Сербия', 'RU': 'Россия', 'RW': 'Руанда', 'SA': 'Сауд. Аравия',
    'SB': 'Соломоны', 'SC': 'Сейшелы', 'SD': 'Судан', 'SE': 'Швеция',
    'SG': 'Сингапур', 'SH': 'Св. Елена', 'SI': 'Словения', 'SK': 'Словакия',
    'SL': 'Сьерра-Леоне', 'SM': 'Сан-Марино', 'SN': 'Сенегал', 'SO': 'Сомали',
    'SR': 'Суринам', 'SS': 'Юж. Судан', 'ST': 'Сан-Томе', 'SV': 'Сальвадор',
    'SX': 'Синт-Мартен', 'SY': 'Сирия', 'SZ': 'Эсватини', 'TC': 'Тёркс',
    'TD': 'Чад', 'TG': 'Того', 'TH': 'Таиланд', 'TJ': 'Таджикистан',
    'TK': 'Токелау', 'TL': 'Тимор', 'TM': 'Туркмения', 'TN': 'Тунис',
    'TO': 'Тонга', 'TR': 'Турция', 'TT': 'Тринидад', 'TV': 'Тувалу',
    'TW': 'Тайвань', 'TZ': 'Танзания', 'UA': 'Украина', 'UG': 'Уганда',
    'US': 'США', 'UY': 'Уругвай', 'UZ': 'Узбекистан', 'VA': 'Ватикан',
    'VC': 'Сент-Винсент', 'VE': 'Венесуэла', 'VG': 'Брит. Виргины',
    'VI': 'Виргины США', 'VN': 'Вьетнам', 'VU': 'Вануату', 'WF': 'Уоллис',
    'WS': 'Самоа', 'XK': 'Косово', 'YE': 'Йемен', 'YT': 'Майотта',
    'ZA': 'ЮАР', 'ZM': 'Замбия', 'ZW': 'Зимбабве',
    // Мульти-регионы
    'XX': 'Мир',
  };
  
  return names[code] || country;
};

/**
 * Флаг страны по ISO коду или названию (для старого кода)
 * @deprecated Используй getFlagUrl для картинок
 */
export const getCountryEmoji = (country: string): string => {
  if (!country) return '🌍';
  
  const code = getCountryCode(country);
  if (code === 'XX') return '🌍';
  
  const offset = 127397;
  try {
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    );
  } catch {
    return '🌍';
  }
};
