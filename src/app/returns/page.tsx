'use client';

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  RotateCcw,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldCheck,
  Search,
  Filter,
  DollarSign,
  Package,
  Eye,
  AlertTriangle,
  ChevronRight,
  Calendar,
  MapPin,
  Phone,
  User,
  Copy,
  Check,
  FileText,
  Printer,
  ExternalLink,
  RefreshCw,
  Info,
  BadgeAlert,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCheck,
  X,
  CreditCard,
  Building,
  Maximize2,
} from 'lucide-react';
import {
  useGetStoreRequestQuery,
  useGetReturnsQuery,
  useGetReturnDetailsQuery,
  useUpdateReturnItemStatusMutation,
  useUpdateReturnStatusMutation,
} from '@/store/api/vendorApi';

export type ReturnType = 'RETURN' | 'EXCHANGE';

export type ReturnStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'INSPECTED'
  | 'REFUND_COMPLETED'
  | 'EXCHANGE_DISPATCHED'
  | 'COMPLETED'
  | 'REJECTED';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: ReturnStatus;
  actor: 'CUSTOMER' | 'VENDOR' | 'LOGISTICS' | 'SYSTEM';
}

export interface ReturnRequest {
  id: string;
  returnId?: string;
  itemId?: string;
  returnNumber: string;
  orderId: string;
  orderDate: string;
  requestDate: string;
  type: ReturnType;
  status: ReturnStatus;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    pincode: string;
  };
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    image: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    unit: string;
  };
  orderInfo?: {
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    deliveryFee: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    createdAt?: string;
  };
  exchangeDetails?: {
    requestedItemName: string;
    requestedVariant: string;
    exchangeReason: string;
    replacementTrackingNumber?: string;
    replacementCourier?: string;
  };
  reason: {
    title: string;
    category: string;
    customerNotes: string;
    images: string[];
  };
  refund: {
    amount: number;
    mode: 'ORIGINAL_PAYMENT' | 'STORE_WALLET' | 'UPI';
    status: 'PENDING' | 'INITIATED' | 'COMPLETED' | 'CANCELLED';
    transactionId?: string;
    refundedAt?: string;
    deductionAmount?: number;
    deductionReason?: string;
  };
  pickup?: {
    partner: string;
    trackingNumber: string;
    scheduledDate: string;
    timeSlot: string;
    status: 'SCHEDULED' | 'PICKED' | 'DELIVERED_TO_HUB';
  };
  review?: {
    rejectionReason?: string;
    vendorRemarks?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    inspectionNotes?: string;
  };
  timeline: TimelineEvent[];
}

