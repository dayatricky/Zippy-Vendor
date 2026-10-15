import type { Metadata } from 'next';
import VendorLayout from '@/components/VendorLayout';
import ReduxProvider from '@/store/ReduxProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zippy Vendor Dashboard - 10-Minute Grocery Delivery',
  description: 'Vendor Dashboard for Zippy Grocery Partners to manage products, orders, payouts, and store settings.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen font-sans bg-[#177843] antialiased">
        <ReduxProvider>
          <VendorLayout>{children}</VendorLayout>
        </ReduxProvider>
      </body>
    </html>
  );
}
