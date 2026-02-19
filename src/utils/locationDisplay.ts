interface LocationContextInstance {
  warehouse_name?: string;
  zp_name?: string;
  name?: string;
  [key: string]: any;
}

interface ManageHistory {
  location?: string;
  location_context_instance?: LocationContextInstance | null;
  [key: string]: any;
}

export const getLocationDisplay = (history: ManageHistory | null | undefined): string => {
  if (!history) return '-';

  const location = history.location || '';
  const contextInstance = history.location_context_instance;

  if (contextInstance) {
    const name =
      contextInstance.warehouse_name ||
      contextInstance.zp_name ||
      contextInstance.name ||
      '';
    return name ? `${location} (${name})` : location;
  }
  return location;
};
