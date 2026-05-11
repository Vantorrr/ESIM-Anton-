import {
  buildAndroidQuickInstall,
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
  it('строит Apple Universal Link с LPA в carddata', () => {
    const lpa = 'LPA:1$rsp.truphone.com$ABC';
    expect(buildAppleQuickInstall(lpa)).toBe(
      'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$rsp.truphone.com$ABC',
    );
  });

  it('null при пустой LPA', () => {
    expect(buildAppleQuickInstall(null)).toBeNull();
    expect(buildAppleQuickInstall('')).toBeNull();
  });
});

describe('buildAndroidQuickInstall', () => {
  it('строит Android Universal Link с LPA в carddata', () => {
    const link = buildAndroidQuickInstall('LPA:1$rsp.truphone.com$ABC');
    expect(link).toBe(
      'https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA:1$rsp.truphone.com$ABC',
    );
  });

  it('null при пустой LPA', () => {
    expect(buildAndroidQuickInstall(null)).toBeNull();
  });
});

describe('buildEsimActivationLinks', () => {
  it('собирает все три ссылки разом', () => {
    const links = buildEsimActivationLinks('rsp.truphone.com', 'ABC');
    expect(links.lpa).toBe('LPA:1$rsp.truphone.com$ABC');
    expect(links.appleUniversalLink).toContain('esimsetup.apple.com');
    expect(links.androidUniversalLink).toContain('esimsetup.android.com');
  });

  it('все три null если smdp пустой и ac не LPA', () => {
    const links = buildEsimActivationLinks('', 'ABC');
    expect(links.lpa).toBeNull();
    expect(links.appleUniversalLink).toBeNull();
    expect(links.androidUniversalLink).toBeNull();
  });

  it('использует activationCode как LPA если он уже в формате LPA', () => {
    const links = buildEsimActivationLinks('', 'LPA:1$rsp-eu.simlessly.com$8E6A01EC');
    expect(links.lpa).toBe('LPA:1$rsp-eu.simlessly.com$8E6A01EC');
    expect(links.appleUniversalLink).toContain('esimsetup.apple.com');
    expect(links.androidUniversalLink).toContain('esimsetup.android.com');
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
