/**
 * Форматирование цены
 * Бэкенд возвращает цену в рублях (целое число)
 */
export const formatPrice = (price: number | string): string => {
  const num = Number(price) || 0;
  return num.toLocaleString('ru-RU');
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

/**
 * Флаг страны по ISO коду или названию
 */
export const getCountryEmoji = (country: string): string => {
  if (!country) return '🌍';
  
  // ISO код (2 буквы) -> флаг
  if (/^[A-Za-z]{2}$/.test(country)) {
    const code = country.toUpperCase();
    const offset = 127397;
    try {
      return String.fromCodePoint(
        code.charCodeAt(0) + offset,
        code.charCodeAt(1) + offset
      );
    } catch {
      return '🌍';
    }
  }

  // Мультистрана
  if (country.includes(',')) {
    return '🌍';
  }

  // Словарь названий
  const flags: Record<string, string> = {
    'andorra': '🇦🇩', 'united arab emirates': '🇦🇪', 'uae': '🇦🇪',
    'afghanistan': '🇦🇫', 'albania': '🇦🇱', 'armenia': '🇦🇲',
    'austria': '🇦🇹', 'australia': '🇦🇺', 'azerbaijan': '🇦🇿',
    'belgium': '🇧🇪', 'bulgaria': '🇧🇬', 'brazil': '🇧🇷',
    'canada': '🇨🇦', 'switzerland': '🇨🇭', 'china': '🇨🇳',
    'cyprus': '🇨🇾', 'czech republic': '🇨🇿', 'germany': '🇩🇪',
    'denmark': '🇩🇰', 'estonia': '🇪🇪', 'egypt': '🇪🇬',
    'spain': '🇪🇸', 'finland': '🇫🇮', 'france': '🇫🇷',
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'georgia': '🇬🇪',
    'greece': '🇬🇷', 'hong kong': '🇭🇰', 'croatia': '🇭🇷',
    'hungary': '🇭🇺', 'indonesia': '🇮🇩', 'ireland': '🇮🇪',
    'israel': '🇮🇱', 'india': '🇮🇳', 'italy': '🇮🇹',
    'japan': '🇯🇵', 'south korea': '🇰🇷', 'korea': '🇰🇷',
    'kazakhstan': '🇰🇿', 'sri lanka': '🇱🇰', 'lithuania': '🇱🇹',
    'luxembourg': '🇱🇺', 'latvia': '🇱🇻', 'morocco': '🇲🇦',
    'moldova': '🇲🇩', 'montenegro': '🇲🇪', 'mexico': '🇲🇽',
    'malaysia': '🇲🇾', 'netherlands': '🇳🇱', 'norway': '🇳🇴',
    'new zealand': '🇳🇿', 'philippines': '🇵🇭', 'pakistan': '🇵🇰',
    'poland': '🇵🇱', 'portugal': '🇵🇹', 'qatar': '🇶🇦',
    'romania': '🇷🇴', 'serbia': '🇷🇸', 'russia': '🇷🇺',
    'saudi arabia': '🇸🇦', 'sweden': '🇸🇪', 'singapore': '🇸🇬',
    'slovenia': '🇸🇮', 'slovakia': '🇸🇰', 'thailand': '🇹🇭',
    'turkey': '🇹🇷', 'taiwan': '🇹🇼', 'ukraine': '🇺🇦',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'vietnam': '🇻🇳',
    'south africa': '🇿🇦', 'europe': '🇪🇺', 'global': '🌍',
    'сша': '🇺🇸', 'турция': '🇹🇷', 'оаэ': '🇦🇪', 'таиланд': '🇹🇭',
    'япония': '🇯🇵', 'китай': '🇨🇳', 'россия': '🇷🇺', 'европа': '🇪🇺',
  };
  
  return flags[country.toLowerCase()] || '🌍';
};
