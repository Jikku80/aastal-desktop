'use client';
/**
 * PermissionGate — conditionally renders children based on runtime permissions.
 *
 * @example  Single permission
 *   <PermissionGate permission="invoice.create">
 *     <Button>Create Invoice</Button>
 *   </PermissionGate>
 *
 * @example  Any of several permissions
 *   <PermissionGate anyOf={['billing.manage', 'invoice.create']}>
 *     <BillingActions />
 *   </PermissionGate>
 *
 * @example  With a fallback
 *   <PermissionGate permission="settings.manage" fallback={<ReadOnlyNote />}>
 *     <SettingsForm />
 *   </PermissionGate>
 */
import React from 'react';
import { usePermissions } from '@/store/permissions.store';
import type { Permission } from '@/lib/permissions';

interface PermissionGateProps {
  permission?: Permission;
  allOf?:      Permission[];
  anyOf?:      Permission[];
  fallback?:   React.ReactNode;
  children:    React.ReactNode;
}

export default function PermissionGate({
  permission,
  allOf,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, isLoaded, permissions } = usePermissions();

  if (!isLoaded) return null;

  let allowed = true;

  if (permission) {
    allowed = can(permission);
  } else if (allOf && allOf.length > 0) {
    allowed = allOf.every((p) => permissions.includes(p));
  } else if (anyOf && anyOf.length > 0) {
    allowed = canAny(anyOf);
  }

  return <>{allowed ? children : fallback}</>;
}
