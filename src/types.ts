export type PostalAddress = {
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  prefectureKana?: string;
  cityKana?: string;
  townKana?: string;
};

export type PostalCodePrefixData = Record<string, PostalAddress[]>;
