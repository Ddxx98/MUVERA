import { locationService, LocationData } from '@/modules/locations';
import { inventoryService } from './service';

export interface AllocationItem {
  variantId: string;
  sku: string;
  quantity: number;
}

export interface AllocationPlan {
  location: LocationData;
  canFulfillExpress: boolean;
  allocations: Array<{
    variantId: string;
    sku: string;
    quantity: number;
    availableStock: number;
  }>;
}

export const allocationService = {
  /**
   * Plans stock allocation for a basket of items against customer destination pincode.
   */
  async planAllocation(
    items: AllocationItem[],
    pincode: string
  ): Promise<AllocationPlan> {
    const { location, isExpressAvailable } =
      await locationService.resolveFulfillmentLocation(pincode);

    const allocations = await Promise.all(
      items.map(async (item) => {
        const stock = await inventoryService.getLiveStock(item.variantId, location.code);
        return {
          variantId: item.variantId,
          sku: item.sku,
          quantity: item.quantity,
          availableStock: stock.available,
        };
      })
    );

    const allInStockAtLocation = allocations.every((a) => a.availableStock >= a.quantity);

    return {
      location,
      canFulfillExpress: isExpressAvailable && allInStockAtLocation,
      allocations,
    };
  },
};
