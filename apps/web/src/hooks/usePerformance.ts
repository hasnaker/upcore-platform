'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery, useApiMutation } from './useApi';
import { useTenant } from './useTenant';

/* ─── Types — mirror services/performance/internal/domain ─── */

export type CycleType = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'custom';
export type CycleStatus =
  | 'planning'
  | 'goal_setting'
  | 'active'
  | 'in_review'
  | 'calibration'
  | 'closed'
  | 'archived';

export interface PerformanceCycle {
  id: string;
  tenant_id: string;
  name_tr: string;
  cycle_type: CycleType;
  period_start: string;
  period_end: string;
  goal_setting_start?: string | null;
  goal_setting_end?: string | null;
  review_start?: string | null;
  review_end?: string | null;
  status: CycleStatus;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalCategory =
  | 'individual'
  | 'team'
  | 'strategic'
  | 'development'
  | 'behavioral';

export type GoalStatus =
  | 'draft'
  | 'active'
  | 'at_risk'
  | 'on_track'
  | 'completed'
  | 'missed'
  | 'deferred'
  | 'cancelled';

export type MetricType = 'numeric' | 'percentage' | 'boolean' | 'milestone' | 'qualitative';

export interface PerformanceGoal {
  id: string;
  cycle_id: string;
  employee_id: string;
  category: GoalCategory;
  title_tr: string;
  description?: string | null;
  metric_type: MetricType;
  target_value?: number | null;
  current_value: number;
  unit?: string | null;
  weight_pct: number;
  due_date?: string | null;
  status: GoalStatus;
  progress_pct: number;
  aligned_with_id?: string | null;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type OKROwnerType = 'company' | 'department' | 'team' | 'individual';
export type OKRStatus =
  | 'draft'
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'off_track'
  | 'completed'
  | 'abandoned';

export interface OKRKeyResult {
  id: string;
  okr_id: string;
  title_tr: string;
  metric_type: MetricType;
  start_value: number;
  target_value: number;
  current_value: number;
  unit?: string | null;
  owner_id?: string | null;
  progress_pct: number;
  confidence_score?: number | null;
  status: OKRStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface OKR {
  id: string;
  cycle_id: string;
  owner_type: OKROwnerType;
  owner_id?: string | null;
  parent_okr_id?: string | null;
  objective_tr: string;
  description?: string | null;
  quarter_label?: string | null;
  confidence_score?: number | null;
  status: OKRStatus;
  progress_pct: number;
  key_results?: OKRKeyResult[];
  created_at: string;
  updated_at: string;
}

export type ReviewType = 'self' | 'manager' | 'peer' | 'subordinate' | 'skip_level' | 'external';
export type ReviewStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'calibrated'
  | 'final'
  | 'disputed';

export interface ReviewFeedback {
  id: string;
  review_id: string;
  competency_code: string;
  competency_name_tr: string;
  rating: number;
  comment?: string | null;
  evidence?: string | null;
}

export interface PerformanceReview {
  id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id: string;
  review_type: ReviewType;
  performance_rating?: number | null;
  potential_rating?: number | null;
  overall_comment?: string | null;
  strengths?: string | null;
  growth_areas?: string | null;
  goals_achieved_pct?: number | null;
  status: ReviewStatus;
  submitted_at?: string | null;
  acknowledged_at?: string | null;
  finalised_at?: string | null;
  feedback?: ReviewFeedback[];
  created_at: string;
  updated_at: string;
}

export type Band = 'low' | 'medium' | 'high';
export type TalentSegment =
  | 'underperformer'
  | 'inconsistent_player'
  | 'dilemma'
  | 'reliable_contributor'
  | 'core_player'
  | 'high_potential'
  | 'solid_performer'
  | 'high_performer'
  | 'star';

export interface NineBoxAssignment {
  id: string;
  cycle_id: string;
  employee_id: string;
  performance_band: Band;
  potential_band: Band;
  box_label: string;
  talent_segment?: TalentSegment | null;
  calibration_notes?: string | null;
  recommended_action?: string | null;
  set_by?: string | null;
  calibrated_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface Listed<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/* ─── Cycles ─── */

export function usePerformanceCycles(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return useApiQuery<Listed<PerformanceCycle>>(
    ['performance', 'cycles', status ?? 'all'],
    `/api/v1/performance/cycles${qs}`,
  );
}

export function usePerformanceCycle(id: string | null | undefined) {
  return useApiQuery<PerformanceCycle>(
    ['performance', 'cycle', id ?? ''],
    `/api/v1/performance/cycles/${id}`,
    { enabled: Boolean(id) },
  );
}

/** Alias matching the spec (`useCycleDetail`). */
export const useCycleDetail = usePerformanceCycle;

/**
 * Cycles treated as "closing" (KR edits must be disabled, score + comment
 * required). The domain state machine flips from `active` to `in_review` then
 * `calibration` before `closed` — both of those are user-visible closing modes.
 */
export function isCycleClosing(status: CycleStatus | undefined | null): boolean {
  return status === 'in_review' || status === 'calibration';
}

export function isCycleEditable(status: CycleStatus | undefined | null): boolean {
  return status === 'planning' || status === 'goal_setting' || status === 'active';
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useApiMutation<
    PerformanceCycle,
    {
      name_tr: string;
      cycle_type: CycleType;
      period_start: string;
      period_end: string;
      description?: string;
    }
  >('/api/v1/performance/cycles', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'cycles'] }),
  });
}

