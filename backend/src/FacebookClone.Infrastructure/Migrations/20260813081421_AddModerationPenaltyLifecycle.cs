using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FacebookClone.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationPenaltyLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PunishmentEndsAt",
                table: "ModerationReports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "ModerationReports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RestoredAt",
                table: "ModerationReports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RestoredById",
                table: "ModerationReports",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewDueAt",
                table: "ModerationReports",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "TargetOwnerId",
                table: "ModerationReports",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.Sql("""
                UPDATE "ModerationReports" r
                SET "ReviewDueAt" = r."CreatedAt" + INTERVAL '24 hours',
                    "ResolvedAt" = CASE WHEN r."Status" IN (3, 4) THEN COALESCE(r."ReviewedAt", r."UpdatedAt") ELSE NULL END,
                    "TargetOwnerId" = CASE r."TargetType"
                        WHEN 1 THEN COALESCE((SELECT p."UserId" FROM "Posts" p WHERE p."Id" = r."TargetId"), '00000000-0000-0000-0000-000000000000'::uuid)
                        WHEN 2 THEN COALESCE((SELECT x."UserId" FROM "Reels" x WHERE x."Id" = r."TargetId"), '00000000-0000-0000-0000-000000000000'::uuid)
                        WHEN 3 THEN COALESCE((SELECT l."OwnerId" FROM "LiveSessions" l WHERE l."Id" = r."TargetId"), '00000000-0000-0000-0000-000000000000'::uuid)
                        WHEN 4 THEN COALESCE((SELECT m."SellerId" FROM "MarketplaceListings" m WHERE m."Id" = r."TargetId"), '00000000-0000-0000-0000-000000000000'::uuid)
                        WHEN 5 THEN r."TargetId"
                        ELSE '00000000-0000-0000-0000-000000000000'::uuid
                    END;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ModerationReports_Status_PunishmentEndsAt_RestoredAt",
                table: "ModerationReports",
                columns: new[] { "Status", "PunishmentEndsAt", "RestoredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ModerationReports_TargetOwnerId_ResolutionAction_Punishment~",
                table: "ModerationReports",
                columns: new[] { "TargetOwnerId", "ResolutionAction", "PunishmentEndsAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ModerationReports_Status_PunishmentEndsAt_RestoredAt",
                table: "ModerationReports");

            migrationBuilder.DropIndex(
                name: "IX_ModerationReports_TargetOwnerId_ResolutionAction_Punishment~",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "PunishmentEndsAt",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "RestoredAt",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "RestoredById",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "ReviewDueAt",
                table: "ModerationReports");

            migrationBuilder.DropColumn(
                name: "TargetOwnerId",
                table: "ModerationReports");
        }
    }
}
