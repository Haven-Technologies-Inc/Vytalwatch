CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) DEFAULT 'active',
  "isSystem" BOOLEAN DEFAULT false,
  "createdById" UUID,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "staffRoleId" UUID NOT NULL REFERENCES staff_roles(id),
  status VARCHAR(20) DEFAULT 'active',
  department VARCHAR(255),
  title VARCHAR(255),
  "employeeId" VARCHAR(100),
  "additionalPermissions" TEXT,
  "restrictedPermissions" TEXT,
  "supervisorId" UUID,
  "hireDate" TIMESTAMP,
  "lastActiveAt" TIMESTAMP,
  "createdById" UUID,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_members_user ON staff_members("userId");
CREATE INDEX IF NOT EXISTS idx_staff_members_role ON staff_members("staffRoleId");