export function useAdvanceCycle(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PerformanceCycle, Record<string, never>>(
    `/api/v1/performance/cycles/${id}/advance`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['performance', 'cycles'] });
        qc.invalidateQueries({ queryKey: ['performance', 'cycle', id] });
      },
    },
  );
}

/* ─── Goals ─── */

export function usePerformanceGoals(params: {
  cycle_id?: string;
  employee_id?: string;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cycle_id) qs.set('cycle_id', params.cycle_id);
  if (params.employee_id) qs.set('employee_id', params.employee_id);
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useApiQuery<Listed<PerformanceGoal>>(
    ['performance', 'goals', params],
    `/api/v1/performance/goals${suffix}`,
  );
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useApiMutation<
    PerformanceGoal,
    {
      cycle_id: string;
      employee_id: string;
      category: GoalCategory;
      title_tr: string;
      description?: string;
      metric_type: MetricType;
      target_value?: number;
      unit?: string;
      weight_pct?: number;
      due_date?: string;
    }
  >('/api/v1/performance/goals', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'goals'] }),
  });
}

export function useUpdateGoal(id: string) {
  const qc = useQueryClient();
  return useApiMutation<
    PerformanceGoal,
    {
      status?: GoalStatus;
      current_value?: number;
      progress_pct?: number;
      description?: string;
    }
  >(`/api/v1/performance/goals/${id}`, {
    method: 'PATCH',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'goals'] }),
  });
}

/* ─── OKRs ─── */

export interface OKRTreeNode extends OKR {
  children: OKRTreeNode[];
}

export function useOKRs(params: {
  cycle_id?: string;
  owner_type?: OKROwnerType;
  owner_id?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cycle_id) qs.set('cycle_id', params.cycle_id);
  if (params.owner_type) qs.set('owner_type', params.owner_type);
  if (params.owner_id) qs.set('owner_id', params.owner_id);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useApiQuery<Listed<OKR>>(
    ['performance', 'okrs', params],
    `/api/v1/performance/okrs${suffix}`,
    { enabled: Boolean(params.cycle_id) },
  );
}

/** Spec alias that matches the task's naming (`useOkrs`). */
export const useOkrs = useOKRs;

