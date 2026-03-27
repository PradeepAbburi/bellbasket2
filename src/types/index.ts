export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  inStock: boolean;
  vendorId?: string;
  discount?: string;
  discountedPrice?: number;
  quantity?: string;
  availability?: {
    startTime: string;
    endTime: string;
    days: number[];
  };
}

export interface StoreReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
  isAnonymous?: boolean;
}

export type PlanTier = 'none' | 'basic' | 'growth' | 'pro';

export interface Store {
  id: string;
  name: string;
  description: string;
  image: string;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  rating: number;
  category: string;
  products: Product[];
  vendorId: string;
  reviews?: StoreReview[];
  gstin?: string;
  plan?: PlanTier;
  timings?: { open: string; close: string };
  useWatermark?: boolean;
  promoBanner?: string;
  logo?: string;
  brandText?: string;
  showDiscountedPrice?: boolean;
  phone?: string;
  offersDelivery?: boolean;
  deliveryFee?: number;
  slug?: string;
  storeType?: 'product' | 'service';
  isBlocked?: boolean;
  availableTimeSlots?: string[];
}

// ... rest of the interfaces

export interface CartItem {
  product: Product;
  storeId: string;
  storeName: string;
  storePhone?: string;
  quantity: number;
}


export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'accepted' | 'packed' | 'ready' | 'completed' | 'rejected';
  paymentMethod: 'online' | 'pickup' | 'delivery';
  deliveryMethod?: 'pickup' | 'delivery';
  deliveryFee?: number;
  date: string;
  pickupCode?: string;
  rejectedAt?: string;
  review?: {
    rating: number;
    text: string;
    submittedAt: string;
    isAnonymous?: boolean;
    reply?: string;
  };
  userId?: string;
  userName?: string;
  userPhone?: string;
  storePhone?: string;
  deletedByUser?: boolean;
  deletedByVendor?: boolean;
}

export interface ServiceBooking {
  id: string;
  storeId: string;
  storeName: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  location: string;
  description: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  pickupCode?: string;
  createdAt: string;
  vendorId: string;
  userId?: string;
  storePhone?: string;
  storeImage?: string;
  review?: {
    rating: number;
    text: string;
    submittedAt: string;
    isAnonymous?: boolean;
    reply?: string;
  };
  deletedByUser?: boolean;
  deletedByVendor?: boolean;
}



export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin' | 'hr';
  isVerified?: boolean;
  phone?: string;
  hasSetupStore?: boolean;
  lat?: number;
  lng?: number;
  plan?: PlanTier;
  subscriptionExpiry?: string;
  isBlocked?: boolean;
  fcmToken?: string;
  fcmTokens?: string[];
  referralCode?: string;
  language?: string;
  hasCompletedOnboarding?: boolean;
  activeSessionId?: string;
  storeBanner?: string;
  address?: string;
  autoPay?: boolean;
  autoPayFailed?: boolean;
}

export interface Staff {
  id: string;
  agentName: string;
  referralId: string;
  loginId?: string;
  password?: string;
  email?: string;
  phone?: string;
  department?: 'Sales' | 'Marketing' | 'HR' | 'CXO Level' | 'Operations' | 'Finance' | 'IT Support';
  role?: string;
  image?: string;
  address?: string;
  aadharNumber?: string;
  officeLocation?: string;
  isActive?: boolean;
  commissionRate?: number;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
  };
  payments?: {
    amount: number;
    date: any;
    month?: string;
    year?: string;
    status: string;
    transactionRef?: string;
  }[];
  education?: {
    degree: string;
    college: string;
    branch: string;
    startYear: string;
    endYear: string;
  };
  experience?: {
    companyName: string;
    role: string;
    startYear: string;
    endYear: string;
  };
  totalPastExperience?: number;
  resume?: string;
  totalEarnings?: number;
  totalVendors?: number;
  createdAt?: any;
}

export interface Coupon {
  id: string;
  code: string;
  plan: PlanTier;
  months: number;
  isUsed: boolean;
  usedBy?: string;
  usedByList?: string[];
  usageType: 'single' | 'multiple';
  redemptionCount: number;
  usedAt?: string;
  createdAt: string;
}
