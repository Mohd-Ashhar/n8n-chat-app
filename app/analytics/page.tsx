"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Activity,
  Wrench,
  MessageSquare,
  Clock,
} from "lucide-react";

const ANALYTICS_API_URL = "https://n8n.applyforge.cloud/webhook/analytics";

interface AnalyticsData {
  messagesPerHour: { hour: string; count: number }[];
  toolUsage: { tool: string; count: number }[];
}

// Premium Color Palette
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(ANALYTICS_API_URL);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err) {
      console.error(err);
      setError("Could not load analytics data. Ensure n8n workflow is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🛠️ DATA PROCESSING HELPER
  // Fixes the issue where "AI Agent" appears multiple times in the legend
  const processedData = useMemo(() => {
    if (!data) return null;

    // Aggregate Tool Usage
    const toolMap = new Map<string, number>();
    data.toolUsage.forEach((item) => {
      // Clean the tool name (optional) and sum counts
      const name = item.tool || "Unknown";
      toolMap.set(name, (toolMap.get(name) || 0) + item.count);
    });

    const aggregatedTools = Array.from(toolMap.entries()).map(
      ([tool, count]) => ({ tool, count })
    );

    // Calculate Total Messages
    const totalMessages = data.messagesPerHour.reduce(
      (acc, curr) => acc + curr.count,
      0
    );

    // Find Peak Hour
    const peakHourObj = data.messagesPerHour.reduce(
      (prev, current) => (prev.count > current.count ? prev : current),
      { hour: "N/A", count: 0 }
    );

    return {
      messagesPerHour: data.messagesPerHour,
      toolUsage: aggregatedTools,
      totalMessages,
      peakHour: peakHourObj.hour,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Analytics Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              Real-time performance metrics and usage insights.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button
                variant="outline"
                className="bg-white hover:bg-slate-50 border-slate-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chat
              </Button>
            </Link>
            <Button
              onClick={fetchData}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Data
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />{" "}
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
            <div className="col-span-1 md:col-span-2 h-[400px] bg-slate-200 rounded-xl mt-6"></div>
            <div className="col-span-1 md:col-span-2 h-[400px] bg-slate-200 rounded-xl mt-6"></div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && processedData && (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard
                title="Total Messages"
                value={processedData.totalMessages}
                icon={<MessageSquare className="w-5 h-5 text-indigo-500" />}
                subtext="All time volume"
              />
              <KpiCard
                title="Peak Hour"
                value={processedData.peakHour}
                icon={<Clock className="w-5 h-5 text-emerald-500" />}
                subtext="Most active time"
              />
              <KpiCard
                title="Active Tools"
                value={processedData.toolUsage.length}
                icon={<Wrench className="w-5 h-5 text-amber-500" />}
                subtext="Unique integrations"
              />
              <KpiCard
                title="System Status"
                value="Healthy"
                icon={<Activity className="w-5 h-5 text-rose-500" />}
                subtext="All systems operational"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Volume */}
              <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Activity Volume</CardTitle>
                  <CardDescription>
                    Message processing distribution over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processedData.messagesPerHour}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorBar"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="hour"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b" }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f1f5f9" }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#colorBar)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Chart 2: Tool Usage (Donut) */}
              <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Tool Usage Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of AI capabilities utilized
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedData.toolUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="tool"
                        stroke="none"
                      >
                        {processedData.toolUsage.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text for Donut */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-6 text-center pointer-events-none">
                    <span className="block text-2xl font-bold text-slate-800">
                      {processedData.toolUsage.length}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                      Tools
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Simple KPI Card Component
function KpiCard({
  title,
  value,
  icon,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-slate-500 mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}
