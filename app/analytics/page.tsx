"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";

// ⚠️ REPLACE WITH YOUR ANALYTICS WORKFLOW URL
const ANALYTICS_API_URL = "https://n8n.applyforge.cloud/webhook/analytics";

interface AnalyticsData {
  messagesPerHour: { hour: string; count: number }[];
  toolUsage: { tool: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Real-time insights from your AI Agent.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chat
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[350px] bg-slate-200 animate-pulse rounded-xl"></div>
            <div className="h-[350px] bg-slate-200 animate-pulse rounded-xl"></div>
          </div>
        )}

        {/* Charts Grid */}
        {!loading && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Graph 1: Messages Per Hour */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Activity Volume</CardTitle>
                <CardDescription>Number of messages processed per hour</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.messagesPerHour?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.messagesPerHour}>
                      <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No data available yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Graph 2: Tool Usage */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Tool Usage Distribution</CardTitle>
                <CardDescription>Breakdown of tools used by the AI</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.toolUsage?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.toolUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="tool"
                      >
                        {data.toolUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No tool usage recorded.
                  </div>
                )}
              </CardContent>
            </Card>
            
          </div>
        )}
      </div>
    </div>
  );
}