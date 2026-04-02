"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type VaultRecord, type Provider, type RecordCategory } from "@/lib/types";
import { Header } from "@/components/layout/Header";
import {
  Plus, Archive, Stethoscope, Home, Car, DollarSign, Scale,
  ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Minus,
  Clock, CheckCircle2, Pencil, Trash2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, typeof Archive> = {
  stethoscope: Stethoscope,
  home: Home,
  car: Car,
  "dollar-sign": DollarSign,
  scale: Scale,
};

const WOULD_USE_OPTIONS = [
  { value: true, label: "Would use again", icon: ThumbsUp, color: "text-emerald-400" },
  { value: false, label: "Would NOT use again", icon: ThumbsDown, color: "text-red-400" },
  { value: null, label: "No opinion", icon: Minus, color: "text-muted-foreground" },
] as const;

interface RecordForm {
  title: string;
  record_category_id: string;
  provider_name: string;
  specialty: string;
  service_date: string;
  cost: string;
  description: string;
  outcome: string;
  follow_up_date: string;
  follow_up_notes: string;
  would_use_again: boolean | null;
}

const emptyForm = (): RecordForm => ({
  title: "",
  record_category_id: "",
  provider_name: "",
  specialty: "",
  service_date: new Date().toISOString().split("T")[0],
  cost: "",
  description: "",
  outcome: "",
  follow_up_date: "",
  follow_up_notes: "",
  would_use_again: null,
});

export default function RecordsPage() {
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [categories, setCategories] = useState<RecordCategory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<VaultRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const fetchData = async () => {
    const supabase = createClient();
    const [{ data: recs }, { data: cats }] = await Promise.all([
      supabase
        .from("records")
        .select("*, provider:providers(*), record_category:record_categories(*)")
        .order("service_date", { ascending: false }),
      supabase.from("record_categories").select("*").order("sort_order"),
    ]);
    setRecords(recs ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    setEditRecord(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (rec: VaultRecord) => {
    setEditRecord(rec);
    setForm({
      title: rec.title,
      record_category_id: rec.record_category_id ?? "",
      provider_name: rec.provider?.name ?? "",
      specialty: rec.provider?.specialty ?? "",
      service_date: rec.service_date,
      cost: rec.cost != null ? String(rec.cost) : "",
      description: rec.description ?? "",
      outcome: rec.outcome ?? "",
      follow_up_date: rec.follow_up_date ?? "",
      follow_up_notes: rec.follow_up_notes ?? "",
      would_use_again: rec.would_use_again,
    });
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!form.title.trim() || !form.service_date) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find or create provider
    let providerId: string | null = null;
    if (form.provider_name.trim()) {
      const { data: existing } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", form.provider_name.trim())
        .maybeSingle();

      if (existing) {
        providerId = existing.id;
        await supabase.from("providers").update({
          specialty: form.specialty || null,
          would_use_again: form.would_use_again,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        const { data: newProv } = await supabase.from("providers").insert({
          user_id: user.id,
          name: form.provider_name.trim(),
          record_category_id: form.record_category_id || null,
          specialty: form.specialty || null,
          would_use_again: form.would_use_again,
        }).select("id").single();
        if (newProv) providerId = newProv.id;
      }
    }

    const payload = {
      title: form.title.trim(),
      record_category_id: form.record_category_id || null,
      provider_id: providerId,
      service_date: form.service_date,
      cost: form.cost ? parseFloat(form.cost) : null,
      description: form.description || null,
      outcome: form.outcome || null,
      follow_up_date: form.follow_up_date || null,
      follow_up_notes: form.follow_up_notes || null,
      would_use_again: form.would_use_again,
      updated_at: new Date().toISOString(),
    };

    if (editRecord) {
      await supabase.from("records").update(payload).eq("id", editRecord.id);
    } else {
      await supabase.from("records").insert({ ...payload, user_id: user.id });
    }

    setShowForm(false);
    setSaving(false);
    fetchData();
  };

  const deleteRecord = async (id: string) => {
    const supabase = createClient();
    await supabase.from("records").delete().eq("id", id);
    fetchData();
  };

  const markFollowUpDone = async (id: string) => {
    const supabase = createClient();
    await supabase.from("records").update({ follow_up_completed: true, updated_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  const today = new Date().toISOString().split("T")[0];

  const getFollowUpStatus = (rec: VaultRecord) => {
    if (!rec.follow_up_date || rec.follow_up_completed) return null;
    const daysUntil = Math.ceil(
      (new Date(rec.follow_up_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return { label: "Overdue", color: "bg-red-500/20 text-red-400 border-red-500/30" };
    if (daysUntil <= 14) return { label: `In ${daysUntil}d`, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    if (daysUntil <= 30) return { label: `In ${daysUntil}d`, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    return null;
  };

  const tabs = ["All", ...categories.map((c) => c.name)];

  const filteredRecords = records.filter((r) => {
    const matchesTab = activeTab === "All" || r.record_category?.name === activeTab;
    const matchesSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.provider?.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const grouped = categories.map((cat) => ({
    category: cat,
    records: filteredRecords.filter((r) => r.record_category_id === cat.id),
  })).filter((g) => activeTab === "All" ? g.records.length > 0 : g.category.name === activeTab);

  return (
    <div className="flex flex-col h-full">
      <Header title="Records Vault" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={openAdd} className="shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Record
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Archive className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No records yet</p>
              <p className="text-sm mt-1">Brain dump a service call or doctor visit, or click Add Record</p>
            </div>
          ) : (
            grouped.map(({ category, records: catRecords }) => {
              const Icon = categoryIcons[category.icon ?? ""] ?? Archive;
              const isExpanded = expanded.has(category.id) || activeTab !== "All";
              return (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <button
                      className="flex items-center gap-2 w-full text-left"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <Icon className="w-4 h-4" style={{ color: category.color }} />
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{catRecords.length}</Badge>
                    </button>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-2">
                      {catRecords.map((rec) => {
                        const followUp = getFollowUpStatus(rec);
                        const isOpen = expandedRecord === rec.id;
                        return (
                          <div key={rec.id} className="border rounded-lg overflow-hidden">
                            {/* Record header row */}
                            <div
                              className="flex items-start gap-3 p-3 hover:bg-accent/30 cursor-pointer transition-colors"
                              onClick={() => setExpandedRecord(isOpen ? null : rec.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{rec.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {rec.provider && (
                                    <span className="text-xs text-muted-foreground">
                                      {rec.provider.name}
                                      {rec.provider.specialty ? ` · ${rec.provider.specialty}` : ""}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(rec.service_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                  {rec.cost != null && (
                                    <span className="text-xs text-muted-foreground">${rec.cost.toLocaleString()}</span>
                                  )}
                                  {followUp && (
                                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full border", followUp.color)}>
                                      {followUp.label === "Overdue" && <AlertCircle className="w-2.5 h-2.5 inline mr-1" />}
                                      {followUp.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {rec.would_use_again === true && <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />}
                                {rec.would_use_again === false && <ThumbsDown className="w-3.5 h-3.5 text-red-400" />}
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); openEdit(rec); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                                  onClick={(e) => { e.stopPropagation(); deleteRecord(rec.id); }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {/* Expanded detail */}
                            {isOpen && (
                              <div className="px-3 pb-3 space-y-2 border-t bg-accent/10">
                                {rec.description && (
                                  <p className="text-sm text-muted-foreground pt-2">{rec.description}</p>
                                )}
                                {rec.outcome && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground font-medium">Outcome: </span>
                                    {rec.outcome}
                                  </div>
                                )}
                                {rec.follow_up_date && !rec.follow_up_completed && (
                                  <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>
                                        {rec.follow_up_notes ?? "Follow-up"} —{" "}
                                        {new Date(rec.follow_up_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                      </span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400"
                                      onClick={() => markFollowUpDone(rec.id)}>
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                      Done
                                    </Button>
                                  </div>
                                )}
                                {rec.follow_up_completed && (
                                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Follow-up completed
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRecord ? "Edit Record" : "Add Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.record_category_id}
              onChange={(e) => setForm({ ...form, record_category_id: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Provider / Doctor / Company" value={form.provider_name}
                onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
              <Input placeholder="Specialty (e.g., Dermatologist)" value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Service date *</label>
                <Input type="date" value={form.service_date}
                  onChange={(e) => setForm({ ...form, service_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cost ($)</label>
                <Input type="number" placeholder="0.00" value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
            </div>
            <Textarea placeholder="Description / notes" value={form.description} rows={2}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Outcome / result" value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Follow-up date</label>
                <Input type="date" value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
              </div>
              <Input placeholder="Follow-up notes" value={form.follow_up_notes}
                onChange={(e) => setForm({ ...form, follow_up_notes: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Would use again?</label>
              <div className="flex gap-2">
                {WOULD_USE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.would_use_again === opt.value;
                  return (
                    <button key={String(opt.value)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                        isSelected ? "border-accent-foreground bg-accent" : "border-input hover:bg-accent/50")}
                      onClick={() => setForm({ ...form, would_use_again: opt.value as boolean | null })}>
                      <Icon className={cn("w-3.5 h-3.5", isSelected ? opt.color : "text-muted-foreground")} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={saveRecord} disabled={saving || !form.title.trim()} className="w-full">
              {saving ? "Saving..." : editRecord ? "Save Changes" : "Add Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
