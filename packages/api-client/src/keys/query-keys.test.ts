import { describe, it, expect } from 'vitest';
import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('has root key', () => {
    expect(queryKeys.all).toEqual(['upcore']);
  });

  it('generates auth keys', () => {
    expect(queryKeys.auth.me()).toEqual(['upcore', 'auth', 'me']);
    expect(queryKeys.auth.tenant()).toEqual(['upcore', 'auth', 'tenant']);
  });

  it('generates employee keys with filters', () => {
    const filters = { departmentId: 'dept-1' };
    expect(queryKeys.employees.list(filters)).toEqual([
      'upcore',
      'employees',
      'list',
      filters,
    ]);
  });

  it('generates employee detail key', () => {
    expect(queryKeys.employees.detail('emp-1')).toEqual([
      'upcore',
      'employees',
      'detail',
      'emp-1',
    ]);
  });

  it('generates department tree key', () => {
    expect(queryKeys.departments.tree()).toEqual([
      'upcore',
      'departments',
      'tree',
    ]);
  });

  it('generates burnout heatmap key', () => {
    const query = { weekFrom: '2026-01-01', weekTo: '2026-04-01' };
    expect(queryKeys.burnout.heatmap(query)).toEqual([
      'upcore',
      'burnout',
      'heatmap',
      query,
    ]);
  });

  it('generates leave balance key', () => {
    expect(queryKeys.leaves.balance('emp-1')).toEqual([
      'upcore',
      'leaves',
      'balance',
      'emp-1',
    ]);
  });

  it('generates notification unread key', () => {
    expect(queryKeys.notifications.unread()).toEqual([
      'upcore',
      'notifications',
      'unread',
    ]);
  });

  it('generates assessment results key', () => {
    expect(queryKeys.assessments.results('emp-1', 'BURNOUT')).toEqual([
      'upcore',
      'assessments',
      'results',
      'emp-1',
      'BURNOUT',
    ]);
  });

  it('supports hierarchical invalidation (employee all includes list and detail)', () => {
    const allKey = queryKeys.employees.all();
    const listKey = queryKeys.employees.list({});
    const detailKey = queryKeys.employees.detail('1');

    // list and detail should start with the all key prefix
    expect(listKey.slice(0, allKey.length)).toEqual(allKey);
    expect(detailKey.slice(0, allKey.length)).toEqual(allKey);
  });

  it('generates actions keys', () => {
    expect(queryKeys.actions.all()).toEqual(['upcore', 'actions']);
    expect(queryKeys.actions.detail('act-1')).toEqual([
      'upcore',
      'actions',
      'detail',
      'act-1',
    ]);
  });

  it('generates ATS keys', () => {
    expect(queryKeys.ats.all()).toEqual(['upcore', 'ats']);
    expect(queryKeys.ats.pipeline('pos-1')).toEqual([
      'upcore',
      'ats',
      'pipeline',
      'pos-1',
    ]);
  });
});
