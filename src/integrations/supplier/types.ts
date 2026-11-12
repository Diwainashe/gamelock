export interface CatalogItem { skuId: string; name: string; faceZar: number; supplierPkg: string }
export type PurchaseState =
  | { state: 'pending' }
  | { state: 'delivered'; code: string; pin?: string }
  | { state: 'failed'; reason: string };

/** Narrow interface so the supplier can change without touching order logic. */
export interface Supplier {
  syncCatalog(): Promise<CatalogItem[]>;
  createPurchase(ref: string, item: { supplierPkg: string }): Promise<{ supplierRef: string }>; // no money moves
  payPurchase(supplierRef: string): Promise<void>;                                                // money moves
  getPurchase(supplierRef: string): Promise<PurchaseState>;
}
