import { useDashboardData } from '@/hooks/useDashboardData';
import type { Gericht } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GerichtDialog } from '@/components/dialogs/GerichtDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch, IconChefHat,
  IconCurrencyEuro, IconCategory, IconStar,
} from '@tabler/icons-react';

const APPGROUP_ID = '69e8b5612fac9c302abeb8fa';
const REPAIR_ENDPOINT = '/claude/build/repair';

const CATEGORY_COLORS: Record<string, string> = {
  hauptgericht: 'bg-orange-100 text-orange-800 border-orange-200',
  beilage: 'bg-green-100 text-green-800 border-green-200',
  vorspeise: 'bg-blue-100 text-blue-800 border-blue-200',
  dessert: 'bg-pink-100 text-pink-800 border-pink-200',
  getraenk: 'bg-purple-100 text-purple-800 border-purple-200',
};

const CATEGORY_ORDER = ['vorspeise', 'hauptgericht', 'beilage', 'dessert', 'getraenk'];

export default function DashboardOverview() {
  const { gericht, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Gericht | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gericht | null>(null);

  const kategorieOptions = LOOKUP_OPTIONS['gericht']?.['kategorie'] ?? [];

  const filtered = useMemo(() => {
    let result = gericht;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        (g.fields.gericht_name ?? '').toLowerCase().includes(q) ||
        (g.fields.beschreibung ?? '').toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter(g => g.fields.kategorie?.key === activeCategory);
    }
    return result;
  }, [gericht, search, activeCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, Gericht[]> = {};
    for (const g of filtered) {
      const key = g.fields.kategorie?.key ?? 'sonstiges';
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return map;
  }, [filtered]);

  const sortedCategories = useMemo(() => {
    const keys = Object.keys(grouped);
    return keys.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [grouped]);

  const stats = useMemo(() => {
    const total = gericht.length;
    const avgPreis = total > 0
      ? gericht.reduce((s, g) => s + (g.fields.preis ?? 0), 0) / total
      : 0;
    const hauptgerichte = gericht.filter(g => g.fields.kategorie?.key === 'hauptgericht').length;
    const kategorien = new Set(gericht.map(g => g.fields.kategorie?.key).filter(Boolean)).size;
    return { total, avgPreis, hauptgerichte, kategorien };
  }, [gericht]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreate = async (fields: Gericht['fields']) => {
    await LivingAppsService.createGerichtEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Gericht['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateGerichtEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteGerichtEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gerichte gesamt"
          value={String(stats.total)}
          description="Im Angebot"
          icon={<IconChefHat size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Hauptgerichte"
          value={String(stats.hauptgerichte)}
          description="Hauptgang"
          icon={<IconStar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Preis"
          value={stats.avgPreis > 0 ? formatCurrency(stats.avgPreis) : '—'}
          description="Durchschnitt"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(stats.kategorien)}
          description="Verfügbar"
          icon={<IconCategory size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Such- und Filterzeile */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Gericht suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
          className="shrink-0 w-full sm:w-auto"
        >
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Gericht hinzufügen
        </Button>
      </div>

      {/* Kategoriefilter-Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !activeCategory
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          Alle
        </button>
        {kategorieOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setActiveCategory(activeCategory === opt.key ? null : opt.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === opt.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Speisekarte */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <IconChefHat size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-muted-foreground font-medium">Keine Gerichte gefunden</p>
          <p className="text-sm text-muted-foreground">
            {search || activeCategory ? 'Passe deine Suche an.' : 'Füge das erste Gericht hinzu.'}
          </p>
          {!search && !activeCategory && (
            <Button
              size="sm"
              onClick={() => { setEditRecord(null); setDialogOpen(true); }}
              className="mt-2"
            >
              <IconPlus size={14} className="mr-1" />
              Erstes Gericht anlegen
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map(catKey => {
            const catLabel = kategorieOptions.find(o => o.key === catKey)?.label ?? catKey;
            const colorClass = CATEGORY_COLORS[catKey] ?? 'bg-gray-100 text-gray-800 border-gray-200';
            const items = grouped[catKey];
            return (
              <section key={catKey}>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className={`${colorClass} border font-semibold text-sm px-3 py-1`}>
                    {catLabel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'Gericht' : 'Gerichte'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(g => (
                    <GerichtCard
                      key={g.record_id}
                      gericht={g}
                      onEdit={() => { setEditRecord(g); setDialogOpen(true); }}
                      onDelete={() => setDeleteTarget(g)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <GerichtDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Gericht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Gericht']}
      />

      {/* Löschen bestätigen */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Gericht löschen"
        description={`Soll „${deleteTarget?.fields.gericht_name ?? 'dieses Gericht'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function GerichtCard({
  gericht,
  onEdit,
  onDelete,
}: {
  gericht: Gericht;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { gericht_name, beschreibung, preis, kategorie } = gericht.fields;
  const colorClass = CATEGORY_COLORS[kategorie?.key ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <div className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base text-foreground leading-tight min-w-0 truncate">
            {gericht_name ?? '—'}
          </h3>
          {preis != null && (
            <span className="shrink-0 font-bold text-primary text-sm">
              {formatCurrency(preis)}
            </span>
          )}
        </div>
        {beschreibung && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-w-0">
            {beschreibung}
          </p>
        )}
        {kategorie && (
          <div className="mt-auto pt-1">
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
              {kategorie.label}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 pb-3 flex gap-2 border-t pt-2.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onEdit}
        >
          <IconPencil size={13} className="mr-1 shrink-0" />
          Bearbeiten
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
