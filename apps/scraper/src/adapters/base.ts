import type { NormalizedTender } from '../types/tender';

export type FetchResult = {
  tenders: NormalizedTender[];
};

export interface TenderAdapter {
  source: string;
  fetch(): Promise<FetchResult>;
}

