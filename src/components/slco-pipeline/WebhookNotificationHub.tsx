// TerraFusion OS — Phase 65: Real-time Webhook Notification Hub
// Manages outbound webhook subscriptions, dispatch, & delivery monitoring.

import { useState } from "react";
import {
  useWebhookEndpoints,
  useWebhookDeliveries,
  useCreateWebhookEndpoint,
  useToggleWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useTestWebhookEndpoint,
  useDispatchWebhookEvent,
  useWebhookProviderMetrics,
  useDrainWebhookQueue,
  useWebhookStats,
  useWebhookRealtime,
  WEBHOOK_EVENT_TYPES,
  getWebhookProviderConfig,
  type WebhookEndpoint,
  type WebhookDelivery,
} from "@/hooks/useWebhookHub";
import { useActiveCountyId } from "@/hooks/useActiveCounty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Webhook,
  Plus,
  Trash2,
  TestTube,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
  Send,
  Loader2,
  Globe,
  Shield,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

function getProviderLabel(endpoint: Pick<WebhookEndpoint, "url" | "metadata">) {
  const config = getWebhookProviderConfig(endpoint.metadata ?? {});
  if (config.providerKey.trim()) {
    return config.providerKey.trim();
  }

  try {
    return new URL(endpoint.url).hostname;
  } catch {
    return "generic";
  }
}

