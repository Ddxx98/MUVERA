export type SizeOption = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface Variant {
  id: string;
  sku: string;
  size: SizeOption;
  color: string;
  colorHex: string;
  pricePaise: number;
  mrpPaise: number;
}

export interface ProductImage {
  url: string;
  alt: string;
  order: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  description: string;
  fabricDetails?: string;
  mrpPaise: number;
  sellingPricePaise: number;
  discountPercentage: number;
  images: ProductImage[];
  variants: Variant[];
  isBlitzDrop?: boolean;
  isDealOfTheHour?: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: string;
}

export interface InventoryItem {
  variantId: string;
  locationId: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  updatedAt: string;
  productTitle?: string;
  productSlug?: string;
  brand?: string;
  image?: string;
  size?: string;
  color?: string;
}

export interface StockMovement {
  id: string;
  variantId: string;
  sku: string;
  locationId: string;
  type: 'sale' | 'reservation' | 'release' | 'receiving' | 'damage' | 'correction' | 'return_restock';
  quantityDelta: number;
  previousOnHand: number;
  newOnHand: number;
  referenceId: string;
  reason?: string;
  actor: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  status: 'active' | 'committed' | 'released';
  expiresAt: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  brand: string;
  size: SizeOption;
  color: string;
  image: string;
  sellingPricePaise: number;
  mrpPaise: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  apartment?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export type PaymentPreference = 'upi_whatsapp' | 'cod_whatsapp' | 'online_gateway' | 'razorpay' | 'cod';
export type PaymentStatus = 'pending_whatsapp' | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfilmentStatus =
  | 'unfulfilled'
  | 'allocated'
  | 'picking'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled';
export type OrderStatus = 'open' | 'processing' | 'completed' | 'cancelled';

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  brand: string;
  size: SizeOption;
  color: string;
  quantity: number;
  sellingPricePaise: number;
  mrpPaise: number;
  image: string;
}

export interface OrderEvent {
  id: string;
  status: string;
  description: string;
  actor: string;
  createdAt: string;
}

export interface OrderSnapshot {
  id: string;
  orderNo: string;
  invoiceNo?: string;
  trackingNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddress;
  deliveryMethod: 'express_60' | 'standard';
  paymentPreference: PaymentPreference;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  orderStatus: OrderStatus;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  couponCode?: string;
  timeline: OrderEvent[];
  assignedRider?: {
    name: string;
    phone: string;
    vehicleNo: string;
    etaMinutes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  value: number; // e.g. 10 for 10%, or 20000 for ₹200 flat
  minOrderValuePaise: number;
  maxDiscountPaise?: number;
  expiresAt: string;
  usageCount: number;
  active: boolean;
}

export interface ReturnRequest {
  id: string;
  returnNo: string;
  orderId: string;
  orderNo: string;
  customerPhone: string;
  items: Array<{
    variantId: string;
    productName: string;
    size: SizeOption;
    quantity: number;
    reason: string;
    condition?: 'unopened' | 'opened_tags_intact' | 'damaged';
    inspectionDecision?: 'restock' | 'damaged_write_off';
  }>;
  resolutionPreference: 'upi_refund' | 'bank_transfer' | 'store_credit';
  status: 'requested' | 'approved' | 'in_transit' | 'received' | 'inspected' | 'closed' | 'rejected';
  refundAmountPaise: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  count?: number;
  order?: number;
  createdAt?: string;
}
