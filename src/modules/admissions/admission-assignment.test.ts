import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { createAdmissionSchema } from './admission.schema.js';
import { AdmissionService, getAdmissionVisibilityWhere, isEligibleAdmissionAssignee } from './admission.service.js';

test('new admissions require an assignee', () => {
  const input = { candidateName: 'Example', mobileNumber: '5550100', address: 'Example address', courseId: 'course-1' };
  assert.equal(createAdmissionSchema.safeParse(input).success, false);
  assert.equal(createAdmissionSchema.safeParse({ ...input, assignedToUserId: 'staff-1' }).success, true);
});

test('creation rejects a user without project permission', async () => {
  const prisma = {
    user: {
      findUnique: async () => ({ id: 'staff-1', role: 'telecaller', branch: 'north', banned: false, userRole: { permissions: ['enquiries'] } }),
    },
  } as unknown as PrismaClient;
  const service = new AdmissionService(prisma);
  const input = createAdmissionSchema.parse({ candidateName: 'Example', mobileNumber: '5550100', address: 'Example address', courseId: 'course-1', assignedToUserId: 'staff-1' });
  await assert.rejects(service.createAdmission(input, { id: 'admin-1', role: 'admin', branch: null }), /Select an active user/);
});

test('assignees must have project permission and managers are excluded', () => {
  assert.equal(isEligibleAdmissionAssignee({ id: 'staff-1', role: 'executive', userRole: { permissions: ['projects'] } }), true);
  assert.equal(isEligibleAdmissionAssignee({ id: 'admin-1', role: 'admin', userRole: null }), true);
  assert.equal(isEligibleAdmissionAssignee({ id: 'staff-2', role: 'telecaller', userRole: { permissions: ['enquiries'] } }), false);
  assert.equal(isEligibleAdmissionAssignee({ id: 'manager-1', role: 'manager', userRole: { permissions: ['projects'] } }), false);
});

test('staff are scoped to their assignments and managers are scoped to their branch', () => {
  assert.deepEqual(getAdmissionVisibilityWhere({ id: 'staff-1', role: 'executive', branch: 'north' }), { assignedToUserId: 'staff-1' });
  assert.deepEqual(getAdmissionVisibilityWhere({ id: 'manager-1', role: 'manager', branch: 'north' }), {
    OR: [
      { enquiry: { branchId: 'north' } },
      { enquiryId: null, createdBy: { branch: 'north' } },
    ],
  });
  assert.deepEqual(getAdmissionVisibilityWhere({ id: 'manager-1', role: 'manager', branch: null }), { id: '__no_branch_access__' });
  assert.deepEqual(getAdmissionVisibilityWhere({ id: 'admin-1', role: 'admin', branch: null }), {});
});
