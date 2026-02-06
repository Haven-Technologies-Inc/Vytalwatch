/**
 * CareTeamPanel Component - Care team coordination
 */

'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface CareTeamPanelProps {
  team: TeamMember[];
  className?: string;
}

export function CareTeamPanel({ team, className }: CareTeamPanelProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Users className="h-5 w-5" />
        Care Team
      </h3>
      <div className="space-y-3">
        {team.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
            <UserAvatar name={member.name} size="md" />
            <div className="flex-1">
              <h4 className="font-medium">{member.name}</h4>
              <p className="text-sm text-gray-600">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CareTeamPanel;
