export type EventTier = {
  id?: string;
  name: string;
  price: number;
  seats: number;
  note?: string;
};

export type NormalizedEventTier = {
  id: string;
  name: string;
  price: number;
  seats: number;
  note?: string;
};

export type TierSelection = {
  id: string;
  name: string;
  qty: number;
};

export type Tier = EventTier;
