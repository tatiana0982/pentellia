"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Loader2,
  Info,
  Shield,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Globe,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { triggerNotificationRefresh } from "@/lib/events";

// --- Types ---
interface ToolParam {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  defaultValue?: any;
  options?: string[];
  placeholder?: string;
}

interface ToolConfig {
  id: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  version?: string;
  slug: string;
  params: ToolParam[];
}

export default function ToolScanPage() {
  const params = useParams();
  const router = useRouter();
  const toolSlug = params.tool as string;

  const [config, setConfig] = useState<ToolConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [target, setTarget] = useState("");
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Fetch Configuration ---
  useEffect(() => {
    const fetchToolConfig = async () => {
      try {
        const res = await fetch("/api/tools");
        const data = await res.json();

        if (data.success) {
          const foundTool = data.tools.find(
            (t: ToolConfig) => t.slug === toolSlug,
          );

          if (foundTool) {
            // Handle JSON parsing safely (DB might return string or object)
            let parsedParams: ToolParam[] = [];
            if (typeof foundTool.params === "string") {
              try {
                parsedParams = JSON.parse(foundTool.params);
              } catch (e) {
                parsedParams = [];
              }
            } else if (Array.isArray(foundTool.params)) {
              parsedParams = foundTool.params;
            }

            foundTool.params = parsedParams;
            setConfig(foundTool);

            // Initialize Defaults
            const defaults: Record<string, any> = {};
            parsedParams.forEach((p) => {
              if (p.defaultValue !== undefined) {
                defaults[p.key] = p.defaultValue;
              }
            });
            setFormParams(defaults);
          } else {
            setConfig(null);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load tool configuration");
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchToolConfig();
  }, [toolSlug]);

  // --- Handlers ---

  const handleParamChange = (key: string, value: any) => {
    setFormParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) {
      toast.error("Please enter a target URL or IP.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Send Request to Next.js API
      const response = await fetch(`/api/dashboard/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: config?.id,
          target: target,
          params: formParams,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Scan initiated successfully");
        triggerNotificationRefresh();
        // 2. Redirect to the Report/Status Page using the returned scanId
        router.push(`/dashboard/scans/${toolSlug}/${data.scanId}`);
      } else {
        throw new Error(data.error || "Failed to start scan");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Helper: Generate Dynamic Terminal Command Preview ---
  const getCommandPreview = () => {
    if (!config) return "";
    let cmd = `$ ${config.id} -t ${target || "<target>"}`;

    if (config.params) {
      Object.entries(formParams).forEach(([key, value]) => {
        // Skip default values to keep command clean (optional preference)
        const paramDef = config.params.find((p) => p.key === key);
        if (value === "" || value === null) return;

        if (paramDef?.type === "boolean") {
          if (value === true) cmd += ` --${key}`;
        } else {
          cmd += ` --${key} ${value}`;
        }
      });
    }
    return cmd;
  };

  // --- Loading State ---
  if (loadingConfig) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 animate-pulse p-4">
        <div className="space-y-4">
          <div className="h-4 w-24 bg-white/5 rounded"></div>
          <div className="flex justify-between">
            <div className="h-8 w-64 bg-white/5 rounded"></div>
            <div className="h-6 w-20 bg-white/5 rounded-full"></div>
          </div>
          <div className="h-4 w-96 bg-white/5 rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-white/5 rounded-2xl border border-white/10"></div>
          <div className="h-[300px] bg-white/5 rounded-2xl border border-white/10"></div>
        </div>
      </div>
    );
  }

  // --- Not Found State ---
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
        <AlertCircle className="h-12 w-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white">Tool Not Found</h2>
        <p>The scanner "{toolSlug}" does not exist.</p>
        <Button
          onClick={() => router.back()}
          variant="link"
          className="mt-4 text-violet-400"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 font-sans text-slate-200 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-xs text-slate-500 hover:text-violet-400 transition-colors w-fit"
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to Tools
        </button>

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {config.name}
              {config.version && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  {config.version}
                </span>
              )}
            </h1>
            <p className="text-slate-400 max-w-2xl">{config.description}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500 px-3 py-1 rounded-full bg-[#0B0C15] border border-white/10">
              {config.category} Tool
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- LEFT COL: Form --- */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleScanSubmit}>
            <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 backdrop-blur-md shadow-xl p-6 md:p-8 space-y-8">
              {/* Target Input */}
              <div className="space-y-3">
                <Label
                  htmlFor="target"
                  className="text-base font-semibold text-white flex items-center gap-2"
                >
                  <Globe className="h-4 w-4 text-violet-500" /> Target
                </Label>
                <div className="relative">
                  <Input
                    id="target"
                    placeholder="e.g. example.com, 192.168.1.1"
                    className="h-12 bg-white/5 border-white/10 text-lg text-white placeholder:text-slate-600 focus-visible:ring-violet-500 pl-4"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                      Required
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Params */}
              {config.params && config.params.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <Settings2 className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-medium text-slate-300">
                      Configuration
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {config.params.map((param) => (
                      <div
                        key={param.key}
                        className={cn(
                          "space-y-2",
                          param.type === "boolean" &&
                            "flex flex-row items-center justify-between space-y-0 md:col-span-2 p-3 rounded-lg bg-white/5 border border-white/5",
                        )}
                      >
                        <Label
                          htmlFor={param.key}
                          className="text-sm font-medium text-slate-300"
                        >
                          {param.label}
                        </Label>

                        {(param.type === "text" || param.type === "number") && (
                          <Input
                            id={param.key}
                            type={param.type}
                            placeholder={param.placeholder}
                            value={formParams[param.key] || ""}
                            onChange={(e) =>
                              handleParamChange(param.key, e.target.value)
                            }
                            className="bg-black/20 border-white/10 text-white"
                          />
                        )}

                        {param.type === "select" && (
                          <Select
                            value={formParams[param.key]}
                            onValueChange={(val) =>
                              handleParamChange(param.key, val)
                            }
                          >
                            <SelectTrigger className="bg-black/20 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1B26] border-white/10 text-slate-200">
                              {param.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {param.type === "boolean" && (
                          <Switch
                            id={param.key}
                            checked={formParams[param.key] || false}
                            onCheckedChange={(val) =>
                              handleParamChange(param.key, val)
                            }
                            className="data-[state=checked]:bg-violet-600"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> <span>Est. ~2-5 mins</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4 fill-current" /> Start
                        Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* --- RIGHT COL: Info --- */}
        <div className="space-y-6">
          {/* About Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/30 p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Info className="h-4 w-4 text-violet-400" /> About this tool
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {config.long_description || config.description}
            </p>

            <div className="pt-4 flex gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Active
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/5 text-slate-400 border-white/10 text-[10px]"
              >
                <Shield className="w-3 h-3 mr-1" /> Verified
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
