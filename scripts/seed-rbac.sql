CREATE TABLE IF NOT EXISTS "Roles" (
    "Id" uuid NOT NULL,
    "Name" character varying(80) NOT NULL,
    "DisplayName" character varying(120) NOT NULL,
    "Level" integer NOT NULL,
    "IsSystem" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Roles" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS "Permissions" (
    "Id" uuid NOT NULL,
    "Key" character varying(120) NOT NULL,
    "Module" character varying(60) NOT NULL,
    "Action" character varying(60) NOT NULL,
    "Description" character varying(240) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Permissions" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS "RolePermissions" (
    "RoleId" uuid NOT NULL,
    "PermissionId" uuid NOT NULL,
    CONSTRAINT "PK_RolePermissions" PRIMARY KEY ("RoleId", "PermissionId"),
    CONSTRAINT "FK_RolePermissions_Roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RolePermissions_Permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES "Permissions" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserRoles" (
    "UserId" uuid NOT NULL,
    "RoleId" uuid NOT NULL,
    "AssignedAt" timestamp with time zone NOT NULL,
    "AssignedByUserId" uuid NULL,
    CONSTRAINT "PK_UserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_UserRoles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserRoles_Roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Roles_Name" ON "Roles" ("Name");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Permissions_Key" ON "Permissions" ("Key");
CREATE INDEX IF NOT EXISTS "IX_RolePermissions_PermissionId" ON "RolePermissions" ("PermissionId");
CREATE INDEX IF NOT EXISTS "IX_UserRoles_RoleId" ON "UserRoles" ("RoleId");

INSERT INTO "Roles" ("Id", "Name", "DisplayName", "Level", "IsSystem", "CreatedAt", "UpdatedAt") VALUES
('00000000-0000-0000-0000-000000000101', 'super_admin', 'Super Admin', 100, true, now(), now()),
('00000000-0000-0000-0000-000000000102', 'admin', 'Admin', 80, true, now(), now()),
('00000000-0000-0000-0000-000000000103', 'moderator', 'Moderator', 50, true, now(), now()),
('00000000-0000-0000-0000-000000000104', 'user', 'User', 10, true, now(), now())
ON CONFLICT ("Name") DO UPDATE SET
    "DisplayName" = EXCLUDED."DisplayName",
    "Level" = EXCLUDED."Level",
    "UpdatedAt" = now();

INSERT INTO "Permissions" ("Id", "Key", "Module", "Action", "Description", "CreatedAt") VALUES
('00000000-0000-0000-0000-000000000201', 'dashboard.view', 'dashboard', 'view', 'View admin dashboard', now()),
('00000000-0000-0000-0000-000000000202', 'users.view', 'users', 'view', 'View users', now()),
('00000000-0000-0000-0000-000000000203', 'users.manage', 'users', 'manage', 'Ban, unban, delete users', now()),
('00000000-0000-0000-0000-000000000204', 'roles.view', 'roles', 'view', 'View roles and permissions', now()),
('00000000-0000-0000-0000-000000000205', 'roles.manage', 'roles', 'manage', 'Assign roles to users', now()),
('00000000-0000-0000-0000-000000000206', 'posts.view', 'posts', 'view', 'View posts in admin', now()),
('00000000-0000-0000-0000-000000000207', 'posts.manage', 'posts', 'manage', 'Moderate posts', now()),
('00000000-0000-0000-0000-000000000208', 'reels.view', 'reels', 'view', 'View reels in admin', now()),
('00000000-0000-0000-0000-000000000209', 'reels.manage', 'reels', 'manage', 'Moderate reels', now()),
('00000000-0000-0000-0000-000000000210', 'security.view', 'security', 'view', 'View security events', now()),
('00000000-0000-0000-0000-000000000211', 'security.manage', 'security', 'manage', 'Manage block lists and security actions', now()),
('00000000-0000-0000-0000-000000000212', 'settings.manage', 'settings', 'manage', 'Manage system settings', now()),
('00000000-0000-0000-0000-000000000301', 'posts.delete', 'posts', 'delete', 'Delete or hide posts', now()),
('00000000-0000-0000-0000-000000000302', 'posts.restore', 'posts', 'restore', 'Restore deleted posts', now()),
('00000000-0000-0000-0000-000000000303', 'posts.ban_author', 'posts', 'ban_author', 'Ban a user from a post moderation action', now()),
('00000000-0000-0000-0000-000000000304', 'reels.delete', 'reels', 'delete', 'Delete or hide reels', now()),
('00000000-0000-0000-0000-000000000305', 'reels.restore', 'reels', 'restore', 'Restore deleted reels', now()),
('00000000-0000-0000-0000-000000000306', 'reels.ban_author', 'reels', 'ban_author', 'Ban a user from a reel moderation action', now())
ON CONFLICT ("Key") DO UPDATE SET
    "Module" = EXCLUDED."Module",
    "Action" = EXCLUDED."Action",
    "Description" = EXCLUDED."Description";

INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT r."Id", p."Id"
FROM "Roles" r
CROSS JOIN "Permissions" p
WHERE r."Name" = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT r."Id", p."Id"
FROM "Roles" r
JOIN "Permissions" p ON p."Key" <> 'settings.manage'
WHERE r."Name" = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT r."Id", p."Id"
FROM "Roles" r
JOIN "Permissions" p ON p."Key" IN ('dashboard.view', 'users.view', 'posts.view', 'posts.manage', 'posts.delete', 'posts.restore', 'reels.view', 'reels.manage', 'reels.delete', 'reels.restore', 'security.view')
WHERE r."Name" = 'moderator'
ON CONFLICT DO NOTHING;

INSERT INTO "UserRoles" ("UserId", "RoleId", "AssignedAt", "AssignedByUserId")
SELECT u."Id", r."Id", now(), NULL
FROM "Users" u
JOIN "Roles" r ON r."Name" = 'user'
ON CONFLICT DO NOTHING;

INSERT INTO "UserRoles" ("UserId", "RoleId", "AssignedAt", "AssignedByUserId")
SELECT u."Id", r."Id", now(), NULL
FROM "Users" u
JOIN "Roles" r ON r."Name" = 'admin'
WHERE u."IsAdmin" = true AND lower(u."Email") <> 'admin@fbclone.com'
ON CONFLICT DO NOTHING;

INSERT INTO "UserRoles" ("UserId", "RoleId", "AssignedAt", "AssignedByUserId")
SELECT u."Id", r."Id", now(), NULL
FROM "Users" u
JOIN "Roles" r ON r."Name" = 'super_admin'
WHERE lower(u."Email") = 'admin@fbclone.com'
ON CONFLICT DO NOTHING;

UPDATE "Users"
SET "IsAdmin" = true, "IsBanned" = false, "IsDeleted" = false, "BanReason" = NULL, "BannedAt" = NULL, "UpdatedAt" = now()
WHERE lower("Email") = 'admin@fbclone.com';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260714074321_AddRbacTables', '10.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;
