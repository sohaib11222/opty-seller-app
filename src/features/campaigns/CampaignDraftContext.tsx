import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type CampaignKind = 'banner' | 'discount';
export type CampaignDraft = { id?: number; name: string; description: string; scope: string; discount_type: string; discount_value: string; product_ids: number[]; category_ids: number[]; variants: { variant_type: string; variant_id: number }[]; starts_at: string; ends_at: string; launch_mode: 'run_now' | 'schedule'; minimum_order_amount: string; minimum_quantity: string; usage_limit: string; per_buyer_limit: string; priority: string; stacking: boolean; placement: string; destination_type: string; destination_id: string; destination_url: string; category_id: string; title: string; alt_text: string; cta_text: string; sort_order: string; is_active: boolean; desktop_image?: { uri: string; name?: string | null; mimeType?: string | null }; mobile_image?: { uri: string; name?: string | null; mimeType?: string | null } };
/** Keep editable campaign times in the device's local timezone until submission. */
const localDateTime = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
export const freshCampaignDraft = (): CampaignDraft => ({ name: '', description: '', scope: 'products', discount_type: 'percentage', discount_value: '10', product_ids: [], category_ids: [], variants: [], starts_at: localDateTime(), ends_at: localDateTime(new Date(Date.now() + 7 * 86400000)), launch_mode: 'run_now', minimum_order_amount: '', minimum_quantity: '1', usage_limit: '', per_buyer_limit: '', priority: '0', stacking: false, placement: 'homepage_hero', destination_type: 'product', destination_id: '', destination_url: '', category_id: '', title: '', alt_text: '', cta_text: 'Explore', sort_order: '0', is_active: true });
type State = { drafts: Record<CampaignKind, CampaignDraft>; replace: (kind: CampaignKind, value: CampaignDraft) => void; patch: (kind: CampaignKind, value: Partial<CampaignDraft>) => void; reset: (kind: CampaignKind) => void };
const Context = createContext<State>({ drafts: { banner: freshCampaignDraft(), discount: freshCampaignDraft() }, replace: () => undefined, patch: () => undefined, reset: () => undefined });
export function CampaignDraftProvider({ children }: { children: ReactNode }) { const [drafts, setDrafts] = useState<Record<CampaignKind, CampaignDraft>>({ banner: freshCampaignDraft(), discount: freshCampaignDraft() }); const value = useMemo<State>(() => ({ drafts, replace: (kind, value) => setDrafts((current) => ({ ...current, [kind]: value })), patch: (kind, value) => setDrafts((current) => ({ ...current, [kind]: { ...current[kind], ...value } })), reset: (kind) => setDrafts((current) => ({ ...current, [kind]: freshCampaignDraft() })) }), [drafts]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export const useCampaignDraft = () => useContext(Context);
