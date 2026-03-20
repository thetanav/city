export type Tier = {
  name: string;
  price: number;
  seats: number;
};

export type NormalizedEventTier = Tier & {
  id: string;
  note?: string;
};

export type TierSelection = {
  id: string;
  name: string;
  qty: number;
};