/** Cascaded OKR tree for a single cycle. */
export function useOkrTree(cycleId: string | null | undefined) {
  return useApiQuery<Listed<OKRTreeNode>>(
    ['performance', 'okrs', 'tree', cycleId ?? ''],
    `/api/v1/performance/okrs/tree?cycle_id=${cycleId ?? ''}`,
    { enabled: Boolean(cycleId) },
  );
}

export function useOKR(id: string | null | undefined) {
  return useApiQuery<OKR>(
    ['performance', 'okr', id ?? ''],
    `/api/v1/performance/okrs/${id}`,
    { enabled: Boolean(id) },
  );
}

/** Spec alias. */
export const useOkrDetail = useOKR;

export interface CreateOkrInput {
  cycle_id: string;
  owner_type: OKROwnerType;
  owner_id?: string;
  parent_okr_id?: string;
  objective_tr: string;
  description?: string;
  quarter_label?: string;
  key_results?: Array<{
    title_tr: string;
    metric_type: MetricType;
    start_value?: number;
    target_value: number;
    unit?: string;
  }>;
}

export function useCreateOKR() {
  const qc = useQueryClient();
  return useApiMutation<OKR, CreateOkrInput>('/api/v1/performance/okrs', {
    method: 'POST',
    onSuccess: (data) => {
      // Invalidate list + tree for the affected cycle; keep cache coherent.
      qc.invalidateQueries({ queryKey: ['performance', 'okrs'] });
      qc.invalidateQueries({ queryKey: ['performance', 'cycle', data.cycle_id] });
    },
  });
}

/** Spec alias. */
export const useCreateOkr = useCreateOKR;

export interface OkrProgressPatch {
  objective_tr?: string;
  description?: string;
  status?: OKRStatus;
  progress_pct?: number;
  confidence_score?: number;
}

/**
 * Update OKR-level fields (progress, status, confidence).
 * The mutation takes a tuple `{ id, patch }` so the generic body helper
 * still sends a clean JSON payload without the URL id.
 */
export function useUpdateOkr(id: string) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<OKR, Error, OkrProgressPatch>({
    mutationFn: async (patch) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<OKR>(`/api/v1/performance/okrs/${id}`, {
        method: 'PATCH',
        body: patch,
        token,
        tenantSlug: tenant?.slug ?? null,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['performance', 'okrs'] });
      qc.invalidateQueries({ queryKey: ['performance', 'okr', data.id] });
    },
  });
}

export interface KeyResultPatch {
  title_tr?: string;
  metric_type?: MetricType;
  start_value?: number;
  target_value?: number;
  current_value?: number;
  unit?: string;
  progress_pct?: number;
  confidence_score?: number;
  status?: OKRStatus;
  order_index?: number;
}

/**
 * Update a single key-result. Backend recomputes OKR.progress_pct from
 * KR averages automatically.
 *
 * Optimistic update: patches the cached OKR detail before the network
 * round-trip lands, rolls back on error.
 */
export function useUpdateKeyResult(okrId: string) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<OKR, Error, { id: string; patch: KeyResultPatch }, { prev?: OKR }>({
    mutationFn: async ({ id, patch }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<OKR>(
        `/api/v1/performance/okrs/${okrId}/key-results/${id}`,
        {
          method: 'PATCH',
          body: patch,
          token,
          tenantSlug: tenant?.slug ?? null,
        },
      );
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['performance', 'okr', okrId] });
      const prev = qc.getQueryData<OKR>(['performance', 'okr', okrId]);
      if (prev) {
        const next: OKR = {
          ...prev,
          key_results: (prev.key_results ?? []).map((kr) =>
            kr.id === id ? { ...kr, ...patch } : kr,
          ),
        };
        qc.setQueryData(['performance', 'okr', okrId], next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['performance', 'okr', okrId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['performance', 'okr', okrId] });
      qc.invalidateQueries({ queryKey: ['performance', 'okrs'] });
    },
  });
}

/* ─── Reviews ─── */