const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-1',
    returnNumber: 'RET-2026-9041',
    orderId: 'ORD-89421',
    orderDate: '19 Oct 2026, 02:30 PM',
    requestDate: '21 Oct 2026, 09:15 AM',
    type: 'RETURN',
    status: 'PENDING_APPROVAL',
    customer: {
      name: 'Rahul Sharma',
      phone: '+91 98201 54321',
      email: 'rahul.sharma@example.com',
      address: 'Flat 402, Sunshine Heights, Andheri West',
      city: 'Mumbai',
      pincode: '400058',
    },
    product: {
      id: 'p-101',
      name: 'Fortune Sunlite Refined Sunflower Oil',
      sku: 'SKU-OIL-1029',
      category: 'Oils & Ghee',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60',
      unitPrice: 165,
      quantity: 2,
      totalPrice: 330,
      unit: '1 L Pouch',
    },
    reason: {
      title: 'Packaging Leaking & Damaged',
      category: 'Damaged / Leaking',
      customerNotes: 'One of the pouches was punctured and leaked inside the paper delivery bag. Oil spoiled other items in the parcel. Need full refund.',
      images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 330,
      mode: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested by Customer',
        description: 'Customer selected reason: Packaging Leaking & Damaged with 2 photo proofs.',
        timestamp: '21 Oct 2026, 09:15 AM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Under Vendor Review',
        description: 'Request assigned to vendor for verification and pickup approval.',
        timestamp: '21 Oct 2026, 09:16 AM',
        status: 'PENDING_APPROVAL',
        actor: 'SYSTEM',
      },
    ],
  },
  {
    id: 'ret-2',
    returnNumber: 'EXC-2026-9042',
    orderId: 'ORD-89350',
    orderDate: '18 Oct 2026, 06:10 PM',
    requestDate: '20 Oct 2026, 08:40 PM',
    type: 'EXCHANGE',
    status: 'PENDING_APPROVAL',
    customer: {
      name: 'Priya Patel',
      phone: '+91 97123 45678',
      email: 'priya.patel@gmail.com',
      address: 'B-12, Green Acres Society, Satellite',
      city: 'Ahmedabad',
      pincode: '380015',
    },
    product: {
      id: 'p-102',
      name: 'Organic India Classic Tulsi Green Tea',
      sku: 'SKU-TEA-3301',
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
      unitPrice: 245,
      quantity: 1,
      totalPrice: 245,
      unit: 'Pack of 25 Tea Bags',
    },
    exchangeDetails: {
      requestedItemName: 'Organic India Lemon Ginger Tulsi Green Tea',
      requestedVariant: '25 Tea Bags (Lemon Ginger)',
      exchangeReason: 'Wrong variant received in delivery bag. I ordered Lemon Ginger flavor.',
    },
    reason: {
      title: 'Wrong Flavor Delivered',
      category: 'Wrong Item / Variant',
      customerNotes: 'I had selected Lemon Ginger flavor, but delivery guy handed Classic Green Tea. Box is intact and unopened.',
      images: [
        'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 0,
      mode: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Exchange Requested by Customer',
        description: 'Customer requested replacement for flavor variant.',
        timestamp: '20 Oct 2026, 08:40 PM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
    ],
  },
  {
    id: 'ret-3',
    returnNumber: 'RET-2026-9038',
    orderId: 'ORD-89104',
    orderDate: '17 Oct 2026, 11:20 AM',
    requestDate: '19 Oct 2026, 04:30 PM',
    type: 'RETURN',
    status: 'APPROVED',
    customer: {
      name: 'Vikram Malhotra',
      phone: '+91 99887 76655',
      email: 'vikram.m@outlook.com',
      address: 'Tower 3, Apt 1104, Cyber City',
      city: 'Gurugram',
      pincode: '122002',
    },
    product: {
      id: 'p-103',
      name: 'Aashirvaad Shudh Chakki Whole Wheat Atta',
      sku: 'SKU-ATTA-1005',
      category: 'Atta & Flours',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60',
      unitPrice: 460,
      quantity: 1,
      totalPrice: 460,
      unit: '10 kg Bag',
    },
    reason: {
      title: 'Torn Bag Corner & Moisture Damage',
      category: 'Damaged / Leaking',
      customerNotes: 'The bottom seam was torn and flour spilled across the floor.',
      images: [
        'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 460,
      mode: 'UPI',
      status: 'PENDING',
    },
    pickup: {
      partner: 'Zippy Express Logistics',
      trackingNumber: 'ZP-PKUP-984210',
      scheduledDate: '22 Oct 2026',
      timeSlot: '10:00 AM - 01:00 PM',
      status: 'SCHEDULED',
    },
    review: {
      vendorRemarks: 'Return approved after verifying bag seam tear. Pickup scheduled for tomorrow morning.',
      reviewedAt: '20 Oct 2026, 10:15 AM',
      reviewedBy: 'Store Manager',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested',
        description: 'Customer requested return due to torn seam.',
        timestamp: '19 Oct 2026, 04:30 PM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Approved by Vendor',
        description: 'Vendor approved return and generated pickup slip.',
        timestamp: '20 Oct 2026, 10:15 AM',
        status: 'APPROVED',
        actor: 'VENDOR',
      },
      {
        id: 'tl-3',
        title: 'Logistics Assigned',
        description: 'Zippy Express Rider assigned (Tracking: ZP-PKUP-984210).',
        timestamp: '20 Oct 2026, 11:00 AM',
        status: 'PICKUP_SCHEDULED',
        actor: 'LOGISTICS',
      },
    ],
  },
  {
    id: 'ret-4',
    returnNumber: 'RET-2026-9035',
    orderId: 'ORD-88992',
    orderDate: '16 Oct 2026, 03:00 PM',
    requestDate: '18 Oct 2026, 01:10 PM',
    type: 'RETURN',
    status: 'PICKED_UP',
    customer: {
      name: 'Ananya Roy',
      phone: '+91 98301 22334',
      email: 'ananya.roy@yahoo.in',
      address: '45 Lake Gardens, Near Metro',
      city: 'Kolkata',
      pincode: '700045',
    },
    product: {
      id: 'p-104',
      name: 'Cadbury Dairy Milk Silk Roasted Almond',
      sku: 'SKU-CHOC-4021',
      category: 'Snacks & Chocolates',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=60',
      unitPrice: 175,
      quantity: 3,
      totalPrice: 525,
      unit: '143 g Bar',
    },
    reason: {
      title: 'Completely Melted During Transit',
      category: 'Damaged / Leaking',
      customerNotes: 'Chocolates reached completely melted and warped due to hot delivery bag.',
      images: [
        'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 525,
      mode: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
    },
    pickup: {
      partner: 'Shadowfax Express',
      trackingNumber: 'SF-RET-448102',
      scheduledDate: '20 Oct 2026',
      timeSlot: '02:00 PM - 05:00 PM',
      status: 'PICKED',
    },
    review: {
      vendorRemarks: 'Pickup completed by courier. Item is heading to vendor fulfillment hub.',
      reviewedAt: '18 Oct 2026, 03:00 PM',
      reviewedBy: 'Support Team',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested',
        description: 'Customer submitted melt damage claim.',
        timestamp: '18 Oct 2026, 01:10 PM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Return Approved',
        description: 'Vendor authorized immediate courier pickup.',
        timestamp: '18 Oct 2026, 03:00 PM',
        status: 'APPROVED',
        actor: 'VENDOR',
      },
      {
        id: 'tl-3',
        title: 'Courier Picked Up Item',
        description: 'Item received from customer by Shadowfax rider. En route to hub.',
        timestamp: '20 Oct 2026, 04:15 PM',
        status: 'PICKED_UP',
        actor: 'LOGISTICS',
      },
    ],
  },
  {
    id: 'ret-5',
    returnNumber: 'RET-2026-9031',
    orderId: 'ORD-88510',
    orderDate: '15 Oct 2026, 09:30 AM',
    requestDate: '17 Oct 2026, 11:00 AM',
    type: 'RETURN',
    status: 'INSPECTED',
    customer: {
      name: 'Deepak Verma',
      phone: '+91 98450 11223',
      email: 'deepak.verma@gmail.com',
      address: 'Villa 18, Palm Meadows, Whitefield',
      city: 'Bengaluru',
      pincode: '560066',
    },
    product: {
      id: 'p-105',
      name: 'Amul Salted Butter Block 500g',
      sku: 'SKU-DAIRY-5002',
      category: 'Dairy & Eggs',
      image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=60',
      unitPrice: 285,
      quantity: 1,
      totalPrice: 285,
      unit: '500 g Carton',
    },
    reason: {
      title: 'Near Expiry & Sour Smell',
      category: 'Expired / Quality Issue',
      customerNotes: 'Manufacturing date was 3 months old, butter smelled sour upon unpacking.',
      images: [
        'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 285,
      mode: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
    },
    pickup: {
      partner: 'Zippy Express Rider',
      trackingNumber: 'ZP-PKUP-772910',
      scheduledDate: '18 Oct 2026',
      timeSlot: '11:00 AM - 02:00 PM',
      status: 'DELIVERED_TO_HUB',
    },
    review: {
      vendorRemarks: 'Physical item received at store. Quality checked by QA: Lot batch confirmed spoiled. Ready for instant refund release.',
      reviewedAt: '17 Oct 2026, 01:00 PM',
      reviewedBy: 'Store QA Lead',
      inspectionNotes: 'Butter carton inspected. Batch #AM-991 verified defective. Full refund authorized.',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested',
        description: 'Customer logged quality defect issue.',
        timestamp: '17 Oct 2026, 11:00 AM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Approved for Store Inspection',
        description: 'Vendor approved pickup.',
        timestamp: '17 Oct 2026, 01:00 PM',
        status: 'APPROVED',
        actor: 'VENDOR',
      },
      {
        id: 'tl-3',
        title: 'Received & Quality Verified',
        description: 'Quality inspector verified defect. Awaiting refund release.',
        timestamp: '19 Oct 2026, 05:20 PM',
        status: 'INSPECTED',
        actor: 'VENDOR',
      },
    ],
  },
  {
    id: 'ret-6',
    returnNumber: 'EXC-2026-9028',
    orderId: 'ORD-88204',
    orderDate: '14 Oct 2026, 07:15 PM',
    requestDate: '16 Oct 2026, 10:45 AM',
    type: 'EXCHANGE',
    status: 'INSPECTED',
    customer: {
      name: 'Meera Nair',
      phone: '+91 94471 88990',
      email: 'meera.nair@live.com',
      address: 'TC 14/204, Kowdiar Gardens',
      city: 'Thiruvananthapuram',
      pincode: '695003',
    },
    product: {
      id: 'p-106',
      name: 'Nescafe Classic Instant Coffee Jar',
      sku: 'SKU-BEV-9901',
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
      unitPrice: 590,
      quantity: 1,
      totalPrice: 590,
      unit: '200 g Glass Jar',
    },
    exchangeDetails: {
      requestedItemName: 'Nescafe Classic Instant Coffee Jar 200g (Replacement)',
      requestedVariant: '200 g Unbroken Fresh Stock',
      exchangeReason: 'Jar mouth glass was chipped inside the plastic cap.',
    },
    reason: {
      title: 'Glass Chipped Near Rim',
      category: 'Damaged / Leaking',
      customerNotes: 'Opened the red lid and saw small glass chips on the safety foil. Dangerous to consume, please replace with safe jar.',
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 0,
      mode: 'ORIGINAL_PAYMENT',
      status: 'PENDING',
    },
    pickup: {
      partner: 'Delhivery Surface',
      trackingNumber: 'DLV-EXC-338910',
      scheduledDate: '17 Oct 2026',
      timeSlot: '01:00 PM - 04:00 PM',
      status: 'DELIVERED_TO_HUB',
    },
    review: {
      vendorRemarks: 'Item received at store. Glass damage verified. Replacement unit packed and ready for dispatch.',
      reviewedAt: '16 Oct 2026, 12:00 PM',
      reviewedBy: 'Logistics Supervisor',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Exchange Requested',
        description: 'Customer requested replacement for damaged glass rim.',
        timestamp: '16 Oct 2026, 10:45 AM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Exchange Approved',
        description: 'Vendor approved doorstep exchange pickup.',
        timestamp: '16 Oct 2026, 12:00 PM',
        status: 'APPROVED',
        actor: 'VENDOR',
      },
      {
        id: 'tl-3',
        title: 'Defective Unit Inspected',
        description: 'Returned jar verified. Ready to dispatch replacement pack.',
        timestamp: '18 Oct 2026, 03:30 PM',
        status: 'INSPECTED',
        actor: 'VENDOR',
      },
    ],
  },
  {
    id: 'ret-7',
    returnNumber: 'RET-2026-9019',
    orderId: 'ORD-87941',
    orderDate: '12 Oct 2026, 01:20 PM',
    requestDate: '14 Oct 2026, 02:15 PM',
    type: 'RETURN',
    status: 'REFUND_COMPLETED',
    customer: {
      name: 'Suresh Joshi',
      phone: '+91 98220 33445',
      email: 'suresh.joshi@gmail.com',
      address: 'Plot 88, Model Colony, Shivajinagar',
      city: 'Pune',
      pincode: '411016',
    },
    product: {
      id: 'p-107',
      name: 'Tata Sampann Unpolished Toor Dal',
      sku: 'SKU-DAL-2201',
      category: 'Pulses & Grains',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
      unitPrice: 189,
      quantity: 1,
      totalPrice: 189,
      unit: '1 kg Pouch',
    },
    reason: {
      title: 'Infested with Weevils',
      category: 'Expired / Quality Issue',
      customerNotes: 'Found small black bugs inside the sealed packet upon opening.',
      images: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 189,
      mode: 'UPI',
      status: 'COMPLETED',
      transactionId: 'REF-UPI-20261016-99412',
      refundedAt: '16 Oct 2026, 04:30 PM',
    },
    pickup: {
      partner: 'Zippy In-House Rider',
      trackingNumber: 'ZP-RET-9019',
      scheduledDate: '15 Oct 2026',
      timeSlot: '03:00 PM',
      status: 'DELIVERED_TO_HUB',
    },
    review: {
      vendorRemarks: 'Quality verified. Immediate ₹189 refund processed to customer UPI ID.',
      reviewedAt: '14 Oct 2026, 04:00 PM',
      reviewedBy: 'Store Manager',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested',
        description: 'Customer submitted pest claim.',
        timestamp: '14 Oct 2026, 02:15 PM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Return Approved & Picked',
        description: 'Doorstep pickup completed by Zippy rider.',
        timestamp: '15 Oct 2026, 03:00 PM',
        status: 'PICKED_UP',
        actor: 'LOGISTICS',
      },
      {
        id: 'tl-3',
        title: 'Refund Successfully Credited',
        description: '₹189 credited to customer via UPI (Txn: REF-UPI-20261016-99412).',
        timestamp: '16 Oct 2026, 04:30 PM',
        status: 'REFUND_COMPLETED',
        actor: 'SYSTEM',
      },
    ],
  },
  {
    id: 'ret-8',
    returnNumber: 'RET-2026-9012',
    orderId: 'ORD-87102',
    orderDate: '05 Oct 2026, 10:00 AM',
    requestDate: '14 Oct 2026, 09:30 AM',
    type: 'RETURN',
    status: 'REJECTED',
    customer: {
      name: 'Rohan Mehta',
      phone: '+91 99001 88224',
      email: 'rohan.m@gmail.com',
      address: 'Flat 12B, Regency Park, Vasant Kunj',
      city: 'New Delhi',
      pincode: '110070',
    },
    product: {
      id: 'p-108',
      name: 'Epigamia Greek Yogurt Natural 400g',
      sku: 'SKU-DAIRY-8812',
      category: 'Dairy & Eggs',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=60',
      unitPrice: 140,
      quantity: 2,
      totalPrice: 280,
      unit: '400 g Tub',
    },
    reason: {
      title: 'Didn\'t like the sour taste',
      category: 'Customer Preference',
      customerNotes: 'Natural yogurt is too sour for my family. We want full refund.',
      images: [
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80',
      ],
    },
    refund: {
      amount: 0,
      mode: 'ORIGINAL_PAYMENT',
      status: 'CANCELLED',
    },
    review: {
      rejectionReason: 'Perishable Food Policy - Customer Taste/Preference not eligible (>9 days post delivery)',
      vendorRemarks: 'Perishable dairy products cannot be returned after 9 days post delivery due to personal taste preference. The product was delivered cold and fresh within expiry.',
      reviewedAt: '14 Oct 2026, 11:30 AM',
      reviewedBy: 'Store Supervisor',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Return Requested',
        description: 'Customer requested taste-preference return after 9 days.',
        timestamp: '14 Oct 2026, 09:30 AM',
        status: 'PENDING_APPROVAL',
        actor: 'CUSTOMER',
      },
      {
        id: 'tl-2',
        title: 'Return Rejected by Vendor',
        description: 'Declined under Zippy Fresh Perishable Policy: Request outside return window and not a defect.',
        timestamp: '14 Oct 2026, 11:30 AM',
        status: 'REJECTED',
        actor: 'VENDOR',
      },
    ],
  },
];

