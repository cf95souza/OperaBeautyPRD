// ==============================================================================
// OperaBeauty SaaS - Tipos TypeScript dos Contratos de Backend (Item G7 - P2)
// ==============================================================================

import { z } from 'zod';

export type TenantId = string;
export type UserId = string;

export interface BaseAuditLog {
  tenant_id: string;
  user_id?: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface SystemHealthReport {
  status: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
  uptime_seconds: number;
  node_version: string;
  environment: string;
  memory: {
    heap_used_mb: number;
    heap_total_mb: number;
    rss_mb: number;
  };
  services: {
    database: { status: 'UP' | 'DOWN'; latency_ms?: number; error?: string };
    redis: { status: 'UP' | 'DOWN'; latency_ms?: number; error?: string };
  };
}
