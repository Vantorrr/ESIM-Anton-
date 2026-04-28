import {
  buildAndroidIntent,
  buildAppleQuickInstall,
  buildEsimActivationLinks,
  buildLpaString,
  parseLpaString,
} from './esim-links';

describe('buildLpaString', () => {
  it('склеивает smdp и activation в LPA:1$smdp$ac', () => {
    expect(buildLpaString('rsp.truphone.com', 'ABC123')).toBe('LPA:1$rsp.truphone.com$ABC123');
  });

  it('опускает activation, но оставляет разделитель', () => {
    expect(buildLpaString('rsp.truphone.com', '')).toBe('LPA:1$rsp.truphone.com$');
    expect(buildLpaString('rsp.truphone.com', null)).toBe('LPA:1$rsp.truphone.com$');
  });

  it('возвращает null если нет smdp', () => {
    expect(buildLpaString('', 'ABC')).toBeNull();
    expect(buildLpaString(null, 'ABC')).toBeNull();
    expect(buildLpaString(undefined, undefined)).toBeNull();
    expect(buildLpaString('   ', 'ABC')).toBeNull();
  });

  it('тримит пробелы', () => {
    expect(buildLpaString(' rsp.truphone.com ', ' ABC ')).toBe('LPA:1$rsp.truphone.com$ABC');
  });
});

describe('buildAppleQuickInstall', () => {
  it('строит Apple Universal Link с URL-энкодом', () => {
    const lpa = 'LPA:1$rsp.truphone.com$ABC';
    expect(buildAppleQuickInstall(lpa)).toBe(
      'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24rsp.truphone.com%24ABC',
    );
  });

  it('null при пустой LPA', () => {
    expect(buildAppleQuickInstall(null)).toBeNull();
    expect(buildAppleQuickInstall('')).toBeNull();
  });
});

describe('buildAndroidIntent', () => {
  it('строит intent без префикса LPA:', () => {
    const intent = buildAndroidIntent('LPA:1$rsp.truphone.com$ABC');
    expect(intent).toContain('intent://');
    expect(intent).toContain('scheme=lpa');
    expect(intent).toContain('package=com.android.settings');
    expect(intent).toContain(encodeURIComponent('1$rsp.truphone.com$ABC'));
  });

  it('null при пустой LPA', () => {
    expect(buildAndroidIntent(null)).toBeNull();
  });
});

describe('buildEsimActivationLinks', () => {
  it('собирает все три ссылки разом', () => {
    const links = buildEsimActivationLinks('rsp.truphone.com', 'ABC');
    expect(links.lpa).toBe('LPA:1$rsp.truphone.com$ABC');
    expect(links.appleUniversalLink).toContain('esimsetup.apple.com');
    expect(links.androidIntent).toContain('intent://');
  });

  it('все три null если smdp пустой', () => {
    const links = buildEsimActivationLinks('', 'ABC');
    expect(links.lpa).toBeNull();
    expect(links.appleUniversalLink).toBeNull();
    expect(links.androidIntent).toBeNull();
  });
});

describe('parseLpaString', () => {
  it('парсит LPA:1$smdp$ac', () => {
    expect(parseLpaString('LPA:1$rsp.truphone.com$ABC')).toEqual({
      smdp: 'rsp.truphone.com',
      ac: 'ABC',
    });
  });

  it('парсит LPA без activation', () => {
    expect(parseLpaString('LPA:1$rsp.truphone.com$')).toEqual({
      smdp: 'rsp.truphone.com',
      ac: '',
    });
  });

  it('возвращает null для невалидной строки', () => {
    expect(parseLpaString('not-a-lpa')).toBeNull();
    expect(parseLpaString('')).toBeNull();
    expect(parseLpaString(null)).toBeNull();
  });
});
