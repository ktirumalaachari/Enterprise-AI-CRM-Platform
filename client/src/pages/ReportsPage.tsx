import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle, 
  PieChart as PieIcon, 
  Calendar,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export const ReportsPage = () => {
  const { success, error } = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/summary', {
        params: {
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setReportData(res.data);
    } catch (err) {
      error('Failed to load reports summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fromDate, toDate]);

  const handleExport = async (type: 'deals' | 'customers' | 'activities', format: 'csv' | 'json') => {
    try {
      const response = await api.get('/reports/export', {
        params: { type, format, from: fromDate || undefined, to: toDate || undefined },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      success(`Exported ${type} as ${format.toUpperCase()}`);
    } catch (err) {
      error('Export failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-brand-textPrimary">Executive Reports & Intelligence</h1>
          <p className="text-xs text-brand-textSecondary mt-0.5">Export pipeline metrics, audit histories, and revenue reports.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print PDF Report
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="print:hidden">
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-semibold text-brand-textPrimary">Filter Report Period:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs outline-none"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-xs text-brand-primary font-semibold hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Won Revenue</span>
              <h3 className="text-xl font-extrabold text-brand-textPrimary mt-1">
                ${reportData?.summary?.totalRevenue?.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-brand-primary">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Win Rate</span>
              <h3 className="text-xl font-extrabold text-brand-textPrimary mt-1">
                {reportData?.summary?.winRate || 0}%
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-brand-primary rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Deals</span>
              <h3 className="text-xl font-extrabold text-brand-textPrimary mt-1">
                {reportData?.summary?.totalDeals || 0}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <PieIcon className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasks Complete</span>
              <h3 className="text-xl font-extrabold text-brand-textPrimary mt-1">
                {reportData?.summary?.taskCompletionRate || 0}%
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Breakdown Table & Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Value Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-bold text-xs text-brand-textPrimary">Pipeline Stage Value Breakdown</h3>
          </CardHeader>
          <CardBody className="p-4">
            <div className="flex flex-col gap-3">
              {reportData?.pipelineBreakdown?.map((pb: any) => (
                <div key={pb.stage} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{pb.stage} ({pb.count} deals)</span>
                    <span>${pb.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          reportData?.summary?.totalRevenue > 0
                            ? Math.min(100, Math.round((pb.value / (reportData.summary.totalRevenue || 1)) * 100))
                            : pb.count > 0 ? 30 : 5
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Data Export Triggers */}
        <Card className="print:hidden">
          <CardHeader>
            <h3 className="font-bold text-xs text-brand-textPrimary">Export Data Files</h3>
          </CardHeader>
          <CardBody className="p-4 flex flex-col gap-3">
            <div className="p-3 border border-brand-border rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs">Deals Dataset</h4>
                <p className="text-[10px] text-slate-500">Deals, stages, revenue values</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleExport('deals', 'csv')}>CSV</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('deals', 'json')}>JSON</Button>
              </div>
            </div>

            <div className="p-3 border border-brand-border rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs">Customers Dataset</h4>
                <p className="text-[10px] text-slate-500">Leads, contact info, status</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleExport('customers', 'csv')}>CSV</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('customers', 'json')}>JSON</Button>
              </div>
            </div>

            <div className="p-3 border border-brand-border rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs">Audit Activity Logs</h4>
                <p className="text-[10px] text-slate-500">User actions & security logs</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => handleExport('activities', 'csv')}>CSV</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('activities', 'json')}>JSON</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
