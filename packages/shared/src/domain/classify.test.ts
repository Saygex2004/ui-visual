import { describe, it, expect } from 'vitest';
import {
  classifyListing,
  assignRealEstateCluster,
  assignCreditsCluster,
  assignBucket,
  isExcluded,
} from './classify.js';
import { REAL_ESTATE_CLUSTERS, RECOGNIZED_REGIONS } from '../constants/clusters.js';
import { EXCLUSION_CODES } from '../constants/exclusions.js';

describe('area/cluster assignment (DOMAIN_RULES §2–§3)', () => {
  it('each recognized region maps to its declared cluster', () => {
    for (const cluster of REAL_ESTATE_CLUSTERS) {
      for (const region of cluster.regions) {
        expect(assignRealEstateCluster(region)).toBe(cluster.key);
      }
    }
  });

  it('all 20 regions are recognized (4 geolocated clusters)', () => {
    expect(RECOGNIZED_REGIONS).toHaveLength(20);
    expect(new Set(RECOGNIZED_REGIONS).size).toBe(20); // no duplicates
  });

  it('null region → Black Zone', () => {
    expect(assignRealEstateCluster(null)).toBe('black');
    expect(classifyListing({ scope: 'immobili', regione: null }).clusterKey).toBe('black');
  });

  it('unrecognized region spelling → Black Zone (defensive default)', () => {
    expect(assignRealEstateCluster('Padania')).toBe('black');
    expect(assignRealEstateCluster('lombardia')).toBe('black'); // case-sensitive by contract
  });

  it('corporate routing by cod_tipo_categ_lotto, incl. defensive default', () => {
    expect(assignCreditsCluster('CREDITI')).toBe('crediti');
    expect(assignCreditsCluster('QUOTA_SOCIETARIA')).toBe('partecipazioni');
    expect(assignCreditsCluster(null)).toBe('crediti'); // default
    expect(assignCreditsCluster('SOMETHING_NEW')).toBe('crediti'); // default
  });

  it('area is the scope, cluster metadata is attached', () => {
    const re = classifyListing({ scope: 'immobili', regione: 'Lombardia' });
    expect(re.area).toBe('immobili');
    expect(re.clusterKey).toBe('blue_chip');
    expect(re.clusterNumber).toBe(2);
    const cr = classifyListing({ scope: 'corporate', cod_tipo_categ_lotto: 'QUOTA_SOCIETARIA' });
    expect(cr.area).toBe('corporate');
    expect(cr.clusterNumber).toBe(2);
  });
});

describe('bucket split (DOMAIN_RULES §4)', () => {
  it('FALL / NFAL → Fallimenti', () => {
    expect(assignBucket('FALL')).toBe('fallimenti');
    expect(assignBucket('NFAL')).toBe('fallimenti');
  });

  it('null / other → Principali', () => {
    expect(assignBucket(null)).toBe('principali');
    expect(assignBucket('LG')).toBe('principali');
    expect(assignBucket('COPR')).toBe('principali');
  });

  it('applies to both areas', () => {
    expect(classifyListing({ scope: 'corporate', cod_tipo_rito: 'FALL' }).bucket).toBe(
      'fallimenti',
    );
  });
});

describe('exclusions (DOMAIN_RULES §5)', () => {
  it('every code of the exclusion set is excluded (real estate)', () => {
    for (const { code } of EXCLUSION_CODES) {
      expect(isExcluded('immobili', code)).toBe(true);
      expect(
        classifyListing({ scope: 'immobili', regione: 'Lazio', cod_tipo_rito: code }).excluded,
      ).toBe(true);
    }
  });

  it('null / unrecognized rito is never excluded (fail-open)', () => {
    expect(isExcluded('immobili', null)).toBe(false);
    expect(isExcluded('immobili', 'LG')).toBe(false);
    expect(isExcluded('immobili', 'TOTALLY_NEW_CODE')).toBe(false);
  });

  it('corporate is never evaluated (even with an exclusion code)', () => {
    expect(isExcluded('corporate', 'ESIM')).toBe(false);
    expect(classifyListing({ scope: 'corporate', cod_tipo_rito: 'ESIM' }).excluded).toBe(false);
  });
});