export default function ReturnsPage() {
  const [returnsList, setReturnsList] = useState<ReturnRequest[]>([]);

  // Clear any legacy dummy cache on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zippy_vendor_returns_cache');
    }
  }, []);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RETURN' | 'EXCHANGE'>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isDispatchExchangeOpen, setIsDispatchExchangeOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form states for modals
  const [approveForm, setApproveForm] = useState({
    pickupDate: 'Tomorrow (10:00 AM - 01:00 PM)',
    pickupPartner: 'Zippy Express Logistics',
    inspectionPolicy: 'INSPECT_FIRST' as 'INSPECT_FIRST' | 'INSTANT_ON_PICKUP',
    vendorNotes: '',
  });

  const [rejectForm, setRejectForm] = useState({
    rejectionReason: 'Policy violation: Return claimed after policy window (>7 days)',
    customRemarks: '',
    confirmedCheckedProof: false,
  });

  const [refundForm, setRefundForm] = useState({
    refundAmount: 0,
    deductionAmount: 0,
    deductionReason: 'None',
    refundMode: 'ORIGINAL_PAYMENT' as 'ORIGINAL_PAYMENT' | 'STORE_WALLET' | 'UPI',
    notes: 'Refund approved after physical verification at store.',
  });

  const [exchangeForm, setExchangeForm] = useState({
    replacementItem: '',
    courierPartner: 'Zippy Express Delivery',
    trackingNumber: '',
    notes: 'Fresh replacement item dispatched with tamper-evident seal.',
  });

  // Store verification status check
  const token = typeof window !== 'undefined' ? localStorage.getItem('zippy_vendor_token') : null;
  const savedStatus = typeof window !== 'undefined' ? localStorage.getItem('zippy_store_status') : null;

  const { data: storeRequestData } = useGetStoreRequestQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  const requestObj = (storeRequestData as any)?.data || storeRequestData;
  const rawStatus = requestObj?.status || requestObj?.approvalStatus || requestObj?.storeRequest?.status;
  const currentStatus = rawStatus
    ? String(rawStatus).toUpperCase()
    : savedStatus
    ? String(savedStatus).toUpperCase()
    : 'NOT_REGISTERED';
  const isApproved = currentStatus === 'APPROVED';

  // Backend RTK Query integration
  // 1. GET /api/v1/vendor/returns — list requests for your store items
  const {
    data: apiReturnsData,
    isLoading: isApiLoading,
    refetch: refetchReturns,
  } = useGetReturnsQuery();

  // 2. GET /api/v1/vendor/returns/:id — view a specific return request details
  const { data: apiSingleReturnData, isLoading: isSingleReturnLoading } = useGetReturnDetailsQuery(
    selectedReturn?.returnId || selectedReturn?.id || '',
    { skip: !(selectedReturn?.returnId || selectedReturn?.id) || !isDetailOpen }
  );

  // 3. PATCH /api/v1/vendor/returns/items/:itemId/status — approve/reject or update workflow status
  const [updateReturnStatusApi] = useUpdateReturnStatusMutation();

  // Helper to extract returns array from API response
  const rawApiReturns = useMemo(() => {
    if (!apiReturnsData) return null;
    if (Array.isArray(apiReturnsData)) return apiReturnsData;
    if (Array.isArray((apiReturnsData as any).data)) return (apiReturnsData as any).data;
    if (Array.isArray((apiReturnsData as any).returns)) return (apiReturnsData as any).returns;
    if (Array.isArray((apiReturnsData as any).items)) return (apiReturnsData as any).items;
    if (Array.isArray((apiReturnsData as any).data?.returns)) return (apiReturnsData as any).data.returns;
    if (Array.isArray((apiReturnsData as any).data?.items)) return (apiReturnsData as any).data.items;
    return null;
  }, [apiReturnsData]);

  // Sync real API returns into returnsList when available from backend
  useEffect(() => {
    if (rawApiReturns && Array.isArray(rawApiReturns)) {
      if (rawApiReturns.length === 0) {
        setReturnsList([]);
        return;
      }

      const normalized: ReturnRequest[] = rawApiReturns.flatMap((r: any, rIdx: number) => {
        const rawItems = Array.isArray(r.items) && r.items.length > 0 
          ? r.items 
          : Array.isArray(r.order_items) && r.order_items.length > 0
          ? r.order_items
          : [r.item || r];

        return rawItems.map((firstItem: any, itemIdx: number) => {
          const retId = String(r.id || r._id || r.return_id || `ret-api-${rIdx}`);
          const itemId = String(firstItem?.id || firstItem?._id || firstItem?.item_id || r.item_id || retId);
          const cardId = firstItem?.id ? `${retId}_${firstItem.id}` : `${retId}_${itemIdx}`;

          const ord = r.order || {};
          const orderNumber = String(
            ord.orderNumber ||
            ord.order_number ||
            r.order_number ||
            r.orderNumber ||
            r.orderId ||
            r.order_id ||
            `ORD-${rIdx + 1000}`
          );
          const returnNumber = r.return_number || r.returnNumber || `RET-${retId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

          // Product & Order item mapping
          const orderItem = firstItem?.order_item || firstItem?.orderItem || firstItem?.product || firstItem || {};
          const productName = String(
            orderItem.productName ||
            orderItem.product_name ||
            orderItem.name ||
            orderItem.title ||
            firstItem?.productName ||
            firstItem?.product_name ||
            firstItem?.name ||
            'Store Product'
          );

          const productSku = String(
            orderItem.sku ||
            orderItem.barcode ||
            (orderItem.productId ? `SKU-${String(orderItem.productId).slice(0, 8).toUpperCase()}` : `SKU-${rIdx + 100}`)
          );

          const productImage = String(
            orderItem.productImage ||
            orderItem.product_image ||
            orderItem.image_url ||
            orderItem.image ||
            firstItem?.productImage ||
            firstItem?.image ||
            (Array.isArray(orderItem.images) && orderItem.images[0]?.image_url ? orderItem.images[0].image_url : null) ||
            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'
          );

          // Pricing parsing
          const unitPrice = Number(
            orderItem.unitPrice ??
            orderItem.unit_price ??
            orderItem.price ??
            firstItem?.unitPrice ??
            firstItem?.unit_price ??
            firstItem?.price ??
            0
          );

          const returnQty = Number(firstItem?.quantity ?? firstItem?.qty ?? 1);
          const orderQty = Number(orderItem?.quantity ?? firstItem?.quantity ?? 1);

          const productTotal = Number(
            orderItem.totalPrice ??
            orderItem.total_price ??
            (unitPrice * returnQty)
          ) || (unitPrice * returnQty);

          const productUnit = String(orderItem.unit || orderItem.unit_type || orderItem.weight || (orderQty > 1 ? `${orderQty} units` : '1 unit'));
          const productCategory = String(
            orderItem.category ||
            orderItem.category_name ||
            (productName.toLowerCase().includes('capsicum') ? 'Vegetables & Fruits' : 'General Grocery')
          );

          // Order financials
          const orderSubtotal = Number(ord.subtotal ?? productTotal);
          const orderDiscountAmount = Number(ord.discountAmount ?? ord.discount_amount ?? 0);
          const orderDeliveryFee = Number(ord.deliveryFee ?? ord.delivery_fee ?? 0);
          const orderTaxAmount = Number(ord.taxAmount ?? ord.tax_amount ?? 0);
          const orderTotalAmount = Number(ord.totalAmount ?? ord.total_amount ?? ord.total ?? productTotal);
          const paymentMethod = String(ord.paymentMethod || ord.payment_method || 'COD').toUpperCase();
          const paymentStatus = String(ord.paymentStatus || ord.payment_status || 'PAID').toUpperCase();
          const orderStatus = String(ord.status || 'DELIVERED').toUpperCase();

          // Status normalization
          const rawStatus = String(firstItem?.status || r.status || 'PENDING').toUpperCase();
          let status: ReturnStatus = 'PENDING_APPROVAL';
          if (['APPROVED', 'ACCEPTED'].includes(rawStatus)) status = 'APPROVED';
          else if (['REJECTED', 'DECLINED', 'CANCELLED'].includes(rawStatus)) status = 'REJECTED';
          else if (['PICKUP_SCHEDULED', 'SCHEDULED'].includes(rawStatus)) status = 'PICKUP_SCHEDULED';
          else if (['PICKED_UP', 'IN_TRANSIT', 'SHIPPED'].includes(rawStatus)) status = 'PICKED_UP';
          else if (['INSPECTED', 'RECEIVED', 'RECEIVED_AT_HUB'].includes(rawStatus)) status = 'INSPECTED';
          else if (['REFUND_COMPLETED', 'REFUNDED'].includes(rawStatus)) status = 'REFUND_COMPLETED';
          else if (['EXCHANGE_DISPATCHED'].includes(rawStatus)) status = 'EXCHANGE_DISPATCHED';
          else if (['COMPLETED', 'CLOSED'].includes(rawStatus)) status = 'COMPLETED';
          else status = 'PENDING_APPROVAL';

          const returnType: ReturnType = String(r.type || firstItem?.type || 'RETURN').toUpperCase() === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN';

          // Customer
          const cust = r.customer || r.user || ord.customer || ord.user || {};
          const customerName = cust.name || cust.full_name || cust.username || (ord.userId ? `Customer (${ord.userId.slice(0, 8)})` : 'Customer');
          const customerPhone = cust.phone || cust.phone_number || cust.mobile || '+91 98765 43210';
          const customerEmail = cust.email || 'customer@zippy.in';
          const customerAddress = cust.address || cust.delivery_address?.address_line1 || ord.delivery_address?.address_line1 || ord.deliveryAddress || 'Customer Delivery Address';
          const customerCity = cust.city || cust.delivery_address?.city || ord.delivery_address?.city || 'Local Area';
          const customerPincode = cust.pincode || cust.postal_code || ord.delivery_address?.postal_code || '400001';

          // Reason
          const rawReason = firstItem?.reason || r.reason || {};
          const reasonStr = typeof rawReason === 'string'
            ? rawReason
            : rawReason.title || rawReason.category || r.return_reason || 'Return Request';

          let reasonCat = 'Expired / Quality Issue';
          const lowerR = reasonStr.toLowerCase();
          if (lowerR.includes('rotten') || lowerR.includes('expired') || lowerR.includes('quality') || lowerR.includes('sour')) {
            reasonCat = 'Expired / Quality Issue';
          } else if (lowerR.includes('damag') || lowerR.includes('leak') || lowerR.includes('broken')) {
            reasonCat = 'Damaged / Leaking';
          } else if (lowerR.includes('wrong') || lowerR.includes('incorrect') || lowerR.includes('different')) {
            reasonCat = 'Wrong Item / Variant';
          } else if (lowerR.includes('prefer') || lowerR.includes('mind') || lowerR.includes('not need')) {
            reasonCat = 'Customer Preference';
          }

          const customerNotes = firstItem?.customer_notes ||
            firstItem?.notes ||
            (typeof rawReason === 'object' ? rawReason.customerNotes || rawReason.notes : null) ||
            r.customer_notes ||
            (typeof rawReason === 'string' ? `Customer stated: ${rawReason}` : 'Customer requested return for this item.');

          const reasonImages: string[] = Array.isArray(firstItem?.evidence_urls) && firstItem.evidence_urls.length > 0
            ? firstItem.evidence_urls
            : Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0
            ? r.evidence_urls
            : Array.isArray(rawReason?.images) && rawReason.images.length > 0
            ? rawReason.images
            : Array.isArray(r.images) && r.images.length > 0
            ? r.images
            : [];

          // Refund details
          const payableRefund = Number(
            firstItem?.refund_amount ||
            r.refund_amount ||
            productTotal ||
            orderTotalAmount
          );

          const refundMode = paymentMethod === 'WALLET' ? 'STORE_WALLET' : paymentMethod === 'UPI' ? 'UPI' : 'ORIGINAL_PAYMENT';

          // Timeline
          const timeline: TimelineEvent[] = [];
          if (firstItem?.reviewed_at) {
            timeline.push({
              id: `tl-rev-${rIdx}-${itemIdx}`,
              title: status === 'APPROVED' ? 'Return Approved by Store' : 'Return Request Reviewed',
              description: status === 'APPROVED' ? 'Return request verified and approved. Pickup process initialized.' : `Status set to ${status}.`,
              timestamp: new Date(firstItem.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              status,
              actor: 'VENDOR',
            });
          }
          timeline.push({
            id: `tl-init-${rIdx}-${itemIdx}`,
            title: 'Return Request Created',
            description: `Customer submitted return for ${productName} (Claim Value: ₹${productTotal}).`,
            timestamp: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
            status: 'PENDING_APPROVAL',
            actor: 'CUSTOMER',
          });

          return {
            id: cardId,
            returnId: retId,
            itemId,
            returnNumber,
            orderId: orderNumber,
            orderDate: ord.createdAt || r.order_date ? new Date(ord.createdAt || r.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent Order',
            requestDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today',
            type: returnType,
            status,
            customer: {
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address: customerAddress,
              city: customerCity,
              pincode: customerPincode,
            },
            product: {
              id: String(orderItem.productId || orderItem.id || `prod-${rIdx}`),
              name: productName,
              sku: productSku,
              category: productCategory,
              image: productImage,
              unitPrice,
              quantity: returnQty,
              totalPrice: productTotal,
              unit: productUnit,
            },
            orderInfo: {
              orderNumber,
              subtotal: orderSubtotal,
              discountAmount: orderDiscountAmount,
              deliveryFee: orderDeliveryFee,
              taxAmount: orderTaxAmount,
              totalAmount: orderTotalAmount,
              paymentMethod,
              paymentStatus,
              status: orderStatus,
              createdAt: ord.createdAt,
            },
            reason: {
              title: reasonStr,
              category: reasonCat,
              customerNotes,
              images: reasonImages,
            },
            refund: {
              amount: payableRefund,
              mode: refundMode,
              status: status === 'REFUND_COMPLETED' ? 'COMPLETED' : status === 'REJECTED' ? 'CANCELLED' : 'PENDING',
              transactionId: r.refund_transaction_id || (status === 'REFUND_COMPLETED' ? `TXN-REF-${rIdx + 1000}` : undefined),
            },
            review: {
              rejectionReason: firstItem?.rejection_reason || r.rejection_reason || undefined,
              reviewedAt: firstItem?.reviewed_at ? new Date(firstItem.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined,
              reviewedBy: 'Store Partner',
            },
            timeline,
          };
        });
      });

      setReturnsList(normalized);
    }
  }, [rawApiReturns]);

  // Statistics calculation
  const metrics = useMemo(() => {
    const total = returnsList.length;
    const pending = returnsList.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const inTransit = returnsList.filter(
      (r) => r.status === 'APPROVED' || r.status === 'PICKUP_SCHEDULED' || r.status === 'PICKED_UP'
    ).length;
    const inspected = returnsList.filter((r) => r.status === 'INSPECTED').length;
    const completed = returnsList.filter(
      (r) => r.status === 'REFUND_COMPLETED' || r.status === 'EXCHANGE_DISPATCHED' || r.status === 'COMPLETED'
    ).length;
    const rejected = returnsList.filter((r) => r.status === 'REJECTED').length;
    const totalClaimValue = returnsList.reduce((acc, curr) => acc + (curr.refund.amount || curr.product.totalPrice || 0), 0);
    const pendingClaimValue = returnsList
      .filter((r) => r.status === 'PENDING_APPROVAL')
      .reduce((acc, curr) => acc + (curr.refund.amount || curr.product.totalPrice || 0), 0);
    const totalRefunded = returnsList
      .filter((r) => r.refund.status === 'COMPLETED' || r.status === 'REFUND_COMPLETED')
      .reduce((acc, curr) => acc + (curr.refund.amount || 0), 0);
    const exchangeCount = returnsList.filter((r) => r.type === 'EXCHANGE').length;

    return { total, pending, inTransit, inspected, completed, rejected, totalClaimValue, pendingClaimValue, totalRefunded, exchangeCount };
  }, [returnsList]);

  // Filtered List
  const filteredReturns = useMemo(() => {
    return returnsList.filter((item) => {
      // Tab Status Filter
      if (activeTab === 'PENDING' && item.status !== 'PENDING_APPROVAL') return false;
      if (
        activeTab === 'IN_TRANSIT' &&
        !['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP'].includes(item.status)
      )
        return false;
      if (activeTab === 'INSPECTED' && item.status !== 'INSPECTED') return false;
      if (
        activeTab === 'COMPLETED' &&
        !['REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(item.status)
      )
        return false;
      if (activeTab === 'REJECTED' && item.status !== 'REJECTED') return false;

      // Type Filter
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // Reason Filter
      if (reasonFilter !== 'ALL' && item.reason.category !== reasonFilter) return false;

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = item.returnNumber.toLowerCase().includes(query);
        const matchesOrder = item.orderId.toLowerCase().includes(query);
        const matchesCustomer = item.customer.name.toLowerCase().includes(query) || item.customer.phone.includes(query);
        const matchesProduct = item.product.name.toLowerCase().includes(query) || item.product.sku.toLowerCase().includes(query);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesProduct) return false;
      }

      return true;
    });
  }, [returnsList, activeTab, typeFilter, reasonFilter, searchTerm]);

  // Actions
  const handleOpenApprove = (r: ReturnRequest) => {
    setSelectedReturn(r);
    setApproveForm({
      pickupDate: 'Tomorrow (10:00 AM - 01:00 PM)',
      pickupPartner: 'Zippy Express Logistics',
      inspectionPolicy: 'INSPECT_FIRST',
      vendorNotes: `Approved for doorstep return inspection. Product: ${r.product.name}`,
    });
    setIsApproveOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedReturn) return;

    const newTimelineEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      title: 'Return Request Approved by Vendor',
      description: `Pickup booked with ${approveForm.pickupPartner} for ${approveForm.pickupDate}. Policy: ${
        approveForm.inspectionPolicy === 'INSTANT_ON_PICKUP' ? 'Instant Refund upon pickup' : 'Inspect at Store first'
      }. Notes: ${approveForm.vendorNotes || 'None'}`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'APPROVED',
      actor: 'VENDOR',
    };

    const updated = returnsList.map((item) => {
      if (item.id === selectedReturn.id) {
        return {
          ...item,
          status: 'APPROVED' as ReturnStatus,
          pickup: {
            partner: approveForm.pickupPartner,
            trackingNumber: `ZP-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
            scheduledDate: approveForm.pickupDate,
            timeSlot: 'Morning Slot (10 AM - 1 PM)',
            status: 'SCHEDULED' as const,
          },
          review: {
            ...item.review,
            vendorRemarks: approveForm.vendorNotes,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Store Partner',
          },
          timeline: [newTimelineEvent, ...item.timeline],
        };
      }
      return item;
    });

    setReturnsList(updated);
    setIsApproveOpen(false);
    toast.success(`Request ${selectedReturn.returnNumber} Approved! Pickup scheduled.`);

    try {
      const targetItemId = selectedReturn.itemId || selectedReturn.id;
      await updateReturnStatusApi({
        itemId: targetItemId,
        returnId: selectedReturn.id,
        status: 'APPROVED',
        remarks: approveForm.vendorNotes,
        pickupPartner: approveForm.pickupPartner,
        pickupDate: approveForm.pickupDate,
      }).unwrap();
    } catch (e) {
      // Local state already updated
    }
  };

  const handleOpenReject = (r: ReturnRequest) => {
    setSelectedReturn(r);
    setRejectForm({
      rejectionReason: 'Policy violation: Return claimed after 7-day window or customer mishandling',
      customRemarks: '',
      confirmedCheckedProof: false,
    });
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedReturn) return;
    if (!rejectForm.customRemarks.trim()) {
      toast.error('Please enter detailed remarks explaining the rejection to the customer.');
      return;
    }
    if (!rejectForm.confirmedCheckedProof) {
      toast.error('Please check the confirmation box verifying customer proofs.');
      return;
    }

    const newTimelineEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      title: 'Return Request Declined by Vendor',
      description: `Reason: ${rejectForm.rejectionReason}. Explanation: ${rejectForm.customRemarks}`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'REJECTED',
      actor: 'VENDOR',
    };

    const updated = returnsList.map((item) => {
      if (item.id === selectedReturn.id) {
        return {
          ...item,
          status: 'REJECTED' as ReturnStatus,
          refund: {
            ...item.refund,
            status: 'CANCELLED' as const,
          },
          review: {
            rejectionReason: rejectForm.rejectionReason,
            vendorRemarks: rejectForm.customRemarks,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Store Partner',
          },
          timeline: [newTimelineEvent, ...item.timeline],
        };
      }
      return item;
    });

    setReturnsList(updated);
    setIsRejectOpen(false);
    toast.error(`Request ${selectedReturn.returnNumber} has been rejected.`);

    try {
      const targetItemId = selectedReturn.itemId || selectedReturn.id;
      await updateReturnStatusApi({
        itemId: targetItemId,
        returnId: selectedReturn.id,
        status: 'REJECTED',
        rejectionReason: rejectForm.rejectionReason,
        rejection_reason: rejectForm.rejectionReason,
        reason: rejectForm.rejectionReason,
        remarks: rejectForm.customRemarks,
        vendor_notes: rejectForm.customRemarks,
      }).unwrap();
    } catch (e) {
      // Local state updated
    }
  };

  const handleOpenRefund = (r: ReturnRequest) => {
    setSelectedReturn(r);
    setRefundForm({
      refundAmount: r.product.totalPrice,
      deductionAmount: 0,
      deductionReason: 'None',
      refundMode: r.refund.mode || 'ORIGINAL_PAYMENT',
      notes: 'Item verified physically at store. Full refund issued to customer.',
    });
    setIsRefundOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedReturn) return;
    const finalAmount = Math.max(0, refundForm.refundAmount - refundForm.deductionAmount);
    const txnRef = `REF-${refundForm.refundMode === 'UPI' ? 'UPI' : 'PG'}-${Date.now().toString().slice(-8)}`;

    const newTimelineEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      title: 'Refund Successfully Issued',
      description: `₹${finalAmount} credited to customer via ${refundForm.refundMode}. Reference Txn: ${txnRef}.`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'REFUND_COMPLETED',
      actor: 'SYSTEM',
    };

    const updated = returnsList.map((item) => {
      if (item.id === selectedReturn.id) {
        return {
          ...item,
          status: 'REFUND_COMPLETED' as ReturnStatus,
          refund: {
            amount: finalAmount,
            mode: refundForm.refundMode,
            status: 'COMPLETED' as const,
            transactionId: txnRef,
            refundedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            deductionAmount: refundForm.deductionAmount,
            deductionReason: refundForm.deductionReason,
          },
          timeline: [newTimelineEvent, ...item.timeline],
        };
      }
      return item;
    });

    setReturnsList(updated);
    setIsRefundOpen(false);
    toast.success(`Refund of ₹${finalAmount} processed successfully!`);

    try {
      const targetItemId = selectedReturn.itemId || selectedReturn.id;
      await updateReturnStatusApi({
        itemId: targetItemId,
        returnId: selectedReturn.id,
        status: 'REFUND_COMPLETED',
        refundAmount: finalAmount,
        refund_amount: finalAmount,
        remarks: `Refund issued. Txn: ${txnRef}`,
      }).unwrap();
    } catch (e) {
      // Local state updated
    }
  };

  const handleOpenDispatchExchange = (r: ReturnRequest) => {
    setSelectedReturn(r);
    setExchangeForm({
      replacementItem: r.exchangeDetails?.requestedItemName || r.product.name,
      courierPartner: 'Zippy Fast Rider Express',
      trackingNumber: `ZP-RPL-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: 'New replacement item packed securely with fresh expiry date.',
    });
    setIsDispatchExchangeOpen(true);
  };

  const handleConfirmDispatchExchange = async () => {
    if (!selectedReturn) return;
    if (!exchangeForm.trackingNumber.trim()) {
      toast.error('Please enter an AWB / Tracking number.');
      return;
    }

    const newTimelineEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      title: 'Replacement Item Dispatched',
      description: `Replacement (${exchangeForm.replacementItem}) dispatched via ${exchangeForm.courierPartner}. Tracking AWB: ${exchangeForm.trackingNumber}.`,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'EXCHANGE_DISPATCHED',
      actor: 'VENDOR',
    };

    const updated = returnsList.map((item) => {
      if (item.id === selectedReturn.id) {
        return {
          ...item,
          status: 'EXCHANGE_DISPATCHED' as ReturnStatus,
          exchangeDetails: {
            requestedItemName: exchangeForm.replacementItem,
            requestedVariant: item.exchangeDetails?.requestedVariant || 'Standard',
            exchangeReason: item.exchangeDetails?.exchangeReason || 'Replacement',
            replacementTrackingNumber: exchangeForm.trackingNumber,
            replacementCourier: exchangeForm.courierPartner,
          },
          timeline: [newTimelineEvent, ...item.timeline],
        };
      }
      return item;
    });

    setReturnsList(updated);
    setIsDispatchExchangeOpen(false);
    toast.success(`Replacement dispatched with Tracking: ${exchangeForm.trackingNumber}`);

    try {
      const targetItemId = selectedReturn.itemId || selectedReturn.id;
      await updateReturnStatusApi({
        itemId: targetItemId,
        returnId: selectedReturn.id,
        status: 'EXCHANGE_DISPATCHED',
        trackingNumber: exchangeForm.trackingNumber,
        tracking_number: exchangeForm.trackingNumber,
        remarks: exchangeForm.notes,
      }).unwrap();
    } catch (e) {
      // Local state updated
    }
  };

  const handleQuickStatusAdvance = async (r: ReturnRequest, nextStatus: ReturnStatus, title: string, desc: string) => {
    const newTimelineEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      title,
      description: desc,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: nextStatus,
      actor: 'VENDOR',
    };

    const updated = returnsList.map((item) => {
      if (item.id === r.id) {
        return {
          ...item,
          status: nextStatus,
          timeline: [newTimelineEvent, ...item.timeline],
        };
      }
      return item;
    });

    setReturnsList(updated);
    toast.success(`Status updated to: ${nextStatus.replace(/_/g, ' ')}`);

    try {
      const targetItemId = r.itemId || r.id;
      await updateReturnStatusApi({
        itemId: targetItemId,
        returnId: r.id,
        status: nextStatus,
        remarks: desc,
      }).unwrap();
    } catch (e) {
      // Local state updated
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handlePrintSlip = (r: ReturnRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print RMA slip.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return RMA Slip - ${r.returnNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
            .header { border-bottom: 2px solid #167a46; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 26px; font-weight: 900; color: #167a46; }
            .badge { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #f8fafc; color: #334155; }
            .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 10px; }
            .barcode { margin-top: 30px; text-align: center; border: 2px dashed #94a3b8; padding: 20px; font-family: monospace; font-size: 18px; letter-spacing: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">ZIPPY VENDOR PARTNER</div>
              <div style="font-size: 12px; color: #64748b;">RETURN MERCHANDISE AUTHORIZATION (RMA)</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${r.type}</span>
              <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${r.returnNumber}</div>
              <div style="font-size: 12px; color: #64748b;">Order: ${r.orderId} | Total: ₹${r.orderInfo?.totalAmount || r.product.totalPrice}</div>
              <div style="font-size: 11px; color: #64748b;">Payment: ${r.orderInfo?.paymentMethod || 'COD'} (${r.orderInfo?.paymentStatus || 'PAID'})</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 48%;">
              <div class="section-title">Customer Details</div>
              <div style="font-weight: bold; font-size: 15px;">${r.customer.name}</div>
              <div style="font-size: 13px; color: #475569;">${r.customer.phone} | ${r.customer.email}</div>
              <div style="font-size: 13px; color: #475569; margin-top: 4px;">${r.customer.address}, ${r.customer.city} - ${r.customer.pincode}</div>
            </div>
            <div style="width: 48%;">
              <div class="section-title">Return Summary</div>
              <div style="font-size: 13px;"><strong>Reason:</strong> ${r.reason.title}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 2px;">"${r.reason.customerNotes}"</div>
              <div style="font-size: 13px; margin-top: 6px;"><strong>Status:</strong> ${r.status}</div>
              <div style="font-size: 13px; margin-top: 2px;"><strong>Requested Date:</strong> ${r.requestDate}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Item Details</div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${r.product.name}</strong></td>
                  <td>${r.product.sku}</td>
                  <td>${r.product.unit}</td>
                  <td>${r.product.quantity}</td>
                  <td>₹${r.product.unitPrice}</td>
                  <td>₹${r.product.totalPrice}</td>
                </tr>
              </tbody>
            </table>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; font-size: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
              <div>Order Value: <strong>₹${r.orderInfo?.totalAmount || r.product.totalPrice}</strong> (${r.orderInfo?.paymentMethod || 'COD'})</div>
              <div style="font-weight: 900; font-size: 16px; color: #167a46;">Refund Payable: ₹${r.refund.amount}</div>
            </div>
          </div>

          <div class="barcode">
            *${r.returnNumber}*
            <div style="font-size: 10px; color: #64748b; letter-spacing: 0px; margin-top: 5px;">Scan at warehouse intake inspection</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: ReturnStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case 'PICKUP_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Pickup Scheduled
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300 shadow-xs">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            Picked Up (In Transit)
          </span>
        );
      case 'INSPECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Inspected at Store
          </span>
        );
      case 'REFUND_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300 shadow-xs">
            <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
            Refund Credited
          </span>
        );
      case 'EXCHANGE_DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-xs">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            Exchange Dispatched
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Store Status Reminder if not approved */}
      {!isApproved && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Store Verification In Progress:</span> You can review, test approval workflows, and simulate customer return resolutions. Official customer notifications and automatic payment gateway debits will be enabled as soon as your store documents are verified by Zippy Partner Ops.
          </div>
        </div>
      )}

      {/* Screen Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-[#167a46] border border-emerald-100">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Returns & Exchange Requests
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200">
                  Live Stream
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review return & replacement claims, inspect delivered parcels, authorize pickups, and release customer refunds.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              refetchReturns();
              toast.success('Returns data refreshed!');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
          <button
            onClick={() => {
              const csvContent =
                'data:text/csv;charset=utf-8,' +
                ['Return ID,Order ID,Customer,Product,Type,Status,Amount,Requested Date']
                  .concat(
                    returnsList.map(
                      (r) =>
                        `"${r.returnNumber}","${r.orderId}","${r.customer.name}","${r.product.name}","${r.type}","${r.status}","${r.refund.amount}","${r.requestDate}"`
                    )
                  )
                  .join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `zippy_returns_report_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success('Returns CSV Report downloaded!');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-extrabold transition-all shadow-md hover:shadow-lg"
          >
            <FileText className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Return Requests */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">{metrics.total}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Value: <strong className="text-slate-800">₹{metrics.totalClaimValue.toLocaleString('en-IN')}</strong></span>
              <span>•</span>
              <span>{metrics.total - metrics.exchangeCount} returns</span>
            </div>
          </div>
        </div>

        {/* Card 2: Needs Action / Pending Review */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-3xl border border-amber-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Needs Action
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-950 tracking-tight">{metrics.pending}</div>
            <div className="text-[11px] font-bold text-amber-700 mt-1 flex items-center justify-between">
              <span>Awaiting Approval</span>
              <span>₹{metrics.pendingClaimValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ready for Refund / Inspected */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">At Store / Inspected</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-purple-950 tracking-tight">{metrics.inspected}</div>
            <div className="text-[11px] font-bold text-purple-700 mt-1">
              Ready for Refund / Exchange
            </div>
          </div>
        </div>

        {/* Card 4: Total Refund Processed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refunds Released</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-800 tracking-tight">₹{metrics.totalRefunded.toLocaleString('en-IN')}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              {metrics.completed} claims settled
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-[#167a46] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Requests ({metrics.total})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending Review
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 font-extrabold'}`}>
              {metrics.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('IN_TRANSIT')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'IN_TRANSIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Logistics / In Transit ({metrics.inTransit})
          </button>
          <button
            onClick={() => setActiveTab('INSPECTED')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'INSPECTED'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Store Inspection ({metrics.inspected})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Refunded / Closed ({metrics.completed})
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Declined ({metrics.rejected})
          </button>
        </div>

        {/* Search & Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Return ID (RET-xxx), Order ID, Customer name, Phone, or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#167a46] focus:bg-white transition-all text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
            >
              <option value="ALL">All Claim Types</option>
              <option value="RETURN">Return & Refund</option>
              <option value="EXCHANGE">Exchange / Replacement</option>
            </select>
          </div>

          {/* Reason Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
            >
              <option value="ALL">All Return Reasons</option>
              <option value="Damaged / Leaking">Damaged / Leaking</option>
              <option value="Wrong Item / Variant">Wrong Item / Variant</option>
              <option value="Expired / Quality Issue">Expired / Quality Issue</option>
              <option value="Customer Preference">Customer Preference</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List of Return Cards */}
      {isApiLoading && returnsList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 border-4 border-[#167a46] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Checking Return Requests...</h3>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-14 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center mx-auto text-slate-400 shadow-xs">
            <RotateCcw className="w-8 h-8 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">No Return Request</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Currently there are no return or exchange requests for your store. When customers submit a return claim, it will appear here in real-time.
            </p>
          </div>
          {(searchTerm || activeTab !== 'ALL' || typeFilter !== 'ALL' || reasonFilter !== 'ALL') && (
            <button
              onClick={() => {
                setActiveTab('ALL');
                setTypeFilter('ALL');
                setReasonFilter('ALL');
                setSearchTerm('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((item) => {
            const isReturn = item.type === 'RETURN';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Card Top Header */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center flex-wrap gap-2.5">
                    {/* Return Number with Copy */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-900">{item.returnNumber}</span>
                      <button
                        onClick={() => copyToClipboard(item.returnNumber, 'Return ID')}
                        title="Copy Return ID"
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-slate-300">•</span>

                    {/* Order Reference with Copy */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <span>Order: <span className="font-bold text-slate-800">{item.orderId}</span></span>
                      <button
                        onClick={() => copyToClipboard(item.orderId, 'Order ID')}
                        title="Copy Order ID"
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-slate-300">•</span>

                    {/* Payment Badge */}
                    {item.orderInfo?.paymentMethod && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        {item.orderInfo.paymentMethod} • {item.orderInfo.paymentStatus}
                      </span>
                    )}

                    {/* Type Badge */}
                    {isReturn ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        Return & Refund
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                        Exchange / Replacement
                      </span>
                    )}

                    {/* Status Badge */}
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Requested: {item.requestDate}</span>
                  </div>
                </div>

                {/* Card Body Grid */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Product & Exchange Info (4 cols) */}
                  <div className="lg:col-span-4 flex items-start space-x-3.5">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                      }}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50 shadow-xs"
                    />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.product.category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {item.product.sku}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                        {item.product.name}
                      </h4>

                      {/* Item Pricing & Qty Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                          Price: ₹{item.product.unitPrice}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                          Qty: {item.product.quantity} {item.product.unit}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                          Total: ₹{item.product.totalPrice}
                        </span>
                      </div>

                      {/* Original Order Overview Bar */}
                      {item.orderInfo && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                          <div className="flex justify-between items-center text-slate-600 font-semibold">
                            <span>Order Total:</span>
                            <span className="font-extrabold text-slate-900">₹{item.orderInfo.totalAmount}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 text-[10px]">
                            <span>Subtotal: ₹{item.orderInfo.subtotal}</span>
                            <span>Delivery: {item.orderInfo.deliveryFee > 0 ? `₹${item.orderInfo.deliveryFee}` : 'Free'}</span>
                          </div>
                        </div>
                      )}

                      {/* If Exchange: Highlight Requested Item */}
                      {!isReturn && item.exchangeDetails && (
                        <div className="mt-2 p-2 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-0.5">
                          <div className="flex items-center gap-1 font-extrabold text-[11px] text-blue-800 uppercase tracking-wide">
                            <ArrowLeftRight className="w-3 h-3" />
                            Exchange For:
                          </div>
                          <div className="font-bold text-slate-800 line-clamp-1">
                            {item.exchangeDetails.requestedItemName}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Reason, Customer Comments & Photo Proofs (5 cols) */}
                  <div className="lg:col-span-5 space-y-2.5 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 pt-4 lg:pt-0">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        {item.reason.category}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{item.reason.title}</span>
                    </div>

                    {/* Customer Notes */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 italic leading-relaxed">
                      "{item.reason.customerNotes}"
                    </div>

                    {/* Customer Proof Photos Gallery */}
                    {item.reason.images && item.reason.images.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Customer Proof Photos ({item.reason.images.length})</span>
                          <span className="text-[10px] text-emerald-700 font-extrabold">Click to enlarge</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {item.reason.images.map((imgUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxImage(imgUrl)}
                              className="relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-[#167a46] transition-all"
                            >
                              <img
                                src={imgUrl}
                                alt={`Proof ${idx + 1}`}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                                }}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50/70 border border-slate-200/60">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>No photo proof uploaded by customer</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Customer Info & Financial Status (3 cols) */}
                  <div className="lg:col-span-3 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 pt-4 lg:pt-0 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Customer Details
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {item.customer.name}
                        </div>
                        <div className="text-slate-600 flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`tel:${item.customer.phone}`} className="hover:text-emerald-700 hover:underline">
                            {item.customer.phone}
                          </a>
                        </div>
                        <div className="text-slate-500 flex items-start gap-1.5 text-[11px] line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          {item.customer.city} ({item.customer.pincode})
                        </div>
                      </div>
                    </div>

                    {/* Financial / Refund Summary */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/60 border border-emerald-200 text-xs space-y-2 shadow-2xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-bold text-[11px] uppercase tracking-wide text-emerald-900">Payable Refund:</span>
                        <span className="font-black text-emerald-900 text-base">
                          ₹{item.refund.amount}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-slate-500">Refund Destination:</span>
                          <span className="font-bold text-slate-800">
                            {item.orderInfo?.paymentMethod === 'WALLET'
                              ? 'Zippy Store Wallet'
                              : item.orderInfo?.paymentMethod === 'COD'
                              ? 'Cash / UPI Reversal'
                              : 'Original Payment'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-slate-500">Order Payment:</span>
                          <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {item.orderInfo?.paymentStatus || 'PAID'} ({item.orderInfo?.paymentMethod || 'COD'})
                          </span>
                        </div>
                        {item.orderInfo?.totalAmount && (
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-slate-500">Order Grand Total:</span>
                            <span className="font-bold text-slate-800">₹{item.orderInfo.totalAmount}</span>
                          </div>
                        )}
                        {item.refund.transactionId && (
                          <div className="text-[10px] text-emerald-800 font-mono truncate pt-1 border-t border-emerald-200">
                            Txn: {item.refund.transactionId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Stepper Lifecycle */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="grid grid-cols-5 text-center gap-1 relative text-[11px]">
                    {/* Step 1: Requested */}
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1 shadow-xs">
                        ✓
                      </div>
                      <span className="font-extrabold text-slate-800">Claim Placed</span>
                    </div>

                    {/* Step 2: Approved / Rejected */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          item.status === 'REJECTED'
                            ? 'bg-rose-600 text-white'
                            : item.status !== 'PENDING_APPROVAL'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-400 text-amber-950 animate-pulse'
                        }`}
                      >
                        {item.status === 'REJECTED' ? '✕' : item.status !== 'PENDING_APPROVAL' ? '✓' : '2'}
                      </div>
                      <span
                        className={`font-extrabold ${
                          item.status === 'REJECTED'
                            ? 'text-rose-700'
                            : item.status !== 'PENDING_APPROVAL'
                            ? 'text-slate-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {item.status === 'REJECTED' ? 'Declined' : 'Vendor Review'}
                      </span>
                    </div>

                    {/* Step 3: Courier Pickup */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          ['PICKUP_SCHEDULED', 'PICKED_UP', 'INSPECTED', 'REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(
                            item.status
                          )
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {['PICKUP_SCHEDULED', 'PICKED_UP', 'INSPECTED', 'REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(
                          item.status
                        )
                          ? '✓'
                          : '3'}
                      </div>
                      <span className="font-semibold text-slate-600">Doorstep Pickup</span>
                    </div>

                    {/* Step 4: Physical Inspection */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          ['INSPECTED', 'REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(item.status)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {['INSPECTED', 'REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(item.status) ? '✓' : '4'}
                      </div>
                      <span className="font-semibold text-slate-600">Store Inspection</span>
                    </div>

                    {/* Step 5: Refund or Replacement */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          ['REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(item.status)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {['REFUND_COMPLETED', 'EXCHANGE_DISPATCHED', 'COMPLETED'].includes(item.status) ? '✓' : '5'}
                      </div>
                      <span className="font-bold text-slate-800">
                        {isReturn ? 'Refund Settled' : 'Exchanged'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReturn(item);
                        setIsDetailOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      View Full Details
                    </button>
                    <button
                      onClick={() => handlePrintSlip(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      title="Print Return Merchandise Authorization Slip"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      RMA Slip
                    </button>
                  </div>

                  {/* Stage-dependent Action Buttons */}
                  <div className="flex items-center flex-wrap gap-2">
                    {/* If PENDING: Show Approve & Reject */}
                    {item.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => handleOpenReject(item)}
                          className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all shadow-xs"
                        >
                          Decline Request
                        </button>
                        <button
                          onClick={() => handleOpenApprove(item)}
                          className="px-4 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve Return
                        </button>
                      </>
                    )}

                    {/* If APPROVED: Allow scheduling / marking picked up */}
                    {item.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={() =>
                            handleQuickStatusAdvance(
                              item,
                              'PICKED_UP',
                              'Courier Picked Up Parcel',
                              'Delivery partner received return parcel from customer.'
                            )
                          }
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Mark as Picked Up
                        </button>
                      </>
                    )}

                    {/* If PICKED UP: Allow receiving & marking inspected */}
                    {item.status === 'PICKED_UP' && (
                      <button
                        onClick={() =>
                          handleQuickStatusAdvance(
                            item,
                            'INSPECTED',
                            'Parcel Received & Verified at Hub',
                            'Physical item inspected by store staff. Condition matches customer report.'
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Mark Received & Inspected
                      </button>
                    )}

                    {/* If INSPECTED: Issue Refund or Dispatch Exchange */}
                    {item.status === 'INSPECTED' && (
                      <>
                        {isReturn ? (
                          <button
                            onClick={() => handleOpenRefund(item)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5"
                          >
                            <DollarSign className="w-4 h-4" />
                            Issue Refund (₹{item.refund.amount})
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenDispatchExchange(item)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Truck className="w-4 h-4" />
                            Dispatch Replacement
                          </button>
                        )}
                      </>
                    )}

                    {/* If REFUND_COMPLETED */}
                    {item.status === 'REFUND_COMPLETED' && (
                      <span className="text-xs font-extrabold text-teal-700 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200">
                        <CheckCheck className="w-4 h-4 text-teal-600" />
                        Refund of ₹{item.refund.amount} Settled
                      </span>
                    )}

                    {/* If EXCHANGE_DISPATCHED */}
                    {item.status === 'EXCHANGE_DISPATCHED' && (
                      <span className="text-xs font-extrabold text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
                        <Truck className="w-4 h-4 text-indigo-600" />
                        Tracking: {item.exchangeDetails?.replacementTrackingNumber || 'Dispatched'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: APPROVE REQUEST */}
      {isApproveOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#167a46]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Approve Return Request</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedReturn.returnNumber} • Order: {selectedReturn.orderId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApproveOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Product Mini Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-3.5">
                <img
                  src={selectedReturn.product.image}
                  alt={selectedReturn.product.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                  }}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs font-black text-slate-900 truncate">
                    {selectedReturn.product.name}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                    <span>Rate: <strong className="text-slate-800">₹{selectedReturn.product.unitPrice}</strong></span>
                    <span>•</span>
                    <span>Qty: <strong className="text-slate-800">{selectedReturn.product.quantity}</strong></span>
                    <span>•</span>
                    <span>Payable: <strong className="text-emerald-700 font-extrabold">₹{selectedReturn.product.totalPrice}</strong></span>
                  </div>
                  {selectedReturn.orderInfo && (
                    <div className="text-[10px] text-slate-400">
                      Order: {selectedReturn.orderId} (Total: ₹{selectedReturn.orderInfo.totalAmount} • {selectedReturn.orderInfo.paymentMethod})
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup Logistics Partner */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Doorstep Logistics Courier</label>
                <select
                  value={approveForm.pickupPartner}
                  onChange={(e) => setApproveForm({ ...approveForm, pickupPartner: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                >
                  <option value="Zippy Express Logistics">Zippy Express Logistics (In-house Instant)</option>
                  <option value="Shadowfax Doorstep Return">Shadowfax Doorstep Return</option>
                  <option value="Delhivery Surface Express">Delhivery Surface Express</option>
                  <option value="Store Dedicated Rider">Store Dedicated Delivery Executive</option>
                </select>
              </div>

              {/* Pickup Time Slot */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Scheduled Pickup Slot</label>
                <select
                  value={approveForm.pickupDate}
                  onChange={(e) => setApproveForm({ ...approveForm, pickupDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                >
                  <option value="Today (04:00 PM - 07:00 PM)">Today (04:00 PM - 07:00 PM) - Express</option>
                  <option value="Tomorrow (10:00 AM - 01:00 PM)">Tomorrow (10:00 AM - 01:00 PM)</option>
                  <option value="Tomorrow (02:00 PM - 06:00 PM)">Tomorrow (02:00 PM - 06:00 PM)</option>
                  <option value="Day After Tomorrow (Anytime)">Day After Tomorrow (Flexible)</option>
                </select>
              </div>

              {/* Refund Policy Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Refund Settlement Rule</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, inspectionPolicy: 'INSPECT_FIRST' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      approveForm.inspectionPolicy === 'INSPECT_FIRST'
                        ? 'border-[#167a46] bg-emerald-50/60 ring-2 ring-[#167a46]/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-slate-900">Inspect First</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Refund released after warehouse check</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, inspectionPolicy: 'INSTANT_ON_PICKUP' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      approveForm.inspectionPolicy === 'INSTANT_ON_PICKUP'
                        ? 'border-[#167a46] bg-emerald-50/60 ring-2 ring-[#167a46]/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-slate-900">Instant on Pickup</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Fast refund upon rider barcode scan</div>
                  </button>
                </div>
              </div>

              {/* Vendor Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Instructions for Customer & Rider (Optional)</label>
                <textarea
                  rows={2}
                  value={approveForm.vendorNotes}
                  onChange={(e) => setApproveForm({ ...approveForm, vendorNotes: e.target.value })}
                  placeholder="e.g. Please hand over in original container or bag..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsApproveOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-5 py-2.5 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white text-xs font-black shadow-md hover:shadow-lg transition-all"
              >
                Confirm & Schedule Pickup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT REQUEST */}
      {isRejectOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Decline Return Claim</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedReturn.returnNumber} • Customer: {selectedReturn.customer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRejectOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Please reject claims only if they violate platform policies or fail evidence checks. The reason entered will be communicated directly to the customer.
                </span>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Predefined Rejection Reason</label>
                <select
                  value={rejectForm.rejectionReason}
                  onChange={(e) => setRejectForm({ ...rejectForm, rejectionReason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Policy violation: Return claimed after 7-day window">
                    Return claimed after return policy window (&gt; 7 days)
                  </option>
                  <option value="Perishable item consumed / seal broken without delivery damage proof">
                    Perishable item consumed / seal broken without delivery damage proof
                  </option>
                  <option value="Physical damage caused post-delivery by customer mishandling">
                    Physical damage caused post-delivery by customer mishandling
                  </option>
                  <option value="Returned product batch/serial number mismatch">
                    Product batch/serial number does not match dispatched order
                  </option>
                  <option value="Incomplete package / missing tags or primary components">
                    Incomplete package / missing tags or primary components
                  </option>
                </select>
              </div>

              {/* Custom Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Detailed Explanation for Customer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectForm.customRemarks}
                  onChange={(e) => setRejectForm({ ...rejectForm, customRemarks: e.target.value })}
                  placeholder="Explain why the return cannot be accepted so the customer receives clear feedback..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start space-x-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rejectForm.confirmedCheckedProof}
                  onChange={(e) => setRejectForm({ ...rejectForm, confirmedCheckedProof: e.target.checked })}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  I have carefully examined the customer's photo proof and verified our dispatch logs before declining this claim.
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PROCESS REFUND */}
      {isRefundOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-[#167a46]">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Release Customer Refund</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedReturn.returnNumber} • {selectedReturn.product.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRefundOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Product Price Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Product Claim Value ({selectedReturn.product.quantity}x @ ₹{selectedReturn.product.unitPrice}):</span>
                  <span className="font-bold text-slate-800">₹{selectedReturn.product.totalPrice}</span>
                </div>
                {selectedReturn.orderInfo?.totalAmount && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Original Order Total:</span>
                    <span className="font-bold text-slate-800">₹{selectedReturn.orderInfo.totalAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-slate-800">{selectedReturn.orderInfo?.paymentMethod || 'COD'} ({selectedReturn.orderInfo?.paymentStatus || 'PAID'})</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Delivery Fee Refund:</span>
                  <span className="font-bold text-slate-800">₹0 (Free Return)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Net Refund Payable:</span>
                  <span className="text-emerald-700 text-lg">
                    ₹{Math.max(0, refundForm.refundAmount - refundForm.deductionAmount)}
                  </span>
                </div>
              </div>

              {/* Refund Method */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Refund Destination Mode</label>
                <select
                  value={refundForm.refundMode}
                  onChange={(e) => setRefundForm({ ...refundForm, refundMode: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                >
                  <option value="ORIGINAL_PAYMENT">Original Payment Method (Card / NetBanking / UPI Gateway)</option>
                  <option value="UPI">Direct Customer UPI VPA (Instant Settlement)</option>
                  <option value="STORE_WALLET">Zippy Store Wallet (Instant Credit + ₹20 Bonus)</option>
                </select>
              </div>

              {/* Deduction if any */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Deduction / Restocking Fee (₹, if any)</label>
                <input
                  type="number"
                  min="0"
                  max={selectedReturn.product.totalPrice}
                  value={refundForm.deductionAmount}
                  onChange={(e) => setRefundForm({ ...refundForm, deductionAmount: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Inspection & Settlement Remarks</label>
                <textarea
                  rows={2}
                  value={refundForm.notes}
                  onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167a46]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsRefundOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Authorize & Release ₹{Math.max(0, refundForm.refundAmount - refundForm.deductionAmount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DISPATCH REPLACEMENT */}
      {isDispatchExchangeOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Dispatch Replacement Item</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedReturn.returnNumber} • Customer: {selectedReturn.customer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchExchangeOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Replacement Product Item</label>
                <input
                  type="text"
                  value={exchangeForm.replacementItem}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, replacementItem: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Courier Partner</label>
                <select
                  value={exchangeForm.courierPartner}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, courierPartner: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Zippy Fast Rider Express">Zippy Fast Rider Express (Delivery in 30 mins)</option>
                  <option value="Shadowfax Local Delivery">Shadowfax Local Delivery</option>
                  <option value="Delhivery Surface Express">Delhivery Surface Express</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Dispatch AWB / Tracking Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={exchangeForm.trackingNumber}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, trackingNumber: e.target.value })}
                  placeholder="e.g. ZP-RPL-982410"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Notes for Customer</label>
                <textarea
                  rows={2}
                  value={exchangeForm.notes}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDispatchExchangeOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatchExchange}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FULL DETAILS DRAWER / MODAL */}
      {isDetailOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 text-[#167a46] shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedReturn.returnNumber}</h3>
                    {renderStatusBadge(selectedReturn.status)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Order Ref: {selectedReturn.orderId} • Claim Type: {selectedReturn.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Product and Customer Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Product Details
                  </span>
                  <div className="flex items-start space-x-3">
                    <img
                      src={selectedReturn.product.image}
                      alt={selectedReturn.product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                      }}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-0.5 text-xs">
                      <div className="font-extrabold text-slate-900">{selectedReturn.product.name}</div>
                      <div className="text-slate-500">SKU: {selectedReturn.product.sku}</div>
                      <div className="font-bold text-slate-800">
                        ₹{selectedReturn.product.totalPrice} ({selectedReturn.product.quantity}x @ ₹{selectedReturn.product.unitPrice})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Pickup Address
                  </span>
                  <div className="font-black text-slate-900">{selectedReturn.customer.name}</div>
                  <div className="text-slate-600 font-medium">
                    {selectedReturn.customer.phone} • {selectedReturn.customer.email}
                  </div>
                  <div className="text-slate-500">
                    {selectedReturn.customer.address}, {selectedReturn.customer.city} ({selectedReturn.customer.pincode})
                  </div>
                </div>
              </div>

              {/* Order & Financial Breakdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Order Financials & Refund Payable
                  </span>
                  {selectedReturn.orderInfo && (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedReturn.orderInfo.paymentMethod} • {selectedReturn.orderInfo.paymentStatus}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold block">Unit Price</span>
                    <span className="font-extrabold text-slate-900 text-sm">₹{selectedReturn.product.unitPrice}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold block">Return Quantity</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedReturn.product.quantity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
                    <span className="text-[10px] text-emerald-700 font-bold block">Claim Item Value</span>
                    <span className="font-black text-emerald-900 text-sm">₹{selectedReturn.product.totalPrice}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold block">Full Order Total</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ₹{selectedReturn.orderInfo?.totalAmount || selectedReturn.product.totalPrice}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs gap-2">
                  <div className="text-slate-500 text-[11px]">
                    Subtotal: <span className="font-bold text-slate-700">₹{selectedReturn.orderInfo?.subtotal || selectedReturn.product.totalPrice}</span>
                    {selectedReturn.orderInfo?.deliveryFee !== undefined && (
                      <> • Delivery: <span className="font-bold text-slate-700">{selectedReturn.orderInfo.deliveryFee > 0 ? `₹${selectedReturn.orderInfo.deliveryFee}` : 'Free'}</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-semibold text-xs">Net Refund Payable:</span>
                    <span className="text-base font-black text-emerald-800">₹{selectedReturn.refund.amount}</span>
                  </div>
                </div>
              </div>

              {/* Customer Claim & Proof Gallery */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer Claim & Evidence
                </span>
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">{selectedReturn.reason.title}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                      {selectedReturn.reason.category}
                    </span>
                  </div>
                  <p className="text-slate-700 italic">"{selectedReturn.reason.customerNotes}"</p>

                  {/* Proof Images */}
                  {selectedReturn.reason.images.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold text-slate-500 mb-1.5">Attached Photos:</div>
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {selectedReturn.reason.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Proof"
                            onClick={() => setLightboxImage(img)}
                            className="w-16 h-16 rounded-xl object-cover border border-amber-200 cursor-pointer hover:scale-105 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Return Activity Audit Trail
                </span>
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedReturn.timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#167a46] border-2 border-white ring-2 ring-[#167a46]/30" />
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900">{event.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{event.timestamp}</span>
                        </div>
                        <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handlePrintSlip(selectedReturn)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Print RMA Slip
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX: PHOTO ENLARGE MODAL */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged Proof"
              className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-900 shadow-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
