// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Gericht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gericht_name?: string;
    beschreibung?: string;
    preis?: number;
    kategorie?: LookupValue;
  };
}

export const APP_IDS = {
  GERICHT: '69e8b527888384266c89ea2c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'gericht': {
    kategorie: [{ key: "hauptgericht", label: "Hauptgericht" }, { key: "beilage", label: "Beilage" }, { key: "vorspeise", label: "Vorspeise" }, { key: "dessert", label: "Dessert" }, { key: "getraenk", label: "Getränk" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'gericht': {
    'gericht_name': 'string/text',
    'beschreibung': 'string/textarea',
    'preis': 'number',
    'kategorie': 'lookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateGericht = StripLookup<Gericht['fields']>;