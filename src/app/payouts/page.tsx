'use client';

import React, { useState } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  CheckCircle2,
  Clock,
  Building,
  X,
  FileText,
} from 'lucide-react';
import { useVendorStore } from '@/store/useVendorStore';
import { useGetOrdersQuery } from '@/store/api/vendorApi';

export default function PayoutsPage() {
  const { vendor, payouts, requestPayout, setStoreModalOpen } = useVendorStore();
  const { data: ordersApiData } = useGetOrdersQuery();

  // Extract real completed orders to compute actual earnings
  const completedOrdersTotal = (() => {
    if (!ordersApiData) return 0;
    let list = Array.isArray(ordersApiData) ? ordersApiData : (ordersApiData as any).data || (ordersApiData as any).orders || (ordersApiData as any).items || [];
    if (!Array.isArray(list) && Array.isArray((list as any)?.orders)) list = (list as any).orders;
    if (!Array.isArray(list) && Array.isArray((list as any)?.items)) list = (list as any).items;
    if (!Array.isArray(list)) return 0;
    return list
      .filter((o: any) => {
        const status = String(o.status || o.order_status || '').toUpperCase();
        return status === 'COMPLETED' || status === 'DELIVERED';
      })
      .reduce((sum: number, o: any) => sum + Number(o.billing_details?.total_amount ?? o.total_amount ?? o.grand_total ?? 0), 0);
  })();

  const grossSales = completedOrdersTotal;
  const adminCommission = grossSales * (vendor.commissionRate || 0.1);
  const totalNetEarnings = grossSales - adminCommission;

  const processedTotal = payouts
    .filter((p) => p.status === 'PROCESSED')
    .reduce((sum, p) => sum + p.amount, 0);

  const availableBalance = Math.max(0, totalNetEarnings - processedTotal);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('5000');

  const handleRequestPayoutClick = () => {
    if (vendor.approvalStatus === 'NOT_REGISTERED') {
      setStoreModalOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const handleRequestPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(requestAmount);
    if (!amountNum || amountNum <= 0 || amountNum > availableBalance) return;

    requestPayout(amountNum);
    setIsModalOpen(false);
    setRequestAmount('5000');
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-[#167a46]" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Earnings & Payout Ledger</h1>
          </div>
          <p className="text-slate-600 text-xs md:text-sm mt-1">
            Track gross sales, Zippy 10% admin commission, net earnings, and request bank payouts.
          </p>
        </div>

        <button
          onClick={handleRequestPayoutClick}
          className="px-5 py-3 rounded-2xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-sm transition-all flex items-center space-x-2 shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Financial Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross Sales */}
        <div className="white-card p-6 space-y-3 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales Volume</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#167a46] border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">₹{grossSales.toLocaleString('en-IN')}</div>
          <p className="text-xs text-slate-500">100% total sales executed through Zippy</p>
        </div>

        {/* 10% Commission */}
        <div className="white-card p-6 space-y-3 shadow-sm border border-amber-200 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Admin 10% Commission</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700">₹{adminCommission.toLocaleString('en-IN')}</div>
          <p className="text-xs text-amber-800/80">Standard Zippy platform fee (10%)</p>
        </div>

        {/* Available Payout Balance */}
        <div className="white-card p-6 space-y-3 shadow-md border-2 border-[#167a46] bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#167a46] uppercase tracking-wider">Available Payout Balance</span>
            <div className="w-10 h-10 rounded-2xl bg-[#167a46] text-white flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#167a46]">₹{availableBalance.toLocaleString('en-IN')}</div>
          <p className="text-xs text-slate-600">Ready for instant transfer to bank</p>
        </div>
      </div>

      {/* Banking Info Box */}
      <div className="white-card p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#167a46]">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase">Linked Bank Account</div>
            <div className="text-sm font-black text-slate-900">
              HDFC Bank • Account No: {vendor.bankAccount} ({vendor.ifscCode})
            </div>
          </div>
        </div>
        <div className="text-xs text-[#167a46] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
          Settlements processed within 24 hours
        </div>
      </div>

      {/* Payout History Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-[#167a46]" />
          <h2 className="text-lg font-bold text-slate-900">Payout History Ledger</h2>
        </div>

        <div className="white-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase font-bold">
                  <th className="p-4">Payout ID</th>
                  <th className="p-4">Gross Amount</th>
                  <th className="p-4">10% Fee</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Transfer Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No payout requests yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">When your store generates sales, you will be able to submit payout requests here.</p>
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">{p.id}</td>
                      <td className="p-4 text-slate-800 font-medium">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-amber-700 font-medium">- ₹{p.commissionDeducted.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-black text-[#167a46]">₹{p.netAmount.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-slate-500 text-xs">{p.date}</td>
                      <td className="p-4">
                        {p.status === 'PROCESSED' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PROCESSED</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>PENDING TRANSFER</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="white-card max-w-md w-full p-6 space-y-6 shadow-2xl relative border-2 border-[#167a46]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#167a46]" />
                <h3 className="text-xl font-black text-slate-900">Request Bank Payout</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRequestPayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Available Balance</label>
                <div className="text-2xl font-black text-[#167a46] bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  ₹{availableBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payout Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="500"
                  max={availableBalance}
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="custom-input w-full px-4 py-2.5 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  10% Zippy commission (₹{(parseFloat(requestAmount || '0') * 0.1).toFixed(0)}) will be automatically deducted.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#167a46] hover:bg-[#12653a] text-white font-bold text-xs shadow-md"
                >
                  Confirm Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