export function usePerformanceReviews(params: {
  cycle_id?: string;
  employee_id?: string;
  review_type?: ReviewType;
}) {
  const qs = new URLSearchParams();
  if (params.cycle_id) qs.set('cycle_id', params.cycle_id);
  if (params.employee_id) qs.set('employee_id', params.employee_id);
  if (params.review_type) qs.set('review_type', params.review_type);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useApiQuery<Listed<PerformanceReview>>(
    ['performance', 'reviews', params],
    `/api/v1/performance/reviews${suffix}`,
  );
}

export function useReview(id: string | null | undefined) {
  return useApiQuery<PerformanceReview>(
    ['performance', 'review', id ?? ''],
    `/api/v1/performance/reviews/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useApiMutation<
    PerformanceReview,
    {
      cycle_id: string;
      employee_id: string;
      reviewer_id: string;
      review_type: ReviewType;
      performance_rating?: number;
      potential_rating?: number;
      overall_comment?: string;
      strengths?: string;
      growth_areas?: string;
      goals_achieved_pct?: number;
    }
  >('/api/v1/performance/reviews', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'reviews'] }),
  });
}

export function useTransitionReview(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PerformanceReview, { status: ReviewStatus }>(
    `/api/v1/performance/reviews/${id}/transition`,
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'reviews'] }),
    },
  );
}

/* ─── 9-Box Grid ─── */

export function useNineBoxGrid(cycleId: string | null | undefined, segment?: string) {
  const qs = new URLSearchParams();
  if (cycleId) qs.set('cycle_id', cycleId);
  if (segment) qs.set('segment', segment);
  return useApiQuery<Listed<NineBoxAssignment>>(
    ['performance', 'nineBox', 'grid', cycleId, segment ?? 'all'],
    `/api/v1/performance/nine-box/grid?${qs}`,
    { enabled: Boolean(cycleId) },
  );
}

export function useUpsertNineBox() {
  const qc = useQueryClient();
  return useApiMutation<
    NineBoxAssignment,
    {
      cycle_id: string;
      employee_id: string;
      performance_band: Band;
      potential_band: Band;
      calibration_notes?: string;
      recommended_action?: string;
    }
  >('/api/v1/performance/nine-box', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 'nineBox'] }),
  });
}

/* ─── 360° Feedback ─── */

export type AnonymityMode = 'anonymous' | 'named';
export type CampaignStatus =
  | 'draft'
  | 'distributed'
  | 'collecting'
  | 'complete'
  | 'cancelled';
export type InvitationStatus = 'pending' | 'sent' | 'responded' | 'declined' | 'expired';
export type Relation = 'self' | 'manager' | 'peer' | 'direct_report';

export interface Survey360Campaign {
  id: string;
  tenant_id: string;
  cycle_id: string;
  subject_user_id: string;
  created_by: string;
  anonymity_mode: AnonymityMode;
  status: CampaignStatus;
  due_date: string;
  min_responses: number;
  distributed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Survey360Invitation {
  id: string;
  tenant_id: string;
  campaign_id: string;
  reviewer_user_id?: string | null; // hidden under anonymous mode for non-owners
  relation: Relation;
  status: InvitationStatus;
  sent_at?: string | null;
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Survey360ResponseItem {
  competency_code: string;
  competency_name_tr: string;
  score: number;
  comment?: string;
}

export interface CompetencyAggregate {
  competency_code: string;
  competency_name_tr: string;
  average: number;
  sample_size: number;
  by_relation: Partial<Record<Relation, number>>;
}

export interface Survey360Report {
  campaign_id: string;
  subject_user_id: string;
  anonymity_mode: AnonymityMode;
  status: CampaignStatus;
  response_count: number;
  reviewer_count: number;
  min_responses: number;
  unlocked: boolean;
  locked_reason?: string;
  competencies: CompetencyAggregate[];
  strengths: string[];
  growth_areas: string[];
}

export interface CreateCampaignInput {
  cycle_id: string;
  subject_user_id: string;
  anonymity_mode: AnonymityMode;
  due_date: string; // YYYY-MM-DD
  min_responses?: number;
}

export function useCreate360Campaign() {
  const qc = useQueryClient();
  return useApiMutation<Survey360Campaign, CreateCampaignInput>(
    '/api/v1/performance/surveys/360/campaigns',
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 's360'] }),
    },
  );
}

export function useAddInvitation(campaignId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    Survey360Invitation,
    { reviewer_user_id: string; relation: Relation }
  >(`/api/v1/performance/surveys/360/campaigns/${campaignId}/invitations`, {
    method: 'POST',
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['performance', 's360', 'invitations', campaignId] }),
  });
}

export function useDistributeCampaign(campaignId: string) {
  const qc = useQueryClient();
  return useApiMutation<Survey360Campaign, Record<string, never>>(
    `/api/v1/performance/surveys/360/campaigns/${campaignId}/distribute`,
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['performance', 's360'] }),
    },
  );
}

export function useMyCampaigns(subjectUserId: string | null | undefined) {
  const qs = subjectUserId ? `?subject_user_id=${encodeURIComponent(subjectUserId)}` : '';
  return useApiQuery<Listed<Survey360Campaign>>(
    ['performance', 's360', 'campaigns', subjectUserId ?? ''],
    `/api/v1/performance/surveys/360/campaigns${qs}`,
    { enabled: Boolean(subjectUserId) },
  );
}

export function useCampaignInvitations(campaignId: string | null | undefined) {
  return useApiQuery<Listed<Survey360Invitation>>(
    ['performance', 's360', 'invitations', campaignId ?? ''],
    `/api/v1/performance/surveys/360/campaigns/${campaignId}/invitations`,
    { enabled: Boolean(campaignId) },
  );
}

export function useMy360Invitations(reviewerUserId?: string | null) {
  const qs = reviewerUserId
    ? `?reviewer_user_id=${encodeURIComponent(reviewerUserId)}`
    : '';
  return useApiQuery<Listed<Survey360Invitation>>(
    ['performance', 's360', 'my-invitations', reviewerUserId ?? 'self'],
    `/api/v1/performance/surveys/360/invitations${qs}`,
  );
}

export function useInvitationDetail(invitationId: string | null | undefined) {
  return useApiQuery<Survey360Invitation>(
    ['performance', 's360', 'invitation', invitationId ?? ''],
    `/api/v1/performance/surveys/360/invitations/${invitationId}`,
    { enabled: Boolean(invitationId) },
  );
}

/**
 * Submit 360 responses. Optimistic: mark invitation as responded in cache
 * immediately; roll back on error.
 */
export function useSubmit360Response(invitationId: string) {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  return useMutation<
    { ok: true },
    Error,
    { items: Survey360ResponseItem[] },
    { prev?: Survey360Invitation }
  >({
    mutationFn: async (body) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ ok: true }>(
        `/api/v1/performance/surveys/360/invitations/${invitationId}/responses`,
        {
          method: 'POST',
          body,
          token,
          tenantSlug: tenant?.slug ?? null,
        },
      );
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['performance', 's360', 'invitation', invitationId] });
      const prev = qc.getQueryData<Survey360Invitation>([
        'performance',
        's360',
        'invitation',
        invitationId,
      ]);
      if (prev) {
        qc.setQueryData(['performance', 's360', 'invitation', invitationId], {
          ...prev,
          status: 'responded',
          responded_at: new Date().toISOString(),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['performance', 's360', 'invitation', invitationId], ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['performance', 's360'] });
    },
  });
}

export function use360Report(campaignId: string | null | undefined) {
  return useApiQuery<Survey360Report>(
    ['performance', 's360', 'report', campaignId ?? ''],
    `/api/v1/performance/surveys/360/campaigns/${campaignId}/report`,
    { enabled: Boolean(campaignId) },
  );
}
