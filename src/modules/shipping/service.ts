import { ShippingProvider, CreateShipmentInput, ShipmentResult, TrackingUpdate } from './types';
import { ManualShippingProvider } from './providers/manual';

class ShippingService {
  private providers: Map<string, ShippingProvider> = new Map();

  constructor() {
    this.registerProvider(new ManualShippingProvider());
  }

  registerProvider(provider: ShippingProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(providerName = 'manual'): ShippingProvider {
    return this.providers.get(providerName) || this.providers.get('manual')!;
  }

  async createShipment(
    input: CreateShipmentInput,
    preferredProvider = 'manual'
  ): Promise<ShipmentResult> {
    const provider = this.getProvider(preferredProvider);
    return provider.createShipment(input);
  }

  async getTracking(
    trackingNumber: string,
    preferredProvider = 'manual'
  ): Promise<TrackingUpdate[]> {
    const provider = this.getProvider(preferredProvider);
    return provider.getTracking(trackingNumber);
  }
}

export const shippingService = new ShippingService();
