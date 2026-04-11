export type OwnerCustomerSheetRegistryEntry = {
  key: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  label: string;
};

export const OWNER_CUSTOMER_SHEET_REGISTRY: OwnerCustomerSheetRegistryEntry[] = [
  {
    key: "customer_1",
    spreadsheetId: "1m_zY6_6IipNx7TeHFy4zBG6X9fHfeua-4yO8FlW3w9Q",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1m_zY6_6IipNx7TeHFy4zBG6X9fHfeua-4yO8FlW3w9Q/edit?usp=sharing",
    label: "Customer 1",
  },
  {
    key: "customer_2",
    spreadsheetId: "1AvHOgmC84ULFSxYmcUE1N0b-Mxa0FVKT1gV93mdVFB8",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1AvHOgmC84ULFSxYmcUE1N0b-Mxa0FVKT1gV93mdVFB8/edit?usp=sharing",
    label: "Customer 2",
  },
  {
    key: "customer_3",
    spreadsheetId: "1o4y23OmFgQYjh82hIJ86Da0JpBaFiqN_kjTde4ACSaM",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1o4y23OmFgQYjh82hIJ86Da0JpBaFiqN_kjTde4ACSaM/edit?usp=sharing",
    label: "Customer 3",
  },
  {
    key: "customer_4",
    spreadsheetId: "19NMDm65URBdyhGKtSlL50sQB_c0GLXQCPTHPzOIG3Xk",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/19NMDm65URBdyhGKtSlL50sQB_c0GLXQCPTHPzOIG3Xk/edit?usp=sharing",
    label: "Customer 4",
  },
  {
    key: "customer_5",
    spreadsheetId: "1LqJrSeQlNF8P-gfhFQNxaCMSZ-D-F_sZjfed1VXBzRc",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1LqJrSeQlNF8P-gfhFQNxaCMSZ-D-F_sZjfed1VXBzRc/edit?usp=sharing",
    label: "Customer 5",
  },
  {
    key: "customer_6",
    spreadsheetId: "1tHraH6FMuAq7C3hyCyEAlCHFEVP2LwB-Zbd5CK3k71M",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1tHraH6FMuAq7C3hyCyEAlCHFEVP2LwB-Zbd5CK3k71M/edit?usp=sharing",
    label: "Customer 6",
  },
  {
    key: "customer_7",
    spreadsheetId: "1rT5oavSFp0U0FepzSHCw-F9R48swPbd8QJ89lFwhQLs",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1rT5oavSFp0U0FepzSHCw-F9R48swPbd8QJ89lFwhQLs/edit?usp=sharing",
    label: "Customer 7",
  },
  {
    key: "customer_8",
    spreadsheetId: "1thB2Aib9y6-mLS3AZimfjMw1z5XrjIATn7CFuvXcPVA",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1thB2Aib9y6-mLS3AZimfjMw1z5XrjIATn7CFuvXcPVA/edit?usp=sharing",
    label: "Customer 8",
  },
  {
    key: "customer_9",
    spreadsheetId: "16srKWsZzk1vZt9DlOPtFmPULdsnsB3X9NQf-o92vLDM",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/16srKWsZzk1vZt9DlOPtFmPULdsnsB3X9NQf-o92vLDM/edit?usp=sharing",
    label: "Customer 9",
  },
  {
    key: "customer_10",
    spreadsheetId: "15ZP_Kbq_yw7R9ym8UcveKghlVCH0GwNkc-Hx5Avwgeo",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/15ZP_Kbq_yw7R9ym8UcveKghlVCH0GwNkc-Hx5Avwgeo/edit?usp=sharing",
    label: "Customer 10",
  },
];

export function getOwnerCustomerSheetByIndex(index: number) {
  return OWNER_CUSTOMER_SHEET_REGISTRY[index] ?? null;
}