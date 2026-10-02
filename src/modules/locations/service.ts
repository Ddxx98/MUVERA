import mongoose from 'mongoose';
import { LocationModel, ILocation } from './model';

export interface LocationData {
  code: string;
  name: string;
  type: 'dark_store' | 'warehouse' | 'retail';
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  serviceablePincodes: string[];
  expressEnabled: boolean;
  active: boolean;
}

const defaultLocations: LocationData[] = [
  {
    code: 'loc_blr_ind_01',
    name: 'Indiranagar Quick-Glam Dark Store',
    type: 'dark_store',
    address: {
      street: '100ft Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
    serviceablePincodes: ['560038', '560008', '560075', '560001', '560025', '560047', '560034'],
    expressEnabled: true,
    active: true,
  },
  {
    code: 'loc_blr_kor_02',
    name: 'Koramangala 4th Block Hub',
    type: 'dark_store',
    address: {
      street: '80ft Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560034',
    },
    serviceablePincodes: ['560034', '560095', '560029', '560068', '560102'],
    expressEnabled: true,
    active: true,
  },
  {
    code: 'loc_blr_central_00',
    name: 'Bengaluru Central Fulfillment Center',
    type: 'warehouse',
    address: {
      street: 'Industrial Layout, Bommasandra',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560099',
    },
    serviceablePincodes: ['*'], // Serves all standard courier shipments
    expressEnabled: false,
    active: true,
  },
];

declare global {
  var _muveraLocations: LocationData[] | undefined;
}

if (!global._muveraLocations) {
  global._muveraLocations = [...defaultLocations];
}

function isDbConnected(): boolean {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

export const locationService = {
  async getLocations(): Promise<LocationData[]> {
    if (isDbConnected()) {
      try {
        const docs = await LocationModel.find({ active: true }).lean();
        if (docs.length > 0) return docs as any;
      } catch (err) {
        console.warn('Failed querying locations from Mongo:', err);
      }
    }
    return global._muveraLocations!.filter((l) => l.active);
  },

  async getLocationByCode(code: string): Promise<LocationData | undefined> {
    if (isDbConnected()) {
      try {
        const doc = await LocationModel.findOne({ code, active: true }).lean();
        if (doc) return doc as any;
      } catch (err) {
        console.warn('Failed querying location by code:', err);
      }
    }
    return global._muveraLocations!.find((l) => l.code === code && l.active);
  },

  /**
   * Resolves the optimal location for a given customer pincode.
   * If pincode is serviceable by a dark store, selects that dark store for 60-min express.
   * Otherwise falls back to Central Warehouse.
   */
  async resolveFulfillmentLocation(pincode: string): Promise<{
    location: LocationData;
    isExpressAvailable: boolean;
  }> {
    const locations = await this.getLocations();

    const matchedDarkStore = locations.find(
      (loc) =>
        loc.active &&
        loc.expressEnabled &&
        loc.type === 'dark_store' &&
        loc.serviceablePincodes.includes(pincode)
    );

    if (matchedDarkStore) {
      return { location: matchedDarkStore, isExpressAvailable: true };
    }

    const defaultWarehouse =
      locations.find((l) => l.code === 'loc_blr_central_00') || locations[0];

    return {
      location: defaultWarehouse,
      isExpressAvailable: false,
    };
  },
};