// ── Stats Cards ────────────────────────────────────────────────────
function StatsRow() {
  const stats = useWebhookStats();
  const items = [
    { label: "Endpoints", value: stats.totalEndpoints, icon: Webhook },
    { label: "Active", value: stats.activeEndpoints, icon: Zap },
    { label: "Deliveries", value: stats.totalDeliveries, icon: Send },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50 bg-card/80">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{item.value}</div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Create Endpoint Dialog ─────────────────────────────────────────
function CreateEndpointDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [providerKey, setProviderKey] = useState("");
  const [tokenBucketCapacity, setTokenBucketCapacity] = useState(60);
  const [refillPerMinute, setRefillPerMinute] = useState(60);
  const [queueOnThrottle, setQueueOnThrottle] = useState(true);
  const [circuitFailureThreshold, setCircuitFailureThreshold] = useState(5);
  const [circuitResetTimeoutMs, setCircuitResetTimeoutMs] = useState(30_000);
  const createMutation = useCreateWebhookEndpoint();

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCreate = () => {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
      toast.error("Name, URL, and at least one event type are required");
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        url: url.trim(),
        event_types: selectedEvents,
        secret: secret.trim() || undefined,
        metadata: {
          providerKey: providerKey.trim() || undefined,
          tokenBucketCapacity,
          refillPerMinute,
          queueOnThrottle,
          circuitFailureThreshold,
          circuitResetTimeoutMs,
        },
      },
      {
        onSuccess: () => {
          toast.success("Webhook endpoint created");
          setOpen(false);
          setName("");
          setUrl("");
          setSecret("");
          setSelectedEvents([]);
          setProviderKey("");
          setTokenBucketCapacity(60);
          setRefillPerMinute(60);
          setQueueOnThrottle(true);
          setCircuitFailureThreshold(5);
          setCircuitResetTimeoutMs(30_000);
        },
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Endpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> New Webhook Endpoint
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack Pipeline Alerts" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/webhook" />
          </div>
          <div>
            <Label>Secret (optional)</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="HMAC signing secret" type="password" />
          </div>
          <div>
            <Label>Event Types</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {WEBHOOK_EVENT_TYPES.map((evt) => (
                <Badge
                  key={evt}
                  variant={selectedEvents.includes(evt) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] transition-colors"
                  onClick={() => toggleEvent(evt)}
                >
                  {evt}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
            <div>
              <Label>Provider Key</Label>
              <Input value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="Auto-detect from hostname" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bucket Capacity</Label>
                <Input type="number" min={1} value={tokenBucketCapacity} onChange={(e) => setTokenBucketCapacity(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Refill / Min</Label>
                <Input type="number" min={1} value={refillPerMinute} onChange={(e) => setRefillPerMinute(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Breaker Failures</Label>
                <Input type="number" min={1} value={circuitFailureThreshold} onChange={(e) => setCircuitFailureThreshold(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Reset Timeout (ms)</Label>
                <Input type="number" min={1000} step={1000} value={circuitResetTimeoutMs} onChange={(e) => setCircuitResetTimeoutMs(Number(e.target.value) || 1000)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
              <div>
                <div className="text-xs font-medium">Queue On Throttle</div>
                <div className="text-[10px] text-muted-foreground">Persist overflow and throttled deliveries instead of failing fast.</div>
              </div>
              <Switch checked={queueOnThrottle} onCheckedChange={setQueueOnThrottle} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Endpoint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dispatch Event Dialog ──────────────────────────────────────────
function DispatchEventDialog() {
  const countyId = useActiveCountyId();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState("");
  const [payloadStr, setPayloadStr] = useState("{}");
  const dispatchMutation = useDispatchWebhookEvent();

  const handleDispatch = () => {
    if (!eventType) {
      toast.error("Select an event type");
      return;
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      toast.error("Invalid JSON payload");
      return;
    }
    dispatchMutation.mutate(
      { event_type: eventType, payload, county_id: countyId ?? undefined },
      {
        onSuccess: (result) => {
          const queueNote = result.queued > 0 ? `, ${result.queued} queued` : "";
          toast.success(`Dispatched to ${result.dispatched} endpoint(s), ${result.delivered} delivered${queueNote}`);
          setOpen(false);
        },
        onError: (err) => toast.error(`Dispatch failed: ${err.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Dispatch Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Dispatch Webhook Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Event Type</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {WEBHOOK_EVENT_TYPES.map((evt) => (
                <Badge
                  key={evt}
                  variant={eventType === evt ? "default" : "outline"}
                  className="cursor-pointer text-[10px] transition-colors"
                  onClick={() => setEventType(evt)}
                >
                  {evt}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Payload (JSON)</Label>
            <textarea
              className="w-full h-24 mt-1 p-2 rounded-md border border-border bg-muted/30 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              value={payloadStr}
              onChange={(e) => setPayloadStr(e.target.value)}
            />
          </div>
          <Button onClick={handleDispatch} disabled={dispatchMutation.isPending} className="w-full">
            {dispatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Fire Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderHealthBoard({ countyId }: { countyId: string | null }) {
  const { data, isLoading } = useWebhookProviderMetrics(countyId);
  const drainMutation = useDrainWebhookQueue();

  if (!countyId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border/40 bg-muted/10 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  const providers = data?.providers ?? [];
  const queueSummary = data?.queueSummary;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Provider Health
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Token buckets, circuit state, and queued dispatch pressure by external provider.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={drainMutation.isPending || (queueSummary?.ready ?? 0) === 0}
          onClick={() =>
            drainMutation.mutate(countyId, {
              onSuccess: (result) => toast.success(`Drained ${result.drained} queued delivery job(s)`),
              onError: (err) => toast.error(`Drain failed: ${err.message}`),
            })
          }
        >
          {drainMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Drain Ready Queue
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border/50 bg-card/70 lg:col-span-2">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{providers.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Providers Tracked</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardContent className="p-3">
            <div className="text-lg font-bold font-mono">{queueSummary?.queued ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Queued</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardContent className="p-3">
            <div className="text-lg font-bold font-mono">{queueSummary?.ready ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ready To Drain</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardContent className="p-3">
            <div className="text-lg font-bold font-mono">{queueSummary?.processing ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Processing</div>
          </CardContent>
        </Card>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 py-6 text-center text-sm text-muted-foreground">
          No provider activity yet. Dispatch an event to initialize health tracking.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {providers.map((provider) => (
            <Card key={provider.providerKey} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">{provider.providerKey}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {provider.activeEndpoints}/{provider.endpoints} active endpoints
                    </div>
                  </div>
                  <Badge variant={provider.circuitState === "closed" ? "default" : "destructive"} className="text-[10px] capitalize">
                    {provider.circuitState.replace("_", " ")}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Token Bucket</span>
                    <span className="font-mono">{provider.tokensAvailable.toFixed(1)} / {provider.tokenCapacity}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 transition-all"
                      style={{ width: `${Math.max(4, Math.min(100, (provider.tokensAvailable / Math.max(provider.tokenCapacity, 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-md border border-border/40 px-2 py-1.5">
                    <div className="text-muted-foreground uppercase tracking-wide">Queued</div>
                    <div className="font-mono text-sm">{provider.queuedRequests}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-2 py-1.5">
                    <div className="text-muted-foreground uppercase tracking-wide">Ready</div>
                    <div className="font-mono text-sm">{provider.readyQueued}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-2 py-1.5">
                    <div className="text-muted-foreground uppercase tracking-wide">Delivered</div>
                    <div className="font-mono text-sm">{provider.totalDelivered}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-2 py-1.5">
                    <div className="text-muted-foreground uppercase tracking-wide">Failed</div>
                    <div className="font-mono text-sm">{provider.totalFailed}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span>Refill {provider.refillPerMinute}/min</span>
                  <span>Load {provider.saturationPercent}%</span>
                  {provider.openUntil ? <span>Open until {new Date(provider.openUntil).toLocaleTimeString()}</span> : null}
                  {provider.lastFailureAt ? <span>Last fail {new Date(provider.lastFailureAt).toLocaleTimeString()}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Endpoint Card ──────────────────────────────────────────────────
function EndpointCard({ endpoint }: { endpoint: WebhookEndpoint }) {
  const toggleMutation = useToggleWebhookEndpoint();
  const deleteMutation = useDeleteWebhookEndpoint();
  const testMutation = useTestWebhookEndpoint();
  const providerConfig = getWebhookProviderConfig(endpoint.metadata ?? {});
  const providerLabel = getProviderLabel(endpoint);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{endpoint.name}</span>
                <Badge
                  variant={endpoint.is_active ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {endpoint.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 max-w-[300px] truncate">
                {endpoint.url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={endpoint.is_active}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: endpoint.id, is_active: checked })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {endpoint.event_types.map((evt) => (
            <Badge key={evt} variant="outline" className="text-[9px] px-1.5">
              {evt}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <Shield className="h-3 w-3" />
            {endpoint.secret ? "HMAC signed" : "No signing"}
            <span className="mx-1">·</span>
            {endpoint.retry_count} retries · {endpoint.timeout_ms}ms timeout
            <span className="mx-1">·</span>
            {providerLabel} · {providerConfig.tokenBucketCapacity}/{providerConfig.refillPerMinute} tpm
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() =>
                testMutation.mutate(endpoint.id, {
                  onSuccess: () => toast.success("Test ping sent"),
                  onError: (err) => toast.error(err.message),
                })
              }
              disabled={testMutation.isPending}
            >
              <TestTube className="h-3 w-3" /> Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() =>
                deleteMutation.mutate(endpoint.id, {
                  onSuccess: () => toast.success("Endpoint deleted"),
                })
              }
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Delivery Timeline ──────────────────────────────────────────────
function DeliveryTimeline({ deliveries }: { deliveries: WebhookDelivery[] }) {
  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string }> = {
    delivered: { icon: CheckCircle2, color: "text-emerald-400" },
    failed: { icon: XCircle, color: "text-destructive" },
    pending: { icon: Clock, color: "text-amber-400" },
    queued: { icon: Clock, color: "text-sky-400" },
    retrying: { icon: Loader2, color: "text-amber-400" },
  };

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No deliveries yet. Create an endpoint and send a test ping.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {deliveries.slice(0, 50).map((d) => {
        const config = statusConfig[d.status] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <div
            key={d.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5">
                  {d.event_type}
                </Badge>
                {d.status_code && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    HTTP {d.status_code}
                  </span>
                )}
                <span className="text-[10px] font-mono text-muted-foreground">
                  attempt #{d.attempt_number}
                </span>
              </div>
              {d.error_message && (
                <p className="text-[10px] text-destructive mt-0.5 truncate">
                  {d.error_message}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {new Date(d.created_at).toLocaleTimeString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────
export function WebhookNotificationHub() {
  const countyId = useActiveCountyId();
  useWebhookRealtime();
  const { data: endpoints, isLoading: epLoading } = useWebhookEndpoints();
  const { data: deliveries, isLoading: delLoading } = useWebhookDeliveries();

  if (epLoading || delLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Webhook Notification Hub
          </CardTitle>
          <div className="flex gap-2">
            <DispatchEventDialog />
            <CreateEndpointDialog />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatsRow />

        <Separator className="opacity-30" />

        <ProviderHealthBoard countyId={countyId} />

        <Separator className="opacity-30" />

        {/* Endpoints */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Registered Endpoints
          </h3>
          {(endpoints?.length ?? 0) === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No webhook endpoints configured. Click "Add Endpoint" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {endpoints!.map((ep) => (
                <EndpointCard key={ep.id} endpoint={ep} />
              ))}
            </div>
          )}
        </div>

        <Separator className="opacity-30" />

        {/* Delivery Log */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recent Deliveries
          </h3>
          <DeliveryTimeline deliveries={deliveries ?? []} />
        </div>
      </CardContent>
    </Card>
  );
}
