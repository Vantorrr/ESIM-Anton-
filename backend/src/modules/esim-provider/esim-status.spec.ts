import { EsimStatus, describeEsimStatus, mapEsimAccessStatus } from './esim-status';

describe('mapEsimAccessStatus', () => {
  it.each([
    ['NEW', EsimStatus.NOT_INSTALLED],
    ['GOT_RESOURCE', EsimStatus.NOT_INSTALLED],
    ['RELEASED', EsimStatus.NOT_INSTALLED],
    ['INSTALLATION', EsimStatus.NOT_INSTALLED],
    ['INSTALLED', EsimStatus.NOT_INSTALLED],
    ['USING', EsimStatus.ACTIVE],
    ['ENABLED', EsimStatus.ACTIVE],
    ['IN_USE', EsimStatus.ACTIVE],
    ['ACTIVE', EsimStatus.ACTIVE],
    ['EXPIRED', EsimStatus.EXPIRED],
    ['USED_UP', EsimStatus.USED_UP],
    ['EXHAUSTED', EsimStatus.USED_UP],
    ['REVOKED', EsimStatus.CANCELLED],
    ['CANCEL', EsimStatus.CANCELLED],
    ['CANCELLED', EsimStatus.CANCELLED],
    ['CANCELED', EsimStatus.CANCELLED],
  ])('маппит %s → %s', (raw, expected) => {
    expect(mapEsimAccessStatus(raw)).toBe(expected);
  });

  it('нечувствителен к регистру', () => {
    expect(mapEsimAccessStatus('using')).toBe(EsimStatus.ACTIVE);
    expect(mapEsimAccessStatus(' Expired ')).toBe(EsimStatus.EXPIRED);
  });

  it('null/undefined/пустая строка → UNKNOWN', () => {
    expect(mapEsimAccessStatus(null)).toBe(EsimStatus.UNKNOWN);
    expect(mapEsimAccessStatus(undefined)).toBe(EsimStatus.UNKNOWN);
    expect(mapEsimAccessStatus('')).toBe(EsimStatus.UNKNOWN);
    expect(mapEsimAccessStatus('   ')).toBe(EsimStatus.UNKNOWN);
  });

  it('незнакомый код → UNKNOWN', () => {
    expect(mapEsimAccessStatus('SOMETHING_NEW_FROM_PROVIDER')).toBe(EsimStatus.UNKNOWN);
  });

  it('число тоже валидно как input (приводится к строке)', () => {
    expect(mapEsimAccessStatus(0)).toBe(EsimStatus.UNKNOWN);
  });
});

describe('describeEsimStatus', () => {
  it('возвращает читабельное описание для каждого статуса', () => {
    expect(describeEsimStatus(EsimStatus.ACTIVE)).toBe('Активна');
    expect(describeEsimStatus(EsimStatus.NOT_INSTALLED)).toBe('Не активирована');
    expect(describeEsimStatus(EsimStatus.EXPIRED)).toBe('Истёк срок');
    expect(describeEsimStatus(EsimStatus.USED_UP)).toBe('Трафик исчерпан');
    expect(describeEsimStatus(EsimStatus.CANCELLED)).toBe('Отменена');
    expect(describeEsimStatus(EsimStatus.UNKNOWN)).toBe('Статус неизвестен');
  });
});
