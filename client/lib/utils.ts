export const formatPrice = (price: number): string => {
  if (price === undefined || price === null) return '0';
  // Heuristic: prices > 5000 are likely in cents (e.g. 16800 -> 168)
  if (price > 5000) {
    return Math.round(price / 100).toString();
  }
  return price.toString();
};

export const formatDataAmount = (amount: string): string => {
  if (!amount) return '';
  
  // Fix for backend bug displaying KB/MB as GB
  if (amount.includes('GB')) {
    const val = parseFloat(amount);
    
    // Case 1: 20971520 GB (raw KB) -> 20 GB (20971520 KB / 1024 / 1024)
    if (val > 1000000) {
       const gb = Math.round(val / 1024 / 1024);
       return `${gb} GB`;
    }
    
    // Case 2: 500 GB (500 MB displayed as GB) -> 500 MB
    if (val >= 100 && val < 1000) {
       return `${val} MB`; 
    }
  }
  return amount;
};

export const getCountryEmoji = (country: string): string => {
  if (!country) return '🌍';
  
  // ISO code (2 letters)
  if (/^[A-Za-z]{2}$/.test(country)) {
    const code = country.toUpperCase();
    const offset = 127397;
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    );
  }

  // Multi-country
  if (country.includes(',')) {
    return '🌍';
  }

  const countryLower = country.toLowerCase();
  const flags: Record<string, string> = {
    'andorra': '🇦🇩', 'united arab emirates': '🇦🇪', 'afghanistan': '🇦🇫', 
    'antigua and barbuda': '🇦🇬', 'anguilla': '🇦🇮', 'albania': '🇦🇱', 
    'armenia': '🇦🇲', 'austria': '🇦🇹', 'australia': '🇦🇺', 
    'azerbaijan': '🇦🇿', 'bosnia and herzegovina': '🇧🇦', 'barbados': '🇧🇧', 
    'bangladesh': '🇧🇩', 'belgium': '🇧🇪', 'bulgaria': '🇧🇬', 'bahrain': '🇧🇭', 
    'brazil': '🇧🇷', 'belarus': '🇧🇾', 'canada': '🇨🇦', 'switzerland': '🇨🇭', 
    'china': '🇨🇳', 'colombia': '🇨🇴', 'cyprus': '🇨🇾', 'czech republic': '🇨🇿', 
    'germany': '🇩🇪', 'denmark': '🇩🇰', 'estonia': '🇪🇪', 'egypt': '🇪🇬', 
    'spain': '🇪🇸', 'finland': '🇫🇮', 'france': '🇫🇷', 'united kingdom': '🇬🇧', 
    'georgia': '🇬🇪', 'greece': '🇬🇷', 'hong kong': '🇭🇰', 'croatia': '🇭🇷', 
    'hungary': '🇭🇺', 'indonesia': '🇮🇩', 'ireland': '🇮🇪', 'israel': '🇮🇱', 
    'india': '🇮🇳', 'iraq': '🇮🇶', 'iran': '🇮🇷', 'iceland': '🇮🇸', 'italy': '🇮🇹', 
    'japan': '🇯🇵', 'kenya': '🇰🇪', 'kyrgyzstan': '🇰🇬', 'south korea': '🇰🇷', 
    'kazakhstan': '🇰🇿', 'sri lanka': '🇱🇰', 'lithuania': '🇱🇹', 'luxembourg': '🇱🇺', 
    'latvia': '🇱🇻', 'morocco': '🇲🇦', 'moldova': '🇲🇩', 'montenegro': '🇲🇪', 
    'malta': '🇲🇹', 'maldives': '🇲🇻', 'mexico': '🇲🇽', 'malaysia': '🇲🇾', 
    'netherlands': '🇳🇱', 'norway': '🇳🇴', 'new zealand': '🇳🇿', 'philippines': '🇵🇭', 
    'pakistan': '🇵🇰', 'poland': '🇵🇱', 'portugal': '🇵🇹', 'qatar': '🇶🇦', 
    'romania': '🇷🇴', 'serbia': '🇷🇸', 'russia': '🇷🇺', 'russian federation': '🇷🇺', 
    'saudi arabia': '🇸🇦', 'sweden': '🇸🇪', 'singapore': '🇸🇬', 'slovenia': '🇸🇮', 
    'slovakia': '🇸🇰', 'thailand': '🇹🇭', 'tajikistan': '🇹🇯', 'tunisia': '🇹🇳', 
    'turkey': '🇹🇷', 'taiwan': '🇹🇼', 'ukraine': '🇺🇦', 'united states': '🇺🇸', 
    'usa': '🇺🇸', 'uzbekistan': '🇺🇿', 'vietnam': '🇻🇳', 'viet nam': '🇻🇳', 
    'south africa': '🇿🇦'
  };
  
  return flags[countryLower] || '🌍';
};
